// The chapter page in test mode (ChapterCard.astro): the title card comes alive, the blocks of the text get their
// marks, «Коротко» folds the optional sections, «Конспект главы» opens the chapter's cards on one sheet.
// Nothing here runs without test mode, and the chapter's own markup is only annotated with data attributes.

import { load, type Step } from '../../sky/progress';
import { modelBars } from '../fullscreen/fs';

const SHORT_KEY = 'ig:short';
const html = document.documentElement;

/** Marks by the heading of a section: tasks are «решить», history and applications «интересно». */
const SOLVE = /^(Пример задачи|Рассчитайте сами|Посчитайте сами|Решите сами|Лунная задача|Проверьте себя)/;
const MORE = /^(Кто это открыл|Где это встречается|Для любознательных|Где работа)|( вокруг нас| в нашей жизни)$/;
/** Sections («## …») the short view folds: history, the lunar task, derivations, applications, experiments. */
const FOLD = /^(Кто это открыл|Лунная задача|Рассчитайте сами|Выводим формул|Откуда берётся формула|Где это встречается|Для любознательных|Где работа|Опыт[. ]|Попробуйте сами)|( вокруг нас| в нашей жизни)$/;
/** Subsections («### …») it folds: the ones built around a model or an experiment. */
const FOLD_SUB = /^(Проверим на|Проверьте сами|Опыт[. ]|Предскажите, потом|Измерим )|( сами)$/;
const LABEL = { solve: 'решить', more: 'интересно' } as const;

/** The element of the chapter's text that holds the heading: Starlight wraps a heading together with its anchor link. */
const wrapOf = (h: Element) => h.closest('.sl-heading-wrapper') ?? h;

export const start = () => {
	const card = document.querySelector<HTMLElement>('[data-ccard]');
	const content = document.querySelector<HTMLElement>('.sl-markdown-content');
	if (!card || !content || html.dataset.igTestmode !== '1') return;
	const id = card.dataset.ccard!;

	// --- the emblem: the live constellation of the section moves into the card ---------------------
	const sky = document.querySelector<HTMLElement>('.csky .cs--mini');
	if (sky) card.querySelector('[data-ccard-emblem]')?.append(sky);

	// --- the goals tick themselves ------------------------------------------------------------------
	const paintGoals = () => {
		const done = load()[id] ?? '';
		for (const li of card.querySelectorAll<HTMLElement>('[data-goal]')) {
			const lit = done.includes(li.dataset.goal as Step);
			li.classList.toggle('is-done', lit);
			li.querySelector('[data-sr]')!.textContent = lit ? ' — сделано' : ' — ещё нет';
		}
	};
	paintGoals();
	document.addEventListener('ig:sky', paintGoals);

	// --- marks at the sections ---------------------------------------------------------------------
	const heads = [...content.querySelectorAll<HTMLElement>(':scope > .sl-heading-wrapper > :is(h2, h3), :scope > :is(h2, h3)')];
	for (const h of heads) {
		if (h.tagName !== 'H2') continue;
		const t = h.textContent?.trim() ?? '';
		const kind = SOLVE.test(t) ? 'solve' : MORE.test(t) ? 'more' : '';
		if (!kind) continue;
		const w = wrapOf(h) as HTMLElement;
		w.dataset.igm = kind;
		w.dataset.igmLabel = LABEL[kind];
	}

	// --- what the short view folds ----------------------------------------------------------------
	// A fold is a head that stays (a heading, or the bar above a model) with a button, and the parts it hides. Folded:
	// the optional sections, the subsections built around a model, and every other model with its tasks. The text,
	// the definitions, the formulas and the pictures stay.
	interface Fold {
		parts: HTMLElement[];
		open: (on: boolean) => void;
	}
	const folds: Fold[] = [];
	const taken = new Set<Element>();
	const addFold = (head: HTMLElement, parts: HTMLElement[], words: [string, string], place: (b: HTMLElement) => void) => {
		if (!parts.length) return;
		for (const p of parts) {
			p.dataset.igsFold = '';
			taken.add(p);
		}
		head.dataset.igsHead = '';
		const b = document.createElement('button');
		b.type = 'button';
		b.className = 'igs-toggle';
		b.dataset.igTest = '';
		const open = (on: boolean) => {
			b.textContent = on ? words[1] : words[0];
			b.setAttribute('aria-expanded', String(on));
			head.toggleAttribute('data-igs-open', on);
			for (const p of parts) p.toggleAttribute('data-igs-open', on);
		};
		open(false);
		b.addEventListener('click', () => open(!head.hasAttribute('data-igs-open')));
		place(b);
		folds.push({ parts, open });
	};
	const isPart = (e: Element): e is HTMLElement => e instanceof HTMLElement && !e.matches('script, style, template');
	// sections and subsections, by their headings: everything up to the next heading of the same or a higher level
	for (const level of ['H2', 'H3']) {
		heads.forEach((h, i) => {
			if (h.tagName !== level) return;
			const w = wrapOf(h) as HTMLElement;
			if (taken.has(w) || !(level === 'H2' ? FOLD : FOLD_SUB).test(h.textContent?.trim() ?? '')) return;
			const next = heads.slice(i + 1).find((x) => x.tagName === 'H2' || level === 'H3');
			const end = next ? wrapOf(next) : null;
			const parts: HTMLElement[] = [];
			for (let e = w.nextElementSibling; e && e !== end; e = e.nextElementSibling) if (isPart(e)) parts.push(e);
			addFold(w, parts, ['Развернуть', 'Свернуть'], (b) => w.append(b));
		});
	}
	// every other model: the model, «Что попробовать» and «Что должно было получиться» after it; its bar stays
	for (const { fig, bar } of modelBars()) {
		if (taken.has(fig) || taken.has(bar) || fig.parentElement !== content) continue;
		const parts = [fig];
		for (let e = fig.nextElementSibling; e; e = e.nextElementSibling) {
			if (!isPart(e)) continue;
			const tasksHead = e.tagName === 'P' && e.textContent?.trim() === 'Что попробовать';
			const tasks = e.tagName === 'OL' && parts[parts.length - 1].tagName === 'P';
			const answers = e.tagName === 'DETAILS' && /Что должно было получиться/.test(e.querySelector('summary')?.textContent ?? '');
			if (!tasksHead && !tasks && !answers) break;
			parts.push(e);
			if (answers) break;
		}
		addFold(bar, parts, ['Показать модель', 'Скрыть модель'], (b) => bar.querySelector('.igm')?.after(b));
	}
	// a link to a place inside a fold opens the fold
	const reveal = () => {
		const target = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
		const f = target && folds.find((x) => x.parts.some((p) => p.contains(target)));
		if (f && target) {
			f.open(true);
			target.scrollIntoView();
		}
	};
	addEventListener('hashchange', reveal);
	reveal();

	// --- «Полностью / Коротко» ----------------------------------------------------------------------
	const note = card.querySelector<HTMLElement>('[data-short-note]');
	const paintView = () => {
		const short = html.dataset.igShort === '1';
		for (const b of card.querySelectorAll<HTMLElement>('[data-view]')) b.setAttribute('aria-pressed', String((b.dataset.view === 'short') === short));
		if (note) note.hidden = !short;
	};
	for (const b of card.querySelectorAll<HTMLElement>('[data-view]')) {
		b.addEventListener('click', () => {
			const short = b.dataset.view === 'short';
			if (short) html.dataset.igShort = '1';
			else delete html.dataset.igShort;
			try {
				if (short) localStorage.setItem(SHORT_KEY, '1');
				else localStorage.removeItem(SHORT_KEY);
			} catch {}
			paintView();
		});
	}
	paintView();

	// --- «Конспект главы» ---------------------------------------------------------------------------
	const dlg = card.querySelector<HTMLDialogElement>('[data-konspekt]');
	if (dlg) {
		// the sheet lives next to the page, not inside it: a print then shows the sheet alone
		dlg.dataset.igTest = '';
		document.body.append(dlg);
		card.querySelector('[data-konspekt-open]')?.addEventListener('click', () => dlg.showModal());
		dlg.querySelector('[data-konspekt-close]')?.addEventListener('click', () => dlg.close());
		dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
		// printing: only the sheet, on white (the light theme for the time of the print)
		let theme0: string | undefined;
		addEventListener('beforeprint', () => {
			if (!dlg.open) return;
			theme0 = html.dataset.theme;
			html.dataset.theme = 'light';
			html.classList.add('ig-print-konspekt');
		});
		addEventListener('afterprint', () => {
			if (!html.classList.contains('ig-print-konspekt')) return;
			html.classList.remove('ig-print-konspekt');
			if (theme0 === undefined) delete html.dataset.theme;
			else html.dataset.theme = theme0;
		});
		dlg.querySelector('[data-konspekt-print]')?.addEventListener('click', () => window.print());
	}
};
