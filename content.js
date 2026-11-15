(() => {
  "use strict";
  const api = typeof browser !== "undefined" ? browser : chrome;
  let host, ui, image, source = "", generation = 0, data = null, state = "waiting";
  let started = 0, pending = false, retryAt = 0, lastLocation = "";
  let settings = { defaultSize: "large", position: "right" };
  let clickedImage = null;
  let downloaded = false, historyGeneration = 0;

  function visible(img) {
    const r = img.getBoundingClientRect();
    return r.width >= 100 && r.height >= 80 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight && getComputedStyle(img).visibility !== "hidden";
  }
  function findPreview() {
    // Prefer Google's actual preview images, never the largest search-grid tile.
    const candidates = [...document.querySelectorAll('img.sFlh5c, img.n3VNCb, img.iPVvYb, img[jsname="kn3ccd"], [role="dialog"] img')].filter(visible);
    return candidates.sort((a,b) => {
      const score = img => {
        const r = img.getBoundingClientRect();
        return r.width*r.height + (GID.originalURL(img.currentSrc || img.src) ? 1000000 : 0);
      };
      return score(b)-score(a);
    })[0] || null;
  }
  function original(img) {
    if (!img) return null;
    const direct = GID.originalURL(img.currentSrc || img.src);
    if (direct) return direct;
    // Restrict metadata lookup to this image's result, not sibling results.
    let node = img;
    for (let depth = 0; node && depth < 5; depth++, node = node.parentElement) {
      for (const name of ["data-ou", "data-iurl", "data-src"]) {
        const url = GID.originalURL(node.getAttribute(name));
        if (url) return url;
      }
      if (node.tagName === "A") {
        try { const url = GID.originalURL(new URL(node.href).searchParams.get("imgurl")); if (url) return url; } catch {}
      }
      if (node.querySelectorAll("img").length > 2) break;
    }
    return null;
  }
  const bytesLabel = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(2)} MB`;
  const directLoaded = () => image?.complete && image.naturalWidth > 0 && GID.originalURL(image.currentSrc || image.src) === source;
  function ensureUI() {
    if (host?.isConnected) return;
    host = document.createElement("div");
    host.id = "gid-original";
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `<style>
      :host { all:initial; position:fixed; top:16px; right:16px; z-index:2147483647; width:288px; max-width:calc(100vw - 24px); direction:ltr; color-scheme:light dark; }
      :host([hidden]) { display:none!important; } * { box-sizing:border-box; } [hidden] { display:none!important; }
      section { --surface:#fff; --ink:#202923; --muted:#69756d; --line:#e4eae6; --accent:#167347; background:var(--surface); color:var(--ink); border:1px solid var(--line); border-radius:16px; box-shadow:0 8px 32px #172b201c,0 2px 6px #172b200a; padding:15px; font:12px/1.7 Arial,Helvetica,sans-serif; }
      header { display:flex; align-items:center; gap:8px; } h2 { margin:0; font:700 12px/1.8 Arial,Helvetica,sans-serif; flex:1; }
      .dot { width:7px; height:7px; border-radius:50%; background:#c18a22; flex-shrink:0; } section[data-state=ready] .dot { background:var(--accent); } section[data-state=error] .dot { background:#b86a34; }
      button { font:inherit; cursor:pointer; } .settings { display:grid; place-items:center; border:0; background:transparent; color:var(--muted); border-radius:6px; width:28px; height:28px; padding:4px; } .settings:hover { background:var(--line); color:var(--ink); } svg { display:block; width:20px; height:20px; flex-shrink:0; }
      .stats { display:grid; grid-template-columns:1.4fr .8fr 1fr; margin:13px 0; direction:ltr; } .stat { text-align:center; border-right:1px solid var(--line); } .stat:last-child { border:0; } small { display:block; color:var(--muted); font-size:10px; margin-bottom:3px; } b { font:600 12px/1.5 Arial,sans-serif; white-space:nowrap; }
      .download { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; border:0; border-radius:9px; min-height:38px; background:var(--accent); color:#fff; font-weight:700; } .download:disabled { background:var(--line); color:var(--muted); cursor:default; } .download:not(:disabled):hover { filter:brightness(.92); }
      .download.again:not(:disabled) { background:#2563eb; }
      button:focus-visible { outline:2px solid #4285f4; outline-offset:3px; } .hint { margin:9px 0 0; color:var(--muted); font-size:10px; text-align:center; } .retry { border:0; background:transparent; color:var(--accent); padding:3px 8px; display:block; margin:5px auto 0; }
      .spinner { display:block; width:17px; height:17px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; } @keyframes spin { to { transform:rotate(360deg); } } @media(prefers-reduced-motion:reduce) { .spinner { animation:none; } }
      @media(prefers-color-scheme:dark) { section { --surface:#202622; --ink:#eef4ef; --muted:#b2bfb5; --line:#39453d; --accent:#238556; box-shadow:0 8px 32px #0005; } }
      @media(max-width:600px) { :host { top:auto; bottom:12px; right:12px; } }
    </style><section aria-label="Google Images original image"><header><span class="dot"></span><h2 role="status" aria-live="polite"></h2><button class="settings" title="Settings" aria-label="Settings"></button></header><div class="stats"><div class="stat"><small>Dimensions</small><b id="dimensions">—</b></div><div class="stat"><small>Format</small><b id="format">—</b></div><div class="stat"><small>File size</small><b id="bytes">—</b></div></div><button class="download" disabled><span class="download-icon" aria-hidden="true"></span><span class="spinner" aria-hidden="true" hidden></span><span id="label"></span></button><p class="hint"></p><button class="retry" hidden>Try again</button></section>`;
    const parser = new DOMParser();
    for (const [selector, svg] of [[".settings", GIA_ICONS.settings], [".download-icon", GIA_ICONS.download]]) {
      root.querySelector(selector).appendChild(document.importNode(parser.parseFromString(svg, "image/svg+xml").documentElement, true));
    }
    ui = {
      section: root.querySelector("section"), title: root.querySelector("h2"),
      dimensions: root.querySelector("#dimensions"), format: root.querySelector("#format"), bytes: root.querySelector("#bytes"),
      button: root.querySelector(".download"), label: root.querySelector("#label"), hint: root.querySelector(".hint"), retry: root.querySelector(".retry")
    };
    root.querySelector(".settings").onclick = () => api.runtime.sendMessage({ type:"gid:settings" }).catch(() => {});
    ui.retry.onclick = () => { retryAt = 0; if (source) probe(); else { started = Date.now(); render("waiting"); } };
    ui.button.onclick = save;
    document.documentElement.appendChild(host);
  }
  function render(next, message = "") {
    state = next;
    ensureUI();
    host.hidden = false;
    host.style.right = settings.position === "left" ? "auto" : "16px";
    host.style.left = settings.position === "left" ? "16px" : "auto";
    ui.section.dataset.state = next;
    const ready = next === "ready";
    ui.title.textContent = { waiting:"Waiting for original", checking:"Checking original…", ready:"Original image ready", error:"Could not verify image", saving:"Opening save dialog…" }[next];
    ui.button.disabled = !ready;
    ui.button.classList.toggle("again", downloaded);
    ui.button.title = downloaded ? "This image was downloaded in the last 30 days" : "Download the original image";
    ui.label.textContent = ready ? downloaded ? "Download Again" : "Download Original Image" : next === "saving" ? "Opening save dialog…" : "Waiting for original";
    // Never label thumbnail dimensions/bytes as original information.
    const w = data?.width || (directLoaded() ? image.naturalWidth : 0);
    const h = data?.height || (directLoaded() ? image.naturalHeight : 0);
    ui.dimensions.textContent = w && h ? `${w} × ${h}` : "—";
    ui.format.textContent = data?.format || "—";
    ui.bytes.textContent = data?.bytes != null ? bytesLabel(data.bytes) : "—";
    ui.bytes.title = data?.bytes != null ? `${data.bytes.toLocaleString("en-US")} bytes` : "Original file size is not available yet";
    ui.hint.textContent = message || (ready ? "" : next === "error" ? "Unavailable information is never guessed." : "Checking the original file, not the thumbnail.");
    ui.hint.hidden = !ui.hint.textContent;
    ui.retry.hidden = next !== "error";
    const spinning = ["waiting", "checking", "saving"].includes(next);
    ui.section.querySelector(".spinner").hidden = !spinning;
    ui.section.querySelector(".download-icon").hidden = spinning;
  }
  async function probe() {
    if (!source) return;
    const token = ++generation;
    const url = source;
    data = null;
    render(directLoaded() ? "ready" : "checking");
    try {
      const result = await api.runtime.sendMessage({ type:"gid:inspect", url });
      if (token !== generation) return;
      if (!result?.ok) throw new Error(result?.error || "Could not read original file information");
      data = result.info;
      retryAt = 0;
      render(state === "saving" ? "saving" : "ready");
    } catch (error) {
      if (token !== generation) return;
      retryAt = Date.now()+30000;
      const loaded = directLoaded();
      // A browser-loaded original is usable even when its host blocks extension fetches.
      render(state === "saving" ? "saving" : loaded ? "ready" : "error", loaded ? "" : error.message);
    }
  }
  async function save() {
    if (state !== "ready" || !source) return;
    const token = generation;
    render("saving");
    try {
      const result = await api.runtime.sendMessage({ type:"gid:download-full", url:source, format:data?.format });
      if (token !== generation) return;
      render("ready", result?.ok ? "" : result?.error || "Could not save the image. Please try again.");
    } catch { if (token === generation) render("ready", "Extension disconnected. Refresh this page."); }
  }
  async function checkDownloadStatus() {
    const url = source, token = ++historyGeneration;
    try {
      const result = await api.runtime.sendMessage({ type:"gid:download-status", url });
      if (url !== source || token !== historyGeneration || !result?.ok) return;
      downloaded = result.downloaded === true;
      render(state);
    } catch { /* History lookup failure must not block the original download. */ }
  }
  function applyFilter() {
    if (lastLocation === location.href) return false;
    lastLocation = location.href;
    const target = GID.filteredURL(location.href,settings.defaultSize);
    if (target) { location.replace(target); return true; }
    return false;
  }
  function update() {
    pending = false;
    if (applyFilter()) return;
    const isImages = new URL(location.href).searchParams;
    const next = isImages.get("udm") === "2" || isImages.get("tbm") === "isch" ? findPreview() : null;
    if (!next) {
      if (image) { generation++; historyGeneration++; image = null; source = ""; data = null; downloaded = false; }
      if (host) host.hidden = true;
      return;
    }
    const url = original(next) || "";
    if (next !== image || url !== source) {
      generation++; historyGeneration++; image = next; source = url; data = null; downloaded = false; started = Date.now(); retryAt = 0;
      if (source) { probe(); checkDownloadStatus(); } else render("waiting");
    } else if (!source && Date.now()-started > 15000 && state !== "error") {
      render("error", "Google has not provided the original image URL yet.");
    } else if (source && ["checking","error"].includes(state) && directLoaded()) {
      render("ready");
    } else if (source && state === "ready" && ui.dimensions.textContent === "—" && image.complete && image.naturalWidth && GID.originalURL(image.currentSrc || image.src) === source) {
      render("ready");
    } else if (source && retryAt && Date.now() > retryAt) { retryAt = 0; probe(); }
  }
  function schedule() {
    if (!pending) { pending = true; setTimeout(update,160); }
  }
  document.addEventListener("contextmenu", event => { clickedImage = event.target instanceof HTMLImageElement ? event.target : null; },true);
  document.addEventListener("load", event => { if (event.target instanceof HTMLImageElement) schedule(); },true);
  api.runtime.onMessage.addListener((msg,sender,respond) => {
    if (msg?.type === "gid:download-complete" && source && msg.urls?.includes(GID.imageKey(source))) {
      historyGeneration++;
      downloaded = true;
      render(state);
    }
    if (msg?.type === "gid:get-original") {
      const clicked = clickedImage && (clickedImage.currentSrc || clickedImage.src) === msg.srcUrl ? clickedImage : null;
      const url = original(clicked);
      if (!url) { if (image) render(state,"Original URL not found. Open the preview for this image first."); }
      respond({ url, format:url === source ? data?.format : null });
    }
    if (msg?.type === "gid:notice" && image) render(state,msg.error);
  });
  api.storage.onChanged.addListener((changes,area) => {
    if (area !== "local") return;
    for (const key of ["defaultSize","position"]) if (changes[key]) settings[key] = changes[key].newValue;
    if (host && image) render(state);
  });
  async function start() {
    settings = { ...settings, ...await api.storage.local.get(["defaultSize","position"]) };
    if (applyFilter()) return;
    new MutationObserver(records => {
      if (records.some(record => record.target !== host && !host?.contains(record.target))) schedule();
    }).observe(document.documentElement,{ childList:true, subtree:true, attributes:true, attributeFilter:["src","srcset","class","style","aria-hidden","data-ou","data-iurl"] });
    addEventListener("resize",schedule);
    addEventListener("scroll",schedule,{ passive:true });
    addEventListener("focus",() => { if (source) checkDownloadStatus(); });
    setInterval(update,1500);
    update();
  }
  start().catch(() => {});
})();
