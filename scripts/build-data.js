// Downloads Vienna's official drinking-fountain dataset (Stadt Wien Open Data, CC BY 4.0)
// and writes a compact fountains.json for the site. Run by the GitHub Action daily.
const fs = require("fs");

const SRC =
  "https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0" +
  "&typeName=ogdwien:TRINKBRUNNENOGD&srsName=EPSG:4326&outputFormat=json";

(async () => {
  const r = await fetch(SRC, { headers: { "User-Agent": "wien-wasser (github.com/Evanhodson/wien-wasser)" } });
  if (!r.ok) throw new Error("Upstream " + r.status);
  const gj = await r.json();

  const types = {};
  const fountains = [];
  for (const f of gj.features || []) {
    const p = f.properties || {};
    const type = (p.BASIS_TYP_TXT || "").trim();
    types[type] = (types[type] || 0) + 1;
    if (/zier/i.test(type)) continue; // decorative fountains aren't for drinking
    const c = f.geometry && f.geometry.coordinates;
    if (!c || c.length < 2) continue;
    fountains.push({ id: p.OBJECTID, lat: +c[1].toFixed(6), lon: +c[0].toFixed(6), type });
  }
  if (fountains.length < 100) throw new Error("Suspiciously few fountains: " + fountains.length);

  fs.mkdirSync("_site", { recursive: true });
  fs.writeFileSync("_site/fountains.json",
    JSON.stringify({ updated: new Date().toISOString(), count: fountains.length, types, fountains }));
  console.log("Types:", types);
  console.log("Kept", fountains.length, "of", (gj.features || []).length);
})().catch(e => { console.error(e); process.exit(1); });
