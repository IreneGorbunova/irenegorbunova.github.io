// Leitner boxes for the formula cards. A card is new until first answered; «Помню» moves it one box up,
// «Не помню» back to box 1. The box sets the days until the card is due again.
// State lives only in this browser: localStorage['ig:cards'] = { "<card key>": { box, due: "YYYY-MM-DD" } }.

export const KEY = 'ig:cards';
export const INTERVALS = [1, 2, 4, 8, 16];

const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD. */
export const today = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** YYYY-MM-DD plus n days (calendar arithmetic in UTC, so no daylight-saving drift). */
export const addDays = (/** @type {string} */ day, /** @type {number} */ n) => {
	const [y, m, d] = day.split('-').map(Number);
	const t = new Date(Date.UTC(y, m - 1, d + n));
	return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};

/**
 * New state of a card after an answer.
 * @param {{ box: number, due: string } | undefined} state
 * @param {boolean} remembered
 * @param {string} day
 */
export const answer = (state, remembered, day) => {
	const box = remembered ? Math.min((state?.box ?? 1) + 1, INTERVALS.length) : 1;
	return { box, due: addDays(day, INTERVALS[box - 1]) };
};

/** @param {{ due: string } | undefined} state @param {string} day */
export const isDue = (state, day) => Boolean(state) && /** @type {{ due: string }} */ (state).due <= day;

/**
 * Cards to show in a session: due ones first (oldest first), then new ones, then the rest by due date.
 * @param {string[]} keys
 * @param {Record<string, { box: number, due: string }>} states
 * @param {string} day
 */
export const order = (keys, states, day) => {
	const rank = (/** @type {string} */ k) => (isDue(states[k], day) ? 0 : states[k] ? 2 : 1);
	return keys
		.map((k, i) => ({ k, i }))
		.sort((a, b) => {
			const r = rank(a.k) - rank(b.k);
			if (r) return r;
			const da = states[a.k]?.due ?? '';
			const db = states[b.k]?.due ?? '';
			return da < db ? -1 : da > db ? 1 : a.i - b.i;
		})
		.map((x) => x.k);
};

/** @returns {Record<string, { box: number, due: string }>} */
export const load = () => {
	try {
		const raw = localStorage.getItem(KEY);
		const data = raw ? JSON.parse(raw) : {};
		return data && typeof data === 'object' ? data : {};
	} catch {
		return {};
	}
};

/** @param {Record<string, { box: number, due: string }>} states */
export const save = (states) => {
	try {
		localStorage.setItem(KEY, JSON.stringify(states));
	} catch {
		/* private mode or storage off: the cards still work, they just are not remembered */
	}
};
