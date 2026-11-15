const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { JSDOM } = require("jsdom");
test("English settings save preferences and credit Reza Nemati", async () => {
  const html = fs.readFileSync(require.resolve("../options.html"),"utf8");
  const dom = new JSDOM(html,{ runScripts:"outside-only" });
  try {
    let saved;
    dom.window.chrome = { runtime:{getManifest:() => ({version:"9.8.7"})}, storage:{ local:{ get:async () => ({defaultSize:"large",position:"right"}),set:async value => {saved=value;} } } };
    dom.window.eval(fs.readFileSync(require.resolve("../options.js"),"utf8"));
    await new Promise(resolve => setTimeout(resolve,5));
    const document = dom.window.document;
    assert.equal(document.documentElement.lang,"en");
    assert.equal(document.getElementById("version").textContent,"v9.8.7");
    assert.equal(document.querySelector(".project-link").href,"https://mr-shady.github.io/google-image-assist/");
    assert.equal(/[\u0600-\u06ff]/.test(document.body.textContent),false);
    const credit = [...document.querySelectorAll("a")].find(a => a.textContent === "Reza Nemati");
    assert.equal(credit.href,"https://reza-nemati.ir/");
    document.getElementById("size").value="medium";
    document.getElementById("size").dispatchEvent(new dom.window.Event("change"));
    await new Promise(resolve => setTimeout(resolve,5));
    assert.equal(saved.defaultSize,"medium");
    assert.equal(document.getElementById("saved").textContent,"Settings saved");
  } finally { dom.window.close(); }
});
