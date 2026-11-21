/**
 * A person of the shared people kit standing still on the ground, arms hanging relaxed (the fingers slightly bent),
 * for the chapter's static pictures (AttractPicture, WeightOn). The feet stand at `x` ± 2,5 % of the height on the
 * line y = `ground`, the knees almost straight; `dir` −1 faces left.
 */
import { figure, ANKLE_CM, type FigureOpts } from '@components/people/body';

export const standing = (g: SVGGElement, o: FigureOpts & { x: number; ground: number }) => {
	const fig = figure(g, o);
	const dir = o.dir ?? 1;
	const fs = o.clothes === 'indoor' || !o.clothes ? o.s * Math.min(1, o.H / 172) : o.s;
	const foot = { indoor: ANKLE_CM.trainer, home: ANKLE_CM.lowshoe, winter: ANKLE_CM.boot, swim: ANKLE_CM.barefoot }[o.clothes ?? 'indoor'];
	const ankleY = o.ground - foot * (o.clothes === 'indoor' || !o.clothes ? fs : o.s);
	const leg = (fig.bones.thigh + fig.bones.shin) * 0.997;
	const w = 0.025 * o.s * o.H;
	const a = (ang: number) => (dir > 0 ? ang : Math.PI - ang);
	fig.pose({
		hip: { x: o.x, y: ankleY - leg },
		lean: 0.02,
		ankles: [
			{ x: o.x + dir * w * 0.4, y: ankleY },
			{ x: o.x - dir * w * 0.6, y: ankleY },
		],
		feet: [0, 0],
		planted: [true, true],
		hands: [
			{ arm: [a(1.64), 0.22], pose: 'relaxed' },
			{ arm: [a(1.72), 0.26], pose: 'relaxed' },
		],
	});
	return fig;
};
