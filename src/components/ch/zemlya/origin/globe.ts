/**
 * Procedural globes for the origin story: surface maps (equirectangular, 256 × 128) and a small renderer that
 * maps a map onto a lit sphere seen from a given latitude. Everything is generated from fixed seeds.
 */
import { LAND } from './land';

export const TW = 256;
export const TH = 128;

/** A surface map: albedo (lit by the Sun) and emission (glowing lava, not dependent on light), RGB bytes. */
export type Tex = { alb: Uint8ClampedArray; emi: Uint8ClampedArray; avg: [number, number, number] };

// ---------- noise ----------
const hash = (x: number, y: number, z: number, seed: number) => {
	let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440670441) + Math.imul(seed, 1274126177)) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	h ^= h >>> 16;
	return (h >>> 0) / 4294967296;
};
const fade = (t: number) => t * t * (3 - 2 * t);
const vnoise = (x: number, y: number, z: number, seed: number) => {
	const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
	const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
	const l = (a: number, b: number, t: number) => a + (b - a) * t;
	const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz, seed);
	return l(
		l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
		l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
		zf,
	);
};
const fbm = (x: number, y: number, z: number, oct: number, seed: number) => {
	let s = 0, a = 0.5, f = 1, n = 0;
	for (let i = 0; i < oct; i++) {
		s += a * vnoise(x * f, y * f, z * f, seed + i * 17);
		n += a;
		a *= 0.5;
		f *= 2.03;
	}
	return s / n;
};
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const sstep = (a: number, b: number, x: number) => {
	const t = clamp01((x - a) / (b - a));
	return t * t * (3 - 2 * t);
};

// ---------- maps ----------
type Px = (lon: number, lat: number, p: [number, number, number], i: number) => [number, number, number, number, number, number];

type Job = { tex: Tex; next: () => boolean };
/** A map is filled a few rows at a time, so that building it never blocks the page for long. */
const build = (f: Px): Job => {
	const alb = new Uint8ClampedArray(TW * TH * 3);
	const emi = new Uint8ClampedArray(TW * TH * 3);
	const tex: Tex = { alb, emi, avg: [0, 0, 0] };
	const sum = [0, 0, 0];
	let wsum = 0;
	let r = 0;
	const next = () => {
		for (const end = Math.min(TH, r + 4); r < end; r++) {
			const lat = Math.PI / 2 - ((r + 0.5) / TH) * Math.PI;
			const cl = Math.cos(lat);
			for (let c = 0; c < TW; c++) {
				const lon = ((c + 0.5) / TW) * 2 * Math.PI - Math.PI;
				const p: [number, number, number] = [cl * Math.cos(lon), cl * Math.sin(lon), Math.sin(lat)];
				const i = r * TW + c;
				const [ar, ag, ab, er, eg, eb] = f(lon, lat, p, i);
				alb[i * 3] = ar; alb[i * 3 + 1] = ag; alb[i * 3 + 2] = ab;
				emi[i * 3] = er; emi[i * 3 + 1] = eg; emi[i * 3 + 2] = eb;
				sum[0] += (ar + er) * cl; sum[1] += (ag + eg) * cl; sum[2] += (ab + eb) * cl;
				wsum += cl;
			}
		}
		if (r < TH) return false;
		tex.avg = [sum[0] / wsum, sum[1] / wsum, sum[2] / wsum];
		return true;
	};
	return { tex, next };
};

const landMask = () => {
	const m = new Uint8Array(TW * TH);
	const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	let k = 0, land = 0;
	for (let i = 0; i < LAND.length; i += 2) {
		const n = A.indexOf(LAND[i]) * 64 + A.indexOf(LAND[i + 1]);
		if (land) m.fill(1, k, k + n);
		k += n;
		land ^= 1;
	}
	return m;
};

/** Moon's near-side seas: [longitude E, latitude N, angular radius], degrees (as in the Moon chapter's model). */
const MARIA: [number, number, number][] = [
	[-58, 22, 14], [-55, 6, 13], [-66, -6, 9], [-45, 32, 10], [-40, 14, 10], [-30, 2, 8], [-16, 33, 14], [-26, 40, 8],
	[-5, 25, 7], [17, 28, 9.5], [30, 8, 10], [22, 4, 7], [40, 12, 6], [59, 17, 7], [51, -8, 9], [44, -2, 6],
	[35, -15, 5.5], [-17, -21, 9], [-10, -15, 6], [-23, -10, 6], [-31, 7, 6],
];

export type Maps = Record<'proto' | 'magma' | 'crust' | 'steam' | 'ocean' | 'today' | 'theia' | 'moonHot' | 'moon', Tex>;

/** Builds the maps one at a time (call step() in idle moments; get() finishes the rest at once). */
export const mapBuilder = () => {
	const done: Partial<Maps> = {};
	const order = Object.keys(BUILD) as (keyof Maps)[];
	let i = 0;
	let job: Job | null = null;
	const step = () => {
		if (i >= order.length) return true;
		job ??= BUILD[order[i]](done);
		if (job.next()) {
			done[order[i++]] = job.tex;
			job = null;
		}
		return i >= order.length;
	};
	return {
		step,
		get: () => {
			while (!step());
			return done as Maps;
		},
	};
};

const D = Math.PI / 180;
const lava = (k: number): [number, number, number] => [255 * k, 120 * k * k + 20 * k, 30 * k * k * k];
const cloudsAt = (p: [number, number, number], seed: number, f: number) => {
	const w = fbm(p[0] * 2, p[1] * 2, p[2] * 2, 3, seed + 5) * 2;
	return fbm(p[0] * f + w, p[1] * f * 1.2, p[2] * f * 3, 5, seed);
};
const mareAt = (lon: number, lat: number) => {
	let m = 0;
	for (const [L, B, R] of MARIA) {
		const c = Math.sin(lat) * Math.sin(B * D) + Math.cos(lat) * Math.cos(B * D) * Math.cos(lon - L * D);
		const ang = Math.acos(Math.max(-1, Math.min(1, c))) / D;
		m = Math.max(m, 1 - sstep(R * 0.7, R * 1.05, ang));
	}
	return m;
};

const BUILD: Record<keyof Maps, (m: Partial<Maps>) => Job> = {
	proto: () => build((_, __, p) => {
		const n = fbm(p[0] * 3, p[1] * 3, p[2] * 3, 5, 11);
		const r = 1 - Math.abs(fbm(p[0] * 5 + 7, p[1] * 5, p[2] * 5, 4, 23) - 0.5) * 2;
		const crack = sstep(0.95, 0.995, r);
		const g = 0.55 + 0.6 * n;
		const [er, eg, eb] = lava(0.55 + 0.45 * crack);
		return [150 * g, 112 * g, 92 * g, er * crack, eg * crack, eb * crack];
	}),
	theia: () => build((_, __, p) => {
		const n = fbm(p[0] * 3, p[1] * 3, p[2] * 3, 5, 131);
		const r = 1 - Math.abs(fbm(p[0] * 5, p[1] * 5, p[2] * 5, 4, 141) - 0.5) * 2;
		const crack = sstep(0.96, 0.995, r);
		const g = 0.55 + 0.6 * n;
		const [er, eg, eb] = lava(0.5 * crack);
		return [170 * g, 140 * g, 112 * g, er * crack, eg * crack, eb * crack];
	}),
	magma: () => build((_, __, p) => {
		const n = fbm(p[0] * 5, p[1] * 5, p[2] * 5, 6, 31);
		const raft = sstep(0.6, 0.7, fbm(p[0] * 9 + 3, p[1] * 9, p[2] * 9, 4, 41));
		const vein = sstep(0.93, 0.99, 1 - Math.abs(fbm(p[0] * 7, p[1] * 7, p[2] * 7, 4, 43) - 0.5) * 2);
		const k = Math.min(1, (0.42 + 0.6 * n) * (1 - 0.5 * raft) + 0.25 * vein);
		const [er, eg, eb] = lava(k);
		return [60, 40, 34, er, eg, eb];
	}),
	moonHot: () => build((lon, lat, p) => {
		const n = fbm(p[0] * 5, p[1] * 5, p[2] * 5, 5, 161);
		const m = mareAt(lon, lat);
		const k = 0.35 + 0.4 * n + 0.15 * m;
		const [er, eg, eb] = lava(k);
		return [110, 96, 88, er, eg, eb];
	}),
	moon: () => build((lon, lat, p) => {
		const n = fbm(p[0] * 8, p[1] * 8, p[2] * 8, 4, 151);
		const m = mareAt(lon, lat);
		const v = (176 + 40 * n) * (1 - 0.48 * m);
		return [v, v * 0.98, v * 0.94, 0, 0, 0];
	}),
	crust: () => build((_, __, p) => {
		const n = fbm(p[0] * 4, p[1] * 4, p[2] * 4, 5, 51);
		const r = 1 - Math.abs(fbm(p[0] * 6 + 1, p[1] * 6, p[2] * 6, 4, 61) - 0.5) * 2;
		const crack = sstep(0.965, 0.997, r);
		const g = 0.6 + 0.6 * n;
		const [er, eg, eb] = lava(0.5 * crack);
		return [78 * g, 70 * g, 66 * g, er * crack, eg * crack, eb * crack];
	}),
	steam: (m) => build((_, lat, p, i) => {
		const c = sstep(0.38, 0.62, cloudsAt(p, 71, 2.5));
		const a = m.crust!.alb, e = m.crust!.emi;
		const k = 1 - c;
		const v = 200 + 30 * Math.cos(lat);
		return [a[i * 3] * k + v * c, a[i * 3 + 1] * k + (v - 6) * c, a[i * 3 + 2] * k + (v - 12) * c, e[i * 3] * k * 0.6, e[i * 3 + 1] * k * 0.6, e[i * 3 + 2] * k * 0.6];
	}),
	ocean: () => build((_, __, p) => {
		const n = fbm(p[0] * 3, p[1] * 3, p[2] * 3, 5, 81);
		const isl = sstep(0.66, 0.7, fbm(p[0] * 5, p[1] * 5, p[2] * 5, 5, 91));
		const c = sstep(0.5, 0.75, cloudsAt(p, 101, 3)) * 0.85;
		let r = 18 + 14 * n, g = 52 + 26 * n, b = 98 + 36 * n;
		r = r * (1 - isl) + 92 * isl; g = g * (1 - isl) + 80 * isl; b = b * (1 - isl) + 70 * isl;
		const w = 225;
		return [r * (1 - c) + w * c, g * (1 - c) + w * c, b * (1 - c) + w * c, 0, 0, 0];
	}),
	today: () => {
		const mask = landMask();
		return build((lon, lat, p, i) => {
			const n = fbm(p[0] * 6, p[1] * 6, p[2] * 6, 5, 111);
			const al = Math.abs(lat) / D;
			let r: number, g: number, b: number;
			const ice = lat < -62 * D || al > 78 || (lat > 60 * D && lon > -73 * D && lon < -12 * D && mask[i]);
			if (mask[i]) {
				const desert = sstep(0.42, 0.62, n + 0.32 - Math.abs(al - 24) / 40);
				const north = sstep(52, 66, al);
				r = 52 + 30 * n; g = 92 + 28 * n; b = 44 + 10 * n;
				r = r * (1 - desert) + 196 * desert; g = g * (1 - desert) + 162 * desert; b = b * (1 - desert) + 108 * desert;
				r = r * (1 - north) + 118 * north; g = g * (1 - north) + 112 * north; b = b * (1 - north) + 86 * north;
			} else {
				r = 14 + 10 * n; g = 50 + 22 * n; b = 112 + 30 * n;
			}
			if (ice) { r = 236; g = 240; b = 244; }
			const c = sstep(0.52, 0.78, cloudsAt(p, 121, 3)) * 0.9;
			return [r * (1 - c) + 240 * c, g * (1 - c) + 242 * c, b * (1 - c) + 245 * c, 0, 0, 0];
		});
	},
};

// ---------- renderer ----------
type Lut = { n: number; idx: Int32Array; lon: Float32Array; row: Int32Array; nx: Float32Array; ny: Float32Array; nz: Float32Array; cov: Float32Array };
type Buf = { cv: HTMLCanvasElement; cx: CanvasRenderingContext2D; img: ImageData; lut: Lut | null; key: string };
const bufs = new Map<number, Buf>();

const makeLut = (n: number, tiltDeg: number): Lut => {
	const ct = Math.cos((tiltDeg * Math.PI) / 180), st = Math.sin((tiltDeg * Math.PI) / 180);
	const idx: number[] = [], lon: number[] = [], row: number[] = [], nx: number[] = [], ny: number[] = [], nz: number[] = [], cov: number[] = [];
	const h = n / 2;
	for (let j = 0; j < n; j++) {
		for (let i = 0; i < n; i++) {
			const x = (i + 0.5 - h) / h, y = (h - j - 0.5) / h;
			const d2 = x * x + y * y;
			const d = Math.sqrt(d2);
			if (d > 1 + 1 / h) continue;
			const z = Math.sqrt(Math.max(0, 1 - d2));
			const wy = y * ct - z * st, wz = y * st + z * ct;
			const L = Math.atan2(wy, x), B = Math.asin(Math.max(-1, Math.min(1, wz)));
			idx.push(j * n + i);
			lon.push(((L + Math.PI) / (2 * Math.PI)) * TW);
			row.push(Math.min(TH - 1, Math.max(0, Math.floor((0.5 - B / Math.PI) * TH))) * TW);
			nx.push(x); ny.push(y); nz.push(z);
			cov.push(clamp01((1 - d) * h + 0.5));
		}
	}
	return {
		n: idx.length, idx: Int32Array.from(idx), lon: Float32Array.from(lon), row: Int32Array.from(row),
		nx: Float32Array.from(nx), ny: Float32Array.from(ny), nz: Float32Array.from(nz), cov: Float32Array.from(cov),
	};
};

/**
 * Draws a globe of radius r (CSS px) at (x, y). spin — rotation of the body about its axis (radians, counter-clockwise
 * from the north); tilt — the camera's angle from the north pole (degrees); sun — unit vector to the Sun in view
 * coordinates (x right, y up, z to the viewer). The surface is the mix (1 − k)·A + k·B; emission is scaled by `glow`.
 */
export const drawGlobe = (
	ctx: CanvasRenderingContext2D, dpr: number, x: number, y: number, r: number, spin: number, tilt: number,
	sun: [number, number, number], A: Tex, B: Tex | null, k: number, glow = 1, alpha = 1,
) => {
	if (r <= 0 || alpha <= 0) return;
	const kk = B ? k : 0;
	if (r * dpr < 5) {
		const c = A.avg.map((v, i) => v * (1 - kk) + (B ? B.avg[i] : v) * kk);
		ctx.globalAlpha = alpha;
		ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
		ctx.beginPath();
		ctx.arc(x, y, Math.max(r, 0.6), 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
		return;
	}
	// about one map texel per rendered pixel; the smooth upscaling of drawImage hides the texels
	let n = Math.min(176, Math.ceil(r * dpr * 2));
	n = Math.max(16, Math.ceil(n / 8) * 8);
	let b = bufs.get(n);
	if (!b) {
		const cv = document.createElement('canvas');
		cv.width = cv.height = n;
		const cx = cv.getContext('2d')!;
		b = { cv, cx, img: cx.createImageData(n, n), lut: null, key: '' };
		bufs.set(n, b);
	}
	const tq = Math.round(tilt * 2) / 2;
	const key = `${tq}`;
	if (!b.lut || b.key !== key) {
		b.lut = makeLut(n, tq);
		b.key = key;
		b.img.data.fill(0);
	}
	const L = b.lut;
	const d = b.img.data;
	const sh = ((((spin / (2 * Math.PI)) * TW) % TW) + TW) % TW;
	const [sx, sy, sz] = sun;
	const aA = A.alb, eA = A.emi;
	const aB = B ? B.alb : A.alb, eB = B ? B.emi : A.emi;
	const k1 = 1 - kk;
	for (let i = 0; i < L.n; i++) {
		let u = L.lon[i] - sh;
		if (u < 0) u += TW;
		const t = (L.row[i] + (u | 0) % TW) * 3;
		const l = L.nx[i] * sx + L.ny[i] * sy + L.nz[i] * sz;
		const lit = l > -0.1 ? Math.min(1, (l + 0.1) * 1.05) : 0;
		const li = lit * lit * (3 - 2 * lit) * 0.97 + 0.03;
		const p = L.idx[i] * 4;
		d[p] = (aA[t] * k1 + aB[t] * kk) * li + (eA[t] * k1 + eB[t] * kk) * glow;
		d[p + 1] = (aA[t + 1] * k1 + aB[t + 1] * kk) * li + (eA[t + 1] * k1 + eB[t + 1] * kk) * glow;
		d[p + 2] = (aA[t + 2] * k1 + aB[t + 2] * kk) * li + (eA[t + 2] * k1 + eB[t + 2] * kk) * glow;
		d[p + 3] = 255 * L.cov[i];
	}
	b.cx.putImageData(b.img, 0, 0);
	ctx.globalAlpha = alpha;
	ctx.drawImage(b.cv, x - r, y - r, 2 * r, 2 * r);
	ctx.globalAlpha = 1;
};
