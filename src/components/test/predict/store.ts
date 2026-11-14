/**
 * The pupil's predictions on this device: localStorage['ig:predict'] = { [question id]: Entry }.
 * c: the chosen option; v: 1 once the verdict has been shown; s: 1 when the veil was skipped without a prediction.
 */
export const KEY = 'ig:predict';
export type Entry = { c?: number; v?: 1; s?: 1 };

const all = (): Record<string, Entry> => {
	try {
		const o = JSON.parse(localStorage.getItem(KEY) ?? '{}');
		return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
	} catch {
		return {};
	}
};

export const read = (id: string): Entry => {
	const e = all()[id];
	return e && typeof e === 'object' ? e : {};
};

export const write = (id: string, e: Entry) => {
	try {
		const o = all();
		if (Object.keys(e).length) o[id] = e;
		else delete o[id];
		localStorage.setItem(KEY, JSON.stringify(o));
	} catch {
		/* storage off: the block still works until the page is left */
	}
};
