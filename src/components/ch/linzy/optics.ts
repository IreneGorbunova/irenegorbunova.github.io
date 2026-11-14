/**
 * Thin-lens geometry shared by the lens components (build time and browser).
 *
 * World coordinates are centimetres: the lens stands at x = 0, the principal axis is y = 0,
 * the object is on the left (x = −d), light goes from left to right.
 * F is signed: F > 0 for a converging lens, F < 0 for a diverging one.
 * Distances follow the school convention 1/d + 1/f = 1/F: f > 0 for a real image
 * (right of the lens), f < 0 for a virtual one (left of the lens).
 */

export type P = [number, number];

export interface View {
	xmin: number;
	xmax: number;
	ymin: number;
	ymax: number;
	/** pixels per centimetre, the same on both axes */
	S: number;
	/** SVG size */
	w: number;
	h: number;
}

export const makeView = (xmin: number, xmax: number, ymin: number, ymax: number, S: number): View => ({
	xmin,
	xmax,
	ymin,
	ymax,
	S,
	w: (xmax - xmin) * S,
	h: (ymax - ymin) * S,
});

export const X = (v: View, x: number) => (x - v.xmin) * v.S;
export const Y = (v: View, y: number) => (v.ymax - y) * v.S;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** SVG path through world points. */
export const pathD = (v: View, pts: P[]) =>
	pts.length < 2 ? '' : pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(X(v, x))} ${r1(Y(v, y))}`).join(' ');

export interface Image {
	/** signed image distance; ±Infinity when the object is in the focal plane */
	f: number;
	/** signed magnification H/h: negative = inverted */
	m: number;
	finite: boolean;
	real: boolean;
}

export const lensImage = (d: number, F: number): Image => {
	if (Math.abs(d - F) < 1e-9) return { f: Infinity, m: Infinity, finite: false, real: false };
	const f = (d * F) / (d - F);
	return { f, m: -f / d, finite: true, real: f > 0 };
};

/** Where a ray from p in direction dir leaves the view rectangle. */
export const exitPoint = (v: View, p: P, dir: P): P => {
	let t = Infinity;
	const [x, y] = p;
	const [dx, dy] = dir;
	if (dx > 1e-12) t = Math.min(t, (v.xmax - x) / dx);
	if (dx < -1e-12) t = Math.min(t, (v.xmin - x) / dx);
	if (dy > 1e-12) t = Math.min(t, (v.ymax - y) / dy);
	if (dy < -1e-12) t = Math.min(t, (v.ymin - y) / dy);
	if (!Number.isFinite(t) || t < 0) t = 0;
	return [x + dx * t, y + dy * t];
};

export const inView = (v: View, [x, y]: P, pad = 0) =>
	x >= v.xmin + pad && x <= v.xmax - pad && y >= v.ymin + pad && y <= v.ymax - pad;

export interface Ray {
	/** the path light really takes, from the object point onwards */
	real: P[];
	/** dashed backward extension of the outgoing ray (virtual image), or empty */
	virt: P[];
	/** thin helper line (where the ray comes from or aims at), or empty */
	guide: P[];
	/** height at which the ray crosses the lens plane */
	yLens: number;
}

export interface Scene {
	img: Image;
	/** image tip, or null when there is no image */
	tip: P | null;
	/** 1: parallel to the axis, 2: through the optical centre, 3: through the front focus */
	rays: [Ray, Ray, Ray | null];
}

/**
 * The three characteristic rays from the tip of an object of height h at distance d.
 * lensHalf limits where ray 3 may meet the lens (beyond that it is dropped).
 */
export const traceScene = (v: View, d: number, h: number, F: number, lensHalf: number): Scene => {
	const img = lensImage(d, F);
	const A: P = [-d, h];
	const tip: P | null = img.finite ? [img.f, img.m * h] : null;
	// dashed backward extensions (virtual image only): to a little beyond the image,
	// and for ray 1 of a diverging lens at least to its focus, to show it passes through F
	const virtual = img.finite && !img.real;
	const backTo = (x: number) => Math.max(x - 1.5, v.xmin);
	const extend = (p: P, slope: number, xEnd: number): P[] =>
		virtual ? [p, [xEnd, p[1] + slope * (xEnd - p[0])]] : [];

	// 1: parallel to the axis, then along the line through (0, h) and the focus (F, 0)
	const s1 = -h / F;
	const ray1: Ray = {
		real: [A, [0, h], exitPoint(v, [0, h], [1, s1])],
		virt: extend([0, h], s1, backTo(Math.min(img.f, F < 0 ? F : img.f))),
		guide: [],
		yLens: h,
	};

	// 2: through the optical centre, undeviated
	const s2 = -h / d;
	const ray2: Ray = {
		real: [A, [0, 0], exitPoint(v, [0, 0], [1, s2])],
		// for a diverging lens the image lies on the incoming part itself, no extension needed
		virt: F > 0 ? extend([0, 0], s2, backTo(img.f)) : [],
		guide: [],
		yLens: 0,
	};

	// 3: along the line through the front focus (−F, 0), then parallel to the axis
	let ray3: Ray | null = null;
	if (Math.abs(d - F) > 1e-9) {
		const yc = (-h * F) / (d - F);
		if (Math.abs(yc) <= lensHalf) {
			const out = exitPoint(v, [0, yc], [1, 0]);
			let guide: P[] = [];
			if (F > 0 && d < F) guide = [[-F, 0], A]; // comes as if from the front focus
			if (F < 0) guide = [[0, yc], [-F, 0]]; // was aimed at the focus behind the lens
			ray3 = {
				real: [A, [0, yc], out],
				virt: extend([0, yc], 0, backTo(img.f)),
				guide,
				yLens: yc,
			};
		}
	}
	return { img, tip, rays: [ray1, ray2, ray3] };
};

/**
 * Lens outline (world points). Converging: biconvex, diverging: biconcave, both symmetric.
 * The surfaces are sphere caps with the radius a glass lens (n = 1.5) of this F would have,
 * R = 2(n − 1)|F|; `maxSag` flattens the caps for a schematic drawing of a tall lens.
 */
export const lensOutline = (
	half: number,
	F: number,
	opts: { n?: number; edge?: number; maxSag?: number; steps?: number } = {},
): P[] => {
	const n = opts.n ?? 1.5;
	const edge = opts.edge ?? 0.35;
	const steps = opts.steps ?? 24;
	const R = 2 * (n - 1) * Math.abs(F);
	const rim = R > half ? Math.sqrt(R * R - half * half) : 0;
	const full = R > half ? R - rim : half;
	const sag = opts.maxSag !== undefined ? Math.min(full, opts.maxSag) : full;
	// bulge of the surface above the rim plane at height y (0 at the rim, sag on the axis)
	const bulge = (y: number) => {
		const b = R > half ? Math.sqrt(R * R - y * y) - rim : full * Math.sqrt(Math.max(0, 1 - (y / half) ** 2));
		return (b / full) * sag;
	};
	const surf = (y: number) => edge / 2 + (F > 0 ? bulge(y) : sag - bulge(y));
	const pts: P[] = [];
	for (let i = 0; i <= steps; i++) {
		const y = half - (2 * half * i) / steps;
		pts.push([surf(y), y]);
	}
	for (let i = 0; i <= steps; i++) {
		const y = -half + (2 * half * i) / steps;
		pts.push([-surf(y), y]);
	}
	return pts;
};

export const closedPath = (v: View, pts: P[]) => `${pathD(v, pts)} Z`;

/* ---------- numbers ---------- */

/** Russian decimal format with a true minus sign. */
export const fmt = (x: number, digits = 1) =>
	x
		.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false })
		.replace('-', '−');

/** Like fmt, but drops a trailing ",0…" so whole numbers look whole. */
export const fmtSmart = (x: number, digits = 1) => {
	const r = Math.round(x * 10 ** digits) / 10 ** digits;
	return Number.isInteger(r) ? fmt(r, 0) : fmt(r, digits);
};

/** Number for KaTeX with a decimal comma. */
export const texNum = (x: number, digits = 1) => fmt(x, digits).replace('−', '-').replace(',', '{,}');

/** Is x a multiple of step (up to rounding noise)? */
export const isRound = (x: number, step: number) => Math.abs(x / step - Math.round(x / step)) < 1e-6;

export type Kind = {
	real: boolean;
	/** 1 = larger, 0 = same size, −1 = smaller */
	size: 1 | 0 | -1;
	inverted: boolean;
};

export const imageKind = (d: number, F: number): Kind | null => {
	const im = lensImage(d, F);
	if (!im.finite) return null;
	const a = Math.abs(im.m);
	return {
		real: im.real,
		size: Math.abs(a - 1) < 1e-6 ? 0 : a > 1 ? 1 : -1,
		inverted: im.m < 0,
	};
};

/** Where the object stands relative to F and 2F (converging lens). */
export type Zone = 'far' | 'twoF' | 'between' | 'focus' | 'near';
export const zoneOf = (d: number, F: number): Zone => {
	const e = 1e-6;
	if (Math.abs(d - 2 * F) < e) return 'twoF';
	if (Math.abs(d - F) < e) return 'focus';
	if (d > 2 * F) return 'far';
	if (d > F) return 'between';
	return 'near';
};

/**
 * Schematic lens, as on school drawings: a segment of the lens plane (x = 0) from −half to half with an arrowhead at
 * each end. t = 1: the heads point outwards (converging lens), t = 0: inwards (diverging lens); in between they
 * flatten, which lets a model morph one symbol into the other. head and wing: the head's length and half width.
 * The path is open (stroke it, no fill).
 */
export const lensSymbol = (v: View, half: number, t: number, head: number, wing: number) => {
	const apex = half - head * (1 - t);
	const barb = half - head * t;
	const p = (x: number, y: number) => `${r1(X(v, x))} ${r1(Y(v, y))}`;
	return [
		`M${p(0, -apex)} L${p(0, apex)}`,
		`M${p(-wing, barb)} L${p(0, apex)} L${p(wing, barb)}`,
		`M${p(-wing, -barb)} L${p(0, -apex)} L${p(wing, -barb)}`,
	].join(' ');
};
