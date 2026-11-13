/** Sections of the sidebar and their chapters, for the constellations (constellations.ts). */
import { stepsOf } from './steps';
import { SECTION_SKY, RESERVE } from './constellations';

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

const warned = new Set<string>();

/**
 * Every section of the sidebar with its chapters in sidebar order and its constellation. A section missing from
 * SECTION_SKY gets the next constellation of RESERVE (and a warning at build time), so a new section never breaks.
 */
export const skySections = (route: Route): SkySection[] => {
	const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
	const idOf = (href: string) => href.slice(base.length).replace(/\/$/, '');
	const used = new Set(Object.values(SECTION_SKY));
	const spare = RESERVE.filter((k) => !used.has(k));
	const out: SkySection[] = [];
	let nSpare = 0;
	for (const g of route.sidebar) {
		if (g.type !== 'group') continue;
		for (const s of g.entries) {
			if (s.type !== 'group') continue;
			const chapters = linksOf(s.entries)
				.map((l) => ({ id: idOf(l.href), href: l.href, label: l.label }))
				.filter((c) => isChapter(c.id))
				.map((c) => ({ ...c, need: stepsOf(c.id).join('') }));
			if (!chapters.length) continue;
			const name = `${g.label}/${s.label}`;
			let key = SECTION_SKY[name];
			if (!key) {
				// reserve constellations in order; should they run out, they repeat
				const pool = spare.length ? spare : RESERVE;
				key = pool[nSpare++ % pool.length];
				if (!warned.has(name)) {
					warned.add(name);
					console.warn(`[sky] раздел «${name}» без созвездия в SECTION_SKY (constellations.ts): пока ${key}`);
				}
			}
			out.push({ key, grade: g.label, section: s.label, chapters });
		}
	}
	return out;
};
