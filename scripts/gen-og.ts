/**
 * 生成 OG 分享卡（1200×630 PNG）到 public/og-card.png。
 * 用 sharp 从 SVG 渲染——静态站名卡，一次生成终身用（标题变化留给 og:description）。
 * 运行：npx tsx scripts/gen-og.ts（仅素材变更时手动跑，不进 CI）
 */
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#17181c"/>
  <rect x="0" y="0" width="1200" height="8" fill="#0e7a6c"/>
  <text x="80" y="200" font-family="Consolas, 'Courier New', monospace" font-size="34" fill="#35c2ad">// DAILY_AI_TERMINAL</text>
  <text x="76" y="320" font-family="'Noto Sans SC', sans-serif" font-size="88" font-weight="700" fill="#f7f6f2">每日 AI 要闻</text>
  <text x="80" y="420" font-family="'Noto Sans SC', sans-serif" font-size="40" fill="#9a9aa8">三源聚合 · 新锐榜 · 模型选型</text>
  <text x="80" y="540" font-family="Consolas, monospace" font-size="28" fill="#63636f">yyy588.github.io/ai-daily-terminal</text>
  <rect x="1020" y="480" width="100" height="100" rx="16" fill="#0e7a6c"/>
  <text x="1070" y="548" font-family="Consolas, monospace" font-size="52" font-weight="700" fill="#f7f6f2" text-anchor="middle">//</text>
</svg>`;

async function main(): Promise<void> {
  const png = await sharp(Buffer.from(SVG)).png().toBuffer();
  await writeFile('public/og-card.png', png);
  console.log(`// OG 卡生成: public/og-card.png (${(png.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error('// FATAL:', err);
  process.exit(1);
});
