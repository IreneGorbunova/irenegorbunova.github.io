/** Shared data and helpers for the «Работа и мощность электрического тока» chapter models. */
import katex from 'katex';

export const U_NET = 220; // В, напряжение в домашней сети

/**
 * Household appliances: rounded typical powers (Вт). `hours` — default use per day,
 * `max`/`step` — slider range in hours. `colour` is a CSS colour (theme variable).
 */
export const DEVICES = {
	kettle: { name: 'Электрочайник', P: 2000, hours: 0.3, max: 2, step: 0.1, colour: 'var(--ig-vy)' },
	iron: { name: 'Утюг', P: 2000, hours: 0.2, max: 2, step: 0.1, colour: 'var(--sl-color-purple)' },
	inc: { name: 'Лампа накаливания', P: 60, hours: 5, max: 12, step: 0.5, colour: 'var(--ig-v)' },
	led: { name: 'Светодиодная лампа', P: 8, hours: 5, max: 12, step: 0.5, colour: 'var(--sl-color-green)' },
	tv: { name: 'Телевизор', P: 100, hours: 3, max: 12, step: 0.5, colour: 'var(--ig-vx)' },
	charger: { name: 'Зарядка телефона', P: 10, hours: 2, max: 8, step: 0.5, colour: 'var(--sl-color-gray-2)' },
	heater: { name: 'Обогреватель', P: 1500, hours: 0, max: 0, step: 0, colour: 'var(--sl-color-orange)' },
} as const;
export type DeviceKey = keyof typeof DEVICES;

/** Rounds to `digits` decimals, drops trailing zeros, decimal comma: 0.5 → «0,5». */
export const ru = (v: number, digits = 1) =>
	(Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString('ru-RU', {
		maximumFractionDigits: digits,
		useGrouping: false,
	});

/** Like `ru`, but groups thousands with narrow no-break spaces (for HTML text): 12345 → «12 345». */
export const ruG = (v: number, digits = 0) => {
	const s = ru(v, digits);
	const [a, b] = s.split(',');
	const g = a.length > 4 ? a.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : a;
	return b ? `${g},${b}` : g;
};

/** A number for TeX: decimal comma, thin-space groups. */
export const tex = (v: number, digits = 1) => {
	const s = ru(v, digits);
	const [a, b] = s.split(',');
	const g = a.replace('-', '').length > 4 ? a.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,') : a;
	return b ? `${g}{,}${b}` : g;
};

/** Coloured part of a formula (class .rm-<kind>). */
export const q = (kind: string, body: string) => `\\htmlClass{rm-${kind}}{${body}}`;

export const renderTex = (el: HTMLElement, src: string, display = true) =>
	katex.render(src, el, {
		displayMode: display,
		throwOnError: false,
		strict: 'ignore',
		trust: (ctx) => ctx.command === '\\htmlClass',
	});

/**
 * Colour of a glowing hot metal at temperature t (°C) and the glow strength 0…1.
 * Below about 500 °C a metal does not glow visibly; then dark red → cherry → orange → yellow-white.
 */
export const glow = (t: number): { colour: string; a: number } => {
	const stops: [number, number, number, number][] = [
		// t, r, g, b
		[500, 90, 0, 0],
		[600, 150, 10, 0],
		[700, 200, 30, 5],
		[800, 235, 60, 10],
		[900, 255, 100, 20],
		[1000, 255, 140, 40],
		[1100, 255, 180, 80],
		[1250, 255, 220, 150],
		[1500, 255, 245, 220],
	];
	if (t <= stops[0][0]) return { colour: 'rgb(90,0,0)', a: 0 };
	let i = 1;
	while (i < stops.length - 1 && t > stops[i][0]) i++;
	const [t0, r0, g0, b0] = stops[i - 1];
	const [t1, r1, g1, b1] = stops[i];
	const f = Math.min(1, (t - t0) / (t1 - t0));
	const c = (x: number, y: number) => Math.round(x + (y - x) * f);
	const a = Math.min(1, (t - 500) / 350);
	return { colour: `rgb(${c(r0, r1)},${c(g0, g1)},${c(b0, b1)})`, a };
};

/** Appliance pictures, viewBox 0 0 64 64. Parts with class `on-*` come alive when the device works. */
export const ICONS: Record<DeviceKey, string> = {
	kettle: `
		<path class="rmi-steam on-steam" d="M30 14 q-4 -4 0 -8 q4 -4 0 -8" />
		<path class="rmi-steam on-steam on-steam--2" d="M37 15 q-4 -4 0 -8 q4 -4 0 -8" />
		<path class="rmi-body" d="M18 22 h26 l3 30 a4 4 0 0 1 -4 4 h-24 a4 4 0 0 1 -4 -4 z" />
		<path class="rmi-line" d="M44 27 q12 2 9 14 q-2 6 -7 7" />
		<path class="rmi-line" d="M18 26 l-8 -6" />
		<rect class="rmi-line" x="22" y="18" width="18" height="4" rx="2" />
		<path class="rmi-base" d="M14 56 h34 a2 2 0 0 1 2 2 v2 h-38 v-2 a2 2 0 0 1 2 -2 z" />
		<circle class="rmi-led on-red" cx="31" cy="50" r="2" />
		<path class="rmi-water" d="M20.5 40 h21 l1.2 12 a2 2 0 0 1 -2 2 h-19.4 a2 2 0 0 1 -2 -2 z" />`,
	iron: `
		<g class="on-puff"><circle cx="20" cy="56" r="2.2" /><circle cx="30" cy="58" r="2.6" /><circle cx="40" cy="56" r="2.2" /></g>
		<path class="rmi-body" d="M8 48 q4 -18 30 -20 h12 a6 6 0 0 1 6 6 v14 z" />
		<path class="rmi-line" d="M30 28 q0 -10 10 -10 h10 a4 4 0 0 1 4 4 v8" />
		<path class="rmi-sole" d="M6 48 h52 v4 h-52 z" />
		<circle class="rmi-led on-red" cx="44" cy="38" r="2" />
		<circle class="rmi-line" cx="34" cy="40" r="4" />`,
	inc: `
		<circle class="rmi-halo on-halo-warm" cx="32" cy="24" r="22" />
		<path class="rmi-glass" d="M32 4 a18 18 0 0 1 10 33 q-2 2 -2 6 v3 h-16 v-3 q0 -4 -2 -6 a18 18 0 0 1 10 -33 z" />
		<path class="rmi-wire" d="M28 46 v-20 M36 46 v-20" />
		<path class="rmi-fil on-fil" d="M28 26 l1.6 -3 l1.6 3 l1.6 -3 l1.6 3 l1.6 -3" />
		<path class="rmi-base" d="M24 46 h16 v4 h-16 z M25 51 h14 v3 h-14 z M26 55 h12 v3 h-12 z M29 59 h6 v3 h-6 z" />`,
	led: `
		<circle class="rmi-halo on-halo-cool" cx="32" cy="22" r="22" />
		<path class="rmi-glass rmi-glass--led" d="M32 4 a17 17 0 0 1 17 17 v4 a4 4 0 0 1 -4 4 h-26 a4 4 0 0 1 -4 -4 v-4 a17 17 0 0 1 17 -17 z" />
		<g class="rmi-chips on-chips"><rect x="20" y="18" width="4" height="4" rx="1" /><rect x="30" y="18" width="4" height="4" rx="1" /><rect x="40" y="18" width="4" height="4" rx="1" /><rect x="25" y="11" width="4" height="4" rx="1" /><rect x="35" y="11" width="4" height="4" rx="1" /></g>
		<path class="rmi-body" d="M20 29 h24 l-3 15 h-18 z" />
		<path class="rmi-base" d="M24 45 h16 v4 h-16 z M25 50 h14 v3 h-14 z M26 54 h12 v3 h-12 z M29 58 h6 v3 h-6 z" />`,
	tv: `
		<rect class="rmi-body" x="4" y="10" width="56" height="36" rx="3" />
		<rect class="rmi-screen on-screen" x="8" y="14" width="48" height="28" rx="1" />
		<path class="rmi-pic on-pic" d="M8 36 l10 -9 l8 6 l9 -10 l21 15 v4 h-48 z" />
		<circle class="rmi-pic on-pic" cx="46" cy="21" r="3" />
		<path class="rmi-line" d="M26 46 l-4 10 M38 46 l4 10 M18 56 h28" />
		<circle class="rmi-led on-red" cx="54" cy="44" r="1" />`,
	charger: `
		<rect class="rmi-body" x="20" y="6" width="24" height="44" rx="4" />
		<rect class="rmi-screen" x="23" y="11" width="18" height="33" rx="1" />
		<rect class="rmi-batt" x="28" y="19" width="8" height="18" rx="1.2" />
		<rect class="rmi-charge on-charge" x="29.2" y="20.2" width="5.6" height="15.6" rx="0.6" />
		<rect class="rmi-batt-tip" x="30.5" y="17" width="3" height="2" />
		<path class="rmi-line" d="M32 50 v4 q0 6 -8 6 h-10" />
		<path class="rmi-base" d="M4 54 h10 v12 h-10 z" />`,
	heater: `
		<g class="on-waves"><path d="M18 8 q-3 -4 0 -8" /><path d="M32 8 q-3 -4 0 -8" /><path d="M46 8 q-3 -4 0 -8" /></g>
		<rect class="rmi-body" x="8" y="12" width="8" height="40" rx="4" />
		<rect class="rmi-body" x="18" y="12" width="8" height="40" rx="4" />
		<rect class="rmi-body" x="28" y="12" width="8" height="40" rx="4" />
		<rect class="rmi-body" x="38" y="12" width="8" height="40" rx="4" />
		<rect class="rmi-body" x="48" y="12" width="8" height="40" rx="4" />
		<path class="rmi-line" d="M10 52 v6 M54 52 v6" />
		<circle class="rmi-led on-red" cx="52" cy="17" r="1.6" />`,
};

/** Shared CSS for the appliance pictures; included once per component with `<style is:global>`. */
export const ICON_CSS = `
.rmi { width: 100%; height: 100%; overflow: visible; }
.rmi .rmi-body { fill: var(--sl-color-gray-6); stroke: var(--sl-color-gray-3); stroke-width: 1.6; }
.rmi .rmi-line { fill: none; stroke: var(--sl-color-gray-3); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.rmi .rmi-base { fill: var(--sl-color-gray-4); }
.rmi .rmi-sole { fill: var(--sl-color-gray-3); }
.rmi .rmi-glass { fill: color-mix(in srgb, var(--sl-color-gray-5) 40%, transparent); stroke: var(--sl-color-gray-3); stroke-width: 1.4; }
.rmi .rmi-wire { stroke: var(--sl-color-gray-3); stroke-width: 0.9; fill: none; }
.rmi .rmi-fil { fill: none; stroke: var(--sl-color-gray-3); stroke-width: 1.2; stroke-linejoin: round; transition: stroke 0.4s, filter 0.4s; }
.rmi .rmi-chips rect { fill: var(--sl-color-gray-4); transition: fill 0.4s; }
.rmi .rmi-screen { fill: var(--sl-color-black); transition: fill 0.4s; }
.rmi .rmi-pic { fill: transparent; transition: fill 0.4s; }
.rmi .rmi-batt { fill: none; stroke: var(--sl-color-gray-3); stroke-width: 1.2; }
.rmi .rmi-batt-tip { fill: var(--sl-color-gray-3); }
.rmi .rmi-charge { fill: var(--sl-color-green); transform-box: fill-box; transform-origin: 50% 100%; transform: scaleY(0.25); opacity: 0.5; }
.rmi .rmi-led { fill: var(--sl-color-gray-5); transition: fill 0.3s; }
.rmi .rmi-water { fill: color-mix(in srgb, var(--ig-vx) 35%, transparent); }
.rmi .rmi-steam, .rmi .on-waves path { fill: none; stroke: var(--sl-color-gray-2); stroke-width: 1.6; stroke-linecap: round; opacity: 0; }
.rmi .on-puff circle { fill: var(--sl-color-gray-2); opacity: 0; }
.rmi .rmi-halo { opacity: 0; transition: opacity 0.5s; }
.rmi .on-halo-warm { fill: rgba(255, 190, 90, 0.55); filter: blur(7px); }
.rmi .on-halo-cool { fill: rgba(230, 240, 255, 0.6); filter: blur(7px); }
.is-on > .rmi .rmi-halo, .is-on .rmi .rmi-halo { opacity: 1; }
.is-on .rmi .on-fil { stroke: rgb(255, 214, 120); filter: drop-shadow(0 0 2px rgb(255, 170, 60)); }
.is-on .rmi .on-chips rect { fill: rgb(250, 252, 255); }
.is-on .rmi .on-red { fill: var(--sl-color-red); }
.is-on .rmi .on-screen { fill: color-mix(in srgb, var(--ig-vx) 45%, var(--sl-color-black)); }
.is-on .rmi .on-pic { fill: color-mix(in srgb, var(--sl-color-green) 55%, transparent); }
.is-on .rmi .on-charge { opacity: 1; animation: rmi-charge 2.4s ease-in-out infinite; }
.is-on .rmi .on-steam { animation: rmi-steam 1.8s ease-out infinite; }
.is-on .rmi .on-steam--2 { animation-delay: 0.9s; }
.is-on .rmi .on-waves path { animation: rmi-steam 2.2s ease-out infinite; stroke: var(--sl-color-orange); }
.is-on .rmi .on-waves path:nth-child(2) { animation-delay: 0.7s; }
.is-on .rmi .on-waves path:nth-child(3) { animation-delay: 1.4s; }
.is-on .rmi .on-puff circle { animation: rmi-puff 1.6s ease-out infinite; }
.is-on .rmi .on-puff circle:nth-child(2) { animation-delay: 0.5s; }
.is-on .rmi .on-puff circle:nth-child(3) { animation-delay: 1s; }
@keyframes rmi-steam { 0% { opacity: 0; transform: translateY(6px); } 30% { opacity: 0.8; } 100% { opacity: 0; transform: translateY(-6px); } }
@keyframes rmi-puff { 0% { opacity: 0.7; transform: translateY(0); } 100% { opacity: 0; transform: translateY(6px); } }
@keyframes rmi-charge { 0% { transform: scaleY(0.25); } 100% { transform: scaleY(1); } }
:root[data-theme='light'] .rmi .on-halo-cool { fill: rgba(120, 170, 255, 0.45); }
:root[data-theme='light'] .is-on .rmi .on-chips rect { fill: rgb(90, 150, 255); }
:root[data-theme='light'] .is-on .rmi .on-fil { stroke: rgb(235, 140, 20); }
`;
