/* Shared pure helpers; also exercised in tests. */
globalThis.GID = (() => {
  function googleSearch(value) {
    try { const u = new URL(value); return /(^|\.)google\.com$/.test(u.hostname) && u.pathname === "/search"; } catch { return false; }
  }
  function originalURL(value) {
    try {
      const u = new URL(value);
      if (!["https:", "http:"].includes(u.protocol) || u.username || u.password) return null;
      if (/(^|\.)(gstatic\.com|googleusercontent\.com)$/.test(u.hostname) && /(?:encrypted-tbn|\/images|\/image)/i.test(u.href)) return null;
      if (/(^|\.)google\.com$/.test(u.hostname) && /\/(?:images|imgres|search)/.test(u.pathname)) return null;
      return u.href;
    } catch { return null; }
  }
  function filteredURL(value, size) {
    if (!googleSearch(value) || !["large", "medium", "icon"].includes(size)) return null;
    const u = new URL(value);
    if (u.searchParams.get("udm") !== "2" && u.searchParams.get("tbm") !== "isch") return null;
    const tbs = u.searchParams.get("tbs") || "";
    if (u.searchParams.has("isz") || /(?:^|,)isz:/.test(tbs)) return null;
    u.searchParams.set("tbs", [tbs, `isz:${{ large: "l", medium: "m", icon: "i" }[size]}`].filter(Boolean).join(","));
    return u.href;
  }
  function metadata(b, mime = "") {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const text = (s,n) => String.fromCharCode(...b.subarray(s,s+n));
    let format = null, width = 0, height = 0;
    if (b.length >= 24 && text(0,8) === "\x89PNG\r\n\x1a\n") { format = "PNG"; width = v.getUint32(16); height = v.getUint32(20); }
    else if (b.length >= 10 && /^GIF8[79]a$/.test(text(0,6))) { format = "GIF"; width = v.getUint16(6,true); height = v.getUint16(8,true); }
    else if (b.length >= 4 && b[0] === 255 && b[1] === 216) {
      format = "JPG";
      let i = 2;
      while (i + 8 < b.length) {
        if (b[i++] !== 255) continue;
        while (b[i] === 255) i++;
        const marker = b[i++];
        if (marker === 218 || marker === 217) break;
        if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
        if (i + 2 > b.length) break;
        const length = v.getUint16(i);
        if (length < 2 || i + length > b.length) break;
        if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) { height = v.getUint16(i+3); width = v.getUint16(i+5); break; }
        i += length;
      }
    } else if (b.length >= 30 && text(0,4) === "RIFF" && text(8,4) === "WEBP") {
      format = "WEBP";
      if (text(12,4) === "VP8X") { width = 1+b[24]+(b[25]<<8)+(b[26]<<16); height = 1+b[27]+(b[28]<<8)+(b[29]<<16); }
      else if (text(12,4) === "VP8 ") { width = v.getUint16(26,true)&16383; height = v.getUint16(28,true)&16383; }
      else if (text(12,4) === "VP8L") { const bits = v.getUint32(21,true); width = (bits&16383)+1; height = ((bits>>>14)&16383)+1; }
    } else if (b.length >= 26 && text(0,2) === "BM") { format = "BMP"; width = Math.abs(v.getInt32(18,true)); height = Math.abs(v.getInt32(22,true)); }
    else if (b.length >= 16 && text(4,4) === "ftyp" && /avif|avis/.test(text(8,Math.min(32,b.length-8)))) format = "AVIF";
    else if (/^image\/svg\+xml\b/i.test(mime) && /<svg[\s>]/i.test(new TextDecoder().decode(b.subarray(0,4096)))) format = "SVG";
    else if (b.length >= 8 && text(0,4) === "\0\0\x01\0") format = "ICO";
    return { format, width, height };
  }
  function filename(value, format) {
    const ext = String(format || "").toLowerCase();
    let name = "google-image";
    try { name = decodeURIComponent(new URL(value).pathname.split("/").pop()) || name; } catch {}
    name = name.replace(/[<>:"/\\|?*\x00-\x1f]/g,"_").replace(/[. ]+$/g,"").slice(0,140);
    if (!name || /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(name)) name = "google-image";
    if (/^(jpg|png|webp|gif|avif|bmp|svg|ico)$/.test(ext)) name = name.replace(/\.[a-z0-9]{1,5}$/i, "") + "." + ext;
    return name;
  }
  function imageKey(value) {
    const original = originalURL(value);
    if (!original) return null;
    const url = new URL(original);
    url.hash = "";
    return url.href;
  }
  return { googleSearch, originalURL, filteredURL, metadata, filename, imageKey };
})();
