// Reads the chapter page for «Полный экран»: a model's «Что попробовать» tasks and «Что должно было получиться»
// answers. Nothing on the page is changed; copies are made for the view.

const SKIP = 'script, style, template, link, [data-igf]';

/** The ancestor of `el` that is a direct child of the chapter's text. */
const topOf = (el: Element): Element | null => {
	let top: Element = el;
	while (top.parentElement && !top.parentElement.classList.contains('sl-markdown-content')) top = top.parentElement;
	return top.parentElement ? top : null;
};

const isHeading = (e: Element) => e.matches('.sl-heading-wrapper, h1, h2, h3, h4');
const hasModel = (e: Element) => e.matches('figure.not-content') || !!e.querySelector('figure.not-content');

export interface ModelTasks {
	/** the <ol> of «Что попробовать» on the page */
	tasks: HTMLOListElement | null;
	/** the <details> «Что должно было получиться» on the page */
	answers: HTMLDetailsElement | null;
}

/** The tasks and answers that follow a model, up to the next heading or model. */
export const tasksOf = (fig: Element): ModelTasks => {
	const r: ModelTasks = { tasks: null, answers: null };
	const top = topOf(fig);
	if (!top) return r;
	for (let e = top.nextElementSibling; e; e = e.nextElementSibling) {
		if (e.matches(SKIP)) continue;
		if (isHeading(e) || hasModel(e)) break;
		if (e.tagName === 'P' && e.firstElementChild?.tagName === 'STRONG' && e.textContent?.trim() === 'Что попробовать') {
			const ol = e.nextElementSibling;
			if (ol?.tagName === 'OL') r.tasks = ol as HTMLOListElement;
		}
		if (e.tagName === 'DETAILS' && /Что должно было получиться/.test(e.querySelector('summary')?.textContent ?? '')) {
			if (r.tasks) r.answers = e as HTMLDetailsElement;
			break;
		}
	}
	return r;
};

/** A copy for a view: no ids, no hidden templates, no inline handlers carried over. */
export const copyOf = <T extends Element>(el: T): T => {
	const c = el.cloneNode(true) as T;
	for (const x of [c, ...c.querySelectorAll('[id]')]) x.removeAttribute('id');
	for (const t of c.querySelectorAll('template, script, style')) {
		// a <More> note keeps its body in the template right after the word: keep it for the popover, drop the rest
		if (!(t.tagName === 'TEMPLATE' && (t as HTMLElement).previousElementSibling?.hasAttribute('data-more'))) t.remove();
	}
	return c;
};

/** The content of a <details> without its <summary>, as a fragment of copies. */
export const bodyOf = (d: HTMLDetailsElement): DocumentFragment => {
	const f = document.createDocumentFragment();
	for (const ch of d.children) if (ch.tagName !== 'SUMMARY') f.append(copyOf(ch));
	return f;
};
