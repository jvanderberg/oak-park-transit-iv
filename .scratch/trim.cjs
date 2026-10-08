const fs=require("fs");
const B={s:41.872,n:41.906,w:-87.812,e:-87.762};
const inB=(lat,lon)=>lat>=B.s&&lat<=B.n&&lon>=B.w&&lon<=B.e;
const stopsRaw=JSON.parse(fs.readFileSync("data/overpass_raw.json","utf8")).elements;
const stops=stopsRaw.filter(e=>e.type==="node"&&inB(e.lat,e.lon)&&(e.tags?.highway==="bus_stop"||e.tags?.railway||e.tags?.station)).map(e=>({id:e.id,lat:+e.lat.toFixed(6),lon:+e.lon.toFixed(6),name:e.tags.name||e.tags.ref||"",kind:e.tags.station==="subway"||e.tags.railway==="station"?"rail":"bus",routes:[]}));
const rels=JSON.parse(fs.readFileSync("data/overpass_routes_geom.json","utf8")).elements;
const routes=[];
for(const r of rels){
  const t=r.tags||{};
  const segs=[];
  for(const m of r.members||[]){
    if(m.type!=="way"||!m.geometry)continue;
    const pts=m.geometry.map(p=>[+p.lat.toFixed(6),+p.lon.toFixed(6)]);
    if(!pts.some(([a,b])=>inB(a,b)))continue;
    segs.push(pts);
  }
  if(!segs.length)continue;
  routes.push({id:r.id,mode:t.route,ref:t.ref||"",name:t.name||"",from:t.from||"",to:t.to||"",color:t.colour||"",segments:segs});
}
// dedupe-ish: keep all; drop routes whose ref is empty but mode train handled
const out={source:"OpenStreetMap contributors via Overpass API",bbox:B,stops,routes};
fs.writeFileSync("data/oak_park_transit.json",JSON.stringify(out));
console.log("stops",stops.length,"kinds",stops.filter(s=>s.kind==="rail").length,"routes",routes.length,"segs",routes.reduce((a,r)=>a+r.segments.length,0));
console.log([...new Set(routes.map(r=>r.mode+" "+r.ref))].join(", "));
