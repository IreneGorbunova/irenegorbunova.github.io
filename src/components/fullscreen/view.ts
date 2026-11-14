// «Полный экран»: one model of the page on the whole screen, for a projector, an interactive board or a phone
// turned on its side.
// The model's own root element is moved into the view (the same live node: it keeps its state and scripts) and put
// back on closing. The view uses the whole screen: the model's blocks (picture, controls, readings, caption) flow
// into one, two or three columns, and the layout that fills the screen best without scrolling is chosen (fit below);
// the result is scaled with a CSS transform, which the models' pointer maths (getScreenCTM, getBoundingClientRect)
// already follows. Fullscreen API where it exists (on the whole document, so a note's popover still shows), a fixed
// view otherwise.

import { bodyOf, copyOf, tasksOf } from './extract';

const THEME_KEY = 'ig:teach-theme';
const ZOOM_STEP = 1.15;
/** widths of one column, in the model's own pixels: around the width the models were drawn for (the page column) */
const COL_W = [560, 600, 640, 700, 760];
const COL_GAP = 20;
/** below this scale a model is too small to read: it is shown larger and scrolls instead */
const MIN_SCALE = 0.7;
const MAX_SCALE = 3;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] => {
	const e = document.createElement(tag);
	if (cls) e.className = cls;
	if (html) e.innerHTML = html;
	return e;
};

const ICON = {
	sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
	moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
	close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
	minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
	plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>',
};

interface Layout {
	cols: number;
	w: number;
	h: number;
	s: number;
	/** the tall wrappers of the model are dissolved into the columns */
	unwrap: boolean;
	/** too tall for the screen at a readable size: shown larger, the view scrolls */
	scroll?: boolean;
}

let open = false;

export const present = (fig: HTMLElement, name: string, trigger: HTMLElement | null) => {
	if (open) return;
	open = true;
	const html = document.documentElement;
	const { tasks, answers } = tasksOf(fig);

	// --- remember the page as it is -----------------------------------------------------------------
	const scrollX = window.scrollX;
	const scrollY = window.scrollY;
	const theme0 = html.dataset.theme;
	const marker = document.createComment('igf: model on the whole screen');
	const spacer = el('div');
	spacer.style.height = `${fig.offsetHeight}px`;
	spacer.setAttribute('aria-hidden', 'true');
	fig.before(marker, spacer);

	// --- the view -----------------------------------------------------------------------------------
	const view = el('div', 'igf-view');
	view.dataset.pagefindIgnore = '';
	view.dataset.igf = '';
	view.setAttribute('role', 'dialog');
	view.setAttribute('aria-modal', 'true');
	view.setAttribute('aria-label', `Полный экран: ${name}`);

	const bar = el('div', 'igf-view__bar');
	const title = el('p', 'igf-view__title');
	title.textContent = name;
	const tools = el('div', 'igf-view__tools');
	const btn = (label: string, cls = '', aria = '') => {
		const b = el('button', `igf-btn ${cls}`, label);
		b.type = 'button';
		if (aria) b.setAttribute('aria-label', aria);
		return b;
	};
	const bTasks = btn('Задания');
	const bAnswers = btn('Ответы');
	const bMinus = btn(ICON.minus, 'igf-btn--icon', 'Мельче');
	const bPlus = btn(ICON.plus, 'igf-btn--icon', 'Крупнее');
	const bTheme = btn('', 'igf-btn--theme');
	const bClose = btn(`${ICON.close}<span>Закрыть</span>`, 'igf-btn--close', 'Закрыть');
	bTasks.setAttribute('aria-pressed', 'false');
	bAnswers.setAttribute('aria-pressed', 'false');
	if (!tasks) {
		bTasks.hidden = true;
		bAnswers.hidden = true;
	}
	tools.append(bTasks, bAnswers, bMinus, bPlus, bTheme, bClose);
	bar.append(title, tools);

	const body = el('div', 'igf-view__body');
	const stage = el('div', 'igf-view__stage');
	const sizer = el('div', 'igf-view__sizer');
	const holder = el('div', 'sl-markdown-content igf-view__holder');
	sizer.append(holder);
	stage.append(sizer);
	body.append(stage);

	const side = el('aside', 'igf-view__side');
	side.hidden = true;
	side.setAttribute('aria-label', 'Задания к модели');
	const ansBox = el('div', 'igf-view__answers');
	if (tasks) {
		const box = el('div', 'igf-view__tasks');
		const h = el('p', 'igf-view__h');
		h.textContent = 'Что попробовать';
		box.append(h, copyOf(tasks));
		side.append(box);
		if (answers) {
			const ha = el('p', 'igf-view__h');
			ha.textContent = 'Что должно было получиться';
			ansBox.append(ha, bodyOf(answers));
			ansBox.hidden = true;
			side.append(ansBox);
		} else bAnswers.hidden = true;
	}
	body.append(side);
	view.append(bar, body);

	// --- theme --------------------------------------------------------------------------------------
	const paintTheme = () => {
		const light = html.dataset.theme === 'light';
		bTheme.innerHTML = `${light ? ICON.moon : ICON.sun}<span>${light ? 'Тёмная' : 'Светлая'}</span>`;
		bTheme.setAttribute('aria-label', light ? 'Тёмная тема' : 'Светлая тема');
	};
	try {
		const t = localStorage.getItem(THEME_KEY);
		if (t === 'light' || t === 'dark') html.dataset.theme = t;
	} catch {}
	paintTheme();
	bTheme.addEventListener('click', () => {
		const t = html.dataset.theme === 'light' ? 'dark' : 'light';
		html.dataset.theme = t;
		try {
			localStorage.setItem(THEME_KEY, t);
		} catch {}
		paintTheme();
	});

	// --- size ---------------------------------------------------------------------------------------
	// The model's blocks flow into `cols` columns of the figure (CSS columns, the blocks never break), the holder is
	// `w` wide and `h` high in the model's own pixels and is shown at the scale `s`.
	let zoom = 1;
	let cur: Layout | null = null;
	const colsFree = getComputedStyle(fig).display === 'block'; // a figure that is a grid or a flex box keeps its own layout
	// A tall wrapper that only stacks several blocks (the panel of a tab, a grid of views) would stay in one column:
	// it is dissolved (display: contents), so its blocks flow into the columns themselves. Only a plain wrapper: no
	// background, border or positioning of its own. A hidden twin (the panel of another tab) is dissolved with it.
	const unwrapped: HTMLElement[] = [];
	if (colsFree) {
		const shown = (e: Element) => (e as HTMLElement).offsetHeight > 0;
		for (const d of [...fig.children] as HTMLElement[]) {
			if (!shown(d) || d.matches('svg, canvas, table, ul, ol, dl, p, figcaption, label, button, details')) continue;
			const cs = getComputedStyle(d);
			const plain =
				cs.position === 'static' &&
				cs.backgroundColor === 'rgba(0, 0, 0, 0)' &&
				cs.borderTopWidth === '0px' &&
				cs.overflow === 'visible' &&
				cs.transform === 'none';
			const kids = ([...d.children] as HTMLElement[]).filter((k) => shown(k) && k.offsetHeight >= 48);
			const rows = new Set(kids.map((k) => k.offsetTop)).size;
			if (!plain || d.offsetHeight < 520 || rows < 2) continue;
			const gap = parseFloat(cs.rowGap);
			const twins = ([...fig.children] as HTMLElement[]).filter((x) => x === d || (!shown(x) && x.tagName === d.tagName && x.className === d.className));
			for (const t of twins) {
				if (gap > 0) t.style.setProperty('--igf-gap', `${gap}px`);
				unwrapped.push(t);
			}
		}
	}
	const setUnwrap = (on: boolean) => {
		for (const t of unwrapped) t.classList.toggle('igf-unwrap', on);
	};
	const setCols = (n: number) => {
		fig.style.columnCount = n > 1 ? String(n) : '';
		fig.style.columnGap = n > 1 ? `${COL_GAP}px` : '';
		fig.classList.toggle('igf-cols', n > 1);
	};
	const measure = (cols: number, w: number, unwrap: boolean): Layout => {
		setUnwrap(unwrap);
		setCols(cols);
		holder.style.width = `${w}px`;
		return { cols, w, h: holder.offsetHeight, s: 1, unwrap };
	};
	const room = () => {
		const cs = getComputedStyle(stage);
		const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
		const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
		const stacked = view.classList.contains('is-stacked');
		return {
			w: stage.clientWidth - padX,
			h: (stacked ? window.innerHeight - bar.offsetHeight : stage.clientHeight) - padY,
		};
	};
	const apply = (l: Layout) => {
		cur = l;
		setUnwrap(l.unwrap);
		setCols(l.cols);
		holder.style.width = `${l.w}px`;
		const s = Math.min(l.s * zoom, MAX_SCALE * 1.5);
		holder.style.transform = Math.abs(s - 1) < 0.004 ? '' : `scale(${s})`;
		sizer.style.width = `${l.w * s}px`;
		sizer.style.height = `${l.h * s}px`;
	};
	/** The layout that fills the room best without scrolling. */
	const search = (): Layout | null => {
		const { w: availW, h: availH } = room();
		if (availW <= 0 || availH <= 0) return null;
		const cand: Layout[] = [];
		const maxCols = colsFree ? 3 : 1;
		const widths = availW < 560 ? [Math.floor(availW)] : COL_W;
		for (const unwrap of unwrapped.length ? [false, true] : [false]) {
			for (let cols = unwrap ? 2 : 1; cols <= maxCols; cols++) {
				for (const cw of widths) {
					const l = measure(cols, cols * cw + (cols - 1) * COL_GAP, unwrap);
					l.s = Math.min(availW / l.w, availH / l.h, MAX_SCALE);
					cand.push(l);
				}
			}
		}
		// the share of the screen the model covers, with a slight preference for a larger scale (larger text)
		const score = (l: Layout) => ((l.s * l.w * l.s * l.h) / (availW * availH)) * Math.sqrt(Math.min(l.s, 1.5));
		// a phone held upright shows the model at its own size, as on the page, and scrolls if it is taller
		const minS = availW < 560 ? 1 : MIN_SCALE;
		let best = cand.filter((l) => l.s >= minS).sort((a, b) => score(b) - score(a))[0];
		if (!best) {
			// nothing fits at a readable size: the model takes the width of the screen (never above its own size; on a
			// phone held upright that is the model exactly as on the page) in the layout that needs the least
			// scrolling, and the view scrolls
			for (const l of cand) l.s = Math.max(minS, Math.min(availW / l.w, 1));
			const fits = cand.filter((l) => l.w * l.s <= availW + 1);
			best = (fits.length ? fits : cand).sort((a, b) => a.h * a.s - b.h * b.s || b.s - a.s)[0];
			best.scroll = true;
		}
		return best;
	};
	/** Lays the view out: the tasks (when shown) go to the side or below the model, whichever leaves the model larger. */
	const fit = () => {
		const upright = window.innerWidth < 760 && window.innerWidth < window.innerHeight;
		view.classList.toggle('is-stacked', upright && !side.hidden);
		view.classList.remove('is-below');
		let best = search();
		if (!side.hidden && !upright && best) {
			const area = (l: Layout) => (l.scroll ? 0 : l.s * l.s * l.w * l.h);
			view.classList.add('is-below');
			const below = search();
			if (!below || area(below) <= area(best) * 1.08) view.classList.remove('is-below');
			else best = below;
		}
		if (best) apply(best);
	};
	/** The model changed its own height (a panel opened, a table grew): the same layout, a new scale. */
	const refit = () => {
		if (!cur) return;
		const h = holder.offsetHeight;
		if (Math.abs(h - cur.h) < 1) return;
		const { w: availW, h: availH } = room();
		const fitted = Math.min(availW / cur.w, availH / h, MAX_SCALE);
		if (cur.scroll) apply({ ...cur, h });
		else if (fitted >= (availW < 560 ? 1 : MIN_SCALE)) apply({ ...cur, h, s: fitted });
		else fit();
	};
	const ro = new ResizeObserver(() => refit());

	// --- open ---------------------------------------------------------------------------------------
	holder.append(fig);
	document.body.append(view);
	fit();
	ro.observe(holder);
	let fs = false;
	if (document.fullscreenEnabled && html.requestFullscreen) {
		html.requestFullscreen({ navigationUI: 'hide' }).then(
			() => (fs = true),
			() => {},
		);
	}
	bClose.focus({ preventScroll: true });

	const toggle = (b: HTMLButtonElement, on: boolean) => b.setAttribute('aria-pressed', String(on));
	bTasks.addEventListener('click', () => {
		side.hidden = !side.hidden;
		toggle(bTasks, !side.hidden);
		if (side.hidden) {
			ansBox.hidden = true;
			toggle(bAnswers, false);
		}
		fit();
	});
	bAnswers.addEventListener('click', () => {
		const show = ansBox.hidden;
		ansBox.hidden = !show;
		if (show) side.hidden = false;
		toggle(bAnswers, show);
		toggle(bTasks, !side.hidden);
		fit();
		if (show) ansBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	});
	bPlus.addEventListener('click', () => {
		zoom = Math.min(zoom * ZOOM_STEP, 3);
		if (cur) apply(cur);
	});
	bMinus.addEventListener('click', () => {
		zoom = Math.max(zoom / ZOOM_STEP, 0.4);
		if (cur) apply(cur);
	});

	// --- close --------------------------------------------------------------------------------------
	const onKey = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			if (document.querySelector(':popover-open')) return; // the note closes first
			e.preventDefault();
			close();
		} else if (e.key === 'Tab') {
			// keep the focus inside the view
			const f = [...view.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
				(x) => !x.hidden && x.offsetParent !== null && !(x as HTMLButtonElement).disabled,
			);
			if (!f.length) return;
			const first = f[0];
			const last = f[f.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			} else if (!view.contains(document.activeElement)) {
				e.preventDefault();
				first.focus();
			}
		}
	};
	const onFs = () => {
		if (fs && !document.fullscreenElement) close();
		else fit();
	};
	let raf = 0;
	const onResize = () => {
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(fit);
	};
	document.addEventListener('keydown', onKey);
	document.addEventListener('fullscreenchange', onFs);
	window.addEventListener('resize', onResize);

	function close() {
		if (!open) return;
		open = false;
		document.removeEventListener('keydown', onKey);
		document.removeEventListener('fullscreenchange', onFs);
		window.removeEventListener('resize', onResize);
		cancelAnimationFrame(raf);
		ro.disconnect();
		document.querySelector<HTMLElement>(':popover-open')?.hidePopover?.();
		setCols(1);
		setUnwrap(false);
		for (const t of unwrapped) t.style.removeProperty('--igf-gap');
		marker.after(fig);
		marker.remove();
		spacer.remove();
		view.remove();
		if (theme0 === undefined) delete html.dataset.theme;
		else html.dataset.theme = theme0;
		// the scroll position comes back once fullscreen is over (leaving it relayouts the page) and once more on
		// the next frame
		const restore = () => window.scrollTo(scrollX, scrollY);
		restore();
		const after = () => {
			restore();
			requestAnimationFrame(restore);
		};
		if (document.fullscreenElement) document.exitFullscreen().then(after, after);
		else requestAnimationFrame(restore);
		trigger?.focus({ preventScroll: true });
	}
	bClose.addEventListener('click', close);
};
