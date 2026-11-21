/**
 * A spacesuit on top of the shared people kit (src/components/people/), for the chapter's pictures of a person on the
 * Moon. The body, arms, legs and hands are the kit's winter figure (jacket, trousers, boots, gloves; a small figure
 * gets the kit's mittens with a thumb); the class `zs-suit` on the figure's group turns them white (SuitStyles.astro)
 * and hides the hat and the scarf. Added here: a helmet with a gold visor, drawn into the kit's head group so that it
 * turns with the head, a life-support backpack on the back and a control box on the chest, both placed from the pose
 * the same way the kit places the torso (along the spine from the hip joint). Proportions as the kit's adult.
 */
import { figure, type FigureOpts, type FigurePose, type FigureState } from '@components/people/body';
import { SKELETON, mk, P1, type Pt } from '@components/people/core';

export const suited = (g: SVGGElement, o: Omit<FigureOpts, 'clothes' | 'covering'>) => {
	const fig = figure(g, { ...o, clothes: 'winter', covering: 'glove' });
	g.classList.add('zs-suit');
	const root = g.firstElementChild as SVGGElement; // the kit's root group (mirrored when the person faces left)
	const sk = SKELETON[o.age ?? 'adult'];
	const u = o.s * o.H;
	const W = 0.17 * u * (o.girth ?? 1) * (sk.depth / 0.15); // the kit's body depth for winter clothes
	const L = (sk.shoulder + 0.03) * u; // hip joint to the top of the shoulders
	const r = sk.headR * u;
	const dir = o.dir ?? 1;

	// the helmet: in the head group, face to +x, radius r of the head
	const head = root.querySelector('.pkw-hat')!.parentNode as SVGGElement;
	const R = (k: number) => (k * r).toFixed(2);
	mk(head, 'circle', { class: 'zs-helmet', cx: R(0.1), cy: R(-0.08), r: R(1.45) });
	mk(head, 'path', { class: 'zs-visor', d: `M${R(0.15)} ${R(-1.2)} Q${R(1.25)} ${R(-1.05)} ${R(1.5)} ${R(0.0)} Q${R(1.3)} ${R(0.75)} ${R(0.55)} ${R(0.85)} Q${R(0.75)} ${R(-0.2)} ${R(0.15)} ${R(-1.2)} Z` });
	mk(head, 'path', { class: 'zs-glint', d: `M${R(0.75)} ${R(-0.85)} Q${R(1.15)} ${R(-0.6)} ${R(1.22)} ${R(-0.2)}` });
	mk(head, 'path', { class: 'zs-ring', d: `M${R(-0.9)} ${R(1.1)} L${R(0.95)} ${R(1.25)}` });

	// the backpack behind the torso (after the far arm and leg), the chest box in front of it (before the scarf)
	const pack = mk(root, 'path', { class: 'zs-pack' });
	root.insertBefore(pack, root.querySelector('.pkw-far')!.nextSibling);
	const box = mk(root, 'path', { class: 'zs-box' });
	root.insertBefore(box, root.querySelector('.pkw-scarf'));

	const pose = (q: FigurePose): FigureState => {
		const st = fig.pose(q);
		const hip: Pt = { x: dir * q.hip.x, y: q.hip.y }; // in the root's (right-facing) frame, as the kit does
		const ax = Math.sin(q.lean);
		const ay = -Math.cos(q.lean);
		const at = (a: number, b: number): Pt => ({ x: hip.x + ax * a - ay * b, y: hip.y + ay * a + ax * b });
		const quad = (pts: Pt[]) => `M${pts.map(P1).join(' L')} Z`;
		pack.setAttribute('d', quad([at(0.06 * u, -0.45 * W), at(L + 0.02 * u, -0.45 * W), at(L + 0.02 * u, -0.5 * W - 0.1 * u), at(0.06 * u, -0.5 * W - 0.1 * u)]));
		box.setAttribute('d', quad([at(L - 0.12 * u, 0.42 * W), at(L - 0.05 * u, 0.44 * W), at(L - 0.05 * u, 0.44 * W + 0.035 * u), at(L - 0.12 * u, 0.42 * W + 0.035 * u)]));
		return st;
	};
	return Object.assign(pose, { pose, bones: fig.bones, id: fig.id });
};
