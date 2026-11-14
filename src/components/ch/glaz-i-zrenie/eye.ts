/**
 * The eye as a school optical system, shared by the pictures (build time) and the model (browser).
 *
 * Millimetres; the light goes from left to right along the axis y = 0. The cornea and the crystalline lens together
 * act as one thin converging lens at x = 0 (the optical centre of the eye), as in the chapter «Линзы». The retina
 * crosses the axis at x = L. Optical power is in dioptres; 1 дптр = 1/1000 mm⁻¹.
 *
 *   relaxed eye: D0 = 60 дптр (F = 16,7 mm); the lens can add up to A = 6 дптр (an adult of about forty);
 *   normal eye: L = 1000/60 mm, the image of a far object lies on the retina with the lens relaxed;
 *   short-sighted (axial myopia, −4 дптр): L = 1000/56 = 17,9 mm, the eyeball is 1,2 mm longer;
 *   long-sighted (hyperopia, +4 дптр): L = 1000/64 = 15,6 mm, the eyeball is 1,0 mm shorter.
 * Glasses: a thin lens G = 12 mm in front of the optical centre (about 6 mm in front of the cornea).
 * Vergences (in дптр) follow light from left to right: −1/d of a point at distance d, 0 for parallel rays.
 *
 * The drawing: the cornea apex at x = −5,5; the eyeball is an ellipse through the edge of the cornea (−2,92; ±5,8)
 * and through x = L + 0,6 at the back (the sclera behind the retina); the retina is the inner ellipse 0,6 mm inside it.
 * The crystalline lens: front surface radius 10 → 6,4 mm, back 6 → 5,4 mm, thickness 3,6 → 4,0 mm as the eye
 * accommodates by 0 → 6 дптр; its edge comes in from 4,8 to 4,4 mm (real proportions of an adult lens).
 */

export type P = [number, number];

export const D0 = 60;
export const A = 6;
export const PUPIL = 4; // mm, diameter
export const G = 12; // mm from the glasses to the optical centre of the eye
export const TOL = 0.3; // дптр: a smaller defocus is not noticed (the depth of focus of the eye)

export type Kind = 'normal' | 'myopic' | 'hyperopic';
export const EYE_L: Record<Kind, number> = {
	normal: 1000 / 60,
	myopic: 1000 / 56,
	hyperopic: 1000 / 64,
};

/* ---------- optics ---------- */

/** Vergence (дптр) of light from an object at d mm (Infinity = parallel rays) after glasses of power Pg, at the eye. */
export const vergenceAtEye = (d: number, Pg: number) => {
	const v0 = Number.isFinite(d) ? -1000 / (d - G) : 0; // at the glasses
	const v1 = v0 + Pg;
	if (Math.abs(v1) < 1e-12) return 0;
	// transfer over G mm: the glasses' image is at 1000/v1 mm after them
	return v1 / (1 - (G / 1000) * v1);
};

/** Accommodation (дптр) the eye needs for an image on its retina, and what it can do (0 … A). */
export const accommodation = (d: number, Pg: number, L: number) => {
	const need = 1000 / L - D0 - vergenceAtEye(d, Pg);
	return { need, a: Math.min(A, Math.max(0, need)) };
};

/** Signed defocus (дптр) at the retina: > 0 — the image is in front of the retina, < 0 — behind it. */
export const defocus = (d: number, Pg: number, L: number, a: number) => vergenceAtEye(d, Pg) + D0 + a - 1000 / L;

/** Object distance (mm from the optical centre) whose image falls on the retina with accommodation a, or Infinity. */
export const sharpAt = (Pg: number, L: number, a: number) => {
	const ve = 1000 / L - D0 - a; // vergence needed at the eye
	const vg = ve / (1 + (G / 1000) * ve); // … and right after the glasses
	const v0 = vg - Pg; // … and in front of the glasses
	if (v0 >= -1e-9) return Infinity; // parallel or converging light would be needed: no real object
	return G - 1000 / v0;
};

/** The range of clear vision [near, far] in mm, or null when the eye sees nothing sharply. */
export const clearRange = (Pg: number, L: number): [number, number] | null => {
	const far = sharpAt(Pg, L, 0);
	const near = sharpAt(Pg, L, A);
	if (!Number.isFinite(near)) return null;
	return [near, far];
};

/**
 * Rays from a point of the axis at distance d (or parallel rays) through the glasses (Pg, 0 = none) and the eye
 * (power D0 + a), filling a pupil of diameter `pupil`. Each ray: the points it passes until it meets the retina.
 * Also the point where the rays meet (x, mm), or null when they do not converge.
 */
export const traceAxis = (d: number, Pg: number, L: number, a: number, xStart: number, n = 5, pupil = PUPIL) => {
	const g = globe(L);
	const De = (D0 + a) / 1000;
	const Pgm = Pg / 1000;
	const rays: P[][] = [];
	for (let i = 0; i < n; i++) {
		const ye = -pupil / 2 + (pupil * i) / (n - 1); // height at the eye
		// the ray in front of the glasses: from the object point (−d, 0) with slope s0, through the glasses at yg
		// at the eye: ye = yg + s1·G, s1 = s0 − yg·Pg, yg = s0·(d − G)  →  solve for s0
		let s0: number;
		let yg: number;
		if (Number.isFinite(d)) {
			s0 = ye / (d - G + G - (d - G) * Pgm * G);
			yg = s0 * (d - G);
		} else {
			s0 = 0;
			yg = ye / (1 - Pgm * G);
		}
		const pts: P[] = [];
		const hasG = Math.abs(Pg) > 1e-9;
		const xg = -G;
		// start: on the incoming line at xStart (or at the object point if it is inside the view)
		const yAt = (x: number) => (Number.isFinite(d) ? s0 * (x + d) : yg);
		const x0 = Number.isFinite(d) ? Math.max(xStart, -d) : xStart;
		if (hasG) {
			pts.push([x0, yAt(x0)], [xg, yg]);
		} else {
			// no glasses: the incoming line goes straight to the eye
			const s = Number.isFinite(d) ? ye / d : 0;
			pts.push([x0, ye + s * x0]);
		}
		const s1 = hasG ? (Number.isFinite(d) ? s0 : 0) - yg * Pgm : Number.isFinite(d) ? ye / d : 0;
		pts.push([0, ye]);
		const s2 = s1 - ye * De;
		pts.push(hitRetina(g, [0, ye], s2));
		rays.push(pts);
	}
	const v = vergenceAtEye(d, Pg) + D0 + a;
	return { rays, focus: v > 1e-9 ? 1000 / v : null };
};

/** Height (mm) of the image of an object of height h (mm) at distance d on the retina, by the ray through the centre. */
export const imageHeight = (d: number, h: number, Pg: number, L: number) => {
	if (!Number.isFinite(d)) return 0;
	// the glasses make an image of the object; the eye looks at it
	if (Math.abs(Pg) < 1e-9) return (-h * L) / d;
	const dg = d - G; // object from the glasses, mm
	const vin = -1000 / dg;
	const v = vin + Pg;
	if (Math.abs(v) < 1e-9) return 0; // the glasses send the light out parallel: no finite image to look at
	const fg = 1000 / v; // image after the glasses (negative = virtual, in front of them)
	const hg = (h * vin) / v; // its height (magnification = incoming / outgoing vergence)
	const dEye = G - fg; // its distance in front of the eye (negative = behind it)
	// the ray through the optical centre of the eye towards the tip of that image
	return (-hg * L) / dEye;
};

/* ---------- drawing ---------- */

export interface Globe {
	cx: number;
	ax: number;
	ay: number;
	/** the retina: the inner ellipse */
	rx: number;
	ry: number;
	L: number;
}

const LIMBUS: P = [-2.92, 5.8];
export const globe = (L: number): Globe => {
	const ay = 11.6;
	const s = Math.sqrt(1 - (LIMBUS[1] / ay) ** 2);
	const ax = (L + 0.6 - LIMBUS[0]) / (1 + s);
	const cx = L + 0.6 - ax;
	return { cx, ax, ay, rx: ax - 0.6, ry: ay - 0.6, L };
};

/** Where a ray from p with slope s meets the retina (the inner ellipse), going to the right. */
export const hitRetina = (g: Globe, p: P, s: number): P => {
	// ((x − cx)/rx)² + ((p1 + s(x − p0))/ry)² = 1
	const [x0, y0] = p;
	const a = 1 / g.rx ** 2 + (s * s) / g.ry ** 2;
	const b = (-2 * g.cx) / g.rx ** 2 + (2 * s * (y0 - s * x0)) / g.ry ** 2;
	const c = g.cx ** 2 / g.rx ** 2 + (y0 - s * x0) ** 2 / g.ry ** 2 - 1;
	const disc = Math.max(0, b * b - 4 * a * c);
	const x = (-b + Math.sqrt(disc)) / (2 * a);
	return [x, y0 + s * (x - x0)];
};

/** Points of an ellipse arc (angles in radians from the +x direction). */
const arc = (cx: number, rx: number, ry: number, t0: number, t1: number, n = 48): P[] => {
	const pts: P[] = [];
	for (let i = 0; i <= n; i++) {
		const t = t0 + ((t1 - t0) * i) / n;
		pts.push([cx + rx * Math.cos(t), ry * Math.sin(t)]);
	}
	return pts;
};

/** The sclera: from the edge of the cornea at the top round the back to the edge at the bottom. */
export const scleraPts = (g: Globe): P[] => {
	const t = Math.acos((LIMBUS[0] - g.cx) / g.ax); // angle of the limbus
	return arc(g.cx, g.ax, g.ay, t, -t, 72);
};

/** The retina: the inner ellipse from about the ciliary body round the back. */
export const retinaPts = (g: Globe): P[] => {
	const x = 1.6; // the front edge of the retina (ora serrata)
	const t = Math.acos(Math.max(-1, Math.min(1, (x - g.cx) / g.rx)));
	return arc(g.cx, g.rx, g.ry, t, -t, 72);
};

/** The cornea: the outer surface (radius 7,8 mm, apex at −5,5) between the edges. */
export const corneaPts = (): P[] => {
	const R = 7.8;
	const c = -5.5 + R;
	const t = Math.asin(LIMBUS[1] / R);
	const pts: P[] = [];
	for (let i = 0; i <= 24; i++) {
		const u = -t + (2 * t * i) / 24;
		pts.push([c - R * Math.cos(u), R * Math.sin(u)]);
	}
	return pts;
};

/** The inner surface of the cornea (0,55 mm thinner in the middle). */
export const corneaInnerPts = (): P[] => {
	const R = 6.6;
	const c = -4.95 + R;
	const yEdge = 5.5;
	const t = Math.asin(yEdge / R);
	const pts: P[] = [];
	for (let i = 0; i <= 24; i++) {
		const u = -t + (2 * t * i) / 24;
		pts.push([c - R * Math.cos(u), R * Math.sin(u)]);
	}
	return pts;
};

/** The crystalline lens for accommodation a (0 … A), and its edge height. */
export const lensShape = (a: number) => {
	const k = Math.max(0, Math.min(1, a / A));
	const R1 = 10 - 3.6 * k;
	const R2 = 6 - 0.6 * k;
	const xf = -1.8 - 0.3 * k; // front apex
	const xb = 1.8 + 0.12 * k; // back apex
	const sag = (R: number, y: number) => R - Math.sqrt(Math.max(0, R * R - y * y));
	const thick = xb - xf;
	// the edge: where the two surfaces meet
	let lo = 0;
	let hi = Math.min(R1, R2);
	for (let i = 0; i < 40; i++) {
		const m = (lo + hi) / 2;
		if (sag(R1, m) + sag(R2, m) < thick) lo = m;
		else hi = m;
	}
	const edge = lo;
	const n = 20;
	const pts: P[] = [];
	for (let i = 0; i <= n; i++) {
		const y = edge - (2 * edge * i) / n;
		pts.push([xf + sag(R1, y), y]);
	}
	for (let i = 0; i <= n; i++) {
		const y = -edge + (2 * edge * i) / n;
		pts.push([xb - sag(R2, y), y]);
	}
	return { pts, edge, xf, xb };
};

/** The iris: two bars just in front of the lens, from the pupil to the root. */
export const irisBars = (xf: number, pupil = PUPIL): [P, P][] => {
	const x = xf - 0.15;
	return [
		[
			[x, pupil / 2],
			[x - 0.5, 5.7],
		],
		[
			[x, -pupil / 2],
			[x - 0.5, -5.7],
		],
	];
};

/** The optic nerve leaves the eyeball 3,5 mm below the axis (to the nose in a view from above). */
export const nervePts = (g: Globe): P[] => {
	const yc = -3.6;
	const w = 1.6;
	const xAt = (y: number) => g.cx + g.ax * Math.sqrt(Math.max(0, 1 - (y / g.ay) ** 2));
	const top = yc + w;
	const bot = yc - w;
	return [
		[xAt(top) - 0.3, top],
		[xAt(top) + 4.5, top - 1.2],
		[xAt(bot) + 4.5, bot - 1.2],
		[xAt(bot) - 0.3, bot],
	];
};

/* ---------- view (pixels) ---------- */

export interface View {
	xmin: number;
	xmax: number;
	ymin: number;
	ymax: number;
	S: number;
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
export const pathD = (v: View, pts: P[]) =>
	pts.length < 2 ? '' : pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(X(v, x))} ${r1(Y(v, y))}`).join(' ');
export const closed = (v: View, pts: P[]) => `${pathD(v, pts)} Z`;

/** Glasses lens outline (schematic): biconvex for Pg > 0, biconcave for Pg < 0, flat for 0. */
export const glassesPts = (Pg: number, half = 8.5, edge = 0.9): P[] => {
	const sag = Math.min(1.6, Math.abs(Pg) * 0.28);
	const surf = (y: number) => {
		const b = sag * (1 - (y / half) ** 2);
		return edge / 2 + (Pg > 0 ? b : sag - b);
	};
	const n = 16;
	const pts: P[] = [];
	for (let i = 0; i <= n; i++) {
		const y = half - (2 * half * i) / n;
		pts.push([-G + surf(y), y]);
	}
	for (let i = 0; i <= n; i++) {
		const y = -half + (2 * half * i) / n;
		pts.push([-G - surf(y), y]);
	}
	return pts;
};

/** Russian decimal format with a true minus sign. */
export const fmt = (x: number, digits = 1) =>
	x
		.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false })
		.replace('-', '−');

/** Everything needed to draw the eye in a view: SVG path strings. a — accommodation, pupil — its diameter. */
export const eyeParts = (v: View, L: number, a: number, pupil = PUPIL) => {
	const g = globe(L);
	const sclera = scleraPts(g);
	const cornea = corneaPts();
	const lens = lensShape(a);
	const k = Math.max(0, Math.min(1, a / A));
	// the ciliary muscle contracts towards the lens when the eye accommodates; the fibres holding the lens slacken
	const cy = 6.35 - 0.3 * k;
	const ciliary = [1, -1].map((s) => ({ cx: X(v, 0.9), cy: Y(v, s * cy), rx: 1.25 * v.S, ry: 0.7 * v.S }));
	const zonules = [1, -1].flatMap((s) =>
		[-0.45, 0, 0.45].map((dx) =>
			pathD(v, [
				[0.9 + dx, s * (cy - 0.6)],
				[(lens.xf + lens.xb) / 2 + dx * 0.6 - 0.2, s * lens.edge],
			]),
		),
	);
	return {
		globe: closed(v, [...sclera, ...cornea]),
		sclera: pathD(v, sclera),
		cornea: pathD(v, cornea),
		chamber: closed(v, [...cornea, ...corneaInnerPts().reverse()]),
		lens: closed(v, lens.pts),
		lensFront: lens.xf,
		iris: irisBars(lens.xf, pupil).map((b) => pathD(v, b)),
		retina: pathD(v, retinaPts(g)),
		nerve: closed(v, nervePts(g)),
		ciliary,
		zonules,
		g,
	};
};
