const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const shared = fs.readFileSync(require.resolve("../shared.js"),"utf8");
const background = fs.readFileSync(require.resolve("../background.js"),"utf8");
function setup(fetch,download = async () => 123,{ search=async () => [], tabs=[] } = {}) {
  let receive, changed;
  const notifications = [];
  const sandbox = {
    URL,Uint8Array,DataView,TextDecoder,AbortController,Blob,setTimeout,clearTimeout,fetch,
    chrome:{
      runtime:{ onMessage:{ addListener(fn) { receive=fn; } },onInstalled:{ addListener() {} } },
      downloads:{ download, search, onChanged:{ addListener(fn) { changed=fn; } } },
      tabs:{ query:async () => tabs, sendMessage:async (id,msg) => { notifications.push({id,...msg}); } },
      contextMenus:{ onClicked:{ addListener() {} } }
    }
  };
  vm.createContext(sandbox); vm.runInContext(shared,sandbox); vm.runInContext(background,sandbox);
  const sender = { tab:{ id:1 },url:"https://www.google.com/search?udm=2" };
  return {
    message:msg => new Promise(resolve => { const async = receive(msg,sender,resolve); if (!async) resolve(undefined); }),
    receive, notifications,
    change:async delta => { changed(delta); await new Promise(resolve => setTimeout(resolve,10)); }
  };
}
function png() {
  const b = Buffer.alloc(24); Buffer.from("89504e470d0a1a0a","hex").copy(b); b.writeUInt32BE(1920,16); b.writeUInt32BE(1080,20); return b;
}
test("background measures actual response bytes even when Content-Length lies, with caching",async () => {
  let count = 0;
  const s = setup(async () => {
    count++;
    return { ok:true,url:"https://example.org/original",headers:new Headers({ "content-type":"image/jpeg","content-length":"999999" }),body:new Response(png()).body };
  });
  const first = await s.message({ type:"gid:inspect",url:"https://example.org/original" });
  assert.equal(first.ok,true); assert.equal(first.info.bytes,24); assert.equal(first.info.format,"PNG"); assert.equal(first.info.width,1920);
  await s.message({ type:"gid:inspect",url:"https://example.org/original" });
  assert.equal(count,1);
});
test("HTML/error responses do not become image metadata",async () => {
  const s = setup(async () => ({ ok:true,url:"https://example.org/error.jpg",headers:new Headers({ "content-type":"text/html" }),body:new Response("<html>access denied</html>").body }));
  const result = await s.message({ type:"gid:inspect",url:"https://example.org/error.jpg" });
  assert.equal(result.ok,false);
});
test("cancelled save dialogs never trigger a second silent download",async () => {
  let count = 0;
  const s = setup(null,async options => { count++; assert.equal(options.saveAs,true); throw new Error("User canceled"); });
  const result = await s.message({ type:"gid:download-full",url:"https://example.org/original",format:"PNG" });
  assert.equal(result.ok,false); assert.equal(count,1);
});
test("rejects thumbnail downloads and messages from unrelated pages",async () => {
  let count = 0;
  const s = setup(null,async () => { count++; });
  assert.equal((await s.message({ type:"gid:download-full",url:"https://encrypted-tbn0.gstatic.com/images?q=foo" })).ok,false);
  assert.equal(s.receive({ type:"gid:inspect",url:"https://example.org/x" },{ tab:{ id:1 },url:"https://example.org/" },() => {}),undefined);
  assert.equal(count,0);
});
test("recent history matches completed original or redirect URL, not a similar filename or URL", async () => {
  const url = "https://example.org/original.png";
  const recent = new Date().toISOString();
  let items = [{url:url+"-different",filename:url,state:"complete",startTime:recent}];
  const queries = [];
  const s = setup(null,undefined,{search:async query => { queries.push(query); return items; }});
  assert.equal((await s.message({type:"gid:download-status",url})).downloaded,false);
  items = [{url:"https://example.org/redirect",finalUrl:url,state:"complete",startTime:recent}];
  assert.equal((await s.message({type:"gid:download-status",url})).downloaded,true);
  items = [{url,state:"interrupted",startTime:recent}];
  assert.equal((await s.message({type:"gid:download-status",url})).downloaded,false);
  items = [{url,state:"complete",startTime:new Date(Date.now()-31*86400000).toISOString()}];
  assert.equal((await s.message({type:"gid:download-status",url})).downloaded,false);
  assert.equal(queries[0].state,"complete");
  assert.equal(queries[0].query[0],url);
  assert.ok(Date.parse(queries[0].startedAfter) > Date.now()-31*86400000);
});
test("download completion notifies Google image tabs; interrupted downloads do not", async () => {
  const url = "https://example.org/original.png";
  let searches=0;
  const s = setup(null,undefined,{tabs:[{id:9},{id:10}],search:async query => {
    searches++; assert.equal(query.id,42);
    return [{url,finalUrl:url,state:"complete",startTime:new Date().toISOString()}];
  }});
  await s.change({id:42,state:{current:"interrupted"}});
  assert.equal(searches,0);
  assert.equal(s.notifications.length,0);
  await s.change({id:42,state:{current:"complete"}});
  assert.equal(s.notifications.length,2);
  assert.equal(s.notifications[0].type,"gid:download-complete");
  assert.equal(s.notifications[0].urls[0],url);
});
