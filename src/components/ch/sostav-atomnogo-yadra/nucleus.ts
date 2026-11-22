/**
 * Nuclei built from protons and neutrons, shared by the pictures and models of «Состав атомного ядра. Ядерные силы».
 *
 * pack(A, Z) places A nucleons as balls of radius 1 (in femtometers, 1 фм = 10⁻¹⁵ м) inside a ball, as tightly as balls
 * pack at random (about 64 % of the volume), so the nucleus has the radius R ≈ (A / 0,64)^⅓ − 1 + 1 фм measured to the
 * centers plus one nucleon radius. This gives R ≈ 1,2·A^⅓ фм, the measured size of nuclei: 1,9 фм for helium-4,
 * 2,7 фм for carbon-12, 7,4 фм for uranium-238 (the uranium nucleus is about 1,5·10⁻¹⁴ м across). A nucleon drawn with
 * a radius of 1 фм is close to the measured size of a proton (charge radius 0,84 фм). Z of the nucleons are protons,
 * spread evenly (seeded shuffle), the rest are neutrons. The packing is computed once at build time (deterministic).
 *
 * The client side (drawNucleus) turns the ball about a tilted vertical axis and draws the balls back to front, protons
 * in the color of positive charge (--ig-vy) with a «+» when they are big enough, neutrons gray, as in grade 8.
 */
export type Nucleon = [number, number, number, 0 | 1]; // x, y, z (фм), 1 = proton

const rng = (seed: number) => {
	let s = seed >>> 0 || 1;
	return () => {
		s ^= s << 13;
		s ^= s >>> 17;
		s ^= s << 5;
		return (s >>> 0) / 4294967296;
	};
};

const fixed: Record<number, [number, number, number][]> = {
	1: [[0, 0, 0]],
	2: [
		[-1, 0, 0],
		[1, 0, 0],
	],
	3: [
		[-1, 0.577, 0],
		[1, 0.577, 0],
		[0, -1.155, 0],
	],
	4: [
		[1, 1, 1],
		[1, -1, -1],
		[-1, 1, -1],
		[-1, -1, 1],
	].map(([x, y, z]) => [x * 0.7071, y * 0.7071, z * 0.7071] as [number, number, number]),
};

/** A nucleus of A nucleons, Z of them protons. Coordinates in фм, the center at 0. */
export const pack = (A: number, Z: number, seed = 7): Nucleon[] => {
	const r = rng(seed * 7919 + A * 31 + Z);
	let pts: [number, number, number][];
	if (fixed[A]) pts = fixed[A].map((p) => [...p] as [number, number, number]);
	else {
		const Rc = Math.max(0.01, Math.cbrt(A / 0.64) - 1); // radius for the centers
		pts = [];
		while (pts.length < A) {
			const p: [number, number, number] = [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1];
			if (p[0] ** 2 + p[1] ** 2 + p[2] ** 2 <= 1) pts.push([p[0] * Rc, p[1] * Rc, p[2] * Rc]);
		}
		// relax: push overlapping balls apart, pull everything gently toward the center (the nucleus holds together)
		for (let it = 0; it < 400; it++) {
			for (const p of pts) {
				const d = Math.hypot(p[0], p[1], p[2]);
				const k = d > Rc ? Rc / d : 0.997;
				p[0] *= k;
				p[1] *= k;
				p[2] *= k;
			}
			for (let i = 0; i < A; i++)
				for (let j = i + 1; j < A; j++) {
					const a = pts[i];
					const b = pts[j];
					const dx = b[0] - a[0];
					const dy = b[1] - a[1];
					const dz = b[2] - a[2];
					const d2 = dx * dx + dy * dy + dz * dz;
					if (d2 < 4 && d2 > 1e-9) {
						const d = Math.sqrt(d2);
						const k = ((2 - d) / d) * 0.5;
						a[0] -= dx * k;
						a[1] -= dy * k;
						a[2] -= dz * k;
						b[0] += dx * k;
						b[1] += dy * k;
						b[2] += dz * k;
					}
				}
		}
		const c = pts.reduce((s, p) => [s[0] + p[0] / A, s[1] + p[1] / A, s[2] + p[2] / A], [0, 0, 0]);
		pts = pts.map((p) => [p[0] - c[0], p[1] - c[1], p[2] - c[2]]);
	}
	// protons: spread evenly (every A/Z-th of a shuffled order)
	const order = pts.map((_, i) => i);
	for (let i = A - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[order[i], order[j]] = [order[j], order[i]];
	}
	const isP = new Array(A).fill(0);
	for (let k = 0; k < Z; k++) isP[order[Math.floor(((k + 0.5) * A) / Z)]] = 1;
	return pts.map((p, i) => [+p[0].toFixed(3), +p[1].toFixed(3), +p[2].toFixed(3), isP[i] as 0 | 1]);
};

/** The radius of the drawn nucleus (to the outer edge of the balls), фм. */
export const outerRadius = (n: Nucleon[]) => Math.max(...n.map((p) => Math.hypot(p[0], p[1], p[2]))) + 1;

const NS = 'http://www.w3.org/2000/svg';

/**
 * Draws (and redraws) nucleons into `g`: k px per фм, center (cx, cy), turned by `angle` (rad) about the vertical axis
 * tilted by `tilt` toward the viewer. `fills` are the fill values for neutrons and protons (gradients of the picture).
 */
export const drawNucleus = (
	g: SVGGElement,
	n: Nucleon[],
	o: { k: number; cx: number; cy: number; angle: number; tilt?: number; fills: [string, string]; plus?: boolean },
) => {
	const tilt = o.tilt ?? 0.3;
	const ca = Math.cos(o.angle);
	const sa = Math.sin(o.angle);
	const ct = Math.cos(tilt);
	const st = Math.sin(tilt);
	const ball = (p: Nucleon) => {
		const b = document.createElementNS(NS, 'g');
		b.setAttribute('class', p[3] ? 'nuc-p' : 'nuc-n');
		const c = document.createElementNS(NS, 'circle');
		c.setAttribute('r', o.k.toFixed(2));
		c.setAttribute('fill', o.fills[p[3]]);
		b.append(c);
		if (p[3] && (o.plus ?? o.k >= 4)) {
			const s = o.k * 0.45;
			const pl = document.createElementNS(NS, 'path');
			pl.setAttribute('class', 'nuc-plus');
			pl.setAttribute('d', `M${-s} 0 H${s} M0 ${-s} V${s}`);
			pl.setAttribute('stroke-width', Math.max(0.8, o.k * 0.16).toFixed(2));
			b.append(pl);
		}
		(b as unknown as { nuc: Nucleon }).nuc = p;
		return b;
	};
	// the balls keep their nucleon (z-order changes the DOM order); a nucleon whose kind changed gets a new ball
	type Ball = SVGGElement & { nuc: Nucleon; kind?: number };
	let balls = (g as unknown as { balls?: Ball[] }).balls;
	if (!balls || balls.length !== n.length) {
		g.replaceChildren();
		balls = n.map((p) => ball(p) as Ball);
		balls.forEach((b, i) => (b.kind = n[i][3]));
		g.append(...balls);
		(g as unknown as { balls?: Ball[] }).balls = balls;
	}
	n.forEach((p, i) => {
		if (balls![i].kind !== p[3]) {
			const b = ball(p) as Ball;
			b.kind = p[3];
			balls![i].replaceWith(b);
			balls![i] = b;
		}
	});
	const kids = balls;
	const z: { e: SVGGElement; z: number; x: number; y: number }[] = [];
	n.forEach((p, i) => {
		// turn about y, then tilt about x
		const x1 = p[0] * ca + p[2] * sa;
		const z1 = -p[0] * sa + p[2] * ca;
		const y2 = p[1] * ct - z1 * st;
		const z2 = p[1] * st + z1 * ct;
		const e = kids[i];
		const x = o.cx + x1 * o.k;
		const y = o.cy + y2 * o.k;
		e.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
		z.push({ e, z: z2, x, y });
	});
	z.sort((a, b) => a.z - b.z);
	for (const { e } of z) g.append(e);
	// a «+» shows only when no nearer ball covers any of it (a half-covered «+» would read as «−»)
	const pos = z.map((q) => [q.x, q.y]);
	const lim = (1.5 * o.k) ** 2;
	z.forEach(({ e }, i) => {
		const pl = e.children[1] as SVGElement | undefined;
		if (!pl) return;
		let free = true;
		for (let j = i + 1; j < z.length && free; j++) if ((pos[j][0] - pos[i][0]) ** 2 + (pos[j][1] - pos[i][1]) ** 2 < lim) free = false;
		pl.style.display = free ? '' : 'none';
	});
};

/** The screen offset (in фм, y down) and depth of a point of the nucleus turned as in drawNucleus. */
export const project = (p: [number, number, number] | Nucleon, angle: number, tilt = 0.3) => {
	const x1 = p[0] * Math.cos(angle) + p[2] * Math.sin(angle);
	const z1 = -p[0] * Math.sin(angle) + p[2] * Math.cos(angle);
	return { x: x1, y: p[1] * Math.cos(tilt) - z1 * Math.sin(tilt), z: p[1] * Math.sin(tilt) + z1 * Math.cos(tilt) };
};
