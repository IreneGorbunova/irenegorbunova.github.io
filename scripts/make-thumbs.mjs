// Thumbnails of the chapters' first opening scene for the course map (src/components/test/map/), test mode pilot.
// Opens every chapter of a grade on the BUILT site, lets its first scene settle on its end frame (the reduced-motion
// path of src/components/intro/scene.ts, which shows the scene's outcome), screenshots the scene's picture in the
// dark and the light theme and saves WebP images 480 px wide, each at most MAX_BYTES (quality lowered until it fits).
// A chapter whose page has no opening scene gets the picture of its first model instead (its largest drawing, as the
// page shows it at first); a chapter with neither gets no file, and the map shows a neutral fallback for it.
//
// Usage (the site built and served first):
//   export PATH=/storage/arsenii/ig_webpage/tools/node/bin:$PATH
//   python3 -m http.server 4602 --bind 127.0.0.1 --directory dist &
//   PLAYWRIGHT_BROWSERS_PATH=/storage/arsenii/ig_webpage/tools/ms-playwright node scripts/make-thumbs.mjs \
//     [--base http://127.0.0.1:4602] [--grade 8-klass | all] [--only slug1,slug2]
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

// A chapter without an opening scene whose first model makes a poor picture: the drawing to take instead.
const PICK = {
	'zakon-sohraneniya-energii': '.jl__svg', // Joule's apparatus
};

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_DIR ?? '/storage/arsenii/ig_webpage/tools/shots/node_modules/playwright');

// every chapter of the grade (or of all grades): src/content/docs/uchebnik/<grade>/<section>/<slug>.mdx
const uch = join(ROOT, 'src/content/docs/uchebnik');
const grades = GRADE === 'all' ? readdirSync(uch).filter((d) => /^\d+-klass$/.test(d)) : [GRADE];
const chapters = grades
	.flatMap((g) =>
		readdirSync(join(uch, g))
			.filter((d) => statSync(join(uch, g, d)).isDirectory())
			.flatMap((d) =>
				readdirSync(join(uch, g, d))
					.filter((f) => f.endsWith('.mdx'))
					.map((f) => ({ slug: f.replace(/\.mdx$/, ''), path: `/uchebnik/${g}/${d}/${f.replace(/\.mdx$/, '')}/` })),
			),
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
		let svg = page.locator('.sl-markdown-content .intro .intro__card .intro__svg').first();
		let what = '';
		if (!(await svg.count())) {
			// no opening scene: the largest drawing of the first model
			const mark = await page.evaluate((pick) => {
				const own = pick && document.querySelector(`.sl-markdown-content ${pick}`);
				if (own) {
					own.setAttribute('data-thumb-src', '');
					return true;
				}
				for (const f of document.querySelectorAll('.sl-markdown-content figure.not-content')) {
					if (f.closest('details') || !f.querySelector('button, input, select')) continue;
					const g = [...f.querySelectorAll('svg, canvas')]
						.map((e) => ({ e, r: e.getBoundingClientRect() }))
						.filter((x) => x.r.width >= 240 && x.r.height >= 140)
						.sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0];
					if (g) {
						g.e.setAttribute('data-thumb-src', '');
						return true;
					}
				}
				return false;
			}, PICK[ch.slug] ?? '');
			if (mark) {
				svg = page.locator('[data-thumb-src]').first();
				what = ', first model';
			}
		}
		if (!(await svg.count())) {
			report.push(`${ch.slug} ${theme}: no opening scene and no model (fallback)`);
			await page.close();
			continue;
		}
		await svg.scrollIntoViewIfNeeded();
		await page.evaluate(() => document.fonts.ready);
		// a model's drawing is not 3 : 2: it is shown whole, on the background it stands on; «Запустить анимацию»
		// (shown only because the script asks for reduced motion) is hidden
		await page.addStyleTag({ content: '.fe-lab__play{display:none!important}' });
		const bg = what
			? await svg.evaluate((e) => {
					for (let x = e; x; x = x.parentElement) {
						const c = getComputedStyle(x).backgroundColor;
						if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;
					}
					return 'rgb(16, 18, 36)';
				})
			: '';
		const rgb = bg ? bg.match(/[\d.]+/g).slice(0, 3).map(Number) : null;
		if (moment !== undefined) {
			await page.waitForTimeout(300); // the scene's IntersectionObserver wakes it
			await page.clock.runFor(Math.round(moment * 1000));
		} else await page.waitForTimeout(1500);
		const png = await svg.screenshot({ animations: 'disabled' });
		await page.close();
		let q = 82;
		let webp;
		do {
			webp = await sharp(png)
				.resize(rgb ? { width: WIDTH, height: HEIGHT, fit: 'contain', background: { r: rgb[0], g: rgb[1], b: rgb[2] } } : { width: WIDTH, height: HEIGHT, fit: 'cover' })
				.webp({ quality: q, effort: 6 })
				.toBuffer();
			q -= 4;
		} while (webp.length > MAX_BYTES && q > 30);
		const meta = await sharp(webp).metadata();
		const file = join(OUT, `${ch.slug}-${theme}.webp`);
		writeFileSync(file, webp);
		report.push(`${ch.slug} ${theme}: ${meta.width}x${meta.height}, ${(webp.length / 1024).toFixed(1)} KB, q=${q + 4}${moment !== undefined ? `, at ${moment.toFixed(2)} s` : what || ', end frame'}`);
	}
	await ctx.close();
}
await browser.close();
console.log(report.join('\n'));
