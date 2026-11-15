import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root,"manifest.json"),"utf8"));
const files = ["shared.js","ui-icons.js","LICENSE","THIRD_PARTY.md","background.js","content.js","options.html","options.css","options.js","icon16.png","icon32.png","icon48.png","icon128.png"];
for (const browser of ["chrome","firefox"]) {
  const dest = path.join(root,"dist",browser);
  await mkdir(dest,{ recursive:true });
  for (const file of files) await copyFile(path.join(root,file),path.join(dest,file));
  const output = structuredClone(manifest);
  if (browser === "firefox") {
    output.background = { scripts:["shared.js","background.js"] };
    output.browser_specific_settings = { gecko:{ id:"google-images-original@local.extension", strict_min_version:"142.0", data_collection_permissions:{ required:["none"] } } };
  }
  await writeFile(path.join(dest,"manifest.json"),JSON.stringify(output,null,2)+"\n");
}
console.log("Built dist/chrome and dist/firefox");
const assets = path.join(root,"docs","assets");
await mkdir(path.join(assets,"extension"),{recursive:true});
for (const file of ["shared.js","ui-icons.js","content.js"]) await copyFile(path.join(root,file),path.join(assets,"extension",file));
await copyFile(path.join(root,"icon128.png"),path.join(assets,"icon.png"));
await copyFile(path.join(root,"store","landscape.svg"),path.join(assets,"landscape.svg"));
for (const [file,target] of [["01-original-image.png","original.png"],["02-preferences.png","preferences.png"],["03-download-again.png","download-again.png"]]) await copyFile(path.join(root,"store",file),path.join(assets,target));
await writeFile(path.join(root,"docs","version.json"),JSON.stringify({version:manifest.version})+"\n");
