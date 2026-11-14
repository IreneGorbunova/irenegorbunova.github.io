// «Рабочий лист»: a printable A4 worksheet built from the chapter page on demand. A preview opens over the page;
// «Печать» adds a class to <html> and a temporary @page rule, prints, and takes both away again. Closing the preview
// removes everything it added, so the screen page is untouched afterwards.

import type { ChapterCfg, ModelCfg } from './config';
import { SITE } from './config';
import { bodyOf, checkQuestions, copyOf, tasksOf } from './extract';
import { qrSvg } from './qr';

const PICS = import.meta.glob<string>('./pics/*.webp', { eager: true, query: '?url', import: 'default' });
const picUrl = (name: string) => PICS[`./pics/${name}.webp`];

const PAGE_CSS = `@page { size: A4 portrait; margin: 13mm 14mm 15mm; @bottom-center { content: 'Учебник физики · Ирина Горбунова'; font: 8.5pt sans-serif; color: #444; } @bottom-right { content: counter(page) ' / ' counter(pages); font: 8.5pt sans-serif; color: #444; } }`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
	const e = document.createElement(tag);
	if (cls) e.className = cls;
	if (text) e.textContent = text;
	return e;
};

/** Ruled lines for a written answer. */
const lines = (n: number) => {
	const box = el('div', 'ws-lines');
	box.setAttribute('aria-hidden', 'true');
	for (let i = 0; i < n; i++) box.append(el('i'));
	return box;
};

/** How many ruled lines a task gets: two when it asks something or asks to find or write down a value. */
const linesFor = (text: string) => (/[?]|найдите|запишите|подберите|сравните/i.test(text) ? 2 : 1);

export interface SheetModel {
	fig: HTMLElement;
	cfg: ModelCfg;
}

let open = false;

export const openWorksheet = (chapter: ChapterCfg, models: SheetModel[], path: string, trigger: HTMLElement | null) => {
	if (open) return;
	open = true;
	const html = document.documentElement;
	const title = document.querySelector('h1')?.textContent?.trim() ?? document.title;
	const url = `${SITE}${path}`;

	// --- the sheet ----------------------------------------------------------------------------------
	const sheet = el('article', 'ws');
	sheet.lang = 'ru';
	const head = el('header', 'ws-head');
	head.append(el('p', 'ws-kicker', `Рабочий лист · ${chapter.grade}`), el('h1', 'ws-title', title));
	const fields = el('p', 'ws-fields');
	for (const [label, w] of [
		['Фамилия, имя', 'ws-blank--name'],
		['Класс', 'ws-blank--short'],
		['Дата', 'ws-blank--date'],
	]) {
		const f = el('span', 'ws-field');
		f.append(el('span', '', label), el('span', `ws-blank ${w}`));
		fields.append(f);
	}
	head.append(fields);
	sheet.append(head);

	// the parts the teacher can leave out: each model with tasks, and «Проверьте себя»
	interface Part {
		label: string;
		sheet: HTMLElement;
		answer: HTMLElement | null;
		heads: HTMLElement[];
		name: string | null;
		on: boolean;
	}
	const parts: Part[] = [];
	for (const { fig, cfg } of models) {
		const { tasks, answers } = tasksOf(fig);
		if (!tasks) continue;
		const h = el('h2', 'ws-h2');
		const sec = el('section', 'ws-model');
		sec.append(h);
		const src = cfg.pic ? picUrl(cfg.pic) : undefined;
		if (src) {
			const img = el('img', 'ws-pic');
			img.src = src;
			img.alt = `Модель «${cfg.name}» в начальном состоянии`;
			sec.append(img);
		}
		const ol = el('ol', 'ws-tasks');
		for (const li of tasks.children) {
			const item = el('li');
			const text = el('div', 'ws-task');
			text.append(...[...copyOf(li).childNodes]);
			item.append(text, lines(linesFor(li.textContent ?? '')));
			ol.append(item);
		}
		sec.append(ol);
		let a: HTMLElement | null = null;
		const heads = [h];
		if (answers) {
			const ha = el('h2', 'ws-h2');
			a = el('section', 'ws-model');
			a.append(ha, bodyOf(answers));
			heads.push(ha);
		}
		parts.push({ label: cfg.name, sheet: sec, answer: a, heads, name: cfg.name, on: cfg.sheet !== false });
	}

	const qs = checkQuestions();
	if (qs.length) {
		const sec = el('section', 'ws-check');
		const ans = el('section', 'ws-check');
		const heads = [el('h2', 'ws-h2'), el('h2', 'ws-h2')];
		sec.append(heads[0]);
		ans.append(heads[1]);
		for (const q of qs) {
			const item = el('div', 'ws-q');
			const qt = el('div', 'ws-qtext');
			qt.append(...[...copyOf(q.question).childNodes]);
			item.append(qt);
			const a = el('div', 'ws-a');
			const qa = el('p', 'ws-qtext');
			qa.append(...[...copyOf(q.question).childNodes]);
			a.append(qa);
			if (q.kind === 'choice') {
				const opts = el('p', 'ws-opts');
				for (const o of q.options) {
					const s = el('span', 'ws-opt');
					s.append(el('span', 'ws-box'), ...[...copyOf(o).childNodes]);
					opts.append(s);
				}
				item.append(opts);
				const right = q.options[q.answer];
				if (right) {
					const p = el('p', '', 'Ответ: ');
					p.append(...[...copyOf(right).childNodes]);
					p.append('.');
					a.append(p);
				}
				if (q.explain) a.append(bodyOf(q.explain));
			} else {
				item.append(lines(2));
				a.append(bodyOf(q.explain));
			}
			sec.append(item);
			ans.append(a);
		}
		parts.push({ label: 'Проверьте себя', sheet: sec, answer: ans, heads, name: null, on: true });
	}
	for (const pt of parts) {
		sheet.append(pt.sheet);
		pt.sheet.hidden = !pt.on;
		if (pt.answer) pt.answer.hidden = !pt.on;
	}

	/** Numbers the models that stay on the sheet. */
	const renumber = () => {
		let k = 0;
		for (const pt of parts) {
			if (pt.sheet.hidden) continue;
			if (pt.name) k += 1;
			for (const h of pt.heads) h.textContent = pt.name ? `Модель ${k}. ${pt.name}` : pt.label;
		}
	};
	renumber();

	const link = el('section', 'ws-link');
	const qr = el('div', 'ws-qr');
	qr.innerHTML = qrSvg(url, `QR-код: ${url}`);
	const lt = el('div', 'ws-linktext');
	lt.append(el('p', '', 'Модели этой главы — в учебнике. Наведите камеру телефона на код или наберите адрес:'), el('p', 'ws-url', url.replace(/^https:\/\//, '')));
	link.append(qr, lt);
	sheet.append(link);

	const answersSheet = el('div', 'ws-answers');
	answersSheet.hidden = true;
	answersSheet.append(
		el('p', 'ws-kicker', `Лист ответов для учителя · ${chapter.grade}`),
		el('h1', 'ws-title', title),
		...parts.flatMap((pt) => (pt.answer ? [pt.answer] : [])),
	);
	sheet.append(answersSheet);

	// --- the preview --------------------------------------------------------------------------------
	const wrap = el('div', 'igk-ws');
	wrap.dataset.igTest = '';
	wrap.dataset.pagefindIgnore = '';
	wrap.dataset.igk = '';
	wrap.setAttribute('role', 'dialog');
	wrap.setAttribute('aria-modal', 'true');
	wrap.setAttribute('aria-label', 'Рабочий лист');
	const bar = el('div', 'igk-ws__bar');
	const bt = el('p', 'igk-ws__title', 'Рабочий лист');
	const est = el('span', 'igk-ws__est');
	est.setAttribute('aria-live', 'polite');
	const head2 = el('div', 'igk-ws__head');
	head2.append(bt, est);
	const pick = el('details', 'igk-ws__pick');
	const pickSum = el('summary', 'igk-pbtn');
	const pickList = el('div', 'igk-ws__picklist');
	for (const pt of parts) {
		const l = el('label', 'igk-ws__opt');
		const c = el('input');
		c.type = 'checkbox';
		c.checked = pt.on;
		c.addEventListener('change', () => {
			pt.sheet.hidden = !c.checked;
			if (pt.answer) pt.answer.hidden = !c.checked;
			renumber();
			paintPick();
		});
		l.append(c, el('span', '', pt.label));
		pickList.append(l);
	}
	pick.append(pickSum, pickList);
	const paintPick = () => {
		const on = parts.filter((pt) => !pt.sheet.hidden).length;
		pickSum.textContent = `На листе: ${on} из ${parts.length}`;
		estimate();
	};
	const optL = el('label', 'igk-ws__opt');
	const opt = el('input');
	opt.type = 'checkbox';
	optL.append(opt, el('span', '', 'Добавить лист ответов для учителя'));
	const bPrint = el('button', 'igk-pbtn igk-pbtn--primary', 'Печать');
	bPrint.type = 'button';
	const bClose = el('button', 'igk-pbtn', 'Закрыть');
	bClose.type = 'button';
	const tools = el('div', 'igk-ws__tools');
	tools.append(pick, optL, bPrint, bClose);
	bar.append(head2, tools);
	const scroll = el('div', 'igk-ws__scroll');
	const sizer = el('div', 'igk-ws__sizer');
	sizer.append(sheet);
	scroll.append(sizer);
	wrap.append(bar, scroll);

	document.body.append(wrap);

	// on a narrow screen the A4 sheet is shown scaled down
	const fit = () => {
		const avail = scroll.clientWidth - 24;
		const w = sheet.offsetWidth;
		const s = Math.min(1, avail / w);
		sheet.style.transform = s < 1 ? `scale(${s})` : '';
		sizer.style.width = `${w * s}px`;
		sizer.style.height = `${sheet.offsetHeight * s}px`;
	};
	/** Pages of the pupil's sheet, measured on the screen copy (same width and margins as on paper). */
	function estimate() {
		const mm = sheet.offsetWidth / 210;
		const cs = getComputedStyle(sheet);
		const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
		const h = answersSheet.hidden ? sheet.scrollHeight - pad : answersSheet.offsetTop - pad;
		const n = Math.max(1, Math.ceil(h / (269 * mm)));
		est.textContent = `примерно ${n} ${n === 1 ? 'страница' : n < 5 ? 'страницы' : 'страниц'}`;
	}
	const ro = new ResizeObserver(fit);
	ro.observe(scroll);
	ro.observe(sheet);
	fit();
	paintPick();
	bPrint.focus({ preventScroll: true });

	opt.addEventListener('change', () => {
		answersSheet.hidden = !opt.checked;
	});

	let pageStyle: HTMLStyleElement | null = null;
	const class0 = html.getAttribute('class');
	const endPrint = () => {
		if (class0 === null) html.removeAttribute('class');
		else html.setAttribute('class', class0);
		pageStyle?.remove();
		pageStyle = null;
	};
	const onAfter = () => endPrint();
	window.addEventListener('afterprint', onAfter);
	bPrint.addEventListener('click', async () => {
		await Promise.all([...sheet.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
		pageStyle = el('style');
		pageStyle.textContent = PAGE_CSS;
		document.head.append(pageStyle);
		html.classList.add('igk-printing');
		window.print();
		// Chrome returns after the dialog closes; Safari fires afterprint later
		if (!('onafterprint' in window)) endPrint();
	});

	const onKey = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	};
	document.addEventListener('keydown', onKey);

	function close() {
		if (!open) return;
		open = false;
		endPrint();
		ro.disconnect();
		window.removeEventListener('afterprint', onAfter);
		document.removeEventListener('keydown', onKey);
		wrap.remove();
		trigger?.focus({ preventScroll: true });
	}
	bClose.addEventListener('click', close);
};
