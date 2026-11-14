// The chapter page (ChapterTools.astro): «Коротко» folds the optional sections,
// «Конспект главы» opens the chapter's cards on one sheet.
// Nothing here runs without test mode, and the chapter's own markup is only annotated with data attributes.


const SHORT_KEY = 'ig:short';
const html = document.documentElement;

/** Sections («## …») the short view folds: history, the lunar task, derivations, applications, the optional ones.
 *  Models and experiments stay (Irina, 14 Nov 2026). */
const FOLD = /^(Кто это открыл|Лунная задача|Рассчитайте сами|Выводим формул|Откуда берётся формула|Где это встречается|Для любознательных|Где работа)|( вокруг нас| в нашей жизни)$/;

/** The element of the chapter's text that holds the heading: Starlight wraps a heading together with its anchor link. */
const wrapOf = (h: Element) => h.closest('.sl-heading-wrapper') ?? h;

export const start = () => {
	const card = document.querySelector<HTMLElement>('[data-ctools]');
	const content = document.querySelector<HTMLElement>('.sl-markdown-content');
	if (!card || !content || html.dataset.igTestmode !== '1') return;
	const heads = [...content.querySelectorAll<HTMLElement>(':scope > .sl-heading-wrapper > h2, :scope > h2')];

	// --- what the short view folds ----------------------------------------------------------------
	// A fold is a section's heading, which stays with a button, and everything up to the next «## …», which hides.
	// The text, the definitions, the formulas, the pictures and the models stay.
	interface Fold {
		parts: HTMLElement[];
		open: (on: boolean) => void;
	}
	const folds: Fold[] = [];
	const isPart = (e: Element): e is HTMLElement => e instanceof HTMLElement && !e.matches('script, style, template');
	heads.forEach((h, i) => {
		if (!FOLD.test(h.textContent?.trim() ?? '')) return;
		const w = wrapOf(h) as HTMLElement;
		const end = heads[i + 1] ? wrapOf(heads[i + 1]) : null;
		const parts: HTMLElement[] = [];
		for (let e = w.nextElementSibling; e && e !== end; e = e.nextElementSibling) if (isPart(e)) parts.push(e);
		if (!parts.length) return;
		for (const p of parts) p.dataset.igsFold = '';
		w.dataset.igsHead = '';
		const b = document.createElement('button');
		b.type = 'button';
		b.className = 'igs-toggle';
		const open = (on: boolean) => {
			b.textContent = on ? 'Свернуть' : 'Развернуть';
			b.setAttribute('aria-expanded', String(on));
			w.toggleAttribute('data-igs-open', on);
			for (const p of parts) p.toggleAttribute('data-igs-open', on);
		};
		open(false);
		b.addEventListener('click', () => open(!w.hasAttribute('data-igs-open')));
		w.append(b);
		folds.push({ parts, open });
	});
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
