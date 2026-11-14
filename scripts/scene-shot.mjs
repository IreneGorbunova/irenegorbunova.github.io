// Shared by scripts/make-thumbs.mjs and scripts/make-share.mjs: a picture of a chapter from the BUILT site.
// It is the chapter's first opening scene on its end frame (the reduced-motion path of src/components/intro/scene.ts,
// which shows the scene's outcome), or, for a chapter without an opening scene, the largest drawing of its first
// model as the page shows it at first. Playwright is not a dependency of the site: it is loaded from PLAYWRIGHT_DIR
// (default /storage/arsenii/ig_webpage/tools/shots/node_modules/playwright).
import { createRequire } from 'node:module';
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
export const { chromium } = require(process.env.PLAYWRIGHT_DIR ?? '/storage/arsenii/ig_webpage/tools/shots/node_modules/playwright');

export const arg = (name, dflt) => {
	const i = process.argv.indexOf(`--${name}`);
	return i > 0 ? process.argv[i + 1] : dflt;
};

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

/** Every chapter of a grade («8-klass») or of all grades («all»): { slug, grade, section, path }. */
export const chaptersOf = (grade = 'all', only = []) => {
	const uch = join(ROOT, 'src/content/docs/uchebnik');
	const grades = grade === 'all' ? readdirSync(uch).filter((d) => /^\d+-klass$/.test(d)) : [grade];
	return grades
		.flatMap((g) =>
			readdirSync(join(uch, g))
				.filter((d) => statSync(join(uch, g, d)).isDirectory())
				.flatMap((d) =>
					readdirSync(join(uch, g, d))
						.filter((f) => f.endsWith('.mdx'))
						.map((f) => ({ slug: f.replace(/\.mdx$/, ''), grade: g, section: d, path: `/uchebnik/${g}/${d}/${f.replace(/\.mdx$/, '')}/` })),
				),
		)
		.filter((c) => !only.length || only.includes(c.slug));
};

/** A browser context that shows the site in a theme, with reduced motion and without the visit counter. */
export const themedContext = async (browser, theme, { width = 1280, height = 900, scale = 2, test = false } = {}) => {
	const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, reducedMotion: 'reduce' });
	await ctx.addInitScript(
		([t, test]) => {
			localStorage.setItem('starlight-theme', t === 'dark' ? '' : t);
			if (test) localStorage.setItem('ig:test', '1');
			// the site makes every animation play (src/plugins/motion.mjs replaces matchMedia); keep the browser's own,
			// so that the scenes take their reduced-motion path and draw their end frame
			const native = window.matchMedia.bind(window);
			const mm = (q) => (window.__igMotion && /prefers-reduced-motion/.test(q) ? { matches: /no-preference/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : native(q));
			Object.defineProperty(window, 'matchMedia', { value: mm, writable: false, configurable: false });
			window.goatcounter = { count: () => {} };
		},
		[theme, test],
	);
	return ctx;
};

/**
 * Opens the chapter and takes its picture. Returns { png, rgb, what, page } or null (no scene and no model):
 * `png` the picture, `rgb` the background a model's drawing stands on (null for a scene, which fills its frame),
 * `what` a word for the report. The page is left open for the caller (who closes it).
 */
export const sceneShot = async (ctx, base, ch) => {
	const page = await ctx.newPage();
	await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
	const moment = MOMENT[ch.slug];
	if (moment !== undefined) {
		// play the scene itself (not its reduced-motion end frame) on a fake clock up to the chosen moment
		await page.addInitScript(() => (window.__igMotion = true));
		await page.clock.install();
	}
	await page.goto(`${base}${ch.path}`, { waitUntil: 'load' });
	let el = page.locator('.sl-markdown-content .intro .intro__card .intro__svg').first();
	let what = moment !== undefined ? `scene at ${moment.toFixed(2)} s` : 'scene, end frame';
	let model = false;
	if (!(await el.count())) {
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
		if (!mark) return { png: null, rgb: null, what: 'no opening scene and no model', page };
		el = page.locator('[data-thumb-src]').first();
		what = 'first model';
		model = true;
	}
	await el.scrollIntoViewIfNeeded();
	await page.evaluate(() => document.fonts.ready);
	// «Запустить анимацию» shows only because the script asks for reduced motion
	await page.addStyleTag({ content: '.fe-lab__play{display:none!important}' });
	if (moment !== undefined) {
		await page.waitForTimeout(300); // the scene's IntersectionObserver wakes it
		await page.clock.runFor(Math.round(moment * 1000));
	} else await page.waitForTimeout(1500);
	// a model's drawing is not 3 : 2: it is shown whole, on the background it stands on
	const bg = model
		? await el.evaluate((e) => {
				for (let x = e; x; x = x.parentElement) {
					const c = getComputedStyle(x).backgroundColor;
					if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;
				}
				return 'rgb(16, 18, 36)';
			})
		: '';
	const rgb = bg ? bg.match(/[\d.]+/g).slice(0, 3).map(Number) : null;
	let png = await el.screenshot({ animations: 'disabled' });
	if (rgb) {
		// a model's drawing often stands in a wide empty frame: the empty margins go, a small one comes back
		try {
			const cut = await sharp(png).trim({ background: { r: rgb[0], g: rgb[1], b: rgb[2] }, threshold: 14 }).toBuffer({ resolveWithObject: true });
			const pad = Math.round(Math.max(cut.info.width, cut.info.height) * 0.06);
			png = await sharp(cut.data).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: rgb[0], g: rgb[1], b: rgb[2] } }).png().toBuffer();
		} catch {
			/* nothing to trim */
		}
	}
	return { png, rgb, what, page };
};
