/**
 * «Сначала предскажите, потом проверьте» in the browser (test mode only; Predict.astro calls mount() per block).
 * States of a block: ask (no choice; the model below is veiled unless skipped) → chosen (the choice is fixed and
 * marked, the block says what to do in the model) → verdict (shown when the model reports the checking action, or
 * after «Я проверил(а)» for a question without a trigger). Everything survives a reload (store.ts).
 */
import { read, write, type Entry } from './store';
import { TRIGGERS, type Check } from './triggers';

const PASS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK']);

/** The model the block stands before: the next element sibling, past scripts and other test-mode blocks. */
const modelAfter = (root: HTMLElement): HTMLElement | null => {
	let el = root.nextElementSibling;
	while (el && (PASS.has(el.tagName) || el.hasAttribute('data-ig-test'))) el = el.nextElementSibling;
	return el instanceof HTMLElement && el.matches('figure') ? el : null;
};

export function mount(root: HTMLElement) {
	const id = root.dataset.predict!;
	const answer = Number(root.dataset.answer);
	const $ = <T extends Element>(s: string) => root.querySelector<T>(s)!;
	const opts = [...root.querySelectorAll<HTMLButtonElement>('[data-opt]')];
	const say = $<HTMLElement>('[data-say]');
	const foot = $<HTMLElement>('[data-foot]');
	const doneBtn = $<HTMLButtonElement>('[data-done]');
	const againBtn = $<HTMLButtonElement>('[data-again]');
	const veil = $<HTMLElement>('[data-veil]');
	const skipBtn = $<HTMLButtonElement>('[data-skip]');
	const pill = $<HTMLButtonElement>('[data-pill]');
	const tpl = (name: string) => $<HTMLTemplateElement>(`template[data-t="${name}"]`).content.cloneNode(true);
	const model = modelAfter(root);
	const gate = root.dataset.gate === '1' && model !== null;
	const factory = TRIGGERS[root.dataset.trigger ?? ''];
	const check: Check | null = factory ? factory() : null;

	let st: Entry = read(id);
	const chosen = () => (typeof st.c === 'number' && st.c >= 0 && st.c < opts.length ? st.c : null);
	let shown = ''; // what the live region holds now, so that it is only rewritten (and announced) on a change

	const save = (next: Entry) => {
		st = next;
		write(id, st);
		paint();
	};

	const paint = () => {
		const c = chosen();
		const verdict = c !== null && st.v === 1;
		root.classList.toggle('is-locked', c !== null);
		opts.forEach((b, i) => {
			const outcome = verdict && i === answer && c !== answer;
			b.classList.toggle('is-chosen', i === c);
			b.classList.toggle('is-outcome', outcome);
			b.setAttribute('aria-pressed', String(i === c));
			b.setAttribute('aria-disabled', String(c !== null));
			b.querySelector('[data-tag]')!.textContent = i === c ? 'Ваш прогноз' : outcome ? 'Так получилось' : '';
		});
		const want = c === null ? '' : verdict ? `v${c}` : 'check';
		if (want !== shown) {
			shown = want;
			if (want) say.replaceChildren(tpl(want));
			else say.replaceChildren();
		}
		foot.hidden = c === null;
		doneBtn.hidden = !(c !== null && !verdict && !check);
		veil.hidden = !(gate && c === null && st.s !== 1);
		if (!verdict) pill.hidden = true;
		place();
	};

	// ---------- the veil over the model (a soft gate) ----------
	const place = () => {
		if (veil.hidden || !model) return;
		// another feature may move the model elsewhere (t3's presentation view): then there is nothing to cover
		const here = model.isConnected && model.parentElement === root.parentElement;
		veil.style.display = here ? '' : 'none';
		if (!here) return;
		const r = root.getBoundingClientRect();
		const m = model.getBoundingClientRect();
		// absolute offsets count from the padding box: take off the block's border
		veil.style.top = `${m.top - r.top - root.clientTop}px`;
		veil.style.left = `${m.left - r.left - root.clientLeft}px`;
		veil.style.width = `${m.width}px`;
		veil.style.height = `${m.height}px`;
		veil.style.borderRadius = getComputedStyle(model).borderRadius;
	};
	if (model) {
		const ro = new ResizeObserver(place);
		ro.observe(root);
		ro.observe(model);
		if (root.parentElement) new MutationObserver(place).observe(root.parentElement, { childList: true });
		addEventListener('resize', place);
	}

	// ---------- the pupil ----------
	opts.forEach((b, i) =>
		b.addEventListener('click', () => {
			if (chosen() !== null) return;
			save({ c: i });
		}),
	);
	skipBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		save({ ...st, s: 1 });
		model?.querySelector<HTMLElement>('button, input, select, [tabindex]')?.focus({ preventScroll: true });
	});
	veil.addEventListener('click', () => {
		root.scrollIntoView({ behavior: 'smooth', block: 'start' });
		opts[0]?.focus({ preventScroll: true });
	});
	againBtn.addEventListener('click', () => {
		save({});
		opts[0]?.focus();
	});

	// ---------- the verdict ----------
	const verdict = () => {
		if (chosen() === null || st.v === 1) return;
		save({ ...st, v: 1 });
		// the pupil is looking at the model below: if the verdict is off screen, a small pill leads to it
		const r = say.getBoundingClientRect();
		if (r.bottom < 0 || r.top > innerHeight) {
			pill.hidden = false;
			clearTimeout(pillTimer);
			pillTimer = window.setTimeout(() => (pill.hidden = true), 12000);
		}
	};
	let pillTimer = 0;
	pill.addEventListener('click', () => {
		pill.hidden = true;
		say.scrollIntoView({ behavior: 'smooth', block: 'center' });
	});
	new IntersectionObserver((es) => {
		if (es.some((e) => e.isIntersecting)) pill.hidden = true;
	}).observe(say);

	// The model reports its state (a non-visual hook in the model); every report goes to the trigger, so that it can
	// remember earlier states, but only a fixed prediction gets a verdict.
	if (model && check) model.addEventListener('ig:model-state', (e) => check((e as CustomEvent).detail) && verdict());
	doneBtn.addEventListener('click', verdict);

	paint();
}
