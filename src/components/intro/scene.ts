/**
 * The runner of the opening scenes (IntroFrame.astro): each card loops PRE s of its start frame, `run` s of the
 * scene and HOLD s of its end frame while it is on screen; «Повторить» restarts it. With reduced motion a card shows
 * its end frame and «Повторить» plays it once.
 */
export const PRE = 0.5; // s of the start frame before each run
export const HOLD = 2.5; // s of the final frame before the loop restarts
export const clamp = (x: number) => Math.min(1, Math.max(0, x));
export const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Animation loop that runs only while `el` is on screen. */
export const loop = (el: Element, step: (dt: number) => boolean) => {
	let raf = 0;
	let last = 0;
	let visible = false;
	const frame = (now: number) => {
		const dt = Math.min((now - (last || now)) / 1000, 1 / 20);
		last = now;
		const busy = step(dt);
		raf = visible && busy ? requestAnimationFrame(frame) : 0;
	};
	const wake = () => {
		if (!raf && visible) {
			last = 0;
			raf = requestAnimationFrame(frame);
		}
	};
	new IntersectionObserver((entries) => {
		visible = entries.some((e) => e.isIntersecting);
		if (visible) wake();
	}).observe(el);
	return wake;
};

/** One scene: `draw(x)` with x from 0 (start) to 1 (end); loops PRE + run + HOLD while visible. */
export const scene = (card: HTMLElement, run: number, draw: (x: number) => void) => {
	let t = 0;
	let once = false; // reduced motion: «Повторить» plays the scene once
	const cycle = PRE + run + HOLD;
	const show = () => draw(clamp((t - PRE) / run));
	const wake = loop(card, (dt) => {
		if (reduce() && !once) {
			t = PRE + run;
			show();
			return false;
		}
		t += dt;
		if (once && t >= PRE + run) {
			once = false;
			t = PRE + run;
			show();
			return false;
		}
		if (t >= cycle) t = 0;
		show();
		return true;
	});
	card.querySelector('[data-again]')!.addEventListener('click', () => {
		t = 0;
		once = reduce();
		show();
		wake();
	});
	t = reduce() ? PRE + run : 0;
	show();
};
