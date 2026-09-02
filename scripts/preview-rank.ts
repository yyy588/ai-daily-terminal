import { sortByScore } from '../src/lib/scoring';
import { loadSiteData, SOURCE_NAMES } from '../src/lib/site';
const data = loadSiteData();
const today = data.digests[0];
const top = sortByScore(today.entries, Date.now()).slice(0, 10);
console.log("=== " + today.date + " mixed Top 10 ===");
top.forEach((e: any, i: number) => console.log(String(i + 1).padStart(2, "0"), "s:" + e.score.toFixed(2), e.sources.map((s: string) => SOURCE_NAMES[s] ?? s).join("+").padEnd(9), e.title.slice(0, 30)));
