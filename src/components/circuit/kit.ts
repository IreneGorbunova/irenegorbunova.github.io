/**
 * The circuit constructor on the page: state, drawing, pointer interaction. One call of mount() per figure;
 * everything is scoped to its root element.
 *
 * State: a list of elements (solver.ts: El), each a segment between two grid nodes; parts span two cells,
 * wires any number of cells along a grid line. Every change goes through commit(), which keeps an undo history
 * (JSON snapshots). A burnt lamp or a blown fuse is a consequence of the last change, not a change of its own:
 * «Отменить» brings back the state before that change.
 */
import { solve, len, same, inside, type El, type Kind, type P, type Solution } from './solver';
import { leads, body, HALF } from './symbols';
import { PRESETS } from './presets';

const NS = 'http://www.w3.org/2000/svg';
const C = 50; // grid cell, SVG units
const M = 25; // margin around the grid
const WIDE = { cols: 13, rows: 8 };
const NARROW = { cols: 7, rows: 9 };
const NARROW_BELOW = 520; // px: a narrower board area gets the portrait grid
const LAMP_MAX_U = 9; // В: a lamp rated 6 В burns out above this
const P_FULL = 3; // Вт: the default lamp (12 Ом) at its rated 6 В glows fully
const AMMETER_MAX = 10; // А
const I_SHOW = 0.002; // А: below this no electrons move
const HOT = 100; // А: conductors carrying a short-circuit current glow
const GAP = C / 3; // distance between electrons
const SPEED = 55; // units/s per ampere
const VMAX = 150; // units/s
const FAULT_DELAY = 450; // ms: an overloaded fuse or lamp lasts this long
const RD = 33; // distance of a meter's reading from its axis

export const NAMES: Record<Kind, string> = {
	source: 'Источник',
	key: 'Ключ',
	lamp: 'Лампа',
	resistor: 'Резистор',
	rheostat: 'Реостат',
	ammeter: 'Амперметр',
	voltmeter: 'Вольтметр',
	fuse: 'Предохранитель',
	wire: 'Провод',
};
type Spec = { min: number; max: number; step: number; def: number; sym: string; unit: string };
const SPEC: Partial<Record<Kind, Spec>> = {
	source: { min: 1.5, max: 12, step: 0.5, def: 4.5, sym: '<i>U</i>', unit: 'В' },
	lamp: { min: 6, max: 30, step: 1, def: 12, sym: '<i>R</i>', unit: 'Ом' },
	resistor: { min: 1, max: 100, step: 1, def: 10, sym: '<i>R</i>', unit: 'Ом' },
	rheostat: { min: 0, max: 20, step: 1, def: 10, sym: '<i>R</i>', unit: 'Ом' },
	fuse: { min: 0.5, max: 5, step: 0.5, def: 1, sym: '<i>I</i><sub>ном</sub>', unit: 'А' },
};

const comma = (s: string) => s.replace('.', ',');
/** a reading with d decimals, «−» for negative values that do not round to zero */
const fmt = (x: number, d: number) => {
	// 4 significant digits first: the hidden internal resistance of a source (1e-5 of an Ом at least 1 Ом) may
	// not shift an ideal value across a rounding boundary (0,375 А shows as 0,38 А, as it would ideally)
	const s = Number(Math.abs(x).toPrecision(4)).toFixed(d);
	return (x < 0 && Number(s) !== 0 ? '−' : '') + comma(s);
};
const fmtVal = (v: number) => comma(String(Math.round(v * 100) / 100));
/** parts whose value is written beside them on the board (as on a school diagram) */
const VALUE_UNIT: Partial<Record<Kind, string>> = { source: 'В', lamp: 'Ом', resistor: 'Ом', rheostat: 'Ом', fuse: 'А' };
const add = (p: P, q: P): P => [p[0] + q[0], p[1] + q[1]];
const sub = (p: P, q: P): P => [p[0] - q[0], p[1] - q[1]];

type Seg = { a: P; b: P };
/** common points of two axis-parallel segments: null, one point (lo = hi) or a collinear stretch */
const meet = (s: Seg, t: Seg): { lo: P; hi: P } | null => {
	const hs = s.a[1] === s.b[1];
	const ht = t.a[1] === t.b[1];
	const range = (x: number, y: number): [number, number] => [Math.min(x, y), Math.max(x, y)];
	if (hs && ht) {
		if (s.a[1] !== t.a[1]) return null;
		const [s0, s1] = range(s.a[0], s.b[0]);
		const [t0, t1] = range(t.a[0], t.b[0]);
		const lo = Math.max(s0, t0);
		const hi = Math.min(s1, t1);
		return lo <= hi ? { lo: [lo, s.a[1]], hi: [hi, s.a[1]] } : null;
	}
	if (!hs && !ht) {
		if (s.a[0] !== t.a[0]) return null;
		const [s0, s1] = range(s.a[1], s.b[1]);
		const [t0, t1] = range(t.a[1], t.b[1]);
		const lo = Math.max(s0, t0);
		const hi = Math.min(s1, t1);
		return lo <= hi ? { lo: [s.a[0], lo], hi: [s.a[0], hi] } : null;
	}
	const h = hs ? s : t;
	const v = hs ? t : s;
	const x = v.a[0];
	const y = h.a[1];
	const [h0, h1] = range(h.a[0], h.b[0]);
	const [v0, v1] = range(v.a[1], v.b[1]);
	return x >= h0 && x <= h1 && y >= v0 && y <= v1 ? { lo: [x, y], hi: [x, y] } : null;
};
const isEnd = (p: P, s: Seg) => same(p, s.a) || same(p, s.b);

export function mount(root: HTMLElement) {
	const $ = <T extends Element>(s: string) => root.querySelector<T>(s)!;
	const $$ = <T extends Element>(s: string) => [...root.querySelectorAll<T>(s)];
	const wrap = $<HTMLElement>('[data-wrap]');
	const board = $<SVGSVGElement>('[data-board]');
	const L = {
		grid: $<SVGGElement>('[data-l="grid"]'),
		hot: $<SVGGElement>('[data-l="hot"]'),
		wires: $<SVGGElement>('[data-l="wires"]'),
		dots: $<SVGGElement>('[data-l="dots"]'),
		halos: $<SVGGElement>('[data-l="halos"]'),
		bodies: $<SVGGElement>('[data-l="bodies"]'),
		joints: $<SVGGElement>('[data-l="joints"]'),
		labels: $<SVGGElement>('[data-l="labels"]'),
		ui: $<SVGGElement>('[data-l="ui"]'),
	};
	const panel = {
		empty: $<HTMLElement>('[data-empty]'),
		box: $<HTMLElement>('[data-selbox]'),
		name: $<HTMLElement>('[data-name]'),
		sl: $<HTMLElement>('[data-sl]'),
		sym: $<HTMLElement>('[data-sym]'),
		range: $<HTMLInputElement>('[data-range]'),
		out: $<HTMLOutputElement>('[data-out]'),
		state: $<HTMLElement>('[data-state]'),
		toggle: $<HTMLButtonElement>('[data-act="toggle"]'),
		replace: $<HTMLButtonElement>('[data-act="replace"]'),
		rotate: $<HTMLButtonElement>('[data-act="rotate"]'),
		del: $<HTMLButtonElement>('[data-act="delete"]'),
	};
	const undoBtn = $<HTMLButtonElement>('[data-undo]');
	const clearBtn = $<HTMLButtonElement>('[data-clear]');
	const modeBtns = $$<HTMLButtonElement>('[data-mode]');
	const msg = $<HTMLElement>('[data-msg]');
	const uid = `ck${Math.random().toString(36).slice(2, 8)}`;
	$<SVGDefsElement>('defs').innerHTML =
		`<radialGradient id="${uid}-glow"><stop offset="0" class="ck__g0"/><stop offset="0.45" class="ck__g1"/><stop offset="1" class="ck__g2"/></radialGradient>`;

	// ---------------- state ----------------
	let cols = WIDE.cols;
	let rows = WIDE.rows;
	let els: El[] = [];
	let nextId = 1;
	let sel: number | null = null;
	let sol: Solution = solve([]);
	let mode: 'e' | 'i' = 'e';
	let note = ''; // a one-off message (e.g. «не помещается»)
	const hist: string[] = [];
	const byId = (id: number | null, list = els) => list.find((e) => e.id === id) ?? null;
	const snapshot = () => JSON.stringify({ els, nextId });
	const restore = (s: string) => {
		const o = JSON.parse(s) as { els: El[]; nextId: number };
		els = o.els;
		nextId = o.nextId;
		if (!byId(sel)) sel = null;
	};
	const freeNum = (kind: Kind, list = els) => {
		let n = 1;
		while (list.some((e) => e.kind === kind && e.n === n)) n++;
		return n;
	};
	const make = (kind: Kind, a: P, b: P, v?: number, list = els): El => ({
		id: nextId++,
		kind,
		a,
		b,
		v: v ?? SPEC[kind]?.def ?? 0,
		...(kind === 'key' ? { closed: false } : {}),
		...(kind === 'wire' ? {} : { n: freeNum(kind, list) }),
	});

	// ---------------- geometry ----------------
	const VW = () => cols * C + 2 * M;
	const VH = () => rows * C + 2 * M;
	const X = (p: P) => M + p[0] * C;
	const Y = (p: P) => M + p[1] * C;
	const onBoard = (p: P) => p[0] >= 0 && p[1] >= 0 && p[0] <= cols && p[1] <= rows;
	const world = (ev: { clientX: number; clientY: number }): [number, number] => {
		const m = board.getScreenCTM();
		if (!m) return [0, 0];
		const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
		return [(pt.x - M) / C, (pt.y - M) / C];
	};
	const insideBoard = (ev: { clientX: number; clientY: number }) => {
		const r = board.getBoundingClientRect();
		return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
	};
	const unit = (e: Seg): P => {
		const l = len(e.a, e.b) || 1;
		return [(e.b[0] - e.a[0]) / l, (e.b[1] - e.a[1]) / l];
	};
	/** position along the segment from a (cells) and signed distance from it */
	const proj = (w: [number, number], e: Seg) => {
		const u = unit(e);
		const dx = w[0] - e.a[0];
		const dy = w[1] - e.a[1];
		return { t: dx * u[0] + dy * u[1], d: dx * -u[1] + dy * u[0] };
	};
	const angle = (e: Seg) => {
		const u = unit(e);
		return u[0] === 1 ? 0 : u[0] === -1 ? 180 : u[1] === 1 ? 90 : -90;
	};

	/**
	 * Puts el among the others. A part cuts the stretch it covers out of every wire lying along it (that is how
	 * a part is inserted into a wire); it may touch other elements only by its ends. A wire may not cross or
	 * touch a part except at the part's ends. Returns the new list or null if el does not fit there.
	 */
	const place = (others: El[], el: El): El[] | null => {
		if (!onBoard(el.a) || !onBoard(el.b) || same(el.a, el.b)) return null;
		if (el.kind === 'wire') {
			for (const o of others) {
				if (o.kind === 'wire') continue;
				const m = meet(el, o);
				if (m && !(same(m.lo, m.hi) && isEnd(m.lo, o))) return null;
			}
			return [...others, el];
		}
		const out: El[] = [];
		for (const o of others) {
			const m = meet(el, o);
			if (!m) {
				out.push(o);
				continue;
			}
			const point = same(m.lo, m.hi);
			if (o.kind !== 'wire') {
				if (point && isEnd(m.lo, el) && isEnd(m.lo, o)) out.push(o);
				else return null;
				continue;
			}
			if (point) {
				if (isEnd(m.lo, el)) out.push(o);
				else return null; // the wire crosses the part or ends on its body
				continue;
			}
			// along the wire: keep what lies outside the part
			const keep: Seg[] = [];
			const ax = el.a[1] === el.b[1] ? 0 : 1;
			const lo = Math.min(el.a[ax], el.b[ax]);
			const hi = Math.max(el.a[ax], el.b[ax]);
			const w0 = Math.min(o.a[ax], o.b[ax]);
			const w1 = Math.max(o.a[ax], o.b[ax]);
			const at = (c: number): P => (ax === 0 ? [c, o.a[1]] : [o.a[0], c]);
			if (w0 < lo) keep.push({ a: at(w0), b: at(lo) });
			if (w1 > hi) keep.push({ a: at(hi), b: at(w1) });
			keep.forEach((k, i) => out.push({ ...o, id: i ? nextId++ : o.id, a: k.a, b: k.b }));
		}
		return [...out, el];
	};

	/** a free place near the centre for a part tapped in the palette */
	const freeSpot = (kind: Kind): El | null => {
		const span = kind === 'wire' ? 2 : 2;
		const cx = Math.round(cols / 2);
		const cy = Math.round(rows / 2);
		const cand: [number, number, number][] = [];
		for (let x = 0; x <= cols; x++) for (let y = 0; y <= rows; y++) cand.push([x, y, (x - cx) ** 2 + 1.3 * (y - cy) ** 2]);
		cand.sort((p, q) => p[2] - q[2]);
		for (const vertical of [false, true]) {
			for (const [x, y] of cand) {
				const a: P = vertical ? [x, y - span / 2] : [x - span / 2, y];
				const b: P = vertical ? [x, y + span / 2] : [x + span / 2, y];
				if (!onBoard(a) || !onBoard(b)) continue;
				const seg = { a, b };
				// clear of everything, with a free node on each side along the segment
				const grown = vertical ? { a: [x, y - span / 2 - 1] as P, b: [x, y + span / 2 + 1] as P } : { a: [x - span / 2 - 1, y] as P, b: [x + span / 2 + 1, y] as P };
				if (els.some((o) => meet(seg, o) || meet(grown, o))) continue;
				return make(kind, a, b);
			}
		}
		return null;
	};

	// ---------------- drawing ----------------
	const svg = (tag: string, attrs: Record<string, string | number>, parent?: Element) => {
		const n = document.createElementNS(NS, tag);
		for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
		parent?.append(n);
		return n;
	};
	const drawGrid = () => {
		board.setAttribute('viewBox', `0 0 ${VW()} ${VH()}`);
		wrap.style.aspectRatio = `${VW()} / ${VH()}`;
		root.classList.toggle('is-narrow', cols < rows);
		let h = '';
		for (let x = 0; x <= cols; x++) for (let y = 0; y <= rows; y++) h += `<circle cx="${X([x, y])}" cy="${Y([x, y])}" r="1.8"/>`;
		L.grid.innerHTML = h;
	};

	type Cond = { key: string; x0: number; y0: number; dx: number; dy: number; L: number; I: number; g: SVGGElement; dots: SVGElement[] };
	let conds: Cond[] = [];
	const shifts = new Map<string, number>();
	type Lamp = { id: number; halo: SVGCircleElement; heat: SVGCircleElement | null; hot: SVGPathElement | null; P: number };
	let lamps: Lamp[] = [];
	const glow = new Map<number, number>();

	const reading = (e: El, s: Solution) => {
		if (e.kind === 'ammeter') {
			const I = s.I.get(e.id) ?? 0;
			if (Math.abs(I) > AMMETER_MAX) return { text: 'зашкаливает', over: true, neg: false };
			const t = fmt(I, 2);
			return { text: `${t} А`, over: false, neg: t.startsWith('−') };
		}
		const U = s.phi(e.a) - s.phi(e.b);
		const t = fmt(U, 1);
		return { text: `${t} В`, over: false, neg: t.startsWith('−') };
	};
	const many = (kind: Kind, list: El[]) => list.filter((e) => e.kind === kind).length > 1;
	const nameOf = (e: El, list = els) => NAMES[e.kind] + (e.kind !== 'wire' && many(e.kind, list) ? ` ${e.n}` : '');

	const render = (list: El[] = els, s: Solution = sol, extra?: { bad?: El; draw?: Seg }) => {
		const all = extra?.bad ? [...list, extra.bad] : list;
		// ---- hot short-circuit loop ----
		const shorted = s.shorted.length > 0;
		let hot = '';
		if (shorted) {
			for (const p of s.pieces) if (Math.abs(p.I) > HOT) hot += `<line x1="${X(p.a)}" y1="${Y(p.a)}" x2="${X(p.b)}" y2="${Y(p.b)}"/>`;
			for (const e of list) if (e.kind !== 'wire' && Math.abs(s.I.get(e.id) ?? 0) > HOT) hot += `<line x1="${X(e.a)}" y1="${Y(e.a)}" x2="${X(e.b)}" y2="${Y(e.b)}"/>`;
		}
		L.hot.innerHTML = hot;
		root.classList.toggle('is-short', shorted);

		// ---- wires and leads; bodies; halos ----
		let wires = '';
		let bodies = '';
		let halos = '';
		for (const e of all) {
			const bad = e === extra?.bad ? ' ck--bad' : '';
			const tr = `translate(${X(e.a) + ((e.b[0] - e.a[0]) * C) / 2} ${Y(e.a) + ((e.b[1] - e.a[1]) * C) / 2}) rotate(${angle(e)})`;
			if (e.kind === 'wire') {
				wires += `<line class="ck__w${bad}" x1="${X(e.a)}" y1="${Y(e.a)}" x2="${X(e.b)}" y2="${Y(e.b)}"/>`;
				continue;
			}
			wires += `<g class="${bad}" transform="${tr}">${leads(e.kind)}</g>`;
			const cls = `ck__part ck__part--${e.kind}${e.kind === 'key' ? ' ck__part--tap' : ''}${bad}`;
			bodies += `<g class="${cls}" transform="${tr}" data-id="${e.id}">${body(e.kind, e)}</g>`;
			if (e.kind === 'lamp' && !e.broken) {
				const mx = (X(e.a) + X(e.b)) / 2;
				const my = (Y(e.a) + Y(e.b)) / 2;
				halos += `<circle cx="${mx}" cy="${my}" r="0" fill="url(#${uid}-glow)" opacity="0" data-halo="${e.id}"/>`;
			}
		}
		L.wires.innerHTML = wires;
		L.bodies.innerHTML = bodies;
		L.halos.innerHTML = halos;
		lamps = list
			.filter((e) => e.kind === 'lamp' && !e.broken)
			.map((e) => {
				const g = L.bodies.querySelector(`[data-id="${e.id}"]`)!;
				const U = s.phi(e.a) - s.phi(e.b);
				return {
					id: e.id,
					halo: L.halos.querySelector<SVGCircleElement>(`[data-halo="${e.id}"]`)!,
					heat: g.querySelector<SVGCircleElement>('.ck__heat'),
					hot: g.querySelector<SVGPathElement>('.ck__fil--hot'),
					P: (U * U) / e.v,
				};
			});

		// ---- junctions and free terminals ----
		const ends = new Map<string, { p: P; n: number }>();
		for (const e of all)
			for (const p of [e.a, e.b]) {
				const k = `${p}`;
				ends.set(k, { p, n: (ends.get(k)?.n ?? 0) + 1 });
			}
		let joints = '';
		for (const { p, n } of ends.values()) {
			const through = all.filter((w) => w.kind === 'wire' && inside(p, w.a, w.b)).length;
			const c = n + 2 * through;
			if (c >= 3) joints += `<circle class="ck__joint" cx="${X(p)}" cy="${Y(p)}" r="4.6"/>`;
			else if (c === 1) joints += `<circle class="ck__term" cx="${X(p)}" cy="${Y(p)}" r="3.4"/>`;
		}
		L.joints.innerHTML = joints;

		// ---- labels (always upright) ----
		const parts = list.filter((e) => e.kind !== 'wire');
		const cx = parts.length ? parts.reduce((t, e) => t + (e.a[0] + e.b[0]) / 2, 0) / parts.length : cols / 2;
		const cy = parts.length ? parts.reduce((t, e) => t + (e.a[1] + e.b[1]) / 2, 0) / parts.length : rows / 2;
		let labels = '';
		const txt = (x: number, y: number, t: string, cls: string, anchor = 'middle') =>
			`<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}">${t}</text>`;
		// the side of a part for its labels: the outer one (away from the middle of the circuit)
		const outerSide = (e: El): P => {
			const nv: P = unit(e)[1] === 0 ? [0, -1] : [-1, 0];
			const out = unit(e)[1] === 0 ? (e.a[1] - cy) * nv[1] : (e.a[0] - cx) * nv[0];
			return out < -0.01 ? [-nv[0], -nv[1]] : nv;
		};
		// for a part that is not a meter: the outer side unless there is no room there
		const partSide = (e: El): P => {
			const nv = outerSide(e);
			const mx = (X(e.a) + X(e.b)) / 2;
			const my = (Y(e.a) + Y(e.b)) / 2;
			const room = (n: P) => (unit(e)[1] === 0 ? (n[1] < 0 ? my - 44 > 0 : my + 44 < VH()) : n[0] < 0 ? mx - 60 > 0 : mx + 60 < VW());
			return room(nv) ? nv : [-nv[0], -nv[1]];
		};
		// the box of a part's value label (see value() below), so that meter readings keep off it
		const valueBox = (o: El): [number, number, number, number] | null => {
			const un = VALUE_UNIT[o.kind];
			if (!un) return null;
			const k = o.kind === 'source' ? -1 : 1;
			const n = partSide(o);
			const w = (fmtVal(o.v).length + 1 + un.length) * (cols < rows ? 15 : 13) * 0.56;
			const mx = (X(o.a) + X(o.b)) / 2;
			const my = (Y(o.a) + Y(o.b)) / 2;
			if (unit(o)[1] === 0) {
				const y = my + n[1] * k * 26 + 5;
				return [mx - w / 2, y - 12, mx + w / 2, y + 3];
			}
			const sx = n[0] * k;
			const x = mx + sx * 20;
			return sx < 0 ? [x - w, my - 7, x, my + 8] : [x, my - 7, x + w, my + 8];
		};
		for (const e of all) {
			if (e.kind === 'wire') continue;
			const u = unit(e);
			const hor = u[1] === 0;
			const mx = (X(e.a) + X(e.b)) / 2;
			const my = (Y(e.a) + Y(e.b)) / 2;
			// the side for the reading: the one with fewer things under the label, the outer one (away from the
			// middle of the circuit) when equal; never off the board
			let nv: P = outerSide(e);
			type Spot = { x: number; y: number; anchor: string; box: [number, number, number, number]; side?: P; extra: number };
			let spot: Spot | null = null;
			const r = e.kind === 'ammeter' || e.kind === 'voltmeter' ? reading(e, s) : null;
			if (r && e !== extra?.bad) {
				// the reading goes where the fewest things lie under it: either side of the meter (the outer one first),
				// or beyond one of its ends
				const narrow = cols < rows;
				const w = r.text.length * (r.over ? (narrow ? 17 : 15) : narrow ? 20 : 17) * 0.56;
				const x0 = Math.min(X(e.a), X(e.b));
				const x1 = Math.max(X(e.a), X(e.b));
				const y0 = Math.min(Y(e.a), Y(e.b));
				const y1 = Math.max(Y(e.a), Y(e.b));
				const spots: Spot[] = [];
				for (const n of [nv, [-nv[0], -nv[1]] as P]) {
					if (hor) {
						const y = my + n[1] * RD + 6;
						spots.push({ x: mx, y, anchor: 'middle', box: [mx - w / 2, y - 19, mx + w / 2, y + 1], side: n, extra: 0 });
					} else {
						const x = mx + n[0] * (RD - 6);
						const box: Spot['box'] = n[0] < 0 ? [x - w, my - 13, x, my + 7] : [x, my - 13, x + w, my + 7];
						spots.push({ x, y: my + 6, anchor: n[0] < 0 ? 'end' : 'start', box, side: n, extra: 0 });
					}
				}
				if (hor) {
					spots.push({ x: x1 + 11, y: my - 9, anchor: 'start', box: [x1 + 11, my - 25, x1 + 11 + w, my - 6], extra: 0.5 });
					spots.push({ x: x0 - 11, y: my - 9, anchor: 'end', box: [x0 - 11 - w, my - 25, x0 - 11, my - 6], extra: 0.5 });
				} else {
					spots.push({ x: mx + 11, y: y1 + 21, anchor: 'start', box: [mx + 11, y1 + 5, mx + 11 + w, y1 + 23], extra: 0.5 });
					spots.push({ x: mx + 11, y: y0 - 8, anchor: 'start', box: [mx + 11, y0 - 24, mx + 11 + w, y0 - 6], extra: 0.5 });
				}
				const cost = (sp: Spot) => {
					const [bx0, by0, bx1, by1] = sp.box;
					if (bx0 < 0 || by0 < 0 || bx1 > VW() || by1 > VH()) return 99;
					let c = sp.extra;
					for (const o of all) {
						if (o === e) continue;
						const t = o.kind === 'wire' ? 3 : 17;
						const ox0 = Math.min(X(o.a), X(o.b)) - t;
						const ox1 = Math.max(X(o.a), X(o.b)) + t;
						const oy0 = Math.min(Y(o.a), Y(o.b)) - t;
						const oy1 = Math.max(Y(o.a), Y(o.b)) + t;
						if (ox0 < bx1 && ox1 > bx0 && oy0 < by1 && oy1 > by0) c += o.kind === 'wire' ? 1 : 3;
						const vb = valueBox(o);
						if (vb && vb[0] < bx1 && vb[2] > bx0 && vb[1] < by1 && vb[3] > by0) c += 3;
					}
					return c;
				};
				spot = spots.reduce((best, sp) => (cost(sp) < cost(best) ? sp : best));
				if (spot.side) nv = spot.side;
			} else nv = partSide(e);
			const at = (along: number, side: number): [number, number] => [mx + u[0] * along + nv[0] * side, my + u[1] * along + nv[1] * side];
			const num = many(e.kind, all) ? String(e.n) : '';
			// the part's value: across the middle of a horizontal part, beside a vertical one
			const unitV = VALUE_UNIT[e.kind];
			const value = (k: number, d: number) => {
				if (!unitV) return '';
				const t = `${fmtVal(e.v)}\u00a0${unitV}`;
				if (hor) return txt(mx, my + nv[1] * k * d + 5, t, 'ck__val');
				const sx = nv[0] * k;
				return txt(mx + sx * (d - 6), my + 5, t, 'ck__val', sx < 0 ? 'end' : 'start');
			};
			if (e.kind === 'ammeter' || e.kind === 'voltmeter') {
				labels += txt(mx, my + 6, e.kind === 'ammeter' ? 'A' : 'V', 'ck__letter');
				const [px, py] = at(-26, 13);
				labels += txt(px, py + 5, '+', 'ck__plus');
				if (r && spot) labels += txt(spot.x, spot.y, r.text, `ck__read ck__read--${r.over ? 'over' : e.kind === 'ammeter' ? 'i' : 'u'}`, spot.anchor);
				if (num) {
					const [qx, qy] = at(26, -22);
					labels += txt(qx, qy + 5, num, 'ck__num');
				}
			} else if (e.kind === 'source') {
				const sp = hor ? 9 : 17;
				const [px, py] = at(-sp, 28);
				const [qx, qy] = at(sp, 28);
				labels += txt(px, py + 5, '+', 'ck__sign') + txt(qx, qy + 5, '−', 'ck__sign');
				labels += value(-1, 26);
				if (num) {
					const [nx, ny] = at(-38, -26);
					labels += txt(nx, ny + 5, num, 'ck__num');
				}
			} else {
				labels += value(1, 26);
				if (num) {
					const [nx, ny] = at(-38, 22);
					labels += txt(nx, ny + 5, num, 'ck__num');
				}
			}
		}
		L.labels.innerHTML = labels;

		// ---- selection, handles, wire being drawn ----
		let ui = '';
		const se = byId(sel, list);
		if (se && !extra?.bad) {
			const mx = (X(se.a) + X(se.b)) / 2;
			const my = (Y(se.a) + Y(se.b)) / 2;
			if (se.kind === 'wire') ui += `<line class="ck__selw" x1="${X(se.a)}" y1="${Y(se.a)}" x2="${X(se.b)}" y2="${Y(se.b)}"/>`;
			else ui += `<rect class="ck__sel" x="-62" y="-22" width="124" height="44" rx="10" transform="translate(${mx} ${my}) rotate(${angle(se)})"/>`;
			for (const p of [se.a, se.b]) ui += `<circle class="ck__handle" cx="${X(p)}" cy="${Y(p)}" r="8"/>`;
		}
		if (extra?.draw) {
			const d = extra.draw;
			ui += `<line class="ck__draw" x1="${X(d.a)}" y1="${Y(d.a)}" x2="${X(d.b)}" y2="${Y(d.b)}"/>`;
			ui += `<circle class="ck__drawend" cx="${X(d.a)}" cy="${Y(d.a)}" r="5"/><circle class="ck__drawend" cx="${X(d.b)}" cy="${Y(d.b)}" r="5"/>`;
		}
		L.ui.innerHTML = ui;

		// ---- electrons ----
		L.dots.replaceChildren();
		const keep = new Set<string>();
		conds = [];
		const addCond = (key: string, a: P, b: P, I: number) => {
			const l = len(a, b) * C;
			const n = Math.max(1, Math.round(l / GAP));
			const g = svg('g', {}, L.dots) as SVGGElement;
			const dots = Array.from({ length: n }, () => svg('path', { class: 'ck__e' }, g));
			keep.add(key);
			conds.push({ key, x0: X(a), y0: Y(a), dx: (b[0] - a[0]) / len(a, b), dy: (b[1] - a[1]) / len(a, b), L: l, I, g, dots });
		};
		for (const p of s.pieces) addCond(`w${p.id}:${p.a}:${p.b}`, p.a, p.b, p.I);
		for (const e of list) if (e.kind !== 'wire') addCond(`p${e.id}:${e.a}:${e.b}`, e.a, e.b, s.I.get(e.id) ?? 0);
		for (const k of shifts.keys()) if (!keep.has(k)) shifts.delete(k);
		placeDots(0);
		wake();
	};

	const placeDots = (dt: number) => {
		for (const c of conds) {
			const on = Math.abs(c.I) > I_SHOW;
			c.g.setAttribute('opacity', on ? '1' : '0');
			if (!on) continue;
			const v = Math.sign(c.I) * Math.min(VMAX, SPEED * Math.abs(c.I)) * (mode === 'e' ? -1 : 1);
			const gap = c.L / c.dots.length;
			let sh = ((shifts.get(c.key) ?? Math.random() * gap) + v * dt) % gap;
			if (sh < 0) sh += gap;
			shifts.set(c.key, sh);
			const rot = Math.atan2(c.dy, c.dx) * (180 / Math.PI) + (v < 0 ? 180 : 0);
			const d = mode === 'e' ? 'M 3 0 A 3 3 0 1 1 -3 0 A 3 3 0 1 1 3 0 Z' : 'M 4.5 0 L -3.5 -4 L -3.5 4 Z';
			c.dots.forEach((el, k) => {
				const t = (k * gap + sh) % c.L;
				if (el.getAttribute('d') !== d) el.setAttribute('d', d);
				el.setAttribute('transform', `translate(${(c.x0 + c.dx * t).toFixed(1)} ${(c.y0 + c.dy * t).toFixed(1)}) rotate(${rot})`);
			});
		}
	};

	// ---------------- messages and panel ----------------
	const messages = () => {
		const out: string[] = [];
		if (note) out.push(note);
		if (sol.shorted.length)
			out.push(
				'<b class="ck__warn">Короткое замыкание!</b> Полюсы источника соединены в обход приборов почти без сопротивления: ток огромный, провода и источник сильно нагреваются.',
			);
		for (const e of els) {
			if (e.kind === 'fuse' && e.broken)
				out.push(`${nameOf(e)} перегорел и разомкнул цепь: ток был больше ${fmtVal(e.v)} А. Найдите причину, выберите предохранитель и нажмите «Заменить».`);
			if (e.kind === 'lamp' && e.broken)
				out.push(`${nameOf(e)} перегорела: напряжение на ней было больше 9 В. Выберите лампу и нажмите «Заменить».`);
		}
		for (const e of els) {
			if (e.kind !== 'ammeter' && e.kind !== 'voltmeter') continue;
			const r = reading(e, sol);
			if (r.neg) out.push(`${nameOf(e)} подключён наоборот: поменяйте провода у его клемм.`);
			if (r.over && !sol.shorted.length) out.push(`${nameOf(e)} зашкаливает: сила тока больше 10 А.`);
		}
		msg.innerHTML = out.join('<br/>');
	};

	const showPanel = () => {
		const e = byId(sel);
		panel.empty.hidden = Boolean(e);
		panel.box.hidden = !e;
		if (!e) return;
		panel.name.textContent = NAMES[e.kind] + (e.kind === 'wire' ? '' : ` ${e.n}`);
		const spec = SPEC[e.kind];
		panel.sl.hidden = !spec;
		if (spec) {
			panel.sym.innerHTML = spec.sym;
			panel.range.min = String(spec.min);
			panel.range.max = String(spec.max);
			panel.range.step = String(spec.step);
			if (Number(panel.range.value) !== e.v) panel.range.value = String(e.v);
			panel.range.setAttribute('aria-label', `${NAMES[e.kind]} ${e.n}: ${e.kind === 'source' ? 'напряжение' : e.kind === 'fuse' ? 'ток, на который рассчитан предохранитель' : 'сопротивление'}`);
			panel.out.value = `${fmtVal(e.v)} ${spec.unit}`;
		}
		let state = '';
		if (e.kind === 'key') state = e.closed ? 'замкнут' : 'разомкнут';
		if (e.kind === 'lamp' && e.broken) state = 'перегорела';
		if (e.kind === 'fuse' && e.broken) state = 'перегорел';
		if (e.kind === 'ammeter' || e.kind === 'voltmeter') {
			const r = reading(e, sol);
			state = r.over ? 'зашкаливает' : `показывает ${r.text}`;
		}
		panel.state.textContent = state;
		panel.state.hidden = !state;
		panel.toggle.hidden = e.kind !== 'key';
		panel.toggle.textContent = e.closed ? 'Разомкнуть' : 'Замкнуть';
		panel.replace.hidden = !e.broken;
		panel.rotate.hidden = e.kind === 'wire';
	};

	// ---------------- changes ----------------
	let faultTimer = 0;
	const overloaded = (s: Solution) => {
		const fuses = els.filter((e) => e.kind === 'fuse' && !e.broken && Math.abs(s.I.get(e.id) ?? 0) > e.v + 1e-9);
		if (fuses.length) return fuses;
		return els.filter((e) => e.kind === 'lamp' && !e.broken && Math.abs(s.phi(e.a) - s.phi(e.b)) > LAMP_MAX_U + 1e-9);
	};
	const refresh = () => {
		sol = solve(els);
		render();
		showPanel();
		messages();
		undoBtn.disabled = hist.length === 0;
		clearBtn.disabled = els.length === 0;
		clearTimeout(faultTimer);
		if (overloaded(sol).length)
			faultTimer = window.setTimeout(() => {
				// fuses go first: they protect the rest
				const hit = overloaded(solve(els));
				hit.forEach((e) => (e.broken = true));
				if (hit.length) refresh();
			}, FAULT_DELAY);
	};
	const commit = (next: El[], select: number | null = sel) => {
		hist.push(snapshot());
		if (hist.length > 500) hist.shift();
		els = next;
		sel = byId(select) ? select : null;
		note = '';
		refresh();
	};
	const edit = (id: number, patch: Partial<El>) => commit(els.map((e) => (e.id === id ? { ...e, ...patch } : e)));

	// ---------------- board size ----------------
	/** shift that centres the circuit on a board of the given size, or null if it does not fit */
	const centring = (list: { a: P; b: P }[], c: number, r: number): P | null => {
		if (!list.length) return [0, 0];
		const xs = list.flatMap((e) => [e.a[0], e.b[0]]);
		const ys = list.flatMap((e) => [e.a[1], e.b[1]]);
		const w = Math.max(...xs) - Math.min(...xs);
		const h = Math.max(...ys) - Math.min(...ys);
		if (w > c || h > r) return null;
		return [Math.floor((c - w) / 2) - Math.min(...xs), Math.floor((r - h) / 2) - Math.min(...ys)];
	};
	const shiftAll = (list: El[], d: P) => list.map((e) => ({ ...e, a: add(e.a, d), b: add(e.b, d) }));
	const fit = () => {
		const want = wrap.clientWidth < NARROW_BELOW ? NARROW : WIDE;
		if (want.cols === cols && want.rows === rows) return;
		const d = centring(els, want.cols, want.rows);
		if (!d) return; // the circuit is too big for the other board: keep this one
		els = shiftAll(els, d);
		for (let k = hist.length - 1; k >= 0; k--) {
			const o = JSON.parse(hist[k]) as { els: El[]; nextId: number };
			const dk = centring(o.els, want.cols, want.rows);
			if (!dk) {
				hist.splice(0, k + 1);
				break;
			}
			hist[k] = JSON.stringify({ els: shiftAll(o.els, dk), nextId: o.nextId });
		}
		cols = want.cols;
		rows = want.rows;
		drawGrid();
		refresh();
	};

	// ---------------- pointer on the board ----------------
	type Hit = { t: 'end'; id: number; end: 'a' | 'b' } | { t: 'part'; id: number } | { t: 'wire'; id: number } | { t: 'node'; p: P };
	const hitTest = (w: [number, number]): Hit => {
		const se = byId(sel);
		if (se) for (const end of ['a', 'b'] as const) if (Math.hypot(w[0] - se[end][0], w[1] - se[end][1]) < 0.45) return { t: 'end', id: se.id, end };
		const parts = els.filter((e) => e.kind !== 'wire').reverse();
		for (const e of parts) {
			const { t, d } = proj(w, e);
			if (Math.abs(d) < 0.45 && t > 0.3 && t < len(e.a, e.b) - 0.3) return { t: 'part', id: e.id };
		}
		const node: P = [Math.round(w[0]), Math.round(w[1])];
		if (Math.hypot(w[0] - node[0], w[1] - node[1]) < 0.3 && onBoard(node)) return { t: 'node', p: node };
		for (const e of els.filter((x) => x.kind === 'wire').reverse()) {
			const { t, d } = proj(w, e);
			if (Math.abs(d) < 0.26 && t > 0 && t < len(e.a, e.b)) return { t: 'wire', id: e.id };
		}
		for (const e of parts) {
			const { t, d } = proj(w, e);
			if (Math.abs(d) < 0.45 && t >= 0 && t <= len(e.a, e.b)) return { t: 'part', id: e.id };
		}
		return { t: 'node', p: [Math.min(cols, Math.max(0, node[0])), Math.min(rows, Math.max(0, node[1]))] };
	};
	const snapAlong = (from: P, w: [number, number], minLen: number): P => {
		const dx = w[0] - from[0];
		const dy = w[1] - from[1];
		let p: P = Math.abs(dx) >= Math.abs(dy) ? [from[0] + Math.round(dx), from[1]] : [from[0], from[1] + Math.round(dy)];
		p = [Math.min(cols, Math.max(0, p[0])), Math.min(rows, Math.max(0, p[1]))];
		if (len(from, p) < minLen) {
			if (minLen === 0) return from;
			const ux = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) || 1 : 0;
			const uy = ux ? 0 : Math.sign(dy) || 1;
			p = [from[0] + ux * minLen, from[1] + uy * minLen];
		}
		return p;
	};

	type Drag = {
		pid: number;
		x0: number;
		y0: number;
		w0: [number, number];
		hit: Hit | { t: 'palette'; kind: Kind };
		moved: boolean;
		touch: boolean;
		result: El[] | null; // the circuit if dropped now
		cand: El | null;
	};
	let drag: Drag | null = null;

	const preview = (ev: PointerEvent) => {
		if (!drag) return;
		const w = world(ev);
		const h = drag.hit;
		let cand: El | null = null;
		let others = els;
		let draw: Seg | undefined;
		if (h.t === 'part' || h.t === 'wire') {
			const e = byId(h.id)!;
			others = els.filter((x) => x !== e);
			let d: P = [Math.round(w[0] - drag.w0[0]), Math.round(w[1] - drag.w0[1])];
			// keep it on the board
			const xs = [e.a[0], e.b[0]];
			const ys = [e.a[1], e.b[1]];
			d = [Math.min(cols - Math.max(...xs), Math.max(-Math.min(...xs), d[0])), Math.min(rows - Math.max(...ys), Math.max(-Math.min(...ys), d[1]))];
			if (d[0] === 0 && d[1] === 0) {
				drag.result = null;
				drag.cand = null;
				return render();
			}
			cand = { ...e, a: add(e.a, d), b: add(e.b, d) };
		} else if (h.t === 'end') {
			const e = byId(h.id)!;
			others = els.filter((x) => x !== e);
			const fixed = h.end === 'a' ? e.b : e.a;
			const from = h.end === 'a' ? e.a : e.b;
			let end: P | null = null;
			if (e.kind === 'wire') end = snapAlong(fixed, w, 1);
			else {
				// a part turns about its other end when the pointer comes to one of the three places its end can take;
				// anywhere else the drag draws a wire from this end (those places can never end a straight wire from it)
				const u = unit({ a: fixed, b: from });
				const q: P = [Math.round(w[0]), Math.round(w[1])];
				const turns: P[] = [
					[fixed[0] - 2 * u[1], fixed[1] + 2 * u[0]],
					[fixed[0] + 2 * u[1], fixed[1] - 2 * u[0]],
					[fixed[0] - 2 * u[0], fixed[1] - 2 * u[1]],
				];
				if (turns.some((t) => same(t, q)) && Math.hypot(w[0] - q[0], w[1] - q[1]) < 0.5) end = q;
				else {
					others = els;
					const to = snapAlong(from, w, 0);
					if (same(to, from)) {
						drag.result = null;
						drag.cand = null;
						return render();
					}
					draw = { a: from, b: to };
					cand = { id: -1, kind: 'wire', a: from, b: to, v: 0 };
				}
			}
			if (end) {
				cand = h.end === 'a' ? { ...e, a: end } : { ...e, b: end };
				if (same(cand.a, e.a) && same(cand.b, e.b)) {
					drag.result = null;
					drag.cand = null;
					return render();
				}
			}
		} else if (h.t === 'node') {
			const end = snapAlong(h.p, w, 0);
			if (same(end, h.p)) {
				drag.result = null;
				drag.cand = null;
				return render();
			}
			draw = { a: h.p, b: end };
			cand = { id: -1, kind: 'wire', a: h.p, b: end, v: 0 };
		} else if (h.t === 'palette') {
			if (!insideBoard(ev)) {
				drag.result = null;
				drag.cand = null;
				return render();
			}
			cand = drag.cand && drag.cand.kind === h.kind ? { ...drag.cand } : make(h.kind, [0, 0], [0, 0]);
			// over a wire the part takes its direction (to be inserted into it), otherwise it lies horizontally
			const under = els.find((e) => {
				if (e.kind !== 'wire' || len(e.a, e.b) < 2) return false;
				const { t, d } = proj(w, e);
				return Math.abs(d) < 0.45 && t > 0.5 && t < len(e.a, e.b) - 0.5;
			});
			if (under && under.a[0] === under.b[0]) {
				const y = Math.min(Math.max(under.a[1], under.b[1]) - 1, Math.max(Math.min(under.a[1], under.b[1]) + 1, Math.round(w[1])));
				cand.a = [under.a[0], y - 1];
				cand.b = [under.a[0], y + 1];
			} else {
				const mid: P = under
					? [Math.min(Math.max(under.a[0], under.b[0]) - 1, Math.max(Math.min(under.a[0], under.b[0]) + 1, Math.round(w[0]))), under.a[1]]
					: [Math.min(cols - 1, Math.max(1, Math.round(w[0]))), Math.min(rows, Math.max(0, Math.round(w[1])))];
				cand.a = [mid[0] - 1, mid[1]];
				cand.b = [mid[0] + 1, mid[1]];
			}
		}
		if (!cand) return;
		const saveNext = nextId;
		const res = place(others, cand);
		drag.cand = cand;
		drag.result = res;
		if (res) {
			render(res, solve(res), { draw });
		} else {
			nextId = saveNext;
			render(others, solve(others), { bad: cand, draw });
		}
	};

	const finish = (ev: PointerEvent) => {
		const d = drag;
		drag = null;
		if (!d) return;
		if (!d.moved) {
			const h = d.hit;
			if (h.t === 'part') {
				const e = byId(h.id)!;
				sel = e.id;
				if (e.kind === 'key') return edit(e.id, { closed: !e.closed });
			} else if (h.t === 'wire') sel = h.id;
			else if (h.t === 'node') sel = null;
			note = '';
			return refresh();
		}
		if (d.result && d.cand) {
			const id = d.cand.id === -1 ? nextId++ : d.cand.id;
			const list = d.result.map((e) => (e === d.cand ? { ...e, id } : e));
			// a new wire is not selected (a part whose end it starts from stays selected)
			const select = d.cand.id === -1 ? (d.hit.t === 'end' ? sel : null) : id;
			return commit(list, select);
		}
		if (d.cand && !d.result) note = 'Сюда деталь не помещается: она легла бы на другую деталь.';
		refresh();
		void ev;
	};

	board.addEventListener('pointerdown', (ev) => {
		if (drag || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
		ev.preventDefault();
		const w = world(ev);
		drag = { pid: ev.pointerId, x0: ev.clientX, y0: ev.clientY, w0: w, hit: hitTest(w), moved: false, touch: ev.pointerType !== 'mouse', result: null, cand: null };
		board.setPointerCapture(ev.pointerId);
	});
	board.addEventListener('pointermove', (ev) => {
		if (!drag || ev.pointerId !== drag.pid || drag.hit.t === 'palette') return;
		if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < (drag.touch ? 8 : 4)) return;
		drag.moved = true;
		preview(ev);
	});
	board.addEventListener('pointerup', (ev) => {
		if (drag && ev.pointerId === drag.pid && drag.hit.t !== 'palette') finish(ev);
	});
	board.addEventListener('pointercancel', (ev) => {
		if (drag && ev.pointerId === drag.pid) {
			drag = null;
			refresh();
		}
	});

	// ---------------- palette ----------------
	let noClickUntil = 0;
	const addFree = (kind: Kind) => {
		const e = freeSpot(kind);
		if (!e) {
			note = 'На поле нет свободного места: удалите что-нибудь или нажмите «Очистить».';
			return refresh();
		}
		commit(place(els, e) ?? [...els, e], e.id);
	};
	for (const btn of $$<HTMLButtonElement>('[data-add]')) {
		const kind = btn.dataset.add as Kind;
		btn.addEventListener('pointerdown', (ev) => {
			if (drag || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
			drag = { pid: ev.pointerId, x0: ev.clientX, y0: ev.clientY, w0: [0, 0], hit: { t: 'palette', kind }, moved: false, touch: ev.pointerType !== 'mouse', result: null, cand: null };
			// a touch pointer is captured by its target anyway; capturing it explicitly would cancel the tap's click
			if (ev.pointerType !== 'touch')
				try {
					btn.setPointerCapture(ev.pointerId);
				} catch {
					/* the pointer may be gone already */
				}
		});
		btn.addEventListener('pointermove', (ev) => {
			if (!drag || ev.pointerId !== drag.pid || drag.hit.t !== 'palette') return;
			if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < (drag.touch ? 8 : 4)) return;
			if (!drag.moved) {
				drag.moved = true;
				root.classList.add('is-dragging');
			}
			preview(ev);
		});
		btn.addEventListener('pointerup', (ev) => {
			if (!drag || ev.pointerId !== drag.pid || drag.hit.t !== 'palette') return;
			root.classList.remove('is-dragging');
			noClickUntil = performance.now() + 600; // the click that follows is handled here
			if (drag.moved) {
				if (!insideBoard(ev)) {
					drag = null;
					return refresh();
				}
				finish(ev);
			} else {
				drag = null;
				addFree(kind);
			}
		});
		btn.addEventListener('pointercancel', () => {
			if (drag?.hit.t === 'palette') {
				drag = null;
				root.classList.remove('is-dragging');
				refresh();
			}
		});
		// the keyboard (Enter, Space) gives a click without pointer events
		btn.addEventListener('click', () => {
			if (performance.now() >= noClickUntil) addFree(kind);
		});
	}

	// ---------------- panel and tools ----------------
	let sliding = false;
	panel.range.addEventListener('input', () => {
		const e = byId(sel);
		if (!e) return;
		if (!sliding) {
			hist.push(snapshot());
			sliding = true;
		}
		e.v = Number(panel.range.value);
		note = '';
		refresh();
	});
	panel.range.addEventListener('change', () => (sliding = false));
	panel.toggle.addEventListener('click', () => {
		const e = byId(sel);
		if (e) edit(e.id, { closed: !e.closed });
	});
	panel.replace.addEventListener('click', () => {
		const e = byId(sel);
		if (e) edit(e.id, { broken: false });
	});
	panel.del.addEventListener('click', () => {
		if (sel === null) return;
		commit(
			els.filter((e) => e.id !== sel),
			null,
		);
	});
	panel.rotate.addEventListener('click', () => {
		const e = byId(sel);
		if (!e || e.kind === 'wire') return;
		const mid: P = [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2];
		let d: P = [(e.b[0] - e.a[0]) / 2, (e.b[1] - e.a[1]) / 2];
		const others = els.filter((x) => x !== e);
		for (let k = 0; k < 3; k++) {
			d = [-d[1], d[0]]; // a quarter turn clockwise on the screen
			const res = place(others, { ...e, a: sub(mid, d), b: add(mid, d) });
			if (res) return commit(res);
		}
		note = 'Здесь деталь не повернуть: мешают соседние детали или край поля.';
		refresh();
	});
	undoBtn.addEventListener('click', () => {
		const s = hist.pop();
		if (!s) return;
		restore(s);
		note = '';
		refresh();
	});
	clearBtn.addEventListener('click', () => {
		if (els.length) commit([], null);
	});
	modeBtns.forEach((b) =>
		b.addEventListener('click', () => {
			mode = b.dataset.mode === 'i' ? 'i' : 'e';
			modeBtns.forEach((x) => {
				x.classList.toggle('is-on', x === b);
				x.setAttribute('aria-checked', String(x === b));
			});
			root.classList.toggle('is-current', mode === 'i');
			placeDots(0);
		}),
	);

	// ---------------- animation (only while on screen) ----------------
	let raf = 0;
	let last = 0;
	let visible = false;
	const frame = (now: number) => {
		const dt = Math.min((now - (last || now)) / 1000, 0.05);
		last = now;
		placeDots(dt);
		for (const l of lamps) {
			const goal = Math.min(1.5, Math.sqrt(Math.max(0, l.P) / P_FULL));
			let g = glow.get(l.id) ?? 0;
			g += (goal - g) * Math.min(1, dt / 0.12);
			glow.set(l.id, g);
			l.halo.setAttribute('r', (20 + 34 * g).toFixed(1));
			l.halo.setAttribute('opacity', Math.min(1, 1.25 * g).toFixed(3));
			l.heat?.setAttribute('opacity', Math.min(0.95, 1.7 * g).toFixed(3));
			l.hot?.setAttribute('opacity', Math.min(1, 1.7 * g).toFixed(3));
		}
		raf = visible ? requestAnimationFrame(frame) : 0;
	};
	const wake = () => {
		if (!raf && visible) {
			last = 0;
			raf = requestAnimationFrame(frame);
		}
	};
	new IntersectionObserver((entries) => {
		visible = entries.some((e) => e.isIntersecting);
		wake();
	}).observe(root);

	// ---------------- start ----------------
	const narrow = wrap.clientWidth < NARROW_BELOW;
	cols = narrow ? NARROW.cols : WIDE.cols;
	rows = narrow ? NARROW.rows : WIDE.rows;
	const preset = PRESETS[root.dataset.preset ?? 'empty'] ?? [];
	const d = centring(preset, cols, rows) ?? [0, 0];
	for (const p of preset) {
		const e = make(p.kind, add(p.a, d), add(p.b, d), p.v);
		if (p.closed) e.closed = true;
		els.push(e);
	}
	drawGrid();
	refresh();
	new ResizeObserver(() => fit()).observe(wrap);
}
