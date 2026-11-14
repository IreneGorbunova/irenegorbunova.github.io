// «Показать на уроке»: one model of the page in a presentation view for a projector or an interactive board.
// The model's own root element is moved into the view (the same live node: it keeps its state and scripts) and
// scaled with a CSS transform, so its layout stays exactly as on the page; the models map pointer positions with
// getScreenCTM, which includes the transform. Closing puts the node back where it was and removes the view.
// Fullscreen API where it exists (on the whole document, so the notes' popover still shows), a fixed view otherwise.

import { bodyOf, copyOf, tasksOf } from './extract';

const THEME_KEY = 'ig:teach-theme';
const ZOOM_STEP = 1.15;

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
	const pageW = fig.getBoundingClientRect().width;
	const marker = document.createComment('igk: model in presentation');
	const spacer = el('div');
	spacer.style.height = `${fig.offsetHeight}px`;
	spacer.setAttribute('aria-hidden', 'true');
	fig.before(marker, spacer);

	// --- the view -----------------------------------------------------------------------------------
	const view = el('div', 'igk-pres');
	view.dataset.igTest = '';
	view.dataset.pagefindIgnore = '';
	view.dataset.igk = '';
	view.setAttribute('role', 'dialog');
	view.setAttribute('aria-modal', 'true');
	view.setAttribute('aria-label', `Показ на уроке: ${name}`);

	const bar = el('div', 'igk-pres__bar');
	const title = el('p', 'igk-pres__title');
	title.textContent = name;
	const tools = el('div', 'igk-pres__tools');
	const btn = (label: string, cls = '', aria = '') => {
		const b = el('button', `igk-pbtn ${cls}`, label);
		b.type = 'button';
		if (aria) b.setAttribute('aria-label', aria);
		return b;
	};
	const bTasks = btn('Задания');
	const bAnswers = btn('Ответы');
	const bMinus = btn(ICON.minus, 'igk-pbtn--icon', 'Мельче');
	const bPlus = btn(ICON.plus, 'igk-pbtn--icon', 'Крупнее');
	const bTheme = btn('', 'igk-pbtn--theme');
	const bClose = btn(`${ICON.close}<span>Закрыть</span>`, 'igk-pbtn--close', 'Закрыть');
	bTasks.setAttribute('aria-pressed', 'false');
	bAnswers.setAttribute('aria-pressed', 'false');
	if (!tasks) {
		bTasks.hidden = true;
		bAnswers.hidden = true;
	}
	tools.append(bTasks, bAnswers, bMinus, bPlus, bTheme, bClose);
	bar.append(title, tools);

	const body = el('div', 'igk-pres__body');
	const stage = el('div', 'igk-pres__stage');
	const sizer = el('div', 'igk-pres__sizer');
	const holder = el('div', 'sl-markdown-content igk-pres__holder');
	sizer.append(holder);
	stage.append(sizer);
	body.append(stage);

	const side = el('aside', 'igk-pres__side');
	side.hidden = true;
	side.setAttribute('aria-label', 'Задания к модели');
	const ansBox = el('div', 'igk-pres__answers');
	if (tasks) {
		const h = el('p', 'igk-pres__h');
		h.textContent = 'Что попробовать';
		side.append(h, copyOf(tasks));
		if (answers) {
			const ha = el('p', 'igk-pres__h');
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
	let zoom = 1;
	const W0 = Math.round(Math.min(pageW || 640, 760));
	holder.style.width = `${W0}px`;
	const fit = () => {
		const narrow = window.innerWidth < 1000 || window.innerWidth < window.innerHeight;
		view.classList.toggle('is-stacked', narrow);
		const cs = getComputedStyle(stage);
		const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
		const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
		const availW = stage.clientWidth - padX;
		const availH = (narrow ? window.innerHeight - bar.offsetHeight : stage.clientHeight) - padY;
		const H0 = holder.offsetHeight;
		const w = Math.min(W0, availW);
		holder.style.width = `${w}px`;
		// as large as the model's shape allows: the whole model on the screen, but not below 3/4 of its page size
		// (a taller one scrolls); on a phone it keeps its page size; −/+ change it from there
		const phone = window.innerWidth < 700;
		const s = (phone ? 1 : Math.min(Math.max(Math.min(availW / w, availH / H0), 0.75), 2.6, availW / w)) * zoom;
		holder.style.transform = s === 1 ? '' : `scale(${s})`;
		sizer.style.width = `${w * s}px`;
		sizer.style.height = `${H0 * s}px`;
	};
	const ro = new ResizeObserver(() => fit());

	// --- open ---------------------------------------------------------------------------------------
	holder.append(fig);
	document.body.append(view);
	ro.observe(holder);
	ro.observe(stage);
	fit();
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
		fit();
	});
	bMinus.addEventListener('click', () => {
		zoom = Math.max(zoom / ZOOM_STEP, 0.4);
		fit();
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
	};
	const onResize = () => fit();
	document.addEventListener('keydown', onKey);
	document.addEventListener('fullscreenchange', onFs);
	window.addEventListener('resize', onResize);

	function close() {
		if (!open) return;
		open = false;
		document.removeEventListener('keydown', onKey);
		document.removeEventListener('fullscreenchange', onFs);
		window.removeEventListener('resize', onResize);
		ro.disconnect();
		document.querySelector<HTMLElement>(':popover-open')?.hidePopover?.();
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
