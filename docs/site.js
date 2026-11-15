"use strict";
const root = document.documentElement;
try { const theme = localStorage.getItem("image-assist-theme"); if (["light","dark"].includes(theme)) root.dataset.theme = theme; } catch {}
const themeButton = document.querySelector("[data-theme-toggle]");
function updateThemeLabel() {
  const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  if (themeButton) themeButton.textContent = dark ? "Light mode" : "Dark mode";
}
themeButton?.addEventListener("click",() => {
  const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem("image-assist-theme",root.dataset.theme); } catch {}
  updateThemeLabel();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",updateThemeLabel);
updateThemeLabel();
fetch("version.json").then(response => response.json()).then(data => {
  for (const node of document.querySelectorAll("[data-version]")) node.textContent = `v${data.version}`;
}).catch(() => {});
const iframe = document.getElementById("demo");
const controls = [...document.querySelectorAll("[data-demo-state]")];
function selectDemo(state) { for (const button of controls) button.setAttribute("aria-pressed",String(button.dataset.demoState === state)); }
for (const button of controls) button.addEventListener("click",() => {
  selectDemo(button.dataset.demoState);
  iframe.contentWindow.postMessage({type:"gia:demo",state:button.dataset.demoState},location.origin === "null" ? "*" : location.origin);
});
addEventListener("message",event => { if (event.source === iframe?.contentWindow && event.data?.type === "gia:demo-state") selectDemo(event.data.state); });
const shots = {
  original:{file:"original.png",title:"Details from the original",description:"A compact card shows the image's original dimensions, verified format and file size. The waiting indicator disappears as soon as the original is ready.",alt:"Original image details and a green Download Original Image button in a demonstration image search"},
  again:{file:"download-again.png",title:"A familiar image, a different button",description:"Successful downloads from the last 30 days get a blue Download Again button. Reopening an image checks its own history, including native Save Image As downloads.",alt:"Blue Download Again button for an image previously downloaded"},
  settings:{file:"preferences.png",title:"Your preferences, remembered",description:"Choose your default image-search size and card position. Settings save automatically, with the current extension version and project links close at hand.",alt:"Image Assist settings with default search size, card position, current version and developer credit"}
};
const tabs = [...document.querySelectorAll("[data-shot]")];
for (const tab of tabs) {
  tab.addEventListener("click",() => {
    for (const other of tabs) { const active = other === tab; other.setAttribute("aria-selected",String(active)); other.tabIndex = active ? 0 : -1; }
    const shot = shots[tab.dataset.shot];
    document.getElementById("gallery-image").src = `assets/${shot.file}`;
    document.getElementById("gallery-image").alt = shot.alt;
    document.getElementById("gallery-title").textContent = shot.title;
    document.getElementById("gallery-description").textContent = shot.description;
    document.getElementById("shot-panel").setAttribute("aria-labelledby",tab.id);
  });
  tab.addEventListener("keydown",event => {
    if (!["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
    event.preventDefault();
    let index = tabs.indexOf(tab);
    index = event.key === "Home" ? 0 : event.key === "End" ? tabs.length-1 : (index+(event.key === "ArrowRight" ? 1 : -1)+tabs.length)%tabs.length;
    tabs[index].click(); tabs[index].focus();
  });
}
