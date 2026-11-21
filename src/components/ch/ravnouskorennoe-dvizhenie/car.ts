/**
 * A passenger car in profile, driving to the right, for the pictures of «Равномерное и равноускоренное прямолинейное
 * движение». Real sizes in centimeters (origin at the front bumper on the ground, y up): 440 см long, 145 см high,
 * wheels of radius 32 см on axles 265 см apart (front axle 85 см behind the bumper). A driver's head shows in the front
 * window. `car(g, s, cls)` builds it into `g` (s = px per см; `cls` colors the body) and returns
 * `pose(x, gy, d, brake)`: the front bumper at x px on the ground line gy px, after the car has rolled d см (this
 * turns the wheels: angle = d / R), with the brake lights lit when `brake` is true. Colors come from the classes
 * `cr-*` defined by the component.
 */
import { el } from '../g7/kit';

export const LEN = 440; // см
const R = 32;
const AX = [-85, -350];

export const car = (g: SVGGElement, s: number, cls: string) => {
	g.replaceChildren();
	const f = (v: number) => v.toFixed(1);
	const P = (x: number, y: number) => `${f(x * s)} ${f(-y * s)}`;
	const mk = <K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attrs: Record<string, string | number>) => {
		const e = el(tag, attrs);
		parent.append(e);
		return e;
	};
	const root = mk(g, 'g', {});
	mk(root, 'path', {
		class: `cr-body ${cls}`,
		d: `M${P(0, 30)} L${P(0, 58)} Q${P(-2, 70)} ${P(-14, 73)} L${P(-100, 82)} Q${P(-150, 128)} ${P(-178, 138)} L${P(-292, 141)} Q${P(-330, 130)} ${P(-372, 96)} L${P(-428, 90)} Q${P(-440, 86)} ${P(-440, 70)} L${P(-440, 30)} L${P(-395, 30)} A${f(40 * s)} ${f(40 * s)} 0 0 0 ${P(-305, 30)} L${P(-130, 30)} A${f(40 * s)} ${f(40 * s)} 0 0 0 ${P(-40, 30)} Z`,
	});
	mk(root, 'path', { class: 'cr-glass', d: `M${P(-108, 86)} Q${P(-150, 124)} ${P(-176, 132)} L${P(-226, 133)} L${P(-226, 86)} Z M${P(-236, 86)} L${P(-236, 133)} L${P(-288, 134)} Q${P(-318, 124)} ${P(-352, 92)} Z` });
	// the driver: head and shoulder in the front window
	mk(root, 'path', { class: 'cr-shoulder', d: `M${P(-216, 86)} Q${P(-214, 104)} ${P(-196, 106)} Q${P(-180, 104)} ${P(-176, 86)} Z` });
	mk(root, 'circle', { class: 'cr-head', cx: f(-196 * s), cy: f(-118 * s), r: f(11 * s) });
	mk(root, 'path', { class: 'cr-hair', d: `M${P(-207, 120)} Q${P(-204, 131)} ${P(-193, 130)} Q${P(-186, 128)} ${P(-185, 122)} Q${P(-196, 124)} ${P(-207, 120)} Z` });
	mk(root, 'path', { class: 'cr-line', d: `M${P(-231, 86)} L${P(-231, 40)} M${P(-120, 66)} H${P(-150, 66).split(' ')[0]} M${P(-268, 66)} h${f(-28 * s)}` });
	mk(root, 'rect', { class: 'cr-head-light', x: f(-8 * s), y: f(-66 * s), width: f(8 * s), height: f(9 * s), rx: f(2 * s) });
	const tail = mk(root, 'rect', { class: 'cr-tail', x: f(-440 * s), y: f(-82 * s), width: f(9 * s), height: f(14 * s), rx: f(2 * s) });
	const glow = mk(root, 'circle', { class: 'cr-glow', cx: f(-438 * s), cy: f(-75 * s), r: f(26 * s) });
	const spokes = AX.map((ax) => {
		const w = mk(root, 'g', { transform: `translate(${P(ax, R)})` });
		mk(w, 'circle', { class: 'cr-tire', r: f(R * s) });
		mk(w, 'circle', { class: 'cr-rim', r: f(19 * s) });
		const sp = mk(w, 'path', { class: 'cr-spoke', d: Array.from({ length: 5 }, (_, i) => `M0 0 L${f(Math.cos((i * 2 * Math.PI) / 5) * 18 * s)} ${f(Math.sin((i * 2 * Math.PI) / 5) * 18 * s)}`).join(' ') });
		return sp;
	});
	return (x: number, gy: number, d: number, brake: boolean) => {
		root.setAttribute('transform', `translate(${f(x)} ${f(gy)})`);
		const a = ((d / R) * 180) / Math.PI;
		for (const sp of spokes) sp.setAttribute('transform', `rotate(${f(a)})`);
		tail.classList.toggle('is-on', brake);
		glow.style.opacity = brake ? '1' : '0';
	};
};

/** Styles for the classes used by `car`, scoped under `scope`. */
export const carCss = (scope: string) => `
${scope} .cr-body { stroke: var(--hm-line, var(--sl-color-gray-1)); stroke-width: 0.8; stroke-linejoin: round; }
${scope} .cr-blue { fill: var(--ig-vx); }
${scope} .cr-gold { fill: var(--ig-v); }
${scope} .cr-gray { fill: color-mix(in oklab, var(--ig-vx) 14%, var(--sl-color-gray-3)); }
${scope} .cr-glass { fill: color-mix(in oklab, var(--ig-vx) 30%, var(--sl-color-gray-6)); stroke: var(--hm-line, var(--sl-color-gray-1)); stroke-width: 0.5; }
${scope} .cr-shoulder { fill: color-mix(in oklab, var(--ig-v) 40%, var(--sl-color-gray-4)); }
${scope} .cr-head { fill: var(--hm-skin, hsl(26, 55%, 72%)); stroke: var(--hm-line, var(--sl-color-gray-1)); stroke-width: 0.5; }
${scope} .cr-hair { fill: var(--hm-hair, hsl(25, 40%, 28%)); }
${scope} .cr-line { fill: none; stroke: var(--hm-line, var(--sl-color-gray-1)); stroke-width: 0.6; opacity: 0.6; }
${scope} .cr-head-light { fill: color-mix(in oklab, var(--ig-v) 45%, white); }
${scope} .cr-tail { fill: color-mix(in oklab, var(--ig-vy) 45%, var(--sl-color-gray-5)); }
${scope} .cr-tail.is-on { fill: var(--ig-vy); }
${scope} .cr-glow { fill: var(--ig-vy); opacity: 0; filter: blur(3px); }
${scope} .cr-tire { fill: var(--hm-line, var(--sl-color-gray-1)); }
${scope} .cr-rim { fill: var(--sl-color-gray-3); }
${scope} .cr-spoke { fill: none; stroke: var(--sl-color-gray-5); stroke-width: 1; }
`;
