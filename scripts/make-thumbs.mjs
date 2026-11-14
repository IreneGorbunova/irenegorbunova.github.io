// Thumbnails of the chapters for the course map (src/components/coursemap/): each chapter's picture
// (scripts/scene-shot.mjs: its first opening scene, or its first model) in the dark and the light theme, saved as
// WebP 480 px wide, each at most MAX_BYTES (quality lowered until it fits). A chapter with neither a scene nor a
// model gets no file; the map shows a neutral fallback for it.
//
// Usage (the site built and served first):
//   export PATH=/storage/arsenii/ig_webpage/tools/node/bin:$PATH
//   python3 -m http.server 4602 --bind 127.0.0.1 --directory dist &
//   PLAYWRIGHT_BROWSERS_PATH=/storage/arsenii/ig_webpage/tools/ms-playwright node scripts/make-thumbs.mjs \
//     [--base http://127.0.0.1:4602] [--grade 8-klass | all] [--only slug1,slug2]
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ROOT, arg, chromium, chaptersOf, themedContext, sceneShot } from './scene-shot.mjs';

const BASE = arg('base', 'http://127.0.0.1:4602').replace(/\/$/, '');
const chapters = chaptersOf(arg('grade', 'all'), arg('only', '')?.split(',').filter(Boolean) ?? []);
const OUT = join(ROOT, 'src/components/coursemap/thumbs');
const WIDTH = 480;
const HEIGHT = 320; // the scenes are 360 × 240
const MAX_BYTES = 25 * 1024;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const report = [];
for (const theme of ['dark', 'light']) {
	const ctx = await themedContext(browser, theme);
	for (const ch of chapters) {
		const { png, rgb, what, page } = await sceneShot(ctx, BASE, ch);
		await page.close();
		if (!png) {
			report.push(`${ch.slug} ${theme}: ${what} (fallback)`);
			continue;
		}
		let q = 82;
		let webp;
		do {
			webp = await sharp(png)
				.resize(rgb ? { width: WIDTH, height: HEIGHT, fit: 'contain', background: { r: rgb[0], g: rgb[1], b: rgb[2] } } : { width: WIDTH, height: HEIGHT, fit: 'cover' })
				.webp({ quality: q, effort: 6 })
				.toBuffer();
			q -= 4;
		} while (webp.length > MAX_BYTES && q > 30);
		writeFileSync(join(OUT, `${ch.slug}-${theme}.webp`), webp);
		report.push(`${ch.slug} ${theme}: ${WIDTH}x${HEIGHT}, ${(webp.length / 1024).toFixed(1)} KB, q=${q + 4}, ${what}`);
	}
	await ctx.close();
}
await browser.close();
console.log(report.join('\n'));
