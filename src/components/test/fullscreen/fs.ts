// «Полный экран» (test mode): a button above every model of a chapter opens that model on the whole screen
// (./view.ts). A model is a figure of the chapter's text with real controls: a button, a slider, a field. Pictures
// whose only button is «Повторить» and the notes of <More> do not count; opening scenes and figures inside a
// solution (<details>) are left alone. Everything added carries data-ig-test, so it disappears with test mode; the
// chapter's own markup is not changed.

import './fs.css';
import { present } from './view';

const ICON =
	'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';

const CONTROLS = 'button:not([data-again]), input, select, textarea, [role="slider"], [tabindex="0"]:not(.ig-more, [data-note])';

/** The models of the page, in order. */
export const models = (): HTMLElement[] =>
	[...document.querySelectorAll<HTMLElement>('.sl-markdown-content figure')].filter(
		(f) => !f.parentElement?.closest('figure') && !f.closest('.intro, details, [data-igf]') && f.querySelector(CONTROLS),
	);

/** What the view is called: the section the model stands in («Проверим на модели» says nothing, so its section). */
const nameOf = (fig: HTMLElement): string => {
	let name = '';
	for (const h of document.querySelectorAll<HTMLElement>('.sl-markdown-content :is(h2, h3)')) {
		if (!(h.compareDocumentPosition(fig) & Node.DOCUMENT_POSITION_FOLLOWING)) break;
		const t = h.textContent?.trim() ?? '';
		if (h.tagName === 'H2' || !/^Проверим на модели$/.test(t)) name = t;
	}
	return name || document.querySelector('h1')?.textContent?.trim() || 'Модель';
};

export interface ModelBar {
	fig: HTMLElement;
	bar: HTMLElement;
}
let made: ModelBar[] | null = null;

/** The bar above every model: its mark «сделать» and the button «Полный экран». Made once, whoever asks first. */
export const modelBars = (): ModelBar[] => {
	if (made) return made;
	made = models().map((fig) => {
		const bar = document.createElement('div');
		bar.className = 'igf-bar not-content';
		bar.dataset.igTest = '';
		bar.dataset.pagefindIgnore = '';
		bar.dataset.igf = '';
		// the mark of the block: a model is something to do (the four marks: ../chapter/ChapterCard.astro)
		const mark = document.createElement('span');
		mark.className = 'igm';
		mark.dataset.igm = 'do';
		mark.textContent = 'сделать';
		const b = document.createElement('button');
		b.type = 'button';
		b.className = 'igf-open';
		b.innerHTML = `${ICON}<span>Полный экран</span>`;
		b.addEventListener('click', () => present(fig, nameOf(fig), b));
		bar.append(mark, b);
		fig.before(bar);
		return { fig, bar };
	});
	return made;
};

export const start = () => {
	if (document.documentElement.dataset.igTestmode !== '1') return;
	modelBars();
};
