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

/** Steps a chapter has: every chapter has a model, a derivation and questions; «задачи» only with a trainer. */
export const needOf = (hasTrainer: boolean): Step[] => (hasTrainer ? ['m', 'd', 'q', 't'] : ['m', 'd', 'q']);

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
