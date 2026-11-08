/**
 * The origin story as a pure function of the timeline position u (seconds of the show): render(u) draws the frame
 * from scratch. Seeded particles move on analytic paths; the only integrals (orbital clocks, the Moon's angle, the
 * Earth's spin) are tabulated once at start. World coordinates: astronomical units in the plane of the disk
 * (x to the right, y away from the viewer, z to the north); orbits run counter-clockwise seen from the north.
 */
import { drawGlobe, mapBuilder, type Maps, type Tex } from './globe';

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sstep = (a: number, b: number, x: number) => {
	const t = clamp((x - a) / (b - a), 0, 1);
	return t * t * (3 - 2 * t);
};
const RE = 6371 / 149597870.7; // the Earth's radius in AU
const R0 = 25000; // the cloud's radius, AU

// ---------- timeline ----------
export const DUR = [8, 10, 9, 11, 7, 11, 14, 9, 9, 9];
export const U: number[] = DUR.reduce((a, d) => (a.push(a[a.length - 1] + d), a), [0]);
export const TOTAL = U[U.length - 1];
export const stageAt = (u: number) => {
	for (let k = DUR.length - 1; k >= 0; k--) if (u >= U[k] - 1e-6) return k;
	return 0;
};

// ---------- small helpers ----------
const rng = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(TAU * r());

/** Monotone cubic interpolation through (xs, ys): smooth camera moves without overshoot. */
const mono = (xs: number[], ys: number[]) => {
	const n = xs.length;
	const d: number[] = [], m: number[] = [];
	for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
	m[0] = d[0];
	m[n - 1] = d[n - 2];
	for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
	for (let i = 0; i < n - 1; i++) {
		if (d[i] === 0) {
			m[i] = m[i + 1] = 0;
			continue;
		}
		const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
		if (s > 9) {
			const t = 3 / Math.sqrt(s);
			m[i] = t * a * d[i];
			m[i + 1] = t * b * d[i];
		}
	}
	return (x: number) => {
		if (x <= xs[0]) return ys[0];
		if (x >= xs[n - 1]) return ys[n - 1];
		let i = 0;
		while (x > xs[i + 1]) i++;
		const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
		return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
	};
};

// ---------- camera ----------
// [u, span (AU, or Earth radii when the value is negative), tilt from the north pole, degrees]
const KEYS: [number, number, number][] = [
	[0, 72000, 58],
	[U[1], 60000, 60],
	[U[1] + 4, 9000, 66],
	[U[2], 400, 72],
	[U[2] + 2, 160, 66],
	[U[3], 120, 60],
	[U[3] + 3, 14, 54],
	[U[4], 12.5, 52],
	[U[5], 14, 48],
	[U[5] + 3, 5, 42],
	[U[6], 3.4, 40],
	[U[6] + 3.2, -20, 36],
	[U[6] + 8, -15, 36],
	[U[7], -13, 38],
	[U[8], -26, 45],
	[U[8] + 3.5, -5, 60],
	[U[9], -4.6, 62],
	[U[9] + 3, -11, 64],
	[TOTAL, -11.5, 64],
];
const spanF = mono(KEYS.map((k) => k[0]), KEYS.map((k) => Math.log((k[1] < 0 ? -k[1] * RE : k[1]))));
const tiltF = mono(KEYS.map((k) => k[0]), KEYS.map((k) => k[2]));
export const spanAt = (u: number) => Math.exp(spanF(u));

// ---------- clocks (tabulated integrals) ----------
const STEP = 1 / 120;
const NT = Math.ceil(TOTAL / STEP) + 2;
const tab = (rate: (u: number) => number) => {
	const t = new Float64Array(NT);
	let prev = rate(0);
	for (let i = 1; i < NT; i++) {
		const r = rate(i * STEP);
		t[i] = t[i - 1] + 0.5 * (prev + r) * STEP;
		prev = r;
	}
	return (u: number) => {
		const x = clamp(u / STEP, 0, NT - 1.001);
		const i = Math.floor(x);
		return t[i] + (t[i + 1] - t[i]) * (x - i);
	};
};
/** Orbital clock of the Solar System, years per second of the show: slower as the camera zooms in. */
const tauRate = (u: number) => 12.8 * Math.pow(Math.min(spanAt(u), 300) / 150, 1.4);
const tauSys = tab(tauRate);
const omegaYr = (a: number) => TAU / Math.pow(a, 1.5); // rad per year at a AU

/** The Earth–Moon clock, hours per second of the show. */
const locRate = (u: number) => 1.2 + 0.4 * sstep(U[7], U[7] + 2, u) + 1.4 * sstep(U[9], U[9] + 3, u);
const tauLoc = tab(locRate);
/** The Moon's distance in Earth radii (true values; the last view draws it closer). */
export const moonA = (u: number) =>
	u < U[7] ? 3.8 : u < U[8] ? lerp(3.8, 9, sstep(U[7], U[8], u)) : u < U[9] ? lerp(9, 15, sstep(U[8], U[9], u)) : lerp(15, 60.34, sstep(U[9], U[9] + 5, u) ** 1.6);
const P_SURF = 1.4058; // h, orbital period at the Earth's surface
const omegaH = (a: number) => TAU / (P_SURF * Math.pow(a, 1.5)); // rad per hour at a Earth radii
// angular momentum of the Earth–Moon system is conserved: I·ω + μ·√(G(M+m)a) = const (today's values)
const G = 6.674e-11, ME = 5.972e24, MM = 7.342e22, REm = 6.371e6;
const IE = 0.3307 * ME * REm * REm, MU = (ME * MM) / (ME + MM);
const lorb = (aR: number) => MU * Math.sqrt(G * (ME + MM) * aR * REm);
const LTOT = (IE * TAU) / (23.9345 * 3600) + lorb(3.844e8 / REm);
/** Length of the day (sidereal), hours, when the Moon is at aR Earth radii. */
export const dayHours = (aR: number) => TAU / ((LTOT - lorb(aR)) / IE) / 3600;
const moonPhase = tab((u) => omegaH(moonA(u)) * locRate(u));
const earthSpin = tab((u) => (TAU / dayHours(moonA(u))) * locRate(u));

// ---------- the Earth's place ----------
const PSI_E = 0.35; // the Earth's angle from the Sun at the moment of the zoom (the Sun is then to the left)
const TAU_END = tauSys(TOTAL);
const earthPos = (u: number): [number, number] => {
	const p = PSI_E + omegaYr(1) * (tauSys(u) - TAU_END);
	return [Math.cos(p), Math.sin(p)];
};

// ---------- the cloud and the disk: gas tracers ----------
type Gas = {
	s1: number; f1: number; z1: number; rc: number; zc: number; us: number; D: number; ul: number;
	lr: number; C: number; fl: number; tl: number; om: number; size: number; dust: boolean; star: boolean;
	px: number; py: number; pz: number; dx: number; dy: number; dz: number; dsn: number;
};
const SN: [number, number, number] = [-3.6 * R0, 0.9 * R0, 0.3 * R0];
const SN_T0 = 1.2, SN_T1 = 7.2;
const shellR = (u: number) => (Math.hypot(...SN) * (u - SN_T0)) / (SN_T1 - SN_T0);
const OMC = 0.016; // slow spin of the cloud, rad/s
const PUSH = 0.1 * R0;

const makeGas = (): Gas[] => {
	const r = rng(20261108);
	const N = 1500;
	const clumps = Array.from({ length: 10 }, () => ({
		x: gauss(r) * 0.45 * R0 * 1.25, y: gauss(r) * 0.45 * R0, z: gauss(r) * 0.3 * R0,
		s: (0.16 + 0.2 * r()) * R0, w: 0.4 + r(),
	}));
	const wsum = clumps.reduce((a, c) => a + c.w, 0);
	const pts: [number, number, number][] = [];
	for (let i = 0; i < N; i++) {
		if (r() < 0.3) {
			// diffuse gas
			let x, y, z;
			do {
				x = (r() * 2 - 1) * 1.1;
				y = (r() * 2 - 1) * 1.1;
				z = (r() * 2 - 1) * 0.8;
			} while (x * x + y * y + z * z > 1);
			pts.push([x * R0 * 1.2, y * R0, z * R0]);
		} else {
			let q = r() * wsum, c = clumps[0];
			for (const k of clumps) if ((q -= k.w) <= 0) { c = k; break; }
			pts.push([c.x + gauss(r) * c.s * 1.3, c.y + gauss(r) * c.s, c.z + gauss(r) * c.s * 0.8]);
		}
	}
	// the further from the axis, the larger the angular momentum, the further out the gas lands in the disk
	const order = pts.map((p, i) => [Math.hypot(p[0], p[1]), i]).sort((a, b) => a[0] - b[0]);
	const rank = new Array<number>(N);
	order.forEach(([, i], k) => (rank[i] = k / (N - 1)));
	const rmax = Math.max(...pts.map((p) => Math.hypot(...p)));
	return pts.map((p, i) => {
		const star = r() < 0.2;
		const rc = star ? 0.05 : 0.3 * Math.pow(150 / 0.3, Math.pow(rank[i], 0.7));
		const q = Math.hypot(...p) / rmax;
		const us = U[1] + 0.3 + 6.6 * q;
		const D = 1.4 + 3.2 * q;
		const ul = us + D;
		// the supernova shock pushes the gas away from the explosion
		const dsn = Math.hypot(p[0] - SN[0], p[1] - SN[1], p[2] - SN[2]);
		const n = [(p[0] - SN[0]) / dsn, (p[1] - SN[1]) / dsn, (p[2] - SN[2]) / dsn];
		const pass = sstep(0, 0.3 * R0, shellR(us) - dsn);
		const x1 = p[0] + n[0] * PUSH * pass, y1 = p[1] + n[1] * PUSH * pass, z1 = p[2] + n[2] * PUSH * pass;
		const s1 = Math.hypot(x1, y1), f1 = Math.atan2(y1, x1) + OMC * us;
		// the radius shrinks geometrically, ρ = s·(rc/s)^x, and the gas keeps its angular momentum: dφ/dx ∝ 1/ρ²
		const lr = Math.log(s1 / rc);
		const om = omegaYr(rc);
		const C = om * tauRate(ul) * rc * rc * D;
		const fl = f1 + (C * (Math.exp(2 * lr) - 1)) / (2 * lr * s1 * s1);
		return {
			s1, f1, z1, rc, zc: rc * 0.035 * gauss(r), us, D, ul, lr, C, fl, tl: tauSys(ul), om,
			size: 0.6 + 0.8 * r(), dust: r() < 0.22, star,
			px: p[0], py: p[1], pz: p[2], dx: n[0], dy: n[1], dz: n[2], dsn,
		};
	});
};

// ---------- planetesimals, embryos, planets ----------
type Body = { a: number; f: number; z: number; ice: boolean; size: number };
const makeBits = (): Body[] => {
	const r = rng(77);
	return Array.from({ length: 560 }, () => {
		const a = 0.35 * Math.pow(16 / 0.35, r());
		return { a, f: r() * TAU, z: a * 0.02 * gauss(r), ice: a > 2.7, size: 0.7 + 0.6 * r() };
	});
};

type Embryo = { a: number; f: number; R: number; parent: number; m: number; lost?: boolean };
// final planets (true radii in Earth radii) and the embryos that merge into them; m — merge time within stage 6 (0…1)
const PLANETS = [
	{ name: 'Меркурий', a: 0.387, R: 0.38, f: 2.4 },
	{ name: 'Венера', a: 0.723, R: 0.95, f: 4.3 },
	{ name: 'Земля', a: 1.0, R: 1.0, f: 0 },
	{ name: 'Марс', a: 1.524, R: 0.53, f: 1.2 },
];
const FAMILY: [number, number, number][] = [
	// [a, planet, m]
	[0.33, 0, 0.22], [0.45, 0, 0.48],
	[0.58, 1, 0.12], [0.64, 1, 0.33], [0.8, 1, 0.52], [0.86, 1, 0.7],
	[0.9, 2, 0.18], [0.94, 2, 0.4], [1.1, 2, 0.58], [1.17, 2, 0.76], [1.26, 2, 0.9],
	[1.4, 3, 0.42],
];
const LOST = [1.72, 1.88, 2.0];
const M0 = U[5] + 1.4, M1 = U[6] - 2.2; // merges happen between these moments
const THEIA_A = 1.07;

// ---------- the Earth–Moon system ----------
const TH_R = 0.53; // Theia's radius in Earth radii (the size of Mars)
const B_IMP = (1 + TH_R) * Math.SQRT1_2; // impact parameter for a 45° blow
const P0: [number, number] = [-8.5, -B_IMP];
const U_Z1 = U[6] + 3.2; // zoom ends
const U_C = U[6] + 5.5; // contact
const TH_ACC = 1.0;
const xContact = -Math.sqrt((1 + TH_R) ** 2 - (Math.SQRT1_2 * (1 + TH_R)) ** 2);
const TH_V = (xContact - P0[0] - 0.5 * TH_ACC * (U_C - U_Z1) ** 2) / (U_C - U_Z1);
const TH_C = Math.atan2(-Math.SQRT1_2 * (1 + TH_R), xContact); // direction of the contact point from the Earth's centre

type Bit = { a: number; d: number; e: number; z: number; t: number; size: number; ph: number };
const makeEjecta = (): Bit[] => {
	const r = rng(4510);
	return Array.from({ length: 650 }, () => {
		const a = 1.08 + 5.4 * Math.pow(r(), 1.7);
		return { a, d: 0.9 * r(), e: 0.18 * gauss(r), z: 0.05 * a * gauss(r), t: r(), size: 0.7 + 0.7 * r(), ph: r() * TAU };
	});
};

// ---------- drawing ----------
type Cam = { cx: number; cy: number; k: number; ct: number; st: number; W: number; H: number; tilt: number; span: number };

const SPRITES: Record<string, [number, number, number]> = {
	cold: [140, 150, 255], rose: [235, 120, 150], warm: [255, 150, 80], hot: [255, 210, 150], white: [255, 245, 230],
	lava: [255, 170, 70], ember: [255, 90, 40], neb: [120, 140, 255], neb2: [175, 135, 240],
};

export type Scene = {
	resize: (w: number, h: number, dpr: number) => void;
	render: (u: number) => void;
	readout: (u: number) => { when: string; rel: string; live: string; note: string };
	drawMs: number[];
	prepare: () => boolean;
};

export const createScene = (canvas: HTMLCanvasElement, font: string): Scene => {
	const ctx = canvas.getContext('2d')!;
	let W = 0, H = 0, dpr = 1, sc = 1;
	const stars = document.createElement('canvas');
	const sky = document.createElement('canvas');
	const both = document.createElement('canvas');
	// the soft puffs of the cloud are drawn into a half-resolution layer: they are blurry anyway, and it saves the fill rate
	const haze = document.createElement('canvas');
	const hctx = haze.getContext('2d')!;
	const HS = 0.35;
	const sprites: Record<string, HTMLCanvasElement> = {};
	for (const [name, [r, g, b]] of Object.entries(SPRITES)) {
		const c = document.createElement('canvas');
		c.width = c.height = 64;
		const x = c.getContext('2d')!;
		const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
		if (name.startsWith('neb')) {
			// a soft Gaussian puff for the cloud
			for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, `rgba(${r},${g},${b},${Math.exp(-((i / 8) ** 2) * 4.5) * (1 - i / 8)})`);
		} else {
			gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
			gr.addColorStop(0.35, `rgba(${r},${g},${b},0.45)`);
			gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
		}
		x.fillStyle = gr;
		x.fillRect(0, 0, 64, 64);
		sprites[name] = c;
	}
	const dustSprite = (() => {
		const c = document.createElement('canvas');
		c.width = c.height = 64;
		const x = c.getContext('2d')!;
		const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
		gr.addColorStop(0, 'rgba(10,6,12,0.9)');
		gr.addColorStop(1, 'rgba(10,6,12,0)');
		x.fillStyle = gr;
		x.fillRect(0, 0, 64, 64);
		return c;
	})();

	const gas = makeGas();
	const bits = makeBits();
	const ejecta = makeEjecta();
	const builder = mapBuilder();
	let maps: Maps | null = null;
	const needMaps = () => (maps ??= builder.get());

	// embryos: each child meets its planet at the merge moment (same angle), so the merge is a gentle approach
	const planetAngle = (i: number, tau: number) => (i === 2 ? PSI_E + omegaYr(1) * (tau - TAU_END) : PLANETS[i].f + omegaYr(PLANETS[i].a) * tau);
	const mergeU = FAMILY.map(([, , m]) => lerp(M0, M1, m));
	const embryos: Embryo[] = FAMILY.map(([a, p], j) => {
		const tm = tauSys(mergeU[j]);
		return { a, parent: p, m: mergeU[j], R: 0.45, f: planetAngle(p, tm) - 0.03 - omegaYr(a) * tm };
	});
	const lost: Embryo[] = LOST.map((a, j) => ({ a, parent: -1, m: lerp(M0, M1, 0.25 + 0.25 * j), R: 0.4, f: 1 + j * 2.1, lost: true }));
	const theiaF = (() => {
		const tm = tauSys(U[6]);
		return planetAngle(2, tm) - 0.11 - omegaYr(THEIA_A) * tm;
	})();

	const drawStars = () => {
		stars.width = sky.width = Math.round(W * dpr);
		stars.height = sky.height = Math.round(H * dpr);
		const s = sky.getContext('2d')!;
		s.scale(dpr, dpr);
		const bg = s.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.75);
		bg.addColorStop(0, 'hsl(232 45% 11%)');
		bg.addColorStop(1, 'hsl(232 50% 4%)');
		s.fillStyle = bg;
		s.fillRect(0, 0, W, H);
		// a faint band of the Milky Way
		s.save();
		s.translate(W * 0.5, H * 0.5);
		s.rotate(-0.38);
		s.scale(1, 0.16);
		const mw = s.createRadialGradient(0, 0, 0, 0, 0, W * 0.7);
		mw.addColorStop(0, 'rgba(150,160,220,0.07)');
		mw.addColorStop(1, 'rgba(150,160,220,0)');
		s.fillStyle = mw;
		s.beginPath();
		s.arc(0, 0, W * 0.7, 0, TAU);
		s.fill();
		s.restore();
		const t = stars.getContext('2d')!;
		t.scale(dpr, dpr);
		const r = rng(9);
		const n = Math.round((W * H) / 900);
		for (let i = 0; i < n; i++) {
			const x = r() * W, y = r() * H, m = Math.pow(r(), 3);
			t.globalAlpha = 0.25 + 0.65 * m;
			t.fillStyle = r() < 0.15 ? '#ffd9b0' : r() < 0.3 ? '#bcd0ff' : '#ffffff';
			t.beginPath();
			t.arc(x, y, 0.35 + 0.9 * m, 0, TAU);
			t.fill();
		}
		t.globalAlpha = 1;
		both.width = sky.width;
		both.height = sky.height;
		const bc = both.getContext('2d')!;
		bc.drawImage(sky, 0, 0);
		bc.drawImage(stars, 0, 0);
	};

	const resize = (w: number, h: number, d: number) => {
		W = w;
		H = h;
		dpr = d;
		canvas.width = Math.round(w * d);
		canvas.height = Math.round(h * d);
		sc = clamp(Math.min(W, H) / 400, 0.75, 1.35);
		haze.width = Math.ceil(W * HS);
		haze.height = Math.ceil(H * HS);
		drawStars();
	};

	// ---- camera ----
	const camera = (u: number): Cam => {
		const span = spanAt(u);
		const tilt = tiltF(u);
		let cx = 0, cy = 0;
		if (u >= U[6]) {
			const [ex, ey] = earthPos(u);
			const s6 = spanAt(U[6]);
			const g = 1 - sstep(U[6], U_Z1 - 0.2, u);
			// the Earth glides from its place on the screen to the centre while the camera zooms in
			cx = ex + ((0 - ex) / s6) * span * g;
			cy = ey + ((0 - ey) / s6) * span * g;
		}
		const t = (tilt * Math.PI) / 180;
		return { cx, cy, k: Math.min(W, 1.25 * H) / span, ct: Math.cos(t), st: Math.sin(t), W, H, tilt, span };
	};
	let C: Cam;
	const P = { x: 0, y: 0, d: 0 };
	const proj = (x: number, y: number, z: number) => {
		const dx = x - C.cx, dy = y - C.cy;
		P.x = C.W / 2 + dx * C.k;
		P.y = C.H * 0.53 - (dy * C.ct + z * C.st) * C.k;
		P.d = -dy * C.st + z * C.ct;
		return P;
	};
	const sprite = (name: string, x: number, y: number, r: number, a: number) => {
		if (a <= 0.003 || r <= 0) return;
		ctx.globalAlpha = Math.min(1, a);
		ctx.drawImage(sprites[name], x - r, y - r, 2 * r, 2 * r);
	};
	const label = (text: string, x: number, y: number, a: number, align: CanvasTextAlign = 'center', color = 'rgba(236,240,255,0.95)', size = 12.5) => {
		if (a <= 0.01) return;
		ctx.globalAlpha = Math.min(1, a);
		ctx.font = `${size * clamp(sc, 0.92, 1.12)}px ${font}`;
		ctx.textAlign = align;
		ctx.textBaseline = 'middle';
		ctx.lineJoin = 'round';
		ctx.lineWidth = 3;
		ctx.strokeStyle = 'rgba(4,6,18,0.85)';
		ctx.strokeText(text, x, y);
		ctx.fillStyle = color;
		ctx.fillText(text, x, y);
		ctx.globalAlpha = 1;
	};
	const ring = (R: number, a: number, color: string, dash: number[] = [], lw = 1, from = 0, to = TAU) => {
		if (a <= 0.01) return;
		ctx.globalAlpha = a;
		ctx.strokeStyle = color;
		ctx.lineWidth = lw;
		ctx.setLineDash(dash);
		ctx.beginPath();
		const n = 96;
		for (let i = 0; i <= n; i++) {
			const f = from + ((to - from) * i) / n;
			const p = proj(R * Math.cos(f), R * Math.sin(f), 0);
			if (i) ctx.lineTo(p.x, p.y);
			else ctx.moveTo(p.x, p.y);
		}
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.globalAlpha = 1;
	};
	const ball = (x: number, y: number, r: number, rgb: [number, number, number], a = 1, lx = -0.4, ly = -0.35) => {
		if (a <= 0.01) return;
		const g = ctx.createRadialGradient(x + lx * r, y + ly * r, 0.1 * r, x, y, r);
		g.addColorStop(0, `rgb(${Math.min(255, rgb[0] + 60)},${Math.min(255, rgb[1] + 60)},${Math.min(255, rgb[2] + 60)})`);
		g.addColorStop(0.7, `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`);
		g.addColorStop(1, `rgb(${rgb[0] * 0.35},${rgb[1] * 0.35},${rgb[2] * 0.35})`);
		ctx.globalAlpha = a;
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, TAU);
		ctx.fill();
		ctx.globalAlpha = 1;
	};

	/** Offset of the bright spot of a small body: towards the Sun on the screen. */
	const litFrom = (x: number, y: number): [number, number] => {
		const sx = C.W / 2 - C.cx * C.k, sy = C.H * 0.53 + C.cy * C.ct * C.k; // the Sun on the screen
		const dx = sx - x, dy = sy - y, n = Math.hypot(dx, dy) || 1;
		return [(0.5 * dx) / n, (0.5 * dy) / n];
	};

	// ---- layers ----
	const drawCloudAndDisk = (u: number) => {
		if (u > U[5] + 2.6) return;
		const tau = tauSys(u);
		const big = lerp(12, 3.2, sstep(U[1] + 3, U[2] + 1, u)) * sc;
		const gJ = sstep(U[3] + 3, U[4], u), gS = sstep(U[3] + 6, U[4] + 1.5, u);
		const minPx = 5 * sc;
		ctx.globalCompositeOperation = 'lighter';
		const dust: [number, number, number, number][] = [];
		let puffs = 0;
		hctx.setTransform(1, 0, 0, 1, 0, 0);
		hctx.clearRect(0, 0, haze.width, haze.height);
		hctx.setTransform(HS, 0, 0, HS, 0, 0);
		hctx.globalCompositeOperation = 'lighter';
		const puff = (name: string, x: number, y: number, r: number, a: number) => {
			if (a <= 0.003) return;
			hctx.globalAlpha = Math.min(1, a);
			hctx.drawImage(sprites[name], x - r, y - r, 2 * r, 2 * r);
			puffs++;
		};
		for (let gi = 0; gi < gas.length; gi++) {
			const g = gas[gi];
			// in the cloud every second tracer is enough (and twice as bright): it halves the drawing work
			if (gi & 1 && !g.dust && u < g.us) continue;
			let x: number, y: number, z: number, rho: number;
			let alpha = 1;
			if (u < g.us) {
				// before the fall: the cloud (slowly turning, pushed by the shock)
				const pass = sstep(0, 0.3 * R0, shellR(u) - g.dsn);
				const px = g.px + g.dx * PUSH * pass, py = g.py + g.dy * PUSH * pass;
				z = g.pz + g.dz * PUSH * pass;
				const c = Math.cos(OMC * u), s = Math.sin(OMC * u);
				x = px * c - py * s;
				y = px * s + py * c;
				rho = Math.hypot(x, y, z);
			} else if (u < g.ul) {
				const t = (u - g.us) / g.D;
				const e = Math.exp(g.lr * t);
				rho = g.s1 / e;
				const f = g.f1 + (g.C * (e * e - 1)) / (2 * g.lr * g.s1 * g.s1);
				x = rho * Math.cos(f);
				y = rho * Math.sin(f);
				// shrinks with the rest of the cloud, and flattens faster than it shrinks
				z = (g.z1 / e) * Math.pow(1 - t, 1.2) + t * g.zc;
				if (g.star) alpha = 1 - sstep(0.75, 1, t);
			} else {
				if (g.star) continue;
				rho = g.rc;
				const f = g.fl + g.om * (tau - g.tl);
				let r = rho;
				if (u > U[4]) {
					const p = clamp((u - (U[4] + 0.4 + 3.0 * Math.sqrt(rho / 30))) / 2.2, 0, 1);
					r *= 1 + 2.5 * p * p;
					alpha *= Math.pow(1 - p, 1.5);
				}
				alpha *= 1 - 0.88 * gJ * Math.max(0, 1 - Math.abs(rho - 5.2) / 1.1);
				alpha *= 1 - 0.8 * gS * Math.max(0, 1 - Math.abs(rho - 9.5) / 1.4);
				x = r * Math.cos(f);
				y = r * Math.sin(f);
				z = g.zc;
			}
			if (alpha <= 0.01) continue;
			const p = proj(x, y, z);
			if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) continue;
			const rpx = Math.hypot(x, y) * C.k;
			alpha *= sstep(minPx * 0.6, minPx * 2.2, rpx + (rho > 2000 ? 99 : 0));
			const cloud = rho > 1500;
			// cloud puffs are a fixed share of the frame (the same picture on a phone and on a big screen)
			const rr = cloud ? Math.min(W, 1.25 * H) * 0.026 * g.size : big * g.size * 0.85;
			if (g.dust) {
				if (cloud) dust.push([p.x, p.y, rr * 1.3, alpha]);
				else sprite('rose', p.x, p.y, rr * 0.7, alpha * 0.25);
				continue;
			}
			if (cloud) {
				const k = sstep(1500, 6000, rho);
				puff(g.size > 1.1 ? 'neb2' : 'neb', p.x, p.y, rr * 2.4, alpha * (u < g.us ? 0.28 : 0.16) * k);
				if (k < 1) puff('rose', p.x, p.y, rr * 0.8, alpha * 0.3 * (1 - k));
				continue;
			}
			const name = rho < 1.5 ? 'hot' : rho < 4 ? 'warm' : rho < 18 ? 'rose' : 'cold';
			// dimmer near the centre, where hundreds of tracers overlap
			sprite(name, p.x, p.y, rr, alpha * 0.42 * clamp(rpx / (60 * sc), 0.12, 1));
		}
		if (puffs) {
			// dust lanes absorb the glow of the gas
			hctx.globalCompositeOperation = 'destination-out';
			for (const [x, y, r, a] of dust) {
				hctx.globalAlpha = Math.min(1, a * 0.55);
				hctx.drawImage(dustSprite, x - r, y - r, 2 * r, 2 * r);
			}
			hctx.globalAlpha = 1;
			ctx.globalAlpha = 1;
			ctx.drawImage(haze, 0, 0, W, H);
		}
		ctx.globalCompositeOperation = 'source-over';
	};

	const drawShock = (u: number) => {
		if (u < SN_T0 - 0.2 || u > U[2]) return;
		const p = proj(SN[0], SN[1], SN[2]);
		const sx = p.x, sy = p.y;
		const flash = Math.exp(-Math.max(0, u - SN_T0) / 1.6) * sstep(SN_T0 - 0.2, SN_T0 + 0.15, u);
		ctx.globalCompositeOperation = 'lighter';
		const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * 0.7);
		gr.addColorStop(0, `rgba(190,215,255,${0.55 * flash})`);
		gr.addColorStop(0.3, `rgba(150,180,255,${0.12 * flash})`);
		gr.addColorStop(1, 'rgba(150,180,255,0)');
		ctx.fillStyle = gr;
		ctx.fillRect(0, 0, W, H);
		const R = shellR(u) * C.k;
		const a = sstep(SN_T0, SN_T0 + 1, u) * (1 - sstep(U[1] + 2, U[2] - 3, u));
		if (R > 0 && a > 0) {
			for (const [w, al] of [[18, 0.05], [7, 0.1], [2, 0.35]] as const) {
				ctx.globalAlpha = a * al;
				ctx.strokeStyle = 'rgb(170,200,255)';
				ctx.lineWidth = w * sc;
				ctx.beginPath();
				ctx.arc(sx, sy, R, -0.9, 0.9);
				ctx.stroke();
			}
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		const la = sstep(SN_T0 + 0.8, SN_T0 + 1.6, u) * (1 - sstep(U[1] - 1.5, U[1] - 0.5, u));
		if (la > 0) {
			const ang = 0.32;
			const lx = sx + R * Math.cos(ang), ly = sy + R * Math.sin(ang);
			label('ударная волна сверхновой (гипотеза)', clamp(lx, 122, W - 122), clamp(ly, 70, H - 50), la * sstep(4, 40, sx + R), 'center', 'rgba(200,220,255,0.95)');
		}
	};

	const sunState = (u: number) => {
		const on = sstep(U[1] + 5, U[2] + 1, u);
		const ms = sstep(U[5] + 2, U[6] - 1, u); // reaching the main sequence
		const fl = u > U[3] && u < U[5] + 2 ? 1 + 0.07 * Math.sin(u * 7.3) * Math.sin(u * 2.3 + 1) : 1;
		const col: [number, number, number] =
			u < U[3] ? [255, 130 + 30 * sstep(U[2], U[3], u), 60 + 30 * sstep(U[2], U[3], u)] : [255, lerp(165, 238, ms), lerp(95, 200, ms)];
		return { on, col, r: lerp(1.25, 1, ms) * 6.5 * sc, bright: on * fl * lerp(1.15, 1, ms) };
	};

	const drawSun = (u: number) => {
		const s = sunState(u);
		if (s.on <= 0) return;
		const p = proj(0, 0, 0);
		if (p.x < -W || p.x > 2 * W) return;
		const [r, g, b] = s.col;
		ctx.globalCompositeOperation = 'lighter';
		const R = s.r * 9 * s.bright;
		const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
		gr.addColorStop(0, `rgba(${r},${g},${b},${0.9 * s.on})`);
		gr.addColorStop(0.12, `rgba(${r},${g},${b},${0.45 * s.on})`);
		gr.addColorStop(0.4, `rgba(${r},${g * 0.8},${b * 0.6},${0.12 * s.on})`);
		gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
		ctx.fillStyle = gr;
		ctx.beginPath();
		ctx.arc(p.x, p.y, R, 0, TAU);
		ctx.fill();
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = s.on;
		ctx.fillStyle = `rgb(255,${Math.min(255, g + 50)},${Math.min(255, b + 80)})`;
		ctx.beginPath();
		ctx.arc(p.x, p.y, s.r, 0, TAU);
		ctx.fill();
		ctx.globalAlpha = 1;
	};

	const drawDiskGlow = (u: number) => {
		const a = sstep(U[1] + 6, U[2] + 2, u) * (1 - sstep(U[4] + 1, U[5], u)) * (1 - 0.45 * sstep(U[3], U[3] + 3, u));
		if (a <= 0.01) return;
		const p = proj(0, 0, 0);
		const R = 70 * C.k;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.translate(p.x, p.y);
		ctx.scale(1, C.ct);
		const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
		g.addColorStop(0, `rgba(255,170,100,${0.32 * a})`);
		g.addColorStop(0.08, `rgba(230,120,90,${0.16 * a})`);
		g.addColorStop(0.4, `rgba(150,80,130,${0.07 * a})`);
		g.addColorStop(1, 'rgba(120,80,160,0)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, R, 0, TAU);
		ctx.fill();
		ctx.restore();
	};

	const drawSpin = (u: number) => {
		const a = sstep(U[1] + 6.5, U[1] + 8, u) * (1 - sstep(U[2] + 2, U[2] + 3.5, u));
		if (a <= 0.01) return;
		const R = 0.36 * C.span;
		ring(R, a * 0.8, 'rgba(255,230,200,1)', [], 1.6 * sc, -2.3, -1.0);
		const p1 = { ...proj(R * Math.cos(-1.0), R * Math.sin(-1.0), 0) };
		const p0 = { ...proj(R * Math.cos(-1.08), R * Math.sin(-1.08), 0) };
		const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
		ctx.globalAlpha = a * 0.8;
		ctx.fillStyle = 'rgba(255,230,200,1)';
		ctx.beginPath();
		const h = 8 * sc;
		ctx.moveTo(p1.x + Math.cos(ang) * h, p1.y + Math.sin(ang) * h);
		ctx.lineTo(p1.x + Math.cos(ang + 2.5) * h, p1.y + Math.sin(ang + 2.5) * h);
		ctx.lineTo(p1.x + Math.cos(ang - 2.5) * h, p1.y + Math.sin(ang - 2.5) * h);
		ctx.fill();
		ctx.globalAlpha = 1;
		const pl = proj(R * Math.cos(-1.65), R * Math.sin(-1.65), 0);
		label('вращение', pl.x, pl.y + 14 * sc, a);
	};

	const SPOKE = [8, 14, 22, 34, 50];
	const drawSpoke = (u: number) => {
		const a = sstep(U[2] + 0.3, U[2] + 1.2, u) * (1 - sstep(U[3] - 0.5, U[3] + 1, u));
		if (a <= 0.01) return;
		const t0 = tauSys(U[2] + 0.6);
		const tau = tauSys(u);
		const f0 = -1.25;
		// where the markers started: a straight line
		const pa = { ...proj(SPOKE[0] * Math.cos(f0), SPOKE[0] * Math.sin(f0), 0) };
		const pb = { ...proj(SPOKE[4] * Math.cos(f0), SPOKE[4] * Math.sin(f0), 0) };
		ctx.globalAlpha = a * 0.35;
		ctx.strokeStyle = '#fff';
		ctx.setLineDash([3, 4]);
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(pa.x, pa.y);
		ctx.lineTo(pb.x, pb.y);
		ctx.stroke();
		ctx.setLineDash([]);
		const pts = SPOKE.map((r) => {
			const f = f0 + omegaYr(r) * (tau - t0);
			return { ...proj(r * Math.cos(f), r * Math.sin(f), 0) };
		});
		ctx.globalAlpha = a * 0.55;
		ctx.beginPath();
		pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
		ctx.stroke();
		ctx.globalAlpha = 1;
		for (const p of pts) ball(p.x, p.y, 3.2 * sc, [255, 255, 255], a);
		const la = a * sstep(U[2] + 2, U[2] + 3, u);
		label('ближе к центру — быстрее', pb.x, pb.y + 16 * sc, la);
	};

	const drawBits = (u: number) => {
		const a0 = sstep(U[3] + 1, U[3] + 4.5, u);
		if (a0 <= 0.01 || u > U[6] + 3) return;
		const grow = sstep(U[3] + 1, U[4], u);
		const tau = tauSys(u);
		const inner = 1 - sstep(U[5] + 1, U[6] - 1, u);
		const minPx = 6 * sc;
		for (const b of bits) {
			let a = a0;
			if (b.a < 2.05 || b.a > 3.4) a *= inner;
			if (a <= 0.01) continue;
			const f = b.f + omegaYr(b.a) * tau;
			const p = proj(b.a * Math.cos(f), b.a * Math.sin(f), b.z);
			if (p.x < -5 || p.x > W + 5 || p.y < -5 || p.y > H + 5) continue;
			a *= sstep(minPx, minPx * 2, b.a * C.k);
			const r = (0.55 + 0.9 * grow) * b.size * sc;
			ctx.globalAlpha = a * 0.8;
			ctx.fillStyle = b.ice ? 'rgb(150,192,236)' : 'rgb(196,140,98)';
			ctx.fillRect(p.x - r, p.y - r, 2 * r, 2 * r);
		}
		ctx.globalAlpha = 1;
	};

	const drawSnowLine = (u: number) => {
		const a = sstep(U[3] + 2, U[3] + 3.5, u) * (1 - sstep(U[4] - 0.5, U[4] + 0.8, u));
		if (a <= 0.01) return;
		ring(2.7, a * 0.75, 'rgb(170,220,255)', [4, 4], 1.3 * sc);
		const p = { ...proj(0, -2.7, 0) };
		label('снеговая линия', p.x, p.y + 13 * sc, a, 'center', 'rgb(190,228,255)');
		const pin = { ...proj(-1.45, 0, 0) };
		label('камень,', pin.x, pin.y - 7 * sc, a * 0.9, 'center', 'rgb(232,205,175)', 11.5);
		label('металл', pin.x, pin.y + 7 * sc, a * 0.9, 'center', 'rgb(232,205,175)', 11.5);
		const pout = { ...proj(-3.9, 0, 0) };
		label('+ лёд', pout.x, pout.y, a * 0.9, 'center', 'rgb(205,226,255)', 11.5);
	};

	const giant = (u: number, a: number, f0: number, t0: number, t1: number, Rmax: number, rgb: [number, number, number], name: string, la: number) => {
		const g = sstep(t0, t1, u);
		if (g <= 0 || u > U[6] + 2) return;
		const f = f0 + omegaYr(a) * tauSys(u);
		const p = { ...proj(a * Math.cos(f), a * Math.sin(f), 0) };
		if (p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30) return;
		const r = lerp(1.3, Rmax, g) * sc;
		ctx.globalCompositeOperation = 'lighter';
		sprite('warm', p.x, p.y, r * 3.2, 0.35 * g * (1 - sstep(U[4], U[5], u)));
		ctx.globalCompositeOperation = 'source-over';
		const L = litFrom(p.x, p.y);
		ball(p.x, p.y, r, rgb, Math.min(1, g * 3), L[0], L[1]);
		label(name, p.x, p.y - r - 10 * sc, la);
	};

	const drawWind = (u: number) => {
		const a = sstep(U[4], U[4] + 1, u) * (1 - sstep(U[5] - 1, U[5] + 0.6, u));
		if (a <= 0.01) return;
		const r = rng(5);
		ctx.globalCompositeOperation = 'lighter';
		ctx.strokeStyle = 'rgb(255,220,170)';
		ctx.lineWidth = 1.2 * sc;
		for (let j = 0; j < 70; j++) {
			const f = r() * TAU, ph = r(), sp = 0.25 + 0.2 * r();
			const q = (((u - U[4]) * sp + ph) % 1 + 1) % 1;
			const R1 = (0.6 + q * 15) * (0.8 + 0.4 * r()), R2 = R1 + 1.8;
			const p1 = { ...proj(R1 * Math.cos(f), R1 * Math.sin(f), 0) };
			const p2 = { ...proj(R2 * Math.cos(f), R2 * Math.sin(f), 0) };
			ctx.globalAlpha = a * 0.28 * Math.sin(Math.PI * q);
			ctx.beginPath();
			ctx.moveTo(p1.x, p1.y);
			ctx.lineTo(p2.x, p2.y);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		const pl = { ...proj(0, -8, 0) };
		label('газ уносится', pl.x, pl.y + 12 * sc, a * sstep(U[4] + 1.5, U[4] + 2.5, u));
	};

	/** Planet display radius (CSS px): true size, but never smaller than the enlarged size used in the wide views. */
	const bodyR = (R: number, u: number) => Math.max(R * RE * C.k, (1.8 + 4.2 * R) * sc * (u < U[5] + 0.5 ? 0 : 1));

	const drawEmbryos = (u: number) => {
		const a0 = sstep(U[5] + 0.2, U[5] + 1.8, u);
		if (a0 <= 0.01 || u > U_Z1 + 0.5) return;
		const tau = tauSys(u);
		ctx.globalCompositeOperation = 'source-over';
		const flashes: [number, number, number][] = [];
		const planetMass = PLANETS.map(() => 1);
		const nKids = PLANETS.map((_, i) => embryos.filter((e) => e.parent === i).length);
		embryos.forEach((e) => {
			if (u >= e.m) planetMass[e.parent] += 1;
		});
		// embryos still on their own
		for (const e of [...embryos, ...lost]) {
			if (u >= e.m + (e.lost ? 1.2 : 0)) {
				if (!e.lost && u < e.m + 1.2) flashes.push([e.parent, e.m, 0]);
				continue;
			}
			let a = e.a, f = e.f + omegaYr(e.a) * tau, al = a0;
			if (e.lost) {
				const q = sstep(e.m - 0.4, e.m + 1.2, u);
				a *= 1 + 0.9 * q;
				al *= 1 - q;
			} else {
				const q = sstep(e.m - 1.1, e.m, u);
				a = lerp(e.a, PLANETS[e.parent].a, q);
				f = lerp(f, planetAngle(e.parent, tau), q);
			}
			const p = proj(a * Math.cos(f), a * Math.sin(f), 0);
			const L = litFrom(p.x, p.y);
			ball(p.x, p.y, bodyR(e.R, u), [170, 120, 100], al, L[0], L[1]);
		}
		PLANETS.forEach((pl, i) => {
			const f = planetAngle(i, tau);
			const frac = planetMass[i] / (1 + nKids[i]);
			const R = pl.R * Math.cbrt(frac);
			const p = { ...proj(pl.a * Math.cos(f), pl.a * Math.sin(f), 0) };
			if (i === 2 && u > U[6] - 0.5) return; // the Earth is drawn by the Earth–Moon layer from here on
			const col: [number, number, number] = i === 2 ? [170, 110, 90] : i === 1 ? [205, 170, 120] : i === 3 ? [190, 110, 80] : [160, 150, 140];
			const Lp = litFrom(p.x, p.y);
			ball(p.x, p.y, bodyR(R, u), col, a0, Lp[0], Lp[1]);
			label(pl.name, p.x, p.y - bodyR(R, u) - 10 * sc, sstep(U[6] - 3.5, U[6] - 2.5, u) * (1 - sstep(U[6] + 0.3, U[6] + 1.2, u)));
		});
		for (const [i, m] of flashes) {
			const f = planetAngle(i, tau);
			const p = { ...proj(PLANETS[i].a * Math.cos(f), PLANETS[i].a * Math.sin(f), 0) };
			const q = (u - m) / 1.2;
			ctx.globalCompositeOperation = 'lighter';
			sprite('white', p.x, p.y, (10 + 26 * q) * sc, (1 - q) * 0.9);
			sprite('lava', p.x, p.y, (6 + 10 * q) * sc, (1 - q));
			ctx.globalCompositeOperation = 'source-over';
		}
		const oa = sstep(U[6] - 3.5, U[6] - 2.5, u) * (1 - sstep(U[6] + 0.3, U[6] + 1.2, u));
		if (oa > 0.01) for (const pl of PLANETS) ring(pl.a, oa * 0.35, 'rgb(200,210,255)', [3, 5], 1);
		const belt = sstep(U[5] + 2.5, U[5] + 3.5, u) * (1 - sstep(U[6] - 2.5, U[6] - 1.5, u));
		const pb = { ...proj(0, -2.75, 0) };
		label('пояс астероидов', pb.x, pb.y + 12 * sc, belt * 0.9, 'center', 'rgb(220,205,185)', 11.5);
	};

	// ---- the Earth–Moon system ----
	const theiaLocal = (u: number): [number, number, number] | null => {
		// position relative to the Earth, Earth radii
		if (u < U_Z1) {
			const d = Math.hypot(...P0) * (spanAt(u) / spanAt(U_Z1));
			const n = Math.hypot(...P0);
			return [(P0[0] / n) * d, (P0[1] / n) * d, 0];
		}
		const s = u - U_Z1;
		if (u < U_C) return [P0[0] + TH_V * s + 0.5 * TH_ACC * s * s, P0[1], 0];
		return null;
	};

	const sunView = (u: number): [number, number, number] => {
		const [ex, ey] = earthPos(u);
		const n = Math.hypot(ex, ey);
		const sx = -ex / n, sy = -ey / n;
		return [sx, sy * C.ct, -sy * C.st];
	};

	const ejectaPos = (b: Bit, u: number, out: number[]) => {
		const t0 = U_C + b.d * 0.9;
		if (u < t0) return false;
		const s = u - t0;
		let r = b.a - (b.a - 1.02) * Math.exp(-s / 0.45) + b.e * Math.exp(-s / 2.5) * Math.sin(b.ph + s * 3);
		let f = TH_C + 0.12 * b.e / 0.18 + omegaH(b.a) * (tauLoc(u) - tauLoc(t0)) * 0.85;
		let z = b.z * (1 - Math.exp(-s / 0.6));
		let alpha = sstep(0, 0.12, s);
		if (b.a >= 2.9) {
			const tj = U_C + 3.2 + 3.8 * b.t;
			const w = sstep(tj, tj + 1.3, u);
			if (w > 0) {
				const fm = moonAngle(u);
				let df = ((fm - f) % TAU + TAU) % TAU;
				if (df > Math.PI) df -= TAU;
				f += df * w;
				r = lerp(r, moonA(u), w);
				z *= 1 - w;
				alpha *= 1 - w;
			}
		} else {
			const tj = U_C + 3.4 + 3.6 * b.t;
			const w = sstep(tj, tj + 1.6, u);
			r = lerp(r, 0.98, w);
			alpha *= 1 - w;
		}
		out[0] = r * Math.cos(f);
		out[1] = r * Math.sin(f);
		out[2] = z;
		out[3] = alpha;
		out[4] = s;
		return alpha > 0.01;
	};
	const moonAngle = (u: number) => TH_C + 2.3 + moonPhase(u) - moonPhase(U_C);
	const moonR = (u: number) => 0.2727 * Math.cbrt(sstep(U_C + 3.0, U_C + 7.6, u));
	/** The Moon's distance as drawn: true until the last view, which brings it closer to fit the frame. */
	const moonDrawA = (u: number) => lerp(moonA(u), 4.4, sstep(U[9], U[9] + 1.6, u));

	const earthSurface = (u: number): [Tex, Tex | null, number, number] => {
		const m = needMaps();
		if (u < U_C + 0.8) return [m.proto, m.magma, sstep(U_C, U_C + 0.8, u), lerp(0.9, 1.25, sstep(U_C, U_C + 0.8, u))];
		if (u < U[8] + 0.5) return [m.magma, null, 0, 1.25 - 0.25 * sstep(U[7], U[8], u)];
		if (u < U[8] + 3) return [m.magma, m.crust, sstep(U[8] + 0.5, U[8] + 3, u), 1];
		if (u < U[8] + 5) return [m.crust, m.steam, sstep(U[8] + 3, U[8] + 5, u), 1];
		if (u < U[9] + 0.5) return [m.steam, m.ocean, sstep(U[8] + 5, U[8] + 8, u), 1];
		return [m.ocean, m.today, sstep(U[9] + 2.8, U[9] + 5, u), 1]; // today's continents appear only near the end of the time-lapse
	};

	const drawEarthSystem = (u: number) => {
		if (u < U[5] + 0.2) return;
		const m = needMaps();
		const [ex, ey] = earthPos(u);
		const L = (x: number, y: number, z: number) => proj(ex + x * RE, ey + y * RE, z * RE);
		const E = { ...L(0, 0, 0) };
		const sun = sunView(u);
		const rE = bodyR(1, u);
		const front: (() => void)[] = [];
		const back: (() => void)[] = [];
		const mag = u < U_C ? 0 : 1 - sstep(U[8] + 0.5, U[8] + 4, u);
		// ejecta
		if (u >= U_C && u < U[7] + 0.5) {
			const out = [0, 0, 0, 0, 0];
			const pts: [number, number, number, number, number, boolean][] = [];
			for (const b of ejecta) {
				if (!ejectaPos(b, u, out)) continue;
				const p = L(out[0], out[1], out[2]);
				const behind = p.d < 0 && Math.hypot(p.x - E.x, p.y - E.y) < rE;
				pts.push([p.x, p.y, out[3], out[4], b.size, behind]);
			}
			const drawPts = (sel: boolean) => () => {
				ctx.globalCompositeOperation = 'lighter';
				for (const [x, y, a, s, size, behind] of pts) {
					if (behind !== sel) continue;
					const heat = Math.exp(-s / 2.2);
					sprite(heat > 0.5 ? 'hot' : heat > 0.2 ? 'lava' : 'ember', x, y, (1.5 + 1.6 * heat) * size * sc, a * (0.5 + 0.5 * heat));
				}
				ctx.globalCompositeOperation = 'source-over';
			};
			back.push(drawPts(true));
			front.push(drawPts(false));
			const la = sstep(U_C + 1.6, U_C + 2.4, u) * (1 - sstep(U_C + 4.5, U_C + 5.5, u));
			if (la > 0) {
				const p = { ...L(0, -3.6, 0) };
				front.push(() => label('кольцо обломков', p.x, p.y + 14 * sc, la, 'center', 'rgb(255,214,170)'));
			}
		}
		// Theia
		const th = theiaLocal(u);
		const tSh = u >= U_C ? sstep(U_C, U_C + 1.4, u) : 0;
		if (u > U[5] + 0.2 && u < U_C + 1.4) {
			let pos: [number, number, number];
			let rr: number;
			if (u < U_C) {
				if (u < U[6] + 0.5) {
					// still in the wide view: on its own orbit, then drifting towards the Earth
					const f = theiaF + omegaYr(THEIA_A) * tauSys(u);
					const orb: [number, number] = [THEIA_A * Math.cos(f) - ex, THEIA_A * Math.sin(f) - ey];
					const w = sstep(U[6] - 2, U[6] + 0.5, u);
					pos = [lerp(orb[0] / RE, th![0], w), lerp(orb[1] / RE, th![1], w), 0];
				} else pos = th!;
				rr = TH_R;
			} else {
				// sliding along the surface and merging into the Earth
				const f = TH_C + 0.9 * tSh;
				const d = lerp(1 + TH_R, 0.9, tSh);
				pos = [d * Math.cos(f), d * Math.sin(f), 0];
				rr = TH_R * (1 - tSh);
			}
			const p = { ...L(pos[0], pos[1], pos[2]) };
			const r = Math.max(rr * RE * C.k, u < U_C ? (1.8 + 4.2 * TH_R) * sc : 0);
			const fn = () => {
				drawGlobe(ctx, dpr, p.x, p.y, r, u * 0.3, C.tilt, sun, m.theia, m.magma, tSh, 1, sstep(U[5] + 0.2, U[5] + 1.8, u));
				const la = u < U[6] ? sstep(U[6] - 2.5, U[6] - 1.5, u) : 1 - sstep(U_C - 0.6, U_C, u);
				label('Тейя', p.x, u < U[6] + 1 ? p.y + r + 11 * sc : p.y - r - 11 * sc, la);
			};
			(p.d < E.d ? back : front).push(fn);
		}
		// the Moon
		const rM = moonR(u);
		if (rM > 0) {
			const a = moonDrawA(u), f = moonAngle(u);
			const p = { ...L(a * Math.cos(f), a * Math.sin(f), 0) };
			const r = rM * RE * C.k;
			const hot = 1 - sstep(U[7] + 2, U[8] + 1, u);
			const fn = () => {
				if (hot > 0) {
					ctx.globalCompositeOperation = 'lighter';
					sprite('lava', p.x, p.y, r * 2.6, 0.35 * hot);
					ctx.globalCompositeOperation = 'source-over';
				}
				drawGlobe(ctx, dpr, p.x, p.y, r, f + Math.PI, C.tilt, sun, m.moonHot, m.moon, 1 - hot, 1);
				const la = sstep(U_C + 6, U_C + 7, u) * (1 - sstep(U[8] + 1, U[8] + 2, u)) + sstep(U[9] + 2.5, U[9] + 3.5, u);
				label('Луна', p.x, p.y - r - 11 * sc, Math.min(1, la));
			};
			(p.d < E.d ? back : front).push(fn);
			// its orbit
			if (u > U_C + 6.5) {
				const oa = (sstep(U_C + 6.5, U_C + 7.5, u) * (1 - sstep(U[8], U[8] + 1.5, u)) + sstep(U[9] + 2, U[9] + 3, u)) * 0.4;
				if (oa > 0.01) {
					back.push(() => {
						ctx.globalAlpha = oa;
						ctx.strokeStyle = 'rgb(200,210,255)';
						ctx.setLineDash([3, 5]);
						ctx.lineWidth = 1;
						ctx.beginPath();
						for (let i = 0; i <= 120; i++) {
							const g = (i / 120) * TAU;
							const q = L(a * Math.cos(g), a * Math.sin(g), 0);
							if (i) ctx.lineTo(q.x, q.y);
							else ctx.moveTo(q.x, q.y);
						}
						ctx.stroke();
						ctx.setLineDash([]);
						ctx.globalAlpha = 1;
					});
				}
			}
		}
		for (const f of back) f();
		if (u < U[6] - 0.5) {
			for (const f of front) f();
			return;
		}
		// the Earth
		const [A, B, k, glow] = earthSurface(u);
		const ga = sstep(U[5] + 0.2, U[5] + 1.8, u);
		if (mag > 0.01 && rE > 3) {
			ctx.globalCompositeOperation = 'lighter';
			sprite('ember', E.x, E.y, rE * 1.9, 0.32 * mag * ga);
			ctx.globalCompositeOperation = 'source-over';
		}
		drawGlobe(ctx, dpr, E.x, E.y, rE, earthSpin(u), C.tilt, sun, A, B, k, glow, ga);
		const blue = sstep(U[8] + 5, U[8] + 8, u);
		if (blue > 0 && rE > 8) {
			const g = ctx.createRadialGradient(E.x, E.y, rE * 0.9, E.x, E.y, rE * 1.12);
			g.addColorStop(0, 'rgba(110,170,255,0)');
			g.addColorStop(0.45, `rgba(120,180,255,${0.45 * blue})`);
			g.addColorStop(1, 'rgba(120,180,255,0)');
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(E.x, E.y, rE * 1.12, 0, TAU);
			ctx.fill();
		}
		// the flash of the impact
		if (u >= U_C - 0.05 && u < U_C + 3) {
			const q = (u - U_C) / 3;
			const p = { ...L(Math.cos(TH_C) * 1.1, Math.sin(TH_C) * 1.1, 0) };
			ctx.globalCompositeOperation = 'lighter';
			sprite('white', p.x, p.y, rE * (0.8 + 2.2 * q), Math.max(0, 1 - q) ** 1.5);
			sprite('lava', p.x, p.y, rE * (0.5 + 1.2 * q), Math.max(0, 1 - q));
			ctx.globalCompositeOperation = 'source-over';
		}
		for (const f of front) f();
		const le = (sstep(U_Z1 - 0.5, U_Z1 + 0.3, u) * (1 - sstep(U_C - 0.6, U_C, u))) + sstep(U[9] + 2.5, U[9] + 3.5, u);
		label('Земля', E.x, E.y + rE + 13 * sc, Math.min(1, le));
		const lo = sstep(U[8] + 6, U[8] + 7, u) * (1 - sstep(U[9] + 1, U[9] + 2, u));
		label('первые океаны', E.x, E.y + rE + 13 * sc, lo);
	};

	const drawSkyInset = (u: number) => {
		const a = sstep(U[7] + 1.5, U[7] + 2.5, u) * (1 - sstep(U[8] - 0.6, U[8] + 0.2, u));
		if (a <= 0.01) return;
		const w = clamp(Math.min(W, H) * 0.34, 110, 170);
		const h = w * 0.62;
		const x0 = W - w - 10, y0 = W < 500 ? 62 : H - h - 40;
		ctx.globalAlpha = a;
		ctx.fillStyle = 'rgba(8,10,26,0.9)';
		ctx.strokeStyle = 'rgba(200,210,255,0.35)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(x0, y0, w, h, 8);
		ctx.fill();
		ctx.stroke();
		// the field shows 26° of the sky across
		const FOV = 26;
		const aR = moonA(u);
		const then = (2 * Math.atan(0.2727 / aR) * 180) / Math.PI;
		const now = 0.5179;
		const pxDeg = w / FOV;
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(x0, y0, w, h, 8);
		ctx.clip();
		const gy = y0 + h * 0.8;
		ctx.fillStyle = 'rgba(40,24,22,1)';
		ctx.beginPath();
		ctx.moveTo(x0, gy);
		for (let i = 0; i <= 12; i++) ctx.lineTo(x0 + (w * i) / 12, gy - 3 * Math.sin(i * 1.7) - 2);
		ctx.lineTo(x0 + w, y0 + h);
		ctx.lineTo(x0, y0 + h);
		ctx.fill();
		ctx.restore();
		const r1 = (then * pxDeg) / 2, r2 = Math.max((now * pxDeg) / 2, 0.8);
		const cy = y0 + h * 0.42;
		ctx.globalAlpha = a;
		ball(x0 + w * 0.34, cy, r1, [205, 196, 186], a, -0.6);
		ball(x0 + w * 0.8, cy, r2, [225, 220, 210], a, -0.6);
		label('тогда', x0 + w * 0.34, y0 + h - 9, a, 'center', 'rgb(236,240,255)', 11);
		label('сейчас', x0 + w * 0.8, y0 + h - 9, a, 'center', 'rgb(236,240,255)', 11);
		label('Луна в небе', x0 + w / 2, y0 - 10, a, 'center', 'rgb(236,240,255)', 11.5);
		ctx.globalAlpha = 1;
	};

	const nice = (v: number) => {
		const e = Math.pow(10, Math.floor(Math.log10(v)));
		const m = v / e;
		return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * e;
	};
	const num = (v: number) => v.toLocaleString('ru-RU', { maximumFractionDigits: 2 }).replace(/ /g, ' ');
	const drawScale = (u: number) => {
		const span = C.span;
		const earth = (W * 0.16) / C.k < 0.05; // shorter than 0.05 AU: kilometres
		const unitAU = earth ? 1 / 149597870.7 : 1;
		const target = (W * 0.16) / C.k / unitAU;
		const L = nice(target);
		const px = L * unitAU * C.k;
		const x1 = W - 14, x0 = x1 - px, y = H - 14;
		ctx.globalAlpha = 0.85;
		ctx.strokeStyle = 'rgba(220,226,255,0.9)';
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.moveTo(x0, y - 4);
		ctx.lineTo(x0, y);
		ctx.lineTo(x1, y);
		ctx.lineTo(x1, y - 4);
		ctx.stroke();
		ctx.globalAlpha = 1;
		label(`${num(L)} ${earth ? 'км' : 'а. е.'}`, (x0 + x1) / 2, y - 10, 0.9, 'center', 'rgb(220,226,255)', 11);
		void span;
	};

	const drawMs: number[] = [];
	const render = (u: number) => {
		const t0 = performance.now();
		u = clamp(u, 0, TOTAL);
		C = camera(u);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		// fewer background stars while the disk fills the frame, so they are not confused with its bodies
		const sa = 1 - 0.6 * sstep(U[2], U[2] + 2, u) * (1 - sstep(U[6], U_Z1, u));
		if (sa > 0.999) ctx.drawImage(both, 0, 0, W, H);
		else {
			ctx.drawImage(sky, 0, 0, W, H);
			ctx.globalAlpha = sa;
			ctx.drawImage(stars, 0, 0, W, H);
			ctx.globalAlpha = 1;
		}
		drawShock(u);
		drawDiskGlow(u);
		drawCloudAndDisk(u);
		drawSun(u);
		drawSpin(u);
		drawSpoke(u);
		drawSnowLine(u);
		drawBits(u);
		giant(u, 5.2, 2.2, U[3] + 2.5, U[4] + 1, 7, [226, 196, 156], 'Юпитер', sstep(U[3] + 5, U[3] + 6, u) * (1 - sstep(U[5] + 2, U[5] + 3, u)));
		giant(u, 9.55, 4.6, U[3] + 5.5, U[5] + 2, 5.6, [224, 206, 160], 'Сатурн', sstep(U[3] + 7, U[3] + 8, u) * (1 - sstep(U[5] + 2, U[5] + 3, u)));
		drawWind(u);
		drawEmbryos(u);
		drawEarthSystem(u);
		drawSkyInset(u);
		drawScale(u);
		drawMs.push(performance.now() - t0);
		if (drawMs.length > 600) drawMs.shift();
	};

	// ---- the readout ----
	const ga = (myrAgo: number, digits: number) => `${(myrAgo / 1000).toFixed(digits).replace('.', ',')} млрд лет назад`;
	const myr = (t: number) => (t < 1 ? `+${Math.round(t * 1000 / 10) * 10} тыс. лет` : `+${(t < 10 ? t.toFixed(1) : Math.round(t).toString()).replace('.', ',')} млн лет`);
	const km = (v: number) => Math.round(v).toLocaleString('ru-RU').replace(/ /g, ' ');
	const readout = (u: number) => {
		const k = stageAt(u);
		const x = (a: number, b: number) => clamp((u - a) / (b - a), 0, 1);
		let when = '', rel = '', live = '', note = '';
		if (k <= 1) {
			when = '≈ 4,6 млрд лет назад';
			rel = 'до рождения Солнечной системы';
		} else if (k <= 5) {
			const t = k === 2 ? 0.3 * x(U[2], U[3]) : k === 3 ? lerp(0.3, 3, x(U[3], U[4])) : k === 4 ? lerp(3, 5, x(U[4], U[5])) : 5 * Math.pow(11, x(U[5], U[6] - 0.5));
			when = t < 1 ? '4,567 млрд лет назад' : ga(4567 - t, 2);
			rel = t < 0.05 ? 'рождение Солнечной системы' : myr(t);
			note = 'Солнце и планеты увеличены';
		} else if (k <= 7) {
			when = '≈ 4,5 млрд лет назад';
			if (k === 6) {
				rel = u < U_C ? 'Земле десятки миллионов лет' : u < U_C + 3.2 ? (u < U_C + 0.5 ? 'удар!' : `после удара: ${Math.max(1, Math.round(tauLoc(u) - tauLoc(U_C)))} ч` ) : 'Луна собирается: месяцы — годы';
				note = u < U_Z1 - 0.7 ? 'Солнце и планеты увеличены' : 'всё в масштабе';
			} else {
				note = 'всё в масштабе';
			}
		} else if (k === 8) {
			when = ga(lerp(4500, 4400, x(U[8], U[9])), 2);
			rel = 'кора, атмосфера, океаны';
			note = 'в масштабе';
		} else {
			const q = x(U[9], U[9] + 5);
			const ago = 4400 * (1 - q);
			when = ago < 1 ? 'сегодня' : ago >= 1000 ? ga(ago, 2) : `${Math.round(ago / 10) * 10} млн лет назад`;
			rel = ago < 1 ? 'прошло 4,57 млрд лет' : 'время ускорено';
			note = u > U[9] + 1 ? 'расстояние до Луны уменьшено' : 'в масштабе';
		}
		// the day and the distance are shown only where the time is known well enough: the young Moon and today
		if (k === 7 || (k === 6 && u > U_C + 6.5) || u >= U[9] + 5) {
			const a = moonA(u);
			const day = dayHours(a);
			const dist = a > 60.3 ? '384 400' : km(Math.round((a * 6371) / 1000) * 1000);
			live = `сутки ${day > 23.5 ? '24' : day.toFixed(1).replace('.', ',')} ч · до Луны ${a > 60.3 ? '' : '≈ '}${dist} км`;
		}
		return { when, rel, live, note };
	};

	return { resize, render, readout, drawMs, prepare: builder.step };
};
