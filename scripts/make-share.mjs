// Pictures for sharing, made from the BUILT site:
//  1. public/og/<slug>.jpg — the link preview of every chapter (1200 × 630, og:image): the chapter's picture
//     (scripts/scene-shot.mjs: its first opening scene, or its first model) on a card with the grade, the section
//     and the title. public/og/uchebnik.jpg and public/og/home.jpg are the cards of the textbook and of the home page.
//     src/components/Head.astro puts the matching og:image into every page.
//  2. public/konspekt/<slug>.png — «Конспект главы» as a picture (the sheet of src/components/chapter/), for
//     «Сохранить картинкой»; only chapters that have cards.
// Run it again after a chapter's opening scene, title or cards change, then build again.
//
// Usage (the site built and served first):
//   export PATH=/storage/arsenii/ig_webpage/tools/node/bin:$PATH
//   python3 -m http.server 4602 --bind 127.0.0.1 --directory dist &
//   PLAYWRIGHT_BROWSERS_PATH=/storage/arsenii/ig_webpage/tools/ms-playwright node scripts/make-share.mjs \
//     [--base http://127.0.0.1:4602] [--only slug1,slug2] [--what og,konspekt,site]
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ROOT, arg, chromium, chaptersOf, themedContext, sceneShot } from './scene-shot.mjs';

const BASE = arg('base', 'http://127.0.0.1:4602').replace(/\/$/, '');
const ONLY = arg('only', '')?.split(',').filter(Boolean) ?? [];
const WHAT = arg('what', 'og,konspekt,site').split(',');
const chapters = chaptersOf('all', ONLY);
const OG = join(ROOT, 'public/og');
const KON = join(ROOT, 'public/konspekt');
mkdirSync(OG, { recursive: true });
mkdirSync(KON, { recursive: true });
const W = 1200;
const H = 630;
const report = [];

/** The card, drawn over the open page with the site's own fonts and colors. `pics`: data URLs, one or four. */
const drawCard = async (page, { kicker, title, pics, contain, bg }) => {
	await page.evaluate(
		({ kicker, title, pics, contain, bg, W, H }) => {
			document.getElementById('og-card')?.remove();
			const card = document.createElement('div');
			card.id = 'og-card';
			card.innerHTML = `
				<style>
					#og-card { position: fixed; z-index: 99999; left: 0; top: 0; width: ${W}px; height: ${H}px; box-sizing: border-box; overflow: hidden;
						display: grid; grid-template-columns: 1fr 540px; gap: 48px; align-items: center; padding: 56px 60px 56px 64px;
						font-family: Alice, Georgia, serif; color: hsl(40, 30%, 94%);
						background:
							radial-gradient(circle at 8% 14%, hsl(45 100% 85% / .95) 0 1.6px, transparent 2.4px),
							radial-gradient(circle at 21% 80%, hsl(45 100% 85% / .7) 0 1.2px, transparent 2px),
							radial-gradient(circle at 36% 9%, hsl(220 60% 85% / .7) 0 1.1px, transparent 1.9px),
							radial-gradient(circle at 47% 91%, hsl(220 60% 85% / .6) 0 1.3px, transparent 2px),
							radial-gradient(circle at 93% 7%, hsl(45 100% 85% / .8) 0 1.4px, transparent 2.2px),
							radial-gradient(circle at 96% 93%, hsl(220 60% 85% / .6) 0 1.1px, transparent 1.9px),
							radial-gradient(circle at 3% 55%, hsl(220 60% 85% / .5) 0 1px, transparent 1.8px),
							radial-gradient(ellipse at 78% 50%, hsl(42 80% 45% / .2), transparent 62%),
							radial-gradient(ellipse at 20% 30%, hsl(232 60% 22%), hsl(232 55% 8%) 75%); }
					#og-card * { box-sizing: border-box; margin: 0; }
					#og-card .t { display: flex; flex-direction: column; height: 100%; min-width: 0; }
					#og-card .brand { font-family: 'Great Vibes', cursive; font-size: 54px; line-height: 1; color: hsl(42, 90%, 68%); }
					#og-card .kicker { margin-top: 44px; font-size: 22px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: hsl(42, 70%, 70%); }
					#og-card .title { margin-top: 14px; font-size: 68px; line-height: 1.08; color: #fff; text-wrap: balance; overflow-wrap: normal; word-break: keep-all; hyphens: none; }
					#og-card .foot { margin-top: auto; font-size: 24px; color: hsl(230, 25%, 74%); }
					#og-card .pic { position: relative; width: 540px; height: 360px; border-radius: 26px; overflow: hidden; border: 2px solid hsl(42 60% 60% / .55);
						box-shadow: 0 30px 80px hsl(232 70% 3% / .8), 0 0 0 10px hsl(232 50% 14% / .6); background: ${bg || 'hsl(232, 40%, 12%)'}; }
					#og-card .pic img { display: block; width: 100%; height: 100%; object-fit: ${contain ? 'contain' : 'cover'}; }
					#og-card .pic.four { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; height: 366px; background: hsl(232, 45%, 9%); }
					#og-card .pic.four img { object-fit: cover; }
				</style>
				<div class="t">
					<p class="brand">Учебник физики</p>
					<p class="kicker"></p>
					<p class="title"></p>
					<p class="foot">irenegorbunova.github.io</p>
				</div>
				<div class="pic${pics.length > 1 ? ' four' : ''}">${pics.map((p) => `<img src="${p}" alt="">`).join('')}</div>`;
			card.querySelector('.kicker').textContent = kicker;
			const t = card.querySelector('.title');
			t.textContent = title;
			document.body.append(card);
			// the title shrinks until it fits beside the picture
			let size = 68;
			const room = () => card.querySelector('.foot').getBoundingClientRect().top - t.getBoundingClientRect().bottom;
			while (size > 30 && (room() < 22 || t.scrollWidth > t.clientWidth + 1)) t.style.fontSize = `${(size -= 2)}px`;
		},
		{ kicker, title, pics, contain, bg, W, H },
	);
	await page.evaluate(() => Promise.all([...document.querySelectorAll('#og-card img')].map((i) => i.decode().catch(() => {}))));
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(150);
	const png = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } });
	await page.evaluate(() => document.getElementById('og-card')?.remove());
	return sharp(png).resize(W, H).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
};
const dataUrl = (buf, type = 'image/png') => `data:${type};base64,${buf.toString('base64')}`;

const browser = await chromium.launch();

// --- 1. the chapters' cards -------------------------------------------------------------------------
if (WHAT.includes('og')) {
	const ctx = await themedContext(browser, 'dark', { width: 1280, height: 900, scale: 2 });
	for (const ch of chapters) {
		const { png, rgb, what, page } = await sceneShot(ctx, BASE, ch);
		const meta = await page.evaluate(() => {
			const cur = document.querySelector('nav.sidebar a[aria-current="page"], .sidebar-content a[aria-current="page"]');
			const groups = [];
			for (let d = cur?.closest('details'); d; d = d.parentElement?.closest('details')) groups.unshift(d.querySelector(':scope > summary')?.textContent?.trim() ?? '');
			return { title: document.querySelector('h1')?.textContent?.trim() ?? '', groups };
		});
		await page.evaluate(() => scrollTo(0, 0));
		const jpg = await drawCard(page, {
			kicker: meta.groups.filter(Boolean).join(' · '),
			title: meta.title,
			pics: png ? [dataUrl(png)] : [],
			contain: Boolean(rgb),
			bg: rgb ? `rgb(${rgb.join(',')})` : '',
		});
		await page.close();
		writeFileSync(join(OG, `${ch.slug}.jpg`), jpg);
		report.push(`og/${ch.slug}.jpg: ${(jpg.length / 1024).toFixed(0)} KB, ${what}; «${meta.groups.join(' · ')}» «${meta.title}»`);
	}
	await ctx.close();
}

// --- 2. the cards of the textbook and of the home page: four scenes --------------------------------
if (WHAT.includes('site') && !ONLY.length) {
	const ctx = await themedContext(browser, 'dark', { width: 1280, height: 900, scale: 2 });
	const page = await ctx.newPage();
	await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
	await page.goto(`${BASE}/uchebnik/`, { waitUntil: 'load' });
	const four = ['zakon-oma', 'arhimedova-sila', 'postoyannye-magnity', 'istochniki-sveta'].map((s) =>
		dataUrl(readFileSync(join(ROOT, 'src/components/coursemap/thumbs', `${s}-dark.webp`)), 'image/webp'),
	);
	for (const [file, kicker, title] of [
		['uchebnik', '7–11 класс', 'Физика с живыми моделями, выводами формул и задачами'],
		['home', 'Ирина Горбунова', 'Физика, которая нравится'],
	]) {
		const jpg = await drawCard(page, { kicker, title, pics: four, contain: false, bg: '' });
		writeFileSync(join(OG, `${file}.jpg`), jpg);
		report.push(`og/${file}.jpg: ${(jpg.length / 1024).toFixed(0)} KB`);
	}
	await ctx.close();
}

// --- 3. «Конспект главы» as a picture ----------------------------------------------------------------
if (WHAT.includes('konspekt')) {
	const ctx = await themedContext(browser, 'dark', { width: 900, height: 1000, scale: 1.5, test: true });
	for (const ch of chapters) {
		const page = await ctx.newPage();
		await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
		await page.goto(`${BASE}${ch.path}`, { waitUntil: 'load' });
		const open = page.locator('[data-konspekt-open]');
		if (!(await open.count())) {
			report.push(`konspekt/${ch.slug}: no cards, no picture`);
			await page.close();
			continue;
		}
		await page.waitForFunction(() => document.querySelector('body > dialog[data-konspekt]'));
		await open.click();
		await page.evaluate(() => document.fonts.ready);
		// the whole sheet, however long: the dialog grows for the shot
		await page.addStyleTag({ content: '.konspekt{height:auto!important;max-height:none!important;position:absolute!important;top:0!important}.konspekt__scroll{overflow:visible!important}.konspekt__sheet{border-radius:0!important;border:0!important}' });
		await page.waitForTimeout(300);
		const png = await page.locator('[data-konspekt-sheet]').screenshot({ animations: 'disabled' });
		await page.close();
		const out = await sharp(png).png({ palette: true, colors: 128, effort: 9 }).toBuffer();
		const m = await sharp(out).metadata();
		writeFileSync(join(KON, `${ch.slug}.png`), out);
		report.push(`konspekt/${ch.slug}.png: ${m.width}x${m.height}, ${(out.length / 1024).toFixed(0)} KB`);
	}
	await ctx.close();
}
await browser.close();
console.log(report.join('\n'));
