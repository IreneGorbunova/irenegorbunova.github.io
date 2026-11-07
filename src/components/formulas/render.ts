/**
 * Build-time HTML for formula cards. KaTeX throws on bad TeX, so a typo fails the build.
 */
import katex from 'katex';
import type { CollectionEntry } from 'astro:content';

export type Formula = NonNullable<CollectionEntry<'docs'>['data']['formulas']>[number];

const esc = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const tex = (s: string, displayMode = false) =>
	katex.renderToString(s, { displayMode, throwOnError: true });

/** Plain text with inline math in $…$. */
export const inline = (s: string) =>
	s
		.split(/(\$[^$]+\$)/)
		.map((part) => (part.startsWith('$') && part.endsWith('$') ? tex(part.slice(1, -1)) : esc(part)))
		.join('');

/** The parts a card face is built from (HTML strings; empty when absent). */
export interface CardParts {
	key: string;
	chapter: string;
	href: string;
	name: string;
	ask: string;
	tex: string;
	def: string;
	symbols: string;
	note: string;
}

export const symbolsHtml = (f: Formula) =>
	f.symbols?.length
		? `<dl class="kf-sym">${f.symbols
				.map(
					(x) =>
						`<div><dt>${tex(x.s)}</dt><dd>${inline(x.is)}${
							x.unit ? `, <span class="kf-sym__unit">${esc(x.unit)}</span>` : ''
						}</dd></div>`,
				)
				.join('')}</dl>`
		: '';

export const cardParts = (entryId: string, chapter: string, href: string, f: Formula): CardParts => ({
	key: `${entryId}/${f.id}`,
	chapter: esc(chapter),
	href,
	name: inline(f.name),
	ask: inline(f.ask ?? f.name),
	tex: f.tex ? tex(f.tex, true) : '',
	def: f.def ? inline(f.def) : '',
	symbols: symbolsHtml(f),
	note: f.note ? inline(f.note) : '',
});

/** Chapter title for a docs entry: the sidebar label if set, else the title. */
export const chapterLabel = (entry: CollectionEntry<'docs'>) => entry.data.sidebar?.label ?? entry.data.title;
