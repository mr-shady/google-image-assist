"use strict";
let demoState = "ready", listener;
const original = "https://demo.image-assist.invalid/landscape.svg";
const img = document.querySelector(".sFlh5c");
// Keep the desktop-style preview above the artwork inside this narrow demo iframe.
new MutationObserver(() => {
  const host = document.getElementById("gid-original");
  if (host) { host.style.top = "16px"; host.style.bottom = "auto"; }
}).observe(document.documentElement,{childList:true,subtree:true});
Object.defineProperty(img,"currentSrc",{get:() => demoState === "waiting" ? "https://encrypted-tbn0.gstatic.com/images?q=demo" : original});
function setState(state) {
  demoState = state;
  img.className = `sFlh5c ${state}`;
  if (state === "downloaded") setTimeout(() => listener?.({type:"gid:download-complete",urls:[original]}, {}, () => {}),200);
  parent.postMessage({type:"gia:demo-state",state},location.origin === "null" ? "*" : location.origin);
  // Refresh the local history status when switching back to the same original URL.
  window.dispatchEvent(new Event("focus"));
}
window.chrome = {
  runtime:{onMessage:{addListener(fn){listener=fn;}},sendMessage:async msg => {
    if (msg.type === "gid:download-status") return {ok:true,downloaded:demoState === "downloaded"};
    if (msg.type === "gid:inspect") return {ok:true,info:{format:"SVG",width:2400,height:1600,bytes:1236,url:original}};
    if (msg.type === "gid:download-full") { setState("downloaded"); return {ok:true,id:1}; }
    return {ok:true};
  }},
  storage:{local:{get:async()=>({defaultSize:"none",position:"right"})},onChanged:{addListener(){}}}
};
addEventListener("message",event => { if (event.source === parent && event.data?.type === "gia:demo" && ["waiting","ready","downloaded"].includes(event.data.state)) setState(event.data.state); });
