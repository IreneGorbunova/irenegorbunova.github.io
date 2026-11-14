/**
 * Helpers shared by the widgets of the chapters «Отражение света. Плоское зеркало» and «Преломление света».
 * SVG coordinates are screen pixels (y down); angles are in degrees unless the name says rad.
 */

export const NS = 'http://www.w3.org/2000/svg';
export const RAD = Math.PI / 180;
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export type P = { x: number; y: number };
export const pt = (x: number, y: number): P => ({ x, y });
export const add = (a: P, b: P): P => pt(a.x + b.x, a.y + b.y);
export const sub = (a: P, b: P): P => pt(a.x - b.x, a.y - b.y);
export const mul = (a: P, k: number): P => pt(a.x * k, a.y * k);
export const dot = (a: P, b: P) => a.x * b.x + a.y * b.y;
export const len = (a: P) => Math.hypot(a.x, a.y);
export const norm = (a: P): P => mul(a, 1 / (len(a) || 1));
export const dist = (a: P, b: P) => len(sub(a, b));
/** unit vector pointing at screen angle a (degrees, 0 = right, 90 = down) */
export const dir = (a: number): P => pt(Math.cos(a * RAD), Math.sin(a * RAD));
/** mirror image of point p in the line through a and b */
export const reflectPoint = (p: P, a: P, b: P): P => {
	const u = norm(sub(b, a));
	const ap = sub(p, a);
	const foot = add(a, mul(u, dot(ap, u)));
	return sub(mul(foot, 2), p);
};
/** reflect direction d in a surface with unit normal n */
export const reflectDir = (d: P, n: P): P => sub(d, mul(n, 2 * dot(d, n)));

/** Intersection of segment p→q with segment a→b: parameter t along p→q, or null. */
export const segHit = (p: P, q: P, a: P, b: P): { t: number; u: number } | null => {
	const r = sub(q, p);
	const s = sub(b, a);
	const den = r.x * s.y - r.y * s.x;
	if (Math.abs(den) < 1e-12) return null;
	const ap = sub(a, p);
	const t = (ap.x * s.y - ap.y * s.x) / den;
	const u = (ap.x * r.y - ap.y * r.x) / den;
	return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { t, u } : null;
};
/** Intersection of two lines p1 + t·d1 and p2 + s·d2. */
export const lineX = (p1: P, d1: P, p2: P, d2: P): P | null => {
	const den = d1.x * d2.y - d1.y * d2.x;
	if (Math.abs(den) < 1e-12) return null;
	const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / den;
	return add(p1, mul(d1, t));
};

/**
 * Fraction of unpolarised light reflected at a boundary (Fresnel formulas).
 * n1 → n2, angle of incidence a (degrees). Returns 1 for total internal reflection.
 */
export const fresnelR = (n1: number, n2: number, a: number) => {
	const ci = Math.cos(a * RAD);
	const st = (n1 / n2) * Math.sin(a * RAD);
	if (st >= 1) return 1;
	const ct = Math.sqrt(1 - st * st);
	const rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct);
	const rp = (n1 * ct - n2 * ci) / (n1 * ct + n2 * ci);
	return (rs * rs + rp * rp) / 2;
};

/** «3,25», with a real minus sign; d decimals, trailing zeros removed when trim. */
export const fmt = (x: number, d = 1, trim = false) => {
	let s = (Math.abs(x) < 0.5 * 10 ** -d ? 0 : x).toFixed(d);
	if (trim && s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
	return s.replace('-', '−').replace('.', ',');
};
/** the same for KaTeX: 3{,}25 */
export const tex = (x: number, d = 1, trim = false) => fmt(x, d, trim).replace(',', '{,}').replace('−', '-');

/** SVG arc path around c from screen angle a0 to a1 (degrees), radius r, the short way. */
export const arcD = (c: P, r: number, a0: number, a1: number) => {
	let da = a1 - a0;
	while (da > 180) da -= 360;
	while (da < -180) da += 360;
	const p0 = add(c, mul(dir(a0), r));
	const p1 = add(c, mul(dir(a0 + da), r));
	return `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} A${r} ${r} 0 0 ${da > 0 ? 1 : 0} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
};
/** the point in the middle of that arc, at radius r */
export const arcMid = (c: P, r: number, a0: number, a1: number) => {
	let da = a1 - a0;
	while (da > 180) da -= 360;
	while (da < -180) da += 360;
	return add(c, mul(dir(a0 + da / 2), r));
};
/** screen angle (degrees) of vector v */
export const ang = (v: P) => Math.atan2(v.y, v.x) / RAD;

export const lineD = (pts: P[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

export const svgEl = <K extends keyof SVGElementTagNameMap>(
	tag: K,
	attrs: Record<string, string | number> = {},
	parent?: Element,
): SVGElementTagNameMap[K] => {
	const e = document.createElementNS(NS, tag);
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
	parent?.append(e);
	return e;
};
export const setA = (e: Element, attrs: Record<string, string | number>) => {
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
};

/** SVG point under the pointer */
export const svgPoint = (svg: SVGSVGElement, e: PointerEvent): P => {
	const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
	return pt(p.x, p.y);
};

/**
 * Make an SVG element draggable. onMove gets the pointer position in SVG coordinates
 * (minus the grab offset when keepOffset is set: then it is the new position of the anchor).
 */
export const draggable = (
	svg: SVGSVGElement,
	handle: Element,
	opts: { anchor?: () => P; onMove: (p: P) => void; onStart?: () => void; onEnd?: () => void },
) => {
	let id = -1;
	let off = pt(0, 0);
	handle.addEventListener('pointerdown', (ev) => {
		const e = ev as PointerEvent;
		if (e.button !== 0) return;
		id = e.pointerId;
		const p = svgPoint(svg, e);
		off = opts.anchor ? sub(opts.anchor(), p) : pt(0, 0);
		(handle as Element).setPointerCapture(e.pointerId);
		opts.onStart?.();
		e.preventDefault();
	});
	handle.addEventListener('pointermove', (ev) => {
		const e = ev as PointerEvent;
		if (e.pointerId !== id) return;
		opts.onMove(add(svgPoint(svg, e), off));
	});
	const end = (ev: Event) => {
		if ((ev as PointerEvent).pointerId !== id) return;
		id = -1;
		opts.onEnd?.();
	};
	handle.addEventListener('pointerup', end);
	handle.addEventListener('pointercancel', end);
};

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Run cb on every animation frame while the element is on screen (and motion is allowed). */
export const whileVisible = (el: Element, cb: (now: number) => void) => {
	let raf = 0;
	let on = false;
	const loop = (now: number) => {
		cb(now);
		if (on) raf = requestAnimationFrame(loop);
	};
	new IntersectionObserver((es) => {
		const vis = es.some((e) => e.isIntersecting);
		if (vis && !on && !reduceMotion()) {
			on = true;
			raf = requestAnimationFrame(loop);
		} else if (!vis && on) {
			on = false;
			cancelAnimationFrame(raf);
		}
	}).observe(el);
};
