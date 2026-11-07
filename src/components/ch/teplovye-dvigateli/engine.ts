/**
 * Four-stroke engine: geometry, a simple ideal-gas cycle and an SVG drawing that the main model
 * and the "which stroke?" quiz share.
 *
 * Geometry: exact slider-crank (crank radius R, connecting rod L, px). The crank angle phi runs
 * 0…4π over one cycle (two turns of the shaft); phi = 0 is top dead centre at the start of intake.
 * Gas: intake at 1 atm and 50 °C, compression and expansion with p·V^n = const (n = 1.35),
 * petrol: spark 10° before top dead centre, heat added over ~30°; diesel: fuel burns at constant
 * pressure from top dead centre (the ideal Diesel cycle). Exhaust valve opens at bottom dead
 * centre, the pressure drops to 1 atm, then the piston pushes the gas out. Valve timing is
 * simplified (each valve open exactly during its stroke). The numbers are illustrative.
 */

export type Mode = 'petrol' | 'diesel';

export const R = 42;
export const L = 140;
const N = 1.35;
const K0 = 273.15;
const T1 = 50 + K0;
export const PATM = 101; // kPa
const DEG = Math.PI / 180;

export interface Spec {
	eps: number; // compression ratio
	tPeak: number; // °C after combustion
	fuel: string;
	fuelGen: string; // genitive: «бензина»
	q: number; // J/kg
	qTex: string;
	m: number; // kg of fuel per cycle
	mTex: string; // in grams for display
	shares: [number, number, number, number]; // useful work, exhaust, cooling, friction
}

export const SPECS: Record<Mode, Spec> = {
	petrol: {
		eps: 10,
		tPeak: 1800,
		fuel: 'бензин',
		fuelGen: 'бензина',
		q: 4.6e7,
		qTex: '4{,}6\\cdot 10^7',
		m: 4e-5,
		mTex: '0{,}04',
		shares: [0.25, 0.4, 0.3, 0.05],
	},
	diesel: {
		eps: 18,
		tPeak: 1700,
		fuel: 'дизельное топливо',
		fuelGen: 'дизельного топлива',
		q: 4.2e7,
		qTex: '4{,}2\\cdot 10^7',
		m: 3e-5,
		mTex: '0{,}03',
		shares: [0.4, 0.3, 0.25, 0.05],
	},
};

export const STROKES = ['Впуск', 'Сжатие', 'Рабочий ход', 'Выпуск'];

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Distance of the piston below top dead centre, px. */
export function drop(th: number) {
	const s = Math.sin(th);
	return R + L - (R * Math.cos(th) + Math.sqrt(L * L - R * R * s * s));
}

export interface State {
	phi: number;
	stroke: number; // 0…3
	frac: number; // 0…1 within the stroke
	drop: number; // px
	clear: number; // px of gas above the piston at TDC
	v: number; // V / Vmax
	t: number; // °C
	p: number; // kPa
	liftIn: number; // 0…1
	liftEx: number; // 0…1
	spark: number; // 0…1 flash
	burn: number; // 0…1 how much of the charge has burnt
	inject: number; // 0…1 diesel spray strength
	gasIn: number; // 0…1 amount of gas in the cylinder (relative to a full charge)
	burnt: boolean;
}

export function cycle(mode: Mode) {
	const s = SPECS[mode];
	const vmin = 1 / s.eps;
	const T2 = T1 * s.eps ** (N - 1);
	const p2 = PATM * s.eps ** N;
	const T3 = s.tPeak + K0;
	let p3: number, T4: number, p4: number, rc = 1;
	if (mode === 'petrol') {
		p3 = (p2 * T3) / T2;
		T4 = T3 / s.eps ** (N - 1);
		p4 = p3 / s.eps ** N;
	} else {
		rc = T3 / T2;
		p3 = p2;
		T4 = T3 * (rc / s.eps) ** (N - 1);
		p4 = p3 * (rc / s.eps) ** N;
	}
	const Tb = T4 * (PATM / p4) ** ((N - 1) / N);
	return { s, vmin, T2, p2, T3, p3, T4, p4, Tb, rc };
}

export function state(phiIn: number, mode: Mode): State {
	const c = cycle(mode);
	const TWO = 2 * Math.PI;
	const phi = ((phiIn % (2 * TWO)) + 2 * TWO) % (2 * TWO);
	const stroke = Math.min(3, Math.floor(phi / Math.PI));
	const frac = phi / Math.PI - stroke;
	const d = drop(phi);
	const clear = (2 * R) / (c.s.eps - 1);
	const v = (clear + d) / (clear + 2 * R);
	let T = T1,
		p = PATM,
		spark = 0,
		burn = 0,
		inject = 0,
		gasIn = 1,
		burnt = false;
	const liftIn = stroke === 0 ? Math.sin(phi) : 0;
	const liftEx = stroke === 3 ? Math.sin(phi - 3 * Math.PI) : 0;

	if (stroke === 0) {
		gasIn = (v - c.vmin) / (1 - c.vmin);
	} else if (mode === 'petrol' && stroke <= 2) {
		const Tc = T1 * (1 / v) ** (N - 1);
		const pc = PATM * (1 / v) ** N;
		const Te = c.T3 * (c.vmin / v) ** (N - 1);
		const pe = c.p3 * (c.vmin / v) ** N;
		burn = smooth((phi - (TWO - 6 * DEG)) / (30 * DEG));
		T = Tc + burn * (Te - Tc);
		p = pc + burn * (pe - pc);
		const ds = phi - (TWO - 10 * DEG);
		spark = ds > 0 && ds < 14 * DEG ? Math.sin((ds / (14 * DEG)) * Math.PI) : 0;
		burnt = burn > 0.5;
	} else if (mode === 'diesel' && stroke === 1) {
		T = T1 * (1 / v) ** (N - 1);
		p = PATM * (1 / v) ** N;
		const di = phi - (TWO - 3 * DEG);
		inject = di > 0 ? smooth(di / (3 * DEG)) : 0;
	} else if (mode === 'diesel' && stroke === 2) {
		const vc = c.rc * c.vmin;
		if (v <= vc) {
			p = c.p2;
			T = (c.T2 * v) / c.vmin;
			burn = (v - c.vmin) / (vc - c.vmin);
			inject = 1 - smooth((burn - 0.85) / 0.15);
		} else {
			T = c.T3 * (vc / v) ** (N - 1);
			p = c.p2 * (vc / v) ** N;
			burn = 1;
		}
		burnt = true;
	} else {
		// exhaust: blow-down to 1 atm over 25°, then the piston pushes the gas out
		const bd = smooth((phi - 3 * Math.PI) / (25 * DEG));
		T = c.T4 + bd * (c.Tb - c.T4);
		p = c.p4 + bd * (PATM - c.p4);
		gasIn = (p * v * c.T4) / (T * c.p4);
		burn = 1;
		burnt = true;
	}
	return { phi, stroke, frac, drop: d, clear, v, t: T - K0, p, liftIn, liftEx, spark, burn, inject, gasIn, burnt };
}

/* ------------------------------------------------------------------ drawing */

const NS = 'http://www.w3.org/2000/svg';
export const CX = 180;
const BORE = 100;
const H0 = 96; // underside of the cylinder head
const PIST_H = 46;
const PIN_FROM_TOP = 26;
const CLEAR_MAX = (2 * R) / (10 - 1);
export const CY = H0 + CLEAR_MAX + PIN_FROM_TOP + R + L; // crankshaft axis
const VX = 30; // valve offset from the axis
const LIFT = 11; // px, full valve lift
const NP = 40; // gas particles

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element) {
	const e = document.createElementNS(NS, tag);
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
	parent?.append(e);
	return e;
}

export interface EngineView {
	svg: SVGSVGElement;
	render(phi: number, mode: Mode, dt: number, omega: number): State;
	setLabels(on: boolean): void;
	setMotionArrow(on: boolean): void;
	scatter(): void;
}

export function buildEngine(host: Element, uid: string): EngineView {
	const svg = el('svg', { viewBox: '0 0 360 410', class: 'td-eng', role: 'img' });
	svg.setAttribute('aria-label', 'Четырёхтактный двигатель внутреннего сгорания в разрезе');
	host.append(svg);
	const defs = el('defs', {}, svg);
	const grad = el('radialGradient', { id: `${uid}-fl` }, defs);
	el('stop', { offset: '0', class: 'td-fl0' }, grad);
	el('stop', { offset: '0.55', class: 'td-fl1' }, grad);
	el('stop', { offset: '1', class: 'td-fl2' }, grad);
	const clip = el('clipPath', { id: `${uid}-ch` }, defs);
	const clipRect = el('rect', { x: CX - BORE / 2, y: H0, width: BORE, height: 10 }, clip);
	const mk = el('marker', { id: `${uid}-ah`, viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 4, markerHeight: 4, orient: 'auto' }, defs);
	el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'td-ahead' }, mk);
	const mk2 = el('marker', { id: `${uid}-am`, viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 4, markerHeight: 4, orient: 'auto' }, defs);
	el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'td-mhead' }, mk2);

	// flywheel (behind everything below the cylinder)
	const fly = el('g', { class: 'td-fly' }, svg);
	el('circle', { cx: CX, cy: CY, r: 70, class: 'td-fly-rim' }, fly);
	el('circle', { cx: CX, cy: CY, r: 60, class: 'td-fly-in' }, fly);
	for (let i = 0; i < 6; i++) {
		const a = (i * Math.PI) / 3;
		el('line', { x1: CX + 14 * Math.sin(a), y1: CY - 14 * Math.cos(a), x2: CX + 60 * Math.sin(a), y2: CY - 60 * Math.cos(a), class: 'td-fly-spoke' }, fly);
	}
	el('circle', { cx: CX, cy: CY - 65, r: 3, class: 'td-fly-mark' }, fly);

	// cooling jacket and cylinder
	const yBot = H0 + CLEAR_MAX + 2 * R + PIST_H + 6;
	for (const sgn of [-1, 1]) {
		el('rect', { x: sgn < 0 ? CX - BORE / 2 - 24 : CX + BORE / 2 + 8, y: H0 - 2, width: 16, height: yBot - H0 - 30, rx: 4, class: 'td-jacket' }, svg);
		el('rect', { x: sgn < 0 ? CX - BORE / 2 - 8 : CX + BORE / 2, y: H0, width: 8, height: yBot - H0, class: 'td-metal' }, svg);
	}
	// head with the two ports
	el('rect', { x: CX - BORE / 2 - 26, y: 30, width: BORE + 52, height: H0 - 30, rx: 6, class: 'td-metal' }, svg);
	const portIn = `M 0 40 L ${CX - 70} 40 C ${CX - 50} 40 ${CX - 22} 56 ${CX - VX + 12} ${H0} L ${CX - VX - 13} ${H0} C ${CX - VX - 13} 74 ${CX - 60} 64 ${CX - 70} 64 L 0 64 Z`;
	const portEx = `M 360 40 L ${CX + 70} 40 C ${CX + 50} 40 ${CX + 22} 56 ${CX + VX - 12} ${H0} L ${CX + VX + 13} ${H0} C ${CX + VX + 13} 74 ${CX + 60} 64 ${CX + 70} 64 L 360 64 Z`;
	const pIn = el('path', { d: portIn, class: 'td-port td-port--in' }, svg);
	const pEx = el('path', { d: portEx, class: 'td-port td-port--ex' }, svg);
	el('path', { d: `M 0 40 L ${CX - 70} 40 M 0 64 L ${CX - 70} 64 M 360 40 L ${CX + 70} 40 M 360 64 L ${CX + 70} 64`, class: 'td-pipe' }, svg);

	// gas in the cylinder
	const gas = el('g', { 'clip-path': `url(#${uid}-ch)` }, svg);
	const gasBg = el('rect', { x: CX - BORE / 2, y: H0, width: BORE, height: 10, class: 'td-gas-bg' }, gas);
	const gasFresh = el('rect', { x: CX - BORE / 2, y: H0, width: BORE, height: 10, class: 'td-gas-fresh' }, gas);
	const gasHot = el('rect', { x: CX - BORE / 2, y: H0, width: BORE, height: 10, class: 'td-gas-hot' }, gas);
	const flame = el('circle', { cx: CX, cy: H0, r: 0, fill: `url(#${uid}-fl)` }, gas);
	const spray = el('path', { d: '', class: 'td-spray' }, gas);
	const dots = el('g', {}, gas);
	const parts = Array.from({ length: NP }, (_, i) => ({
		u: (i * 0.618 + 0.13) % 1,
		w: (i * 0.377 + 0.21) % 1,
		in: true,
		a: i * 2.39996,
		e: el('circle', { r: 2.6, class: 'td-pt' }, dots),
	}));
	// gas in the pipes
	const flowIn = Array.from({ length: 9 }, (_, i) => ({ s: i / 9, e: el('circle', { r: 2.6, class: 'td-pt td-pt--fresh' }, svg) }));
	const flowEx = Array.from({ length: 9 }, (_, i) => ({ s: i / 9, e: el('circle', { r: 2.6, class: 'td-pt td-pt--burnt' }, svg) }));
	const midIn = el('path', { d: `M 6 52 L ${CX - 70} 52 C ${CX - 52} 52 ${CX - 34} 66 ${CX - VX} ${H0 + 4}`, fill: 'none', stroke: 'none' }, svg);
	const midEx = el('path', { d: `M ${CX + VX} ${H0 + 4} C ${CX + 34} 66 ${CX + 52} 52 ${CX + 70} 52 L 354 52`, fill: 'none', stroke: 'none' }, svg);

	// valves with springs
	const valve = (x: number) => {
		const g = el('g', { class: 'td-valve' }, svg);
		const spring = el('path', { d: '', class: 'td-spring' }, svg);
		el('rect', { x: x - 2.5, y: 14, width: 5, height: H0 - 16, class: 'td-stem' }, g);
		el('path', { d: `M ${x - 13} ${H0} L ${x + 13} ${H0} L ${x + 4} ${H0 - 6} L ${x - 4} ${H0 - 6} Z`, class: 'td-vhead' }, g);
		el('rect', { x: x - 9, y: 12, width: 18, height: 4, rx: 1.5, class: 'td-stem' }, g);
		return { g, spring, x };
	};
	const vIn = valve(CX - VX);
	const vEx = valve(CX + VX);
	const springPath = (x: number, lift: number) => {
		const y0 = 16 + lift;
		const y1 = 30;
		let d = `M ${x - 7} ${y0}`;
		const n = 6;
		for (let i = 1; i <= n; i++) d += ` L ${x + (i % 2 ? 7 : -7)} ${y0 + ((y1 - y0) * i) / n}`;
		return d;
	};

	// spark plug / injector
	const plug = el('g', { class: 'td-plug' }, svg);
	el('rect', { x: CX - 6, y: 4, width: 12, height: 22, rx: 3, class: 'td-ceramic' }, plug);
	el('rect', { x: CX - 8, y: 26, width: 16, height: 10, rx: 1, class: 'td-stem' }, plug);
	el('rect', { x: CX - 5, y: 36, width: 10, height: H0 - 39, class: 'td-stem' }, plug);
	el('path', { d: `M ${CX} ${H0 - 3} L ${CX} ${H0 + 2.5} M ${CX - 4} ${H0 - 3} L ${CX - 4} ${H0 + 5} L ${CX + 1} ${H0 + 5}`, class: 'td-electrode' }, plug);
	const sparkEl = el('circle', { cx: CX, cy: H0 + 3.5, r: 5, class: 'td-spark' }, svg);
	const inj = el('g', { class: 'td-plug' }, svg);
	el('rect', { x: CX - 7, y: 4, width: 14, height: 30, rx: 3, class: 'td-stem' }, inj);
	el('path', { d: `M ${CX - 5} 34 L ${CX + 5} 34 L ${CX + 3} ${H0 + 1} L ${CX - 3} ${H0 + 1} Z`, class: 'td-stem' }, inj);

	// piston, rod, crank
	const rod = el('line', { class: 'td-rod' }, svg);
	const crank = el('g', {}, svg);
	el('path', { d: `M ${CX - 12} ${CY} A 12 12 0 0 1 ${CX + 12} ${CY} L ${CX + 9} ${CY - R} A 9 9 0 0 1 ${CX - 9} ${CY - R} Z`, class: 'td-web' }, crank);
	el('path', { d: `M ${CX - 30} ${CY + 8} A 31 31 0 0 0 ${CX + 30} ${CY + 8} L ${CX + 10} ${CY} L ${CX - 10} ${CY} Z`, class: 'td-web' }, crank);
	el('circle', { cx: CX, cy: CY, r: 8, class: 'td-journal' }, crank);
	const crankPin = el('circle', { cx: CX, cy: CY - R, r: 7, class: 'td-journal' }, svg);
	const piston = el('g', {}, svg);
	el('rect', { x: CX - BORE / 2 + 1, y: 0, width: BORE - 2, height: PIST_H, rx: 3, class: 'td-piston' }, piston);
	for (const y of [5, 10, 15]) el('line', { x1: CX - BORE / 2 + 1, y1: y, x2: CX + BORE / 2 - 1, y2: y, class: 'td-ring' }, piston);
	const pistonPin = el('circle', { cx: CX, cy: PIN_FROM_TOP, r: 6, class: 'td-journal' }, piston);
	const force = el('line', { x1: CX, x2: CX, class: 'td-force', 'marker-end': `url(#${uid}-ah)` }, svg);
	const forceLbl = el('text', { class: 'td-flab' }, svg);
	forceLbl.textContent = 'F';
	const motion = el('line', { x1: CX + BORE / 2 + 34, x2: CX + BORE / 2 + 34, class: 'td-motion', 'marker-end': `url(#${uid}-am)` }, svg);

	// labels
	const labels = el('g', { class: 'td-labels' }, svg);
	const label = (lines: string[], x: number, y: number, anchor: string, tx: number, ty: number) => {
		const g = el('g', {}, labels);
		const lx = anchor === 'end' ? x + 3 : x - 3;
		const line = el('line', { x1: lx, y1: y - 4, x2: tx, y2: ty, class: 'td-lead' }, g);
		const t = el('text', { x, y: y - (lines.length - 1) * 14, 'text-anchor': anchor }, g);
		lines.forEach((s, i) => {
			const sp = el('tspan', { x, dy: i ? 14 : 0 }, t);
			sp.textContent = s;
		});
		return { g, line };
	};
	label(['впускной', 'клапан'], 64, 104, 'end', CX - VX - 10, H0 + 2);
	label(['выпускной', 'клапан'], 284, 104, 'start', CX + VX + 10, H0 + 2);
	const plugLbl = label(['свеча'], 250, 16, 'start', CX + 7, 14).g;
	const injLbl = label(['форсунка'], 250, 16, 'start', CX + 8, 14).g;
	const pistLbl = label(['поршень'], 64, 196, 'end', CX - 40, 196).line;
	label(['цилиндр'], 270, 160, 'start', CX + BORE / 2 + 4, 160);
	const rodLbl = label(['шатун'], 64, 262, 'end', CX - 6, 262).line;
	label(['коленчатый', 'вал'], 268, 318, 'start', CX + 14, CY + 4);
	label(['маховик'], 64, 386, 'end', CX - 50, CY + 50);
	label(['охлаждающая', 'вода'], 266, 222, 'start', CX + BORE / 2 + 16, 200);

	const at = (p: SVGPathElement, s: number) => p.getPointAtLength(s * p.getTotalLength());

	let last: State | null = null;

	const render = (phiRaw: number, mode: Mode, dt: number, omega: number) => {
		const st = state(phiRaw, mode);
		const th = st.phi % (2 * Math.PI);
		const top = H0 + st.clear + st.drop; // piston crown
		const pinY = top + PIN_FROM_TOP + (CLEAR_MAX - st.clear);
		const cpx = CX + R * Math.sin(th);
		const cpy = CY - R * Math.cos(th);
		piston.setAttribute('transform', `translate(0 ${top})`);
		pistonPin.setAttribute('cy', String(PIN_FROM_TOP + CLEAR_MAX - st.clear));
		pistLbl.setAttribute('y2', String(top + 34));
		rodLbl.setAttribute('x2', String((cpx + CX) / 2 - 4));
		rodLbl.setAttribute('y2', String((cpy + pinY) / 2));
		rod.setAttribute('x1', String(cpx));
		rod.setAttribute('y1', String(cpy));
		rod.setAttribute('x2', String(CX));
		rod.setAttribute('y2', String(pinY));
		crankPin.setAttribute('cx', String(cpx));
		crankPin.setAttribute('cy', String(cpy));
		const deg = (th * 180) / Math.PI;
		crank.setAttribute('transform', `rotate(${deg} ${CX} ${CY})`);
		fly.setAttribute('transform', `rotate(${deg} ${CX} ${CY})`);
		vIn.g.setAttribute('transform', `translate(0 ${LIFT * st.liftIn})`);
		vEx.g.setAttribute('transform', `translate(0 ${LIFT * st.liftEx})`);
		vIn.spring.setAttribute('d', springPath(vIn.x, LIFT * st.liftIn));
		vEx.spring.setAttribute('d', springPath(vEx.x, LIFT * st.liftEx));
		pIn.classList.toggle('is-open', st.liftIn > 0.02);
		pEx.classList.toggle('is-open', st.liftEx > 0.02);

		// gas colours
		const h = top - H0;
		for (const r of [gasBg, gasFresh, gasHot]) r.setAttribute('height', String(h));
		clipRect.setAttribute('height', String(h));
		const dens = Math.min(1, st.gasIn / st.v / 6); // relative density, 1 at ~6× atmospheric density
		const fresh = st.burnt ? 0 : 1 - st.burn;
		gasFresh.style.opacity = String(fresh * (0.12 + 0.5 * dens));
		const heat = Math.max(0, Math.min(1, (st.t - 150) / 1650));
		gasHot.style.opacity = String((st.burnt || st.burn > 0 ? 1 : 0) * (0.12 + 0.75 * heat) * Math.min(1, st.gasIn * 2 + 0.2));
		gasBg.style.opacity = String(st.burnt ? 0.35 * Math.min(1, st.gasIn * 3) : 0);
		const flameR = mode === 'petrol' ? (st.burn > 0 && st.burn < 1 ? 20 + 120 * st.burn : 0) : st.inject > 0.05 && st.stroke === 2 ? 30 + 40 * st.burn : 0;
		flame.setAttribute('r', String(flameR));
		flame.style.opacity = String(mode === 'petrol' ? Math.sin(Math.PI * Math.min(1, st.burn)) : st.inject);
		sparkEl.style.opacity = mode === 'petrol' ? String(st.spark) : '0';
		const sl = Math.min(h - 2, 30);
		spray.setAttribute('d', st.inject > 0.02 ? `M ${CX - 2} ${H0 + 1} L ${CX - 26} ${H0 + sl} L ${CX - 14} ${H0 + sl} Z M ${CX + 2} ${H0 + 1} L ${CX + 26} ${H0 + sl} L ${CX + 14} ${H0 + sl} Z M ${CX - 1.5} ${H0 + 1} L ${CX - 5} ${H0 + sl} L ${CX + 5} ${H0 + sl} L ${CX + 1.5} ${H0 + 1} Z` : '');
		spray.style.opacity = String(st.inject * 0.85);
		plug.style.display = mode === 'petrol' ? '' : 'none';
		inj.style.display = mode === 'diesel' ? '' : 'none';
		plugLbl.style.display = mode === 'petrol' ? '' : 'none';
		injLbl.style.display = mode === 'diesel' ? '' : 'none';

		// particles: count follows the amount of gas; jitter grows with temperature
		const target = Math.round(NP * Math.max(0, Math.min(1, st.gasIn)));
		let count = parts.filter((p) => p.in).length;
		if (last && last.stroke === 3 && st.stroke === 0) {
			parts.forEach((p) => (p.in = false));
			count = 0;
		}
		while (count < target) {
			const p = parts.find((q) => !q.in)!;
			p.in = true;
			p.u = 0.2 + Math.random() * 0.1;
			p.w = 0.02 + Math.random() * 0.1;
			count++;
		}
		while (count > target) {
			let best = parts[0];
			let bd = Infinity;
			for (const p of parts) {
				if (!p.in) continue;
				const dd = (p.u - 0.8) ** 2 + (p.w * h / BORE) ** 2;
				if (dd < bd) {
					bd = dd;
					best = p;
				}
			}
			best.in = false;
			count--;
		}
		// thermal motion: speed grows as the square root of the absolute temperature
		const step = 0.45 * Math.sqrt((st.t + K0) / T1) * Math.min(dt, 0.05);
		const cls = st.burnt ? 'td-pt td-pt--burnt' : 'td-pt td-pt--fresh';
		for (const p of parts) {
			if (dt > 0) {
				p.a += (Math.random() - 0.5) * 0.6;
				p.u += Math.cos(p.a) * step;
				p.w += Math.sin(p.a) * step * 1.4;
				if (p.u < 0.03 || p.u > 0.97) {
					p.a = Math.PI - p.a;
					p.u = Math.min(0.97, Math.max(0.03, p.u));
				}
				if (p.w < 0.06 || p.w > 0.94) {
					p.a = -p.a;
					p.w = Math.min(0.94, Math.max(0.06, p.w));
				}
			}
			p.e.setAttribute('cx', String(CX - BORE / 2 + p.u * BORE));
			p.e.setAttribute('cy', String(H0 + p.w * h));
			p.e.setAttribute('class', cls);
			p.e.style.opacity = p.in ? '1' : '0';
		}
		// gas moving in the pipes
		const flow = (arr: { s: number; e: SVGCircleElement }[], path: SVGPathElement, lift: number) => {
			for (const f of arr) {
				if (dt > 0) f.s = (f.s + lift * omega * dt * 0.5) % 1;
				const pt = at(path, f.s);
				f.e.setAttribute('cx', String(pt.x));
				f.e.setAttribute('cy', String(pt.y));
				f.e.style.opacity = String(Math.min(1, lift * 3) * (0.3 + 0.7 * Math.sin(Math.PI * f.s)));
			}
		};
		flow(flowIn, midIn as SVGPathElement, st.liftIn);
		flow(flowEx, midEx as SVGPathElement, st.liftEx);

		// gas pressure force on the piston
		const fl = (34 * Math.max(0, st.p - PATM)) / 6500;
		force.setAttribute('y1', String(top + 3));
		force.setAttribute('y2', String(top + 3 + fl));
		force.style.opacity = fl > 3 ? '1' : '0';
		forceLbl.setAttribute('x', String(CX + 7));
		forceLbl.setAttribute('y', String(top + 3 + Math.max(fl, 10) - 1));
		forceLbl.style.opacity = fl > 8 ? '1' : '0';
		// direction of the piston's motion
		const goingDown = th < Math.PI;
		const my = H0 + 70;
		motion.setAttribute('y1', String(goingDown ? my - 22 : my + 22));
		motion.setAttribute('y2', String(goingDown ? my + 22 : my - 22));
		last = st;
		return st;
	};

	return {
		svg,
		render,
		setLabels: (on) => labels.style.setProperty('display', on ? '' : 'none'),
		setMotionArrow: (on) => motion.style.setProperty('display', on ? '' : 'none'),
		scatter: () => {
			for (const p of parts) {
				p.u = 0.05 + Math.random() * 0.9;
				p.w = 0.08 + Math.random() * 0.84;
			}
		},
	};
}
