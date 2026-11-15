const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { JSDOM } = require("jsdom");
const shared = fs.readFileSync(require.resolve("../shared.js"),"utf8");
const content = fs.readFileSync(require.resolve("../content.js"),"utf8");
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
async function setup(src, { grid=false, inspect, status=async () => ({ok:true,downloaded:false}) } = {}) {
  const dom = new JSDOM(`<img class="${grid ? "grid" : "sFlh5c"}" src="${src}">`,{ url:"https://www.google.com/search?udm=2&q=cat",runScripts:"outside-only",pretendToBeVisual:true });
  const w = dom.window;
  let root;
  const attach = w.Element.prototype.attachShadow;
  w.Element.prototype.attachShadow = function(options) { root = attach.call(this,options); return root; };
  const img = w.document.querySelector("img");
  img.getBoundingClientRect = () => ({ width:500,height:350,left:600,top:150,right:1100,bottom:500 });
  Object.defineProperties(img,{ complete:{ get:() => true },naturalWidth:{ get:() => 281 },naturalHeight:{ get:() => 180 } });
  const requests = [];
  let listener;
  w.chrome = {
    runtime:{ sendMessage:async msg => {
      requests.push(msg);
      if (msg.type === "gid:download-status") return status(msg);
      if (msg.type === "gid:inspect") return inspect ? inspect(msg) : { ok:true,info:{ format:"PNG",width:2400,height:1600,bytes:123456,url:msg.url } };
      return { ok:true };
    },onMessage:{ addListener(fn) { listener = fn; } } },
    storage:{ local:{ get:async () => ({ defaultSize:"none" }) },onChanged:{ addListener() {} } }
  };
  w.eval(shared); w.eval(fs.readFileSync(require.resolve("../ui-icons.js"),"utf8")); w.eval(content);
  await sleep(50);
  return { dom,w,img,requests,get root() { return root; },notify:msg => listener(msg,{},() => {}), message:msg => new Promise(resolve => listener(msg,{},resolve)) };
}
test("original file information replaces preview metadata; no tick or ready-state footer",async () => {
  const s = await setup("https://example.org/original.jpg");
  try {
    assert.equal(s.root.querySelector("section").dataset.state,"ready");
    assert.equal(s.root.querySelector("#dimensions").textContent,"2400 × 1600");
    assert.equal(s.root.querySelector("#format").textContent,"PNG");
    assert.equal(s.root.querySelector("#bytes").textContent,"120.6 KB");
    assert.equal(s.root.querySelector(".hint").hidden,true);
    assert.equal(s.root.querySelector("h2").textContent,"Original image ready");
    assert.equal(s.root.querySelector(".spinner").hidden,true);
    assert.equal(s.root.querySelector(".download-icon").hidden,false);
    assert.ok(s.root.querySelector(".download-icon svg path"));
    assert.ok(s.root.querySelector(".settings svg circle"));
    assert.equal(/[\u0600-\u06ff]/.test(s.root.textContent),false);
    assert.equal(s.root.textContent.includes("✓"),false);
    s.root.querySelector(".download").click(); await sleep(10);
    assert.equal(s.requests.at(-1).url,"https://example.org/original.jpg");
    assert.equal(s.requests.at(-1).format,"PNG");
  } finally { s.dom.window.close(); }
});
test("a loaded small original stays usable if the host blocks metadata requests",async () => {
  const s = await setup("https://example.org/tiny.png",{ inspect:async () => ({ ok:false,error:"403" }) });
  try {
    assert.equal(s.root.querySelector("section").dataset.state,"ready");
    assert.equal(s.root.querySelector("#dimensions").textContent,"281 × 180");
    assert.equal(s.root.querySelector("#format").textContent,"—");
    assert.equal(s.root.querySelector("#bytes").textContent,"—");
  } finally { s.dom.window.close(); }
});
test("a Google placeholder cannot enable download or leak thumbnail metadata",async () => {
  const s = await setup("https://encrypted-tbn0.gstatic.com/images?q=foo");
  try {
    assert.equal(s.root.querySelector("section").dataset.state,"waiting");
    assert.equal(s.root.querySelector("#dimensions").textContent,"—");
    assert.equal(s.root.querySelector(".download").disabled,true);
    assert.equal(s.root.querySelector(".spinner").hidden,false);
    assert.equal(s.root.querySelector(".download-icon").hidden,true);
    assert.equal(s.requests.length,0);
  } finally { s.dom.window.close(); }
});
test("ordinary grid images do not create a preview card",async () => {
  const s = await setup("https://example.org/original.png",{ grid:true });
  try { assert.equal(s.w.document.getElementById("gid-original"),null); } finally { s.dom.window.close(); }
});
test("late metadata responses cannot overwrite a newly selected image",async () => {
  let resolveA,resolveB;
  const s = await setup("https://example.org/a.jpg",{ inspect:msg => new Promise(resolve => { if (msg.url.endsWith("a.jpg")) resolveA=resolve; else resolveB=resolve; }) });
  try {
    s.img.src="https://example.org/b.jpg";
    await sleep(230);
    resolveB({ ok:true,info:{ format:"WEBP",width:900,height:600,bytes:2048 } });
    await sleep(10);
    resolveA({ ok:true,info:{ format:"JPG",width:5000,height:3000,bytes:999999 } });
    await sleep(10);
    assert.equal(s.root.querySelector("#format").textContent,"WEBP");
    assert.equal(s.root.querySelector("#bytes").textContent,"2.0 KB");
    s.img.src="https://encrypted-tbn0.gstatic.com/images?q=next"; await sleep(230);
    assert.equal(s.root.querySelector("#bytes").textContent,"—");
    assert.equal(s.root.querySelector("#format").textContent,"—");
    assert.equal(s.root.querySelectorAll("#bytes").length,1);
    s.img.remove(); await sleep(230);
    assert.equal(s.w.document.getElementById("gid-original").hidden,true);
  } finally { s.dom.window.close(); }
});
test("context menu never substitutes another open preview",async () => {
  const s = await setup("https://example.org/original.jpg");
  try {
    assert.equal((await s.message({ type:"gid:get-original",srcUrl:"https://example.org/other.jpg" })).url,null);
    s.img.dispatchEvent(new s.w.MouseEvent("contextmenu",{ bubbles:true }));
    assert.equal((await s.message({ type:"gid:get-original",srcUrl:s.img.src })).url,s.img.src);
  } finally { s.dom.window.close(); }
});
test("loaded originals are ready immediately and metadata cannot interrupt a save dialog",async () => {
  let resolveInspect,resolveSave;
  const s = await setup("https://example.org/original.jpg",{ inspect:() => new Promise(resolve => { resolveInspect=resolve; }) });
  try {
    assert.equal(s.root.querySelector("section").dataset.state,"ready");
    s.w.chrome.runtime.sendMessage = msg => msg.type === "gid:download-full" ? new Promise(resolve => { resolveSave=resolve; }) : Promise.resolve({ ok:true });
    s.root.querySelector(".download").click();
    resolveInspect({ ok:true,info:{ format:"PNG",width:1920,height:1080,bytes:2048 } });
    await sleep(10);
    assert.equal(s.root.querySelector("section").dataset.state,"saving");
    assert.equal(s.root.querySelector(".spinner").hidden,false);
    assert.equal(s.root.querySelector(".download").disabled,true);
    resolveSave({ ok:true }); await sleep(10);
    assert.equal(s.root.querySelector("section").dataset.state,"ready");
  } finally { s.dom.window.close(); }
});
test("recent downloads use a blue Download Again button and reset for a different image",async () => {
  const url="https://example.org/original.png";
  const s=await setup(url,{status:async msg => ({ok:true,downloaded:msg.url === url})});
  try {
    assert.equal(s.root.querySelector("#label").textContent,"Download Again");
    assert.equal(s.root.querySelector(".download").classList.contains("again"),true);
    s.img.src="https://example.org/new.png"; await sleep(230);
    assert.equal(s.root.querySelector("#label").textContent,"Download Original Image");
    assert.equal(s.root.querySelector(".download").classList.contains("again"),false);
    s.img.src=url; await sleep(230);
    assert.equal(s.root.querySelector("#label").textContent,"Download Again");
  } finally { s.dom.window.close(); }
});
test("completion updates the current button immediately and overrides a late history lookup",async () => {
  let resolveStatus;
  const url="https://example.org/original.png";
  const s=await setup(url,{status:() => new Promise(resolve => { resolveStatus=resolve; })});
  try {
    assert.equal(s.root.querySelector("#label").textContent,"Download Original Image");
    s.notify({type:"gid:download-complete",urls:["https://example.org/unrelated.png"]});
    assert.equal(s.root.querySelector("#label").textContent,"Download Original Image");
    s.notify({type:"gid:download-complete",urls:[url]});
    resolveStatus({ok:true,downloaded:false}); await sleep(10);
    assert.equal(s.root.querySelector("#label").textContent,"Download Again");
    assert.equal(s.root.querySelector(".download").disabled,false);
  } finally { s.dom.window.close(); }
});
test("late history results cannot mark the next image as previously downloaded",async () => {
  let resolveFirst;
  const s=await setup("https://example.org/first.png",{status:msg => msg.url.endsWith("first.png") ? new Promise(resolve => {resolveFirst=resolve;}) : Promise.resolve({ok:true,downloaded:false})});
  try {
    s.img.src="https://example.org/second.png"; await sleep(230);
    resolveFirst({ok:true,downloaded:true}); await sleep(10);
    assert.equal(s.root.querySelector("#label").textContent,"Download Original Image");
  } finally { s.dom.window.close(); }
});
