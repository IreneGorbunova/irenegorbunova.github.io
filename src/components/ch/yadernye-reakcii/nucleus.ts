/**
 * Nuclei built from protons and neutrons for «Ядерные реакции. Атомная энергетика»; the same look as the nuclei of
 * «Состав атомного ядра. Ядерные силы» (balls packed in a ball, protons red-pink with a «+», neutrons gray).
 *
 * pack(A, Z) places A nucleons as balls of radius 1 фм (1 фм = 10⁻¹⁵ м) inside a ball, packed as balls pack at random
 * (about 64 % of the volume). The nucleus then has the measured size R ≈ 1,2·A^⅓ фм: 7,4 фм for uranium-235,
 * 6,2 фм for barium-141, 5,4 фм for krypton-92. Z of the nucleons are protons spread evenly. Computed at build time.
 *
 * Balls (client side): draw any set of nucleons with 3D positions (фм) into a group, back to front, with a tilt of the
 * view by `tilt` rad so the ball looks round; the «+» of a proton shows only when no nearer ball covers it.
 */
export type Nucleon = [number, number, number, 0 | 1]; // x, y, z (фм), 1 = proton

export const rng = (seed: number) => {
	let s = seed >>> 0 || 1;
	return () => {
		s ^= s << 13;
		s ^= s >>> 17;
		s ^= s << 5;
		return (s >>> 0) / 4294967296;
	};
};

/** A nucleus of A nucleons, Z of them protons. Coordinates in фм, the center at 0. */
export const pack = (A: number, Z: number, seed = 7): Nucleon[] => {
	const r = rng(seed * 7919 + A * 31 + Z);
	let pts: [number, number, number][] = [];
	if (A === 1) pts = [[0, 0, 0]];
	else {
		const Rc = Math.max(0.01, Math.cbrt(A / 0.64) - 1); // radius for the centers
		while (pts.length < A) {
			const p: [number, number, number] = [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1];
			if (p[0] ** 2 + p[1] ** 2 + p[2] ** 2 <= 1) pts.push([p[0] * Rc, p[1] * Rc, p[2] * Rc]);
		}
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
	const order = pts.map((_, i) => i);
	for (let i = A - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[order[i], order[j]] = [order[j], order[i]];
	}
	const isP = new Array(A).fill(0);
	for (let k = 0; k < Z; k++) isP[order[Math.floor(((k + 0.5) * A) / Z)]] = 1;
	return pts.map((p, i) => [+p[0].toFixed(3), +p[1].toFixed(3), +p[2].toFixed(3), isP[i] as 0 | 1]);
};

/** The radius of a packed nucleus to the outer edge of its balls, фм. */
export const outerRadius = (n: Nucleon[]) => Math.max(...n.map((p) => Math.hypot(p[0], p[1], p[2]))) + 1;

const NS = 'http://www.w3.org/2000/svg';

/**
 * A set of balls in a group. `kinds[i]` is 1 for a proton. set(i, x, y, z) places ball i (x, y on screen in px, z the
 * depth: larger = nearer); render() sorts them and hides the «+» signs that are covered. `fills` are the fill values
 * for neutrons and protons; `k` the radius of a ball in px.
 */
export const balls = (g: SVGGElement, kinds: (0 | 1)[], o: { k: number; fills: [string, string]; cls?: string }) => {
	g.replaceChildren();
	const nodes = kinds.map((p) => {
		const b = document.createElementNS(NS, 'g');
		const c = document.createElementNS(NS, 'circle');
		c.setAttribute('r', o.k.toFixed(2));
		c.setAttribute('fill', o.fills[p]);
		c.setAttribute('class', o.cls ? `yr-ball ${o.cls}` : 'yr-ball');
		b.append(c);
		if (p && o.k >= 3.5) {
			const s = o.k * 0.45;
			const pl = document.createElementNS(NS, 'path');
			pl.setAttribute('class', 'yr-plus');
			pl.setAttribute('d', `M${-s} 0 H${s} M0 ${-s} V${s}`);
			pl.setAttribute('stroke-width', Math.max(0.8, o.k * 0.16).toFixed(2));
			b.append(pl);
		}
		g.append(b);
		return b;
	});
	const pos = kinds.map(() => ({ x: 0, y: 0, z: 0, on: true }));
	const set = (i: number, x: number, y: number, z: number, on = true) => {
		const q = pos[i];
		q.x = x;
		q.y = y;
		q.z = z;
		q.on = on;
	};
	const render = () => {
		const idx = pos.map((_, i) => i).filter((i) => pos[i].on);
		idx.sort((a, b) => pos[a].z - pos[b].z);
		nodes.forEach((n, i) => {
			if (!pos[i].on) n.style.display = 'none';
		});
		for (const i of idx) {
			const n = nodes[i];
			n.style.display = '';
			n.setAttribute('transform', `translate(${pos[i].x.toFixed(2)} ${pos[i].y.toFixed(2)})`);
			g.append(n);
		}
		const lim = (1.5 * o.k) ** 2;
		idx.forEach((i, m) => {
			const pl = nodes[i].children[1] as SVGElement | undefined;
			if (!pl) return;
			let free = true;
			for (let j = m + 1; j < idx.length && free; j++) {
				const q = pos[idx[j]];
				if ((q.x - pos[i].x) ** 2 + (q.y - pos[i].y) ** 2 < lim) free = false;
			}
			pl.style.display = free ? '' : 'none';
		});
	};
	return { set, render, nodes };
};

/** Screen offset (фм, y down) and depth of a point seen with the view tilted by `tilt` rad. */
export const view = (x: number, y: number, z: number, tilt = 0.3) => ({ x, y: y * Math.cos(tilt) - z * Math.sin(tilt), z: y * Math.sin(tilt) + z * Math.cos(tilt) });

/**
 * A nucleus as SVG markup (build time): A nucleons, Z protons, k px per фм, centered at (0, 0), seen with a tilt of
 * 0,3 rad. `gp`/`gn` are the fill values of protons and neutrons (gradient urls of the picture). The electron
 * (A = 0, Z = −1) is a small blue ball.
 */
export const clusterSvg = (A: number, Z: number, k: number, gp: string, gn: string) => {
	if (A === 0) return `<circle r="${(k * 0.7).toFixed(2)}" class="yr-ball yr-el"></circle>`;
	const n = pack(A, Z, 5);
	const pts = n.map((p) => ({ ...view(p[0], p[1], p[2]), pr: p[3] }));
	pts.sort((a, b) => a.z - b.z);
	return pts
		.map((p, i) => {
			const x = (p.x * k).toFixed(2);
			const y = (p.y * k).toFixed(2);
			const c = `<circle cx="${x}" cy="${y}" r="${k.toFixed(2)}" fill="${p.pr ? gp : gn}" class="yr-ball"></circle>`;
			const covered = pts.slice(i + 1).some((q) => (q.x - p.x) ** 2 + (q.y - p.y) ** 2 < 2.25);
			if (!p.pr || covered || k < 3.5) return c;
			const s = (k * 0.45).toFixed(2);
			return c + `<path class="yr-plus" transform="translate(${x} ${y})" d="M-${s} 0 H${s} M0 -${s} V${s}" stroke-width="${Math.max(0.8, k * 0.16).toFixed(2)}"></path>`;
		})
		.join('');
};
