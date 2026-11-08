/** Small helpers shared by the Moon chapter's scripts. */

/** A number with a decimal comma and the given number of decimals (thin spaces between thousands). */
export const fmt = (v: number, digits = 1) =>
	v.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Hours as «12 ч 25 мин». */
export const hm = (h: number) => {
	let H = Math.floor(h);
	let M = Math.round((h - H) * 60);
	if (M === 60) {
		H += 1;
		M = 0;
	}
	return M ? `${H} ч ${M} мин` : `${H} ч`;
};

/** Clock time «06:05» from hours (any number, wrapped to a day). */
export const clock = (h: number) => {
	const m = Math.round((((h % 24) + 24) % 24) * 60) % (24 * 60);
	return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const TAU = Math.PI * 2;

/** Runs `frame(dt)` every animation frame while the element is on screen. Returns a stop/start pair. */
export const loop = (root: Element, frame: (dt: number) => void) => {
	let raf = 0;
	let last = 0;
	let visible = false;
	const tick = (now: number) => {
		const dt = Math.min((now - last) / 1000, 0.1);
		last = now;
		frame(dt);
		raf = requestAnimationFrame(tick);
	};
	const start = () => {
		cancelAnimationFrame(raf);
		last = performance.now();
		raf = requestAnimationFrame(tick);
	};
	new IntersectionObserver((entries) => {
		for (const en of entries) {
			visible = en.isIntersecting;
			if (visible) start();
			else cancelAnimationFrame(raf);
		}
	}).observe(root);
	return { isVisible: () => visible };
};

/** SVG helper: sets several attributes at once. */
export const attrs = (el: Element, a: Record<string, string | number>) => {
	for (const [k, v] of Object.entries(a)) el.setAttribute(k, String(v));
};
