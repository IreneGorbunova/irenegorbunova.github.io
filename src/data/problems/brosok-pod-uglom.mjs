// «Решите сами» for «Движение тела, брошенного под углом к горизонту» (10 класс). g = 10 м/с², no air drag.
import { n, t } from '../../components/trainer/engine.mjs';

const G = 10;
const rad = (/** @type {number} */ a) => (a * Math.PI) / 180;
const sin = (/** @type {number} */ a) => Math.sin(rad(a));
const cos = (/** @type {number} */ a) => Math.cos(rad(a));
/** sin and cos of the angles used here, as the solution prints them. */
const SIN = { 15: '0{,}259', 30: '0{,}5', 45: '0{,}707', 60: '0{,}866', 75: '0{,}966', 90: '1', 120: '0{,}866', 150: '0{,}5' };
const COS = { 30: '0{,}866', 45: '0{,}707', 60: '0{,}5' };
const exact = (/** @type {number} */ a) => [30, 90, 150].includes(a);
const eq = (/** @type {number} */ a) => (exact(a) ? '=' : '\\approx');
const DRAG = 'Сопротивлением воздуха пренебрегите, $g = 10$ м/с².';
const ANGLES = { of: [30, 45, 60] };
const V0 = { from: 10, to: 30, step: 2 };
const MS = '~\\text{м/с}';

export default [
	{
		id: 'vremya',
		params: { v0: V0, a: ANGLES },
		text: (v) =>
			`Мяч бросили с земли со скоростью ${v.v0} м/с под углом ${v.a}° к горизонту. Сколько времени мяч будет в полёте? ${DRAG}`,
		answer: (v) => (2 * v.v0 * sin(v.a)) / G,
		unit: 'с',
		traps: [
			{
				value: (v) => (v.v0 * sin(v.a)) / G,
				why: 'Это время подъёма до верхней точки. Время полёта вдвое больше.',
			},
			{
				value: (v) => (v.a === 45 ? null : (2 * v.v0 * cos(v.a)) / G),
				why: 'Время полёта определяет вертикальная составляющая скорости $\\upsilon_{0y} = \\upsilon_0\\sin\\alpha$, а не горизонтальная.',
			},
		],
		solution: (v) => [
			'Время полёта:',
			{
				tex: `\\begin{aligned} t_{\\text{пол}} &= \\frac{2\\upsilon_0 \\sin\\alpha}{g} = \\frac{2 \\cdot ${v.v0} \\cdot ${SIN[v.a]}}{10}~\\text{с} ${eq(v.a)} \\\\ &${eq(v.a)} ${t((2 * v.v0 * sin(v.a)) / G)}~\\text{с}. \\end{aligned}`,
			},
		],
	},
	{
		id: 'vysota',
		params: { v0: V0, a: ANGLES },
		text: (v) =>
			`Мяч бросили с земли со скоростью ${v.v0} м/с под углом ${v.a}° к горизонту. На какую наибольшую высоту он поднимется? ${DRAG}`,
		answer: (v) => (v.v0 ** 2 * sin(v.a) ** 2) / (2 * G),
		unit: 'м',
		traps: [
			{
				value: (v) => (v.v0 ** 2 * sin(v.a)) / (2 * G),
				why: 'Синус тоже возводится в квадрат: $H = \\dfrac{\\upsilon_0^2 \\sin^2\\alpha}{2g}$.',
			},
			{
				value: (v) => (v.v0 ** 2 * sin(v.a) ** 2) / G,
				why: 'В знаменателе формулы высоты стоит $2g$, а не $g$.',
			},
			{
				value: (v) => (v.v0 ** 2) / (2 * G),
				why: 'Так высоко мяч поднялся бы, если бы его бросили вертикально вверх. При броске под углом вверх направлена только составляющая $\\upsilon_0\\sin\\alpha$.',
			},
		],
		solution: (v) => [
			'Наибольшая высота подъёма:',
			{
				tex: `\\begin{aligned} H &= \\frac{\\upsilon_0^2 \\sin^2\\alpha}{2g} = \\frac{${v.v0 ** 2} \\cdot ${SIN[v.a]}^2}{2 \\cdot 10}~\\text{м} ${eq(v.a)} \\\\ &${eq(v.a)} ${t((v.v0 ** 2 * sin(v.a) ** 2) / (2 * G))}~\\text{м}. \\end{aligned}`,
			},
		],
	},
	{
		id: 'dalnost',
		params: { v0: V0, a: ANGLES },
		text: (v) =>
			`Мяч бросили с земли со скоростью ${v.v0} м/с под углом ${v.a}° к горизонту. На каком расстоянии от точки броска он упадёт? ${DRAG}`,
		answer: (v) => (v.v0 ** 2 * sin(2 * v.a)) / G,
		unit: 'м',
		traps: [
			{
				value: (v) => (v.a === 60 ? null : (v.v0 ** 2 * sin(v.a)) / G),
				why: 'В формуле дальности стоит синус двойного угла: $L = \\dfrac{\\upsilon_0^2 \\sin 2\\alpha}{g}$.',
			},
			{
				value: (v) => (v.v0 ** 2 * sin(2 * v.a)) / (2 * G),
				why: 'В знаменателе формулы дальности стоит $g$, а не $2g$.',
			},
		],
		solution: (v) => [
			'Дальность полёта:',
			{
				tex: `\\begin{aligned} L &= \\frac{\\upsilon_0^2 \\sin 2\\alpha}{g} = \\frac{${v.v0 ** 2} \\cdot \\sin ${2 * v.a}^\\circ}{10}~\\text{м} ${eq(2 * v.a)} \\\\ &${eq(2 * v.a)} \\frac{${v.v0 ** 2} \\cdot ${SIN[2 * v.a]}}{10}~\\text{м} ${eq(2 * v.a)} ${t((v.v0 ** 2 * sin(2 * v.a)) / G)}~\\text{м}. \\end{aligned}`,
			},
		],
		note: (v) =>
			v.a === 45
				? 'При броске под углом 45° дальность полёта наибольшая.'
				: `Под углом ${90 - v.a}° мяч с той же скоростью улетел бы на то же расстояние.`,
	},
	{
		id: 'skorost',
		params: { v0: { from: 10, to: 30, step: 1 }, a: { of: [15, 30, 45, 60, 75] } },
		derive: (v) => ({ L: Number(((v.v0 ** 2 * sin(2 * v.a)) / G).toFixed(1)) }),
		text: (v) =>
			`Мяч бросили с земли под углом ${v.a}° к горизонту, и он упал в ${n(v.L, { dec: 1 })} м от точки броска. С какой скоростью его бросили? ${DRAG}`,
		answer: (v) => Math.sqrt((v.L * G) / sin(2 * v.a)),
		unit: 'м/с',
		traps: [
			{
				value: (v) => (v.a === 45 ? null : Math.sqrt(v.L * G)),
				why: 'Не забудьте синус двойного угла: $L = \\dfrac{\\upsilon_0^2 \\sin 2\\alpha}{g}$.',
			},
			{
				value: (v) => (v.L * G) / sin(2 * v.a),
				why: 'Из формулы дальности получается $\\upsilon_0^2$ — осталось извлечь квадратный корень.',
			},
		],
		solution: (v) => {
			const s2 = sin(2 * v.a);
			const v2 = (v.L * G) / s2;
			return [
				'Из формулы дальности $L = \\dfrac{\\upsilon_0^2 \\sin 2\\alpha}{g}$ выразим скорость:',
				{
					tex: `\\begin{aligned} \\upsilon_0 &= \\sqrt{\\frac{gL}{\\sin 2\\alpha}} = \\sqrt{\\frac{10 \\cdot ${t(v.L, { dec: 1 })}}{${SIN[2 * v.a]}}}${MS} ${eq(2 * v.a)} \\\\ &${eq(2 * v.a)} \\sqrt{${t(v2)}}${MS} \\approx ${t(Math.sqrt(v2))}${MS}. \\end{aligned}`,
				},
			];
		},
		note: (v) =>
			v.a === 45
				? 'Под углом 45° мяч с той же скоростью улетает дальше всего.'
				: `Брошенный с той же скоростью под углом ${90 - v.a}°, мяч упал бы в той же точке.`,
	},
	{
		id: 'vershina',
		params: { v0: V0, a: ANGLES },
		text: (v) =>
			`Мяч бросили со скоростью ${v.v0} м/с под углом ${v.a}° к горизонту. С какой скоростью он движется в верхней точке траектории? ${DRAG}`,
		answer: (v) => v.v0 * cos(v.a),
		unit: 'м/с',
		traps: [
			{
				value: () => 0,
				why: 'В верхней точке обращается в нуль только вертикальная составляющая скорости. Горизонтальная весь полёт остаётся равной $\\upsilon_0\\cos\\alpha$.',
			},
			{
				value: (v) => (v.a === 45 ? null : v.v0 * sin(v.a)),
				why: 'Горизонтальная составляющая скорости равна $\\upsilon_0\\cos\\alpha$, а не $\\upsilon_0\\sin\\alpha$.',
			},
			{
				value: (v) => v.v0,
				why: 'Скорость мяча в полёте меняется: в верхней точке у неё остаётся только горизонтальная составляющая.',
			},
		],
		solution: (v) => [
			'В верхней точке вертикальная составляющая скорости равна нулю, а горизонтальная весь полёт одна и та же:',
			{
				tex: `\\begin{aligned} \\upsilon &= \\upsilon_x = \\upsilon_0 \\cos\\alpha = ${v.v0} \\cdot ${COS[v.a]}${MS} ${v.a === 60 ? '=' : '\\approx'} \\\\ &${v.a === 60 ? '=' : '\\approx'} ${t(v.v0 * cos(v.a))}${MS}. \\end{aligned}`,
			},
		],
	},
];
