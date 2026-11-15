"use strict";
const api = typeof browser !== "undefined" ? browser : chrome;
const size = document.getElementById("size");
const position = document.getElementById("position");
const saved = document.getElementById("saved");
document.getElementById("version").textContent = `v${api.runtime.getManifest().version}`;
async function init() {
  const settings = await api.storage.local.get({ defaultSize:"large", position:"right" });
  size.value = settings.defaultSize;
  position.value = settings.position;
  for (const control of [size,position]) control.addEventListener("change",async () => {
    try { await api.storage.local.set({ defaultSize:size.value, position:position.value }); saved.textContent = "Settings saved"; }
    catch { saved.textContent = "Could not save settings. Please try again."; }
  });
}
init().catch(() => { saved.textContent = "Could not load settings."; });
