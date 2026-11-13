/**
 * What a student has done in a chapter, for «Моё небо». A step counts once the student has done the thing:
 * m — moved a model, d — went through a derivation to the end, q — answered a question,
 * t — solved three problems in «Решите сами» (only in chapters that have it).
 * localStorage['ig:sky'] = { "<entry id>": "mdq" } — the steps done; nothing leaves the browser.
 * The chapter's stars in its section's constellation light in proportion (constellations.ts).
 */
export const KEY = 'ig:sky';
export const STEPS = ['m', 'd', 'q', 't'] as const;
export type Step = (typeof STEPS)[number];
export const LABEL: Record<Step, string> = { m: 'модель', d: 'вывод', q: 'вопрос', t: 'задачи' };
export const TRAINER_GOAL = 3;
/** What each step means: the note that opens on the step's word under a chapter title (Irina, 13 Nov 2026). */
export const HINT: Record<Step, string> = {
	m: 'Звезда загорится, когда вы поработаете с любой моделью главы: нажмёте кнопку, сдвинете ползунок или перетащите что-нибудь.',
	d: 'Это блок, где формула выводится или задача решается по шагам, с кнопкой «Следующий шаг». Звезда загорится, когда вы дойдёте в нём до последнего шага.',
	q: 'Звезда загорится, когда вы правильно ответите на любой вопрос с выбором ответа, например в разделе «Проверьте себя».',
	t: 'Звезда загорится, когда вы решите три задачи в разделе «Решите сами».',
};

/** Steps a chapter has: always a model; a derivation and questions where the page has them (steps.ts); «задачи» only with a trainer. */
export const needOf = (hasTrainer: boolean, hasDerivation = true, hasQuiz = true): Step[] => [
	'm',
	...(hasDerivation ? (['d'] as const) : []),
	...(hasQuiz ? (['q'] as const) : []),
	...(hasTrainer ? (['t'] as const) : []),
];

export const load = (): Record<string, string> => {
	try {
		const data = JSON.parse(localStorage.getItem(KEY) ?? '{}');
		return data && typeof data === 'object' ? data : {};
	} catch {
		return {};
	}
};

export const save = (data: Record<string, string>) => {
	try {
		localStorage.setItem(KEY, JSON.stringify(data));
	} catch {
		/* storage off: the stars still light on this page, they just are not remembered */
	}
};
