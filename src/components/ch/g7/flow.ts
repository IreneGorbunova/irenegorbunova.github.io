/**
 * A flow picture of work for the chapters on efficiency: a band of the work spent that splits into the useful work
 * (straight on) and the losses (turning down). The widths of the three bands are proportional to the works.
 */
import { el } from './kit';

export const drawFlow = (g: SVGGElement, x: number, y: number, len: number, width: number, usefulShare: number, labels: { spent: string; useful: string; lost: string }) => {
	g.replaceChildren();
	const wu = width * Math.min(1, Math.max(0, usefulShare));
	const wl = width - wu;
	const mid = x + len * 0.45;
	// the band that comes in
	g.append(el('rect', { class: 'flow__spent', x, y, width: mid - x, height: width }));
	// the useful part goes straight on and ends with an arrow head
	if (wu > 0.5) g.append(el('path', { class: 'flow__useful', d: `M${mid} ${y} H${x + len - 14} L${x + len} ${y + wu / 2} L${x + len - 14} ${y + wu} H${mid} Z` }));
	// the lost part turns down
	if (wl > 0.5) {
		const x1 = mid + 26 + wl;
		g.append(el('path', { class: 'flow__lost', d: `M${mid} ${y + wu} H${mid + 26} Q${x1} ${y + wu} ${x1} ${y + width + 22} L${x1 - wl / 2} ${y + width + 36} L${x1 - wl} ${y + width + 22} Q${x1 - wl} ${y + width} ${mid + 26} ${y + width} H${mid} Z` }));
		g.append(el('text', { class: 't-small', x: x1 + 6, y: y + width + 34 }, labels.lost));
	}
	g.append(el('text', { class: 't-small', x: x + 4, y: y - 6 }, labels.spent));
	g.append(el('text', { class: 't-small', x: x + len, y: y - 6, 'text-anchor': 'end' }, labels.useful));
};
