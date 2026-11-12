/**
 * Drawing of the meter schemes (MeterScheme.astro): where an ammeter or a voltmeter is connected and what it shows.
 * Ammeter: a battery 4,5 В, a key and a lamp of 15 Ом in series, I = 4,5 / 15 = 0,30 А wherever the ammeter stands;
 *   connected in parallel with the lamp it shorts it: the lamp goes out and the needle goes off the scale.
 * Voltmeter: a battery 4,5 В, a key and two lamps of 12 Ом and 6 Ом in series, I = 0,25 А:
 *   3,0 В on lamp 1, 1,5 В on lamp 2, 4,5 В on the battery; in series it lets almost no current through,
 *   the lamps go out and it shows almost the voltage of the battery.
 * The same function draws the first frame at build time and every change in the browser.
 */
import { symbol, type Kind } from './symbols';

export type MeterKind = 'ammeter' | 'voltmeter';
type Place = { x: number; y: number; rot: number };
type Item = { kind: Kind; at: Place; glow?: number; plus?: boolean; label?: string };

export const OPTIONS: Record<MeterKind, string[]> = {
	ammeter: ['до лампы', 'после лампы', 'после ключа', 'параллельно лампе'],
	voltmeter: ['к лампе 1', 'к лампе 2', 'к источнику', 'последовательно'],
};

/** Rotates a local point of a symbol into the drawing. */
const place = (s: Place, x: number, y: number) => {
	const a = (s.rot * Math.PI) / 180;
	return { x: s.x + x * Math.cos(a) - y * Math.sin(a), y: s.y + x * Math.sin(a) + y * Math.cos(a) };
};

const draw = (it: Item, gid: string) => {
	const { body, texts } = symbol(it.kind, true);
	const t = [...texts];
	// the clamps of a meter: «+» where the current comes in (the left end of a symbol), «−» where it goes out
	if (it.plus) t.push({ x: -31, y: -14, t: '+', cls: 'cb__pm' }, { x: 31, y: -14, t: '−', cls: 'cb__pm' });
	// a lamp glows over its white background, under its symbol
	const glow =
		it.kind === 'lamp' ? `<circle class="ms__glow" r="46" fill="url(#${gid})" style="opacity:${(it.glow ?? 0).toFixed(2)}"/>` : '';
	let s = `<g transform="translate(${it.at.x} ${it.at.y}) rotate(${it.at.rot})"><rect class="ms__bg" x="-46" y="-22" width="92" height="44"/>${glow}${body}</g>`;
	for (const x of t) {
		const p = place(it.at, x.x, x.y - 5);
		s += `<text class="${x.cls}" x="${p.x.toFixed(1)}" y="${(p.y + 5).toFixed(1)}" text-anchor="middle">${x.t}</text>`;
	}
	return s;
};

const dot = (x: number, y: number) => `<circle class="cb__dot" cx="${x}" cy="${y}" r="4"/>`;
const text = (x: number, y: number, t: string, cls: string, anchor = 'middle') =>
	`<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;

export const drawMeter = (kind: MeterKind, pos: number, gid: string) => {
	let wires = '';
	let parts = '';
	let labels = '';
	let flow = '';
	let msg = '';
	let short = false;
	if (kind === 'ammeter') {
		// the loop: battery on the left («+» at the top), lamp on the right, key at the bottom; current clockwise
		const L = 50, R = 400, T = 90, B = 230;
		const parallel = pos === 3;
		short = parallel;
		wires += `<path class="ms__w" d="M ${L} ${T} H ${R} V ${B} H ${L} Z"/>`;
		const spots: Place[] = [
			{ x: 225, y: T, rot: 0 },
			{ x: 335, y: B, rot: 180 },
			{ x: 115, y: B, rot: 180 },
			{ x: 460, y: 160, rot: 90 },
		];
		if (parallel) {
			wires += `<path class="ms__w" d="M ${R} ${T} H 460 V ${B} H ${R}"/>`;
			parts += dot(R, T) + dot(R, B);
		}
		parts += draw({ kind: 'battery', at: { x: L, y: 160, rot: 270 } }, gid);
		parts += draw({ kind: 'lamp', at: { x: R, y: 160, rot: 90 }, glow: parallel ? 0 : 1 }, gid);
		parts += draw({ kind: 'key', at: { x: 225, y: B, rot: 180 } }, gid);
		parts += draw({ kind: 'ammeter', at: spots[pos], plus: true }, gid);
		labels += text(L + 30, 167, '4,5 В', 'ms__cap', 'start');
		labels += text(R - 30, 167, 'лампа', 'ms__cap', 'end');
		labels += text(225, B + 42, 'ключ', 'ms__cap');
		const read = parallel ? 'зашкаливает!' : '0,30 А';
		const cls = parallel ? 'ms__read ms__read--bad' : 'ms__read ms__read--i';
		const at = [
			[225, T - 32, 'middle'],
			[335, B + 46, 'middle'],
			[115, B + 46, 'middle'],
			[496, 50, 'end'],
		][pos] as [number, number, string];
		labels += text(at[0], at[1], read, cls, at[2]);
		flow = parallel ? `M ${L} 160 V ${T} H 460 V ${B} H ${L} Z` : `M ${L} 160 V ${T} H ${R} V ${B} H ${L} Z`;
		msg = parallel
			? 'Амперметр подключён параллельно лампе. Почти весь ток идёт через амперметр в обход лампы: лампа погасла, а ток стал таким большим, что стрелка зашкаливает. Так амперметр можно испортить!'
			: 'Амперметр включён последовательно: через него проходит весь ток цепи. Где бы он ни стоял, он показывает одно и то же — 0,30 А.';
	} else {
		// the loop: battery on the left («+» at the top), lamps 1 and 2 at the top, key on the right; current clockwise
		const L = 110, R = 470, T = 110, B = 240;
		const series = pos === 3;
		wires += `<path class="ms__w" d="M ${L} ${T} H ${R} V ${B} H ${L} Z"/>`;
		const branch = [
			{ d: `M 150 ${T} V 40 H 270 V ${T}`, n: [[150, T], [270, T]], at: { x: 210, y: 40, rot: 0 } },
			{ d: `M 290 ${T} V 40 H 410 V ${T}`, n: [[290, T], [410, T]], at: { x: 350, y: 40, rot: 0 } },
			{ d: `M ${L} ${T} H 36 V ${B} H ${L}`, n: [[L, T], [L, B]], at: { x: 36, y: 175, rot: 90 } },
		];
		let vAt: Place = { x: 290, y: B, rot: 180 };
		if (!series) {
			const b = branch[pos];
			wires += `<path class="ms__w" d="${b.d}"/>`;
			parts += b.n.map(([x, y]) => dot(x, y)).join('');
			vAt = b.at;
		}
		const glow = series ? [0, 0] : [1, 0.5]; // powers 0,75 Вт and 0,375 Вт
		parts += draw({ kind: 'battery', at: { x: L, y: 175, rot: 270 } }, gid);
		parts += draw({ kind: 'lamp', at: { x: 210, y: T, rot: 0 }, glow: glow[0] }, gid);
		parts += draw({ kind: 'lamp', at: { x: 350, y: T, rot: 0 }, glow: glow[1] }, gid);
		parts += draw({ kind: 'key', at: { x: R, y: 175, rot: 90 } }, gid);
		parts += draw({ kind: 'voltmeter', at: vAt, plus: true }, gid);
		labels += text(L + 30, 182, '4,5 В', 'ms__cap', 'start');
		labels += text(210, T + 44, 'лампа 1', 'ms__cap');
		labels += text(350, T + 44, 'лампа 2', 'ms__cap');
		labels += text(R - 30, 182, 'ключ', 'ms__cap', 'end');
		const read = ['3,0 В', '1,5 В', '4,5 В', '4,5 В'][pos];
		const at = [
			[278, 30, 'start'],
			[418, 30, 'start'],
			[36, 96, 'middle'],
			[290, 288, 'middle'],
		][pos] as [number, number, string];
		labels += text(at[0], at[1], read, 'ms__read ms__read--u', at[2]);
		flow = series ? '' : `M ${L} 175 V ${T} H ${R} V ${B} H ${L} Z`;
		msg = [
			'Вольтметр подключён параллельно лампе 1 и показывает напряжение на ней: 3,0 В.',
			'Вольтметр подключён параллельно лампе 2 и показывает напряжение на ней: 1,5 В.',
			'Вольтметр подключён к полюсам источника и показывает напряжение источника: 4,5 В.',
			'Вольтметр включён последовательно. Ток через него почти не идёт, и лампы не горят. Вольтметр показывает почти всё напряжение источника — 4,5 В, но не напряжение на лампе.',
		][pos];
	}
	const svg =
		`<g class="ms__wires">${wires}</g>` +
		(flow ? `<path class="ms__flow" d="${flow}"/>` : '') +
		parts +
		labels;
	return { svg, msg, short };
};
