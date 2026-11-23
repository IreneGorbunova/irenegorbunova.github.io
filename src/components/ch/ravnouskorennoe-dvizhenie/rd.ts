/**
 * Helpers for the pictures and models of «Равномерное и равноускоренное прямолинейное движение» (client side):
 * arrows as a shaft and a filled head, number formatting the Russian way, and a group of buttons that switches by
 * itself every few seconds until the reader presses one.
 */
import { el } from '../g7/kit';

export { el };
export const f2 = (v: number) => v.toFixed(2);

/** An arrow from (x1, y1) to (x2, y2): the shaft ends where the head begins. Empty paths for a very short arrow. */
export const arrow = (x1: number, y1: number, x2: number, y2: number, h = 8, w = 4) => {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const L = Math.hypot(dx, dy);
	if (L < 1) return { line: '', head: '' };
	const ux = dx / L;
	const uy = dy / L;
	const hh = Math.min(h, L * 0.7);
	const ww = (w * hh) / h;
	const bx = x2 - ux * hh;
	const by = y2 - uy * hh;
	return {
		line: `M${f2(x1)} ${f2(y1)} L${f2(bx)} ${f2(by)}`,
		head: `M${f2(x2)} ${f2(y2)} L${f2(bx - uy * ww)} ${f2(by + ux * ww)} L${f2(bx + uy * ww)} ${f2(by - ux * ww)} Z`,
	};
};

/** Sets an arrow made of two paths (shaft, head). */
export const setArrow = (shaft: Element, head: Element, x1: number, y1: number, x2: number, y2: number, h = 8, w = 4) => {
	const a = arrow(x1, y1, x2, y2, h, w);
	shaft.setAttribute('d', a.line);
	head.setAttribute('d', a.head);
};

/** 3.14159 → «3,14»; a real minus sign. */
export const num = (v: number, d = 2) => {
	const s = (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('.', ',');
	return s.startsWith('-') ? `−${s.slice(1)}` : s;
};
/** Like num, without trailing zeros. */
export const numT = (v: number, d = 2) => {
	const s = num(v, d);
	return s.includes(',') ? s.replace(/0+$/, '').replace(/,$/, '') : s;
};

/**
 * Buttons of a segmented group that switch by themselves every `period` seconds (while the figure is on screen) until
 * the reader presses one. `pick(i)` is called with the index of the pressed button.
 */
export const autoSeg = (root: Element, buttons: HTMLButtonElement[], pick: (i: number) => void, period = 2.5) => {
	let cur = 0;
	let auto = true;
	let timer = 0;
	const press = (i: number) => {
		cur = i;
		buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
		pick(i);
	};
	buttons.forEach((b, i) =>
		b.addEventListener('click', () => {
			auto = false;
			window.clearInterval(timer);
			press(i);
		}),
	);
	let visible = false;
	new IntersectionObserver((es) => {
		visible = es.some((e) => e.isIntersecting);
	}).observe(root);
	timer = window.setInterval(() => {
		if (auto && visible) press((cur + 1) % buttons.length);
	}, period * 1000);
	press(0);
};
