/**
 * Helpers of the three small particle animations of the chapter «Электрический ток»
 * (OrderedMotion, MetalLattice, CurrentSection): a canvas that follows its CSS width, theme colours,
 * a charge glyph («+» / «−» on a coloured disc, as in the electrification chapter) and a loop that runs
 * only while the picture is on screen.
 */
import { themeColours } from './et';

export const COLOUR_VARS = [
	'--ig-vx',
	'--ig-vy',
	'--ig-v',
	'--sl-color-white',
	'--sl-color-black',
	'--sl-color-gray-2',
	'--sl-color-gray-3',
	'--sl-color-gray-4',
	'--sl-color-gray-5',
	'--sl-color-gray-6',
	'--sl-color-green-high',
	'--sl-color-orange',
];

export type Colours = Record<string, string>;
export const colours = (root: Element): Colours => themeColours(root, COLOUR_VARS);

/** Sets the canvas bitmap to its CSS width × `h` (sharp on retina screens); returns the width in CSS px. */
export const fitCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, h: number) => {
	const w = Math.max(1, Math.round(canvas.clientWidth));
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	canvas.width = Math.round(w * dpr);
	canvas.height = Math.round(h * dpr);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	return w;
};

/** A charge: a disc in the colour of its sign (+ red, − blue) with the sign drawn by lines. */
export const drawCharge = (ctx: CanvasRenderingContext2D, col: Colours, x: number, y: number, r: number, sign: 1 | -1, alpha = 1) => {
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, 2 * Math.PI);
	ctx.fillStyle = sign > 0 ? col['--ig-vy'] : col['--ig-vx'];
	ctx.fill();
	ctx.globalAlpha = 0.5 * alpha;
	ctx.lineWidth = 1;
	ctx.strokeStyle = col['--sl-color-white'];
	ctx.stroke();
	ctx.globalAlpha = alpha;
	const a = r * 0.55;
	ctx.strokeStyle = col['--sl-color-black'];
	ctx.lineWidth = Math.max(1.5, r * 0.3);
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(x - a, y);
	ctx.lineTo(x + a, y);
	if (sign > 0) {
		ctx.moveTo(x, y - a);
		ctx.lineTo(x, y + a);
	}
	ctx.stroke();
	ctx.globalAlpha = 1;
};

/** A horizontal arrow from x1 to x2 at height y with a filled head at x2. */
export const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, colour: string, width = 2) => {
	const dir = Math.sign(x2 - x1) || 1;
	ctx.strokeStyle = colour;
	ctx.fillStyle = colour;
	ctx.lineWidth = width;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(x1, y);
	ctx.lineTo(x2 - dir * 6, y);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x2 + dir * 1, y);
	ctx.lineTo(x2 - dir * 9, y - 5);
	ctx.lineTo(x2 - dir * 9, y + 5);
	ctx.closePath();
	ctx.fill();
};

/**
 * Calls `frame(dt, time)` on every animation frame while `root` is on screen (dt in s, at most 0.05).
 * `onResize` runs whenever the canvas changes its width.
 */
export const runWhileVisible = (root: Element, canvas: HTMLCanvasElement, frame: (dt: number, time: number) => void, onResize: () => void) => {
	let visible = false;
	let raf = 0;
	let last = 0;
	const tick = (time: number) => {
		const dt = last ? Math.min(0.05, (time - last) / 1000) : 0.016;
		last = time;
		frame(dt, time);
		raf = visible ? requestAnimationFrame(tick) : 0;
	};
	new ResizeObserver(() => {
		onResize();
		frame(0, performance.now());
	}).observe(canvas);
	new IntersectionObserver((entries) => {
		visible = entries.some((e) => e.isIntersecting);
		if (visible && !raf) {
			last = 0;
			raf = requestAnimationFrame(tick);
		}
	}).observe(root);
};

/** Small deterministic random generator (the same picture on every load). */
export const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
