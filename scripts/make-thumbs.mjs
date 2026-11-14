// Thumbnails of the chapters' first opening scene for the course map (src/components/test/map/), test mode pilot.
// Opens every chapter of a grade on the BUILT site, lets its first scene settle on its end frame (the reduced-motion
// path of src/components/intro/scene.ts, which shows the scene's outcome), screenshots the scene's picture in the
// dark and the light theme and saves WebP images 480 px wide, each at most MAX_BYTES (quality lowered until it fits).
// A chapter whose page has no opening scene gets no file; the map shows a neutral fallback for it.
//
// Usage (the site built and served first):
//   export PATH=/storage/arsenii/ig_webpage/tools/node/bin:$PATH
//   python3 -m http.server 4602 --bind 127.0.0.1 --directory dist &
//   PLAYWRIGHT_BROWSERS_PATH=/storage/arsenii/ig_webpage/tools/ms-playwright node scripts/make-thumbs.mjs \
//     [--base http://127.0.0.1:4602] [--grade 8-klass] [--only slug1,slug2]
// Playwright is not a dependency of the site: it is loaded from PLAYWRIGHT_DIR
// (default /storage/arsenii/ig_webpage/tools/shots/node_modules/playwright). sharp comes from the site's node_modules.
import { createRequire } from 'node:module';
import { readdirSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, dflt) => {
	const i = process.argv.indexOf(`--${name}`);
	return i > 0 ? process.argv[i + 1] : dflt;
};
const BASE = arg('base', 'http://127.0.0.1:4602').replace(/\/$/, '');
const GRADE = arg('grade', '8-klass');
const ONLY = arg('only', '')?.split(',').filter(Boolean) ?? [];
const OUT = join(ROOT, 'src/components/test/map/thumbs');
const WIDTH = 480;
const HEIGHT = 320; // the scenes are 360 × 240
const MAX_BYTES = 25 * 1024;
// Scenes whose end frame shows too little (the puddle has dried up, the spark is over, the car is back on the heap):
// the moment to take instead, in seconds after the scene starts (its PRE of 0,5 s included), played on a fake clock.
const MOMENT = {
	vlazhnost: 0.5 + 0.35 * 7, // the asphalt half dry, the puddle still there
	elektrizaciya: 0.5 + 0.405 * 5, // the spark between the finger and the handle
	elektromagnity: 0.5 + 0.55 * 8, // the car carried by the electromagnet
};

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_DIR ?? '/storage/arsenii/ig_webpage/tools/shots/node_modules/playwright');

// every chapter of the grade: src/content/docs/uchebnik/<grade>/<section>/<slug>.mdx
const docs = join(ROOT, 'src/content/docs/uchebnik', GRADE);
const chapters = readdirSync(docs)
	.filter((d) => statSync(join(docs, d)).isDirectory())
	.flatMap((d) =>
		readdirSync(join(docs, d))
			.filter((f) => f.endsWith('.mdx'))
			.map((f) => ({ slug: f.replace(/\.mdx$/, ''), path: `/uchebnik/${GRADE}/${d}/${f.replace(/\.mdx$/, '')}/` })),
	)
	.filter((c) => !ONLY.length || ONLY.includes(c.slug));

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const report = [];
for (const theme of ['dark', 'light']) {
	const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
	await ctx.addInitScript((t) => {
		localStorage.setItem('starlight-theme', t === 'dark' ? '' : t);
		// the site makes every animation play (src/plugins/motion.mjs replaces matchMedia); keep the browser's own,
		// so that the scenes take their reduced-motion path and draw their end frame
		const native = window.matchMedia.bind(window);
		const mm = (q) => (window.__igMotion && /prefers-reduced-motion/.test(q) ? { matches: /no-preference/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : native(q));
		Object.defineProperty(window, 'matchMedia', { value: mm, writable: false, configurable: false });
		window.goatcounter = { count: () => {} };
	}, theme);
	for (const ch of chapters) {
		const page = await ctx.newPage();
		await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
		const moment = MOMENT[ch.slug];
		if (moment !== undefined) {
			// play the scene itself (not its reduced-motion end frame) on a fake clock up to the chosen moment
			await page.addInitScript(() => (window.__igMotion = true));
			await page.clock.install();
		}
		await page.goto(`${BASE}${ch.path}`, { waitUntil: 'load' });
		const svg = page.locator('.sl-markdown-content .intro .intro__card .intro__svg').first();
		if (!(await svg.count())) {
			report.push(`${ch.slug} ${theme}: no opening scene (fallback)`);
			await page.close();
			continue;
		}
		await svg.scrollIntoViewIfNeeded();
		await page.evaluate(() => document.fonts.ready);
		if (moment !== undefined) {
			await page.waitForTimeout(300); // the scene's IntersectionObserver wakes it
			await page.clock.runFor(Math.round(moment * 1000));
		} else await page.waitForTimeout(1500);
		const png = await svg.screenshot({ animations: 'disabled' });
		await page.close();
		let q = 82;
		let webp;
		do {
			webp = await sharp(png).resize({ width: WIDTH, height: HEIGHT, fit: 'cover' }).webp({ quality: q, effort: 6 }).toBuffer();
			q -= 4;
		} while (webp.length > MAX_BYTES && q > 30);
		const meta = await sharp(webp).metadata();
		const file = join(OUT, `${ch.slug}-${theme}.webp`);
		writeFileSync(file, webp);
		report.push(`${ch.slug} ${theme}: ${meta.width}x${meta.height}, ${(webp.length / 1024).toFixed(1)} KB, q=${q + 4}${moment !== undefined ? `, at ${moment.toFixed(2)} s` : ', end frame'}`);
	}
	await ctx.close();
}
await browser.close();
console.log(report.join('\n'));
