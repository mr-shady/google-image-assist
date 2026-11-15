const { test } = require("node:test");
const assert = require("node:assert/strict");
require("../shared.js");
const G = globalThis.GID;

test("size filter preserves other tools and explicit size choices", () => {
  const url = "https://www.google.com/search?q=cat&udm=2&tbs=ic:trans";
  const filtered = new URL(G.filteredURL(url,"large"));
  assert.equal(filtered.searchParams.get("tbs"),"ic:trans,isz:l");
  assert.equal(G.filteredURL(filtered.href,"medium"),null);
  for (const value of ["isz:m","isz:lt,islt:4mp","ic:gray,isz:ex,iszw:800,iszh:600"]) {
    assert.equal(G.filteredURL(`https://www.google.com/search?tbm=isch&tbs=${value}`,"large"),null);
  }
  assert.equal(G.filteredURL(url,"none"),null);
  assert.equal(G.filteredURL("https://www.google.com/search?q=cat","large"),null);
  assert.equal(G.filteredURL("https://notgoogle.com/search?udm=2","large"),null);
  assert.equal(G.filteredURL(url+"&isz=lt","large"),null);
});
test("thumbnail URLs never qualify as originals regardless of image size", () => {
  for (const url of ["https://encrypted-tbn0.gstatic.com/images?q=tbn:abc&s=1000","https://www.google.com/images?q=foo","data:image/png;base64,123","javascript:alert(1)",null]) assert.equal(G.originalURL(url),null);
  assert.equal(G.originalURL("https://example.org/tiny.png"),"https://example.org/tiny.png");
});
test("real file signatures determine format and dimensions, not filename or MIME guesses", () => {
  const png = Buffer.alloc(24); Buffer.from("89504e470d0a1a0a","hex").copy(png); png.writeUInt32BE(1920,16); png.writeUInt32BE(1080,20);
  assert.deepEqual(G.metadata(png,"image/jpeg"),{ format:"PNG",width:1920,height:1080 });
  const gif = Buffer.from("47494638396120001000","hex");
  assert.deepEqual(G.metadata(gif),{ format:"GIF",width:32,height:16 });
  const jpeg = Buffer.from("ffd8ffe000040000ffc200110801e0032003011100021100031100ffd9","hex");
  assert.deepEqual(G.metadata(jpeg),{ format:"JPG",width:800,height:480 });
  const webp = Buffer.alloc(30); webp.write("RIFF",0); webp.write("WEBP",8); webp.write("VP8X",12); webp[24]=127; webp[27]=63;
  assert.deepEqual(G.metadata(webp),{ format:"WEBP",width:128,height:64 });
  assert.equal(G.metadata(Buffer.from("<html>403 forbidden</html>"),"image/jpeg").format,null);
  assert.equal(G.metadata(Buffer.from("<svg viewBox='0 0 32 32'></svg>"),"image/svg+xml").format,"SVG");
  for (let i=0;i<32;i++) assert.doesNotThrow(() => G.metadata(Buffer.alloc(i)));
});
test("filenames use verified format and remove unsafe characters", () => {
  assert.equal(G.filename("https://example.org/image.jpg","WEBP"),"image.webp");
  assert.equal(G.filename("https://example.org/a%3Ab%3F.png","PNG"),"a_b_.png");
  assert.equal(G.filename("https://example.org/CON","PNG"),"google-image.png");
});
