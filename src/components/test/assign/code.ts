// «Задание классу»: the assignment in the link, the pupil's variant and the result code (pilot, 14 Nov 2026).
// Pure functions, no DOM, so Node runs them for tests. Only erasable TypeScript syntax.
//
// Link:   …/uchebnik/test/zadanie/#a=<topic>-<count>-<id>      e.g. #a=kt-6-K7MX3PAD
// Variant: a number 1…99 999 drawn once per device and assignment; task i is drawn by the trainer's own engine
//          (generate) from a seed hashed from the assignment id, the variant and i.
// Code:   10 characters «XXXXX-XXXXX» from an alphabet without look-alikes: 6 for the variant and the right/wrong
//          marks of the tasks, 3 for a checksum keyed by the assignment, 1 to catch typos. The checksum lives in this
//          script, so the code suits homework, not graded tests.

/** No 0/O/D-like, 1/I/L, 2/Z, 5/S, 8/B-only pairs, U/V: letters and digits that are hard to confuse when copied. */
export const ALPHABET = '346789ACDEFHJKMNPRTWXY';
const B = ALPHABET.length; // 22
const SALT = 'ig-zadanie-1';
export const VARIANTS = 99_999;
export const MIN_TASKS = 3;
export const MAX_TASKS = 10;

/** 32-bit FNV-1a with a final avalanche (murmur3 fmix). */
export const hash32 = (s: string): number => {
	let h = 0x811c9dc5;
	for (const ch of s) {
		h ^= ch.codePointAt(0) as number;
		h = Math.imul(h, 0x01000193);
	}
	h ^= h >>> 16;
	h = Math.imul(h, 0x85ebca6b);
	h ^= h >>> 13;
	h = Math.imul(h, 0xc2b2ae35);
	h ^= h >>> 16;
	return h >>> 0;
};

const enc = (n: number, len: number): string => {
	let s = '';
	for (let i = 0; i < len; i++) {
		s = ALPHABET[n % B] + s;
		n = Math.floor(n / B);
	}
	return s;
};
const dec = (s: string): number => [...s].reduce((a, c) => a * B + ALPHABET.indexOf(c), 0);

export interface Assignment {
	topic: string;
	count: number;
	id: string;
}

/** A new assignment id: 8 characters, about 5·10^10 possibilities. */
export const newId = (rand: (n: number) => number): string => Array.from({ length: 8 }, () => ALPHABET[rand(B)]).join('');

export const toHash = (a: Assignment): string => `a=${a.topic}-${a.count}-${a.id}`;

/** Reads `#a=…`; null when the fragment is not a well-formed assignment. */
export const fromHash = (hash: string): Assignment | null => {
	const m = /^#?a=([a-z]{1,8})-(\d{1,2})-([A-Z0-9]{8})$/.exec(hash.trim());
	if (!m) return null;
	const count = Number(m[2]);
	if (count < MIN_TASKS || count > MAX_TASKS) return null;
	if ([...m[3]].some((c) => !ALPHABET.includes(c))) return null;
	return { topic: m[1], count, id: m[3] };
};

/** The seed of task `i` of variant `v` (k counts retries if a template could not draw a problem). */
export const taskSeed = (a: Assignment, v: number, i: number, k = 0): number => hash32(`${a.id}|${v}|${i}|${k}`);

const mac = (a: Assignment, payload: number): number => hash32(`${SALT}|${a.topic}|${a.count}|${a.id}|${payload}`) % B ** 3;
const check = (body: string): string => ALPHABET[hash32(`${SALT}|check|${body}`) % B];

/** The result code of variant `v`; bit i of `right` is set when task i was solved. */
export const makeCode = (a: Assignment, v: number, right: number): string => {
	const payload = v * 1024 + right;
	const body = enc(payload, 6) + enc(mac(a, payload), 3);
	const s = body + check(body);
	return `${s.slice(0, 5)}-${s.slice(5)}`;
};

/** Russian letters that look like Latin ones, as typed on a Russian keyboard. */
const CYR: Record<string, string> = { А: 'A', В: 'B', С: 'C', Е: 'E', Н: 'H', К: 'K', М: 'M', Р: 'P', Т: 'T', Х: 'X', У: 'Y' };

/** Upper case, Russian look-alikes made Latin, spaces and dashes dropped. */
export const normalize = (raw: string): string =>
	raw
		.toUpperCase()
		.replace(/[\s\-–—]/g, '')
		.replace(/[АВСЕНКМРТХУ]/g, (c) => CYR[c]);

export type CodeCheck =
	| { status: 'ok'; v: number; right: number; score: number }
	| { status: 'typo' }
	| { status: 'foreign' };

/** Checks a code against an assignment: a typo, a code of another assignment (or changed by hand), or valid. */
export const readCode = (raw: string, a: Assignment): CodeCheck => {
	const s = normalize(raw);
	if (s.length !== 10 || [...s].some((c) => !ALPHABET.includes(c))) return { status: 'typo' };
	const body = s.slice(0, 9);
	if (check(body) !== s[9]) return { status: 'typo' };
	const payload = dec(body.slice(0, 6));
	const v = Math.floor(payload / 1024);
	const right = payload % 1024;
	if (dec(body.slice(6)) !== mac(a, payload) || v < 1 || v > VARIANTS || right >= 2 ** a.count) return { status: 'foreign' };
	let score = 0;
	for (let i = 0; i < a.count; i++) if (right & (1 << i)) score++;
	return { status: 'ok', v, right, score };
};

/** A pasted line «Иванов Петя: K7MX3-PAD4C» → the name and the code; the code is the last 10 code characters. */
export const splitLine = (line: string): { name: string; code: string } | null => {
	const ch = '[0-9A-Za-zАВСЕНКМРТХУавсенкмртху]';
	const m = new RegExp(`(?:^|[\\s:;,.—–-])(${ch}{5}[\\s-]?${ch}{5})\\s*$`).exec(line.trim());
	if (!m) return null;
	const name = line
		.trim()
		.slice(0, line.trim().length - m[1].length)
		.replace(/[\s:;,.—–-]+$/, '')
		.trim();
	return { name, code: m[1] };
};
