"use strict";
if (typeof importScripts === "function") importScripts("shared.js");
const api = typeof browser !== "undefined" ? browser : chrome;
const cache = new Map();
const inflight = new Map();

async function inspect(url) {
  if (!GID.originalURL(url)) throw new Error("Original image URL is unavailable");
  const cached = cache.get(url);
  if (cached && Date.now()-cached.time < 300000) return cached.info;
  if (inflight.has(url)) return inflight.get(url);
  const task = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(url, { signal: controller.signal, credentials: "omit" });
      if (!response.ok || !GID.originalURL(response.url)) throw new Error("Could not retrieve the original file");
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 40*1024*1024) { await reader.cancel(); throw new Error("This file exceeds the 40 MB automatic inspection limit"); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
      const meta = GID.metadata(bytes,response.headers.get("content-type"));
      if (!meta.format) throw new Error("The server did not return a supported image file");
      if ((!meta.width || !meta.height) && typeof createImageBitmap === "function") {
        try {
          const bitmap = await createImageBitmap(new Blob([bytes], { type:response.headers.get("content-type") || "" }));
          meta.width = bitmap.width; meta.height = bitmap.height; bitmap.close();
        } catch { /* Keep unavailable dimensions unknown instead of guessing. */ }
      }
      const info = { ...meta, bytes: size, url: response.url };
      cache.set(url,{ time: Date.now(), info });
      if (cache.size > 40) cache.delete(cache.keys().next().value);
      return info;
    } finally { clearTimeout(timer); }
  })();
  inflight.set(url,task);
  try { return await task; } finally { inflight.delete(url); }
}

async function download(url,format) {
  if (!GID.originalURL(url)) throw new Error("The original image has not been identified yet");
  const id = await api.downloads.download({ url, filename: GID.filename(url,format), saveAs: true, conflictAction: "uniquify" });
  return { ok: true, id };
}

// Use browser-owned history, including native Save Image As downloads. No new database.
const RECENT_DOWNLOAD_MS = 30 * 24 * 60 * 60 * 1000;
async function downloadStatus(url) {
  const key = GID.imageKey(url);
  if (!key) return { ok:true, downloaded:false };
  const cutoff = Date.now() - RECENT_DOWNLOAD_MS;
  const items = await api.downloads.search({
    query:[key], state:"complete", startedAfter:new Date(cutoff).toISOString(), limit:0
  });
  const downloaded = items.some(item => item.state === "complete" &&
    Date.parse(item.startTime) > cutoff &&
    [item.url,item.finalUrl].some(value => GID.imageKey(value) === key));
  return { ok:true, downloaded };
}

api.downloads.onChanged.addListener(delta => {
  if (delta.state?.current !== "complete") return;
  (async () => {
    const [item] = await api.downloads.search({ id:delta.id });
    if (!item || item.state !== "complete" || Date.parse(item.startTime) <= Date.now()-RECENT_DOWNLOAD_MS) return;
    const urls = [...new Set([item.url,item.finalUrl].map(GID.imageKey).filter(Boolean))];
    if (!urls.length) return;
    const tabs = await api.tabs.query({ url:"*://*.google.com/search*" });
    await Promise.all(tabs.filter(tab => tab.id != null).map(tab =>
      api.tabs.sendMessage(tab.id,{ type:"gid:download-complete", urls }).catch(() => {})
    ));
  })().catch(() => {});
});

api.runtime.onMessage.addListener((msg,sender,respond) => {
  if (!sender.tab || !GID.googleSearch(sender.url || sender.tab.url || "")) return;
  let task;
  if (msg?.type === "gid:settings") task = api.runtime.openOptionsPage().then(() => ({ ok:true }));
  if (msg?.type === "gid:inspect") task = inspect(msg.url).then(info => ({ ok: true, info }));
  if (msg?.type === "gid:download-status") task = downloadStatus(msg.url);
  if (msg?.type === "gid:download-full") task = download(msg.url,msg.format);
  if (!task) return;
  task.then(respond,error => respond({ ok: false, error: error.message || "The operation could not be completed" }));
  return true;
});

api.runtime.onInstalled.addListener(() => {
  api.contextMenus.removeAll().then(() => api.contextMenus.create({
    id: "gid-download-full", title: "Download original image", contexts: ["image"],
    documentUrlPatterns: ["*://*.google.com/search*"]
  }));
});
api.contextMenus.onClicked.addListener(async (info,tab) => {
  if (info.menuItemId !== "gid-download-full" || tab?.id == null) return;
  try {
    const result = await api.tabs.sendMessage(tab.id,{ type: "gid:get-original", srcUrl: info.srcUrl });
    if (result?.url) await download(result.url,result.format);
  } catch (error) {
    api.tabs.sendMessage(tab.id,{ type: "gid:notice", error: error.message }).catch(() => {});
  }
});
