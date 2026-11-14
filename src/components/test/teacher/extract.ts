// Reads the chapter page for the teacher's kit: a model's «Что попробовать» tasks and «Что должно было получиться»
// answers, and the «Проверьте себя» questions. Nothing on the page is changed; copies are made for the views.

const SKIP = 'script, style, template, link, [data-igk]';

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

export type Question =
	| { kind: 'choice'; question: Element; options: Element[]; answer: number; explain: HTMLDetailsElement | null }
	| { kind: 'open'; question: Element; explain: HTMLDetailsElement };

/** The «Проверьте себя» questions: a choice with buttons (QuizChoice) or a question in a <details>. */
export const checkQuestions = (): Question[] => {
	const h = document.getElementById('проверьте-себя');
	const start = h ? topOf(h) : null;
	const out: Question[] = [];
	if (!start) return out;
	for (let e = start.nextElementSibling; e; e = e.nextElementSibling) {
		if (e.matches(SKIP)) continue;
		if (isHeading(e)) break;
		const opts = [...e.querySelectorAll('[role="group"] button')];
		const q = e.querySelector(':scope > p');
		if (opts.length && q && e instanceof HTMLElement) {
			out.push({
				kind: 'choice',
				question: q,
				options: opts.map((b) => b.querySelector('span:not([aria-hidden])') ?? b),
				answer: Number(e.dataset.answer ?? -1),
				explain: e.querySelector('details'),
			});
		} else if (e.tagName === 'DETAILS') {
			const s = e.querySelector('summary');
			if (s) out.push({ kind: 'open', question: s, explain: e as HTMLDetailsElement });
		}
	}
	return out;
};
