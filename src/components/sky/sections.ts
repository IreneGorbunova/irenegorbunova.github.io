/** Sections of the sidebar and their chapters, for the constellations (constellations.ts). */
import { PROBLEMS } from '../../data/problems/index.mjs';
import { needOf } from './rays';
import { SECTION_SKY } from './constellations';

type Route = App.Locals['starlightRoute'];
type Item = Route['sidebar'][number];
type Link = Extract<Item, { type: 'link' }>;

const linksOf = (items: Item[]): Link[] => items.flatMap((x) => (x.type === 'link' ? [x] : linksOf(x.entries)));
const isChapter = (id: string) => /^uchebnik\/\d+-klass\/[^/]+\/[^/]+$/.test(id);

export interface SkyChapter {
	id: string;
	href: string;
	label: string;
	need: string;
}
export interface SkySection {
	key: string; // constellation key
	grade: string;
	section: string;
	chapters: SkyChapter[];
}

/** Every section with a constellation, with its chapters in sidebar order. */
export const skySections = (route: Route): SkySection[] => {
	const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
	const idOf = (href: string) => href.slice(base.length).replace(/\/$/, '');
	const out: SkySection[] = [];
	for (const g of route.sidebar) {
		if (g.type !== 'group') continue;
		for (const s of g.entries) {
			if (s.type !== 'group') continue;
			const key = SECTION_SKY[`${g.label}/${s.label}`];
			if (!key) continue;
			const chapters = linksOf(s.entries)
				.map((l) => ({ id: idOf(l.href), href: l.href, label: l.label }))
				.filter((c) => isChapter(c.id))
				.map((c) => ({ ...c, need: needOf(c.id.split('/').pop()! in PROBLEMS).join('') }));
			out.push({ key, grade: g.label, section: s.label, chapters });
		}
	}
	return out;
};
