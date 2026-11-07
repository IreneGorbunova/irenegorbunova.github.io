/**
 * The rays of a chapter's star and where they are kept. A ray lights once the student has done the thing:
 * m — moved a model, d — went through a derivation to the end, q — answered a question,
 * t — solved three problems in «Решите сами» (only in chapters that have it).
 * localStorage['ig:sky'] = { "<entry id>": "mdq" } — the lit rays; nothing leaves the browser.
 */
export const KEY = 'ig:sky';
export const RAYS = ['m', 'd', 'q', 't'] as const;
export type Ray = (typeof RAYS)[number];
export const LABEL: Record<Ray, string> = { m: 'модель', d: 'вывод', q: 'вопрос', t: 'задачи' };
export const TRAINER_GOAL = 3;

/** Rays a chapter has: every chapter has a model, a derivation and questions; «задачи» only with a trainer. */
export const needOf = (hasTrainer: boolean): Ray[] => (hasTrainer ? ['m', 'd', 'q', 't'] : ['m', 'd', 'q']);

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
		/* storage off: the star still lights on this page, it just is not remembered */
	}
};

/**
 * SVG of a star with the given rays (centre at 0,0). Rays are spread evenly from the top;
 * a four-ray star is a sparkle with longer vertical rays.
 */
export const starSvg = (need: readonly Ray[], r = 17) => {
	const n = need.length;
	const rays = need
		.map((ray, i) => {
			const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
			const len = n === 4 && i % 2 ? r * 0.72 : r;
			const x1 = (Math.cos(a) * r * 0.3).toFixed(2);
			const y1 = (Math.sin(a) * r * 0.3).toFixed(2);
			const x2 = (Math.cos(a) * len).toFixed(2);
			const y2 = (Math.sin(a) * len).toFixed(2);
			return `<line class="ray" data-ray="${ray}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
		})
		.join('');
	return `${rays}<circle class="core" r="${(r * 0.2).toFixed(2)}"/>`;
};
