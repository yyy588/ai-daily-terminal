import { sortByScore } from "../src/lib/scoring";
import newsJson from "../src/data/news.json" with { type: "json" };
const now = Date.now();
const weekEntries = newsJson.digests.flatMap(g=>g.entries).filter(e => now - Date.parse(e.pubDate) <= 7*86400000);
const scored = sortByScore(weekEntries, now, 48, true);
console.log("去权重后前12（名次/分/发布日/源）:");
scored.slice(0,12).forEach((e,i)=>console.log(" ", String(i+1).padStart(2), e.score.toFixed(2), e.pubDate.slice(5,16), e.sources.join("+"), e.title.slice(0,18)));
console.log("第11-20发布日:", scored.slice(10,20).map(e=>e.pubDate.slice(5,10)).join(","));
console.log("共报条目数:", weekEntries.filter(e=>e.sources.length>1).length);
