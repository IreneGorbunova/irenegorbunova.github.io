// Problems with changing numbers («Решите сами»). A template draws its numbers from grids, so a problem
// always has round inputs; the answer is checked with a tolerance, and typical mistakes («ловушки») get
// their own explanation. Plain JS so that scripts/check-problems.mjs runs it under bare Node.
//
// Template:
//   id       stable id
//   params   { name: { from, to, step } | { of: [ ... ] } }
//   derive   (v) => ({ ...extra values }), optional: values shown in the text that are computed and rounded
//   valid    (v) => boolean, optional: physically sensible combinations only
//   text     (v) => string, the problem; inline math in $…$
//   answer   (v) => number, in the unit of `unit`
//   unit     unit printed after the answer field
//   sig      significant digits of the shown answer (default 3); dec: decimals instead of sig
//   tol      relative tolerance (default 0.025); tolAbs: absolute tolerance instead
//   traps    [{ value: (v) => number | null, why: string }], null = trap does not apply
//   solution (v) => [string | { tex }], steps; the last step ends with the answer
//   note     (v) => string, optional: shown after a right answer

/** Mulberry32: a small seeded generator, the same numbers for the same seed. */
export const rng = (/** @type {number} */ seed) => {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

const decimalsOf = (/** @type {number} */ x) => {
	const s = String(x);
	return s.includes('.') ? s.length - s.indexOf('.') - 1 : 0;
};

/** All values of a parameter. */
export const values = (/** @type {any} */ spec) => {
	if (spec.of) return spec.of;
	const d = decimalsOf(spec.step);
	const n = Math.round((spec.to - spec.from) / spec.step);
	return Array.from({ length: n + 1 }, (_, k) => Number((spec.from + k * spec.step).toFixed(d)));
};

/** Rounds to `sig` significant digits (or to `dec` decimals) without float noise. */
export const round = (/** @type {number} */ x, /** @type {{ sig?: number, dec?: number }} */ o = {}) => {
	if (!Number.isFinite(x) || x === 0) return x;
	if (o.dec !== undefined) return Number(x.toFixed(o.dec));
	return Number(x.toPrecision(o.sig ?? 3));
};

const group = (/** @type {string} */ int, /** @type {string} */ sep) =>
	int.length > 4 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : int;

/** A number for text: decimal comma, a space between thousands from 10 000 on. */
export const n = (/** @type {number} */ x, /** @type {{ sig?: number, dec?: number }} */ o = {}) => {
	const r = round(x, o);
	const s = String(Math.abs(r)).includes('e') ? Math.abs(r).toFixed(12).replace(/0+$/, '') : String(Math.abs(r));
	const [int, frac] = s.split('.');
	return (r < 0 ? '−' : '') + group(int, '\u00a0') + (frac ? ',' + frac : '');
};

/** The same number for KaTeX: 0{,}5 and 42\,000. */
export const t = (/** @type {number} */ x, /** @type {{ sig?: number, dec?: number }} */ o = {}) =>
	n(x, o).replace(',', '{,}').replace(/\u00a0/g, '\\,').replace('−', '-');

/** Draws one problem; retries until `valid` holds and every trap is clearly away from the answer. */
export const generate = (/** @type {any} */ tpl, /** @type {number} */ seed, tries = 60) => {
	const rand = rng(seed);
	for (let k = 0; k < tries; k++) {
		/** @type {Record<string, any>} */
		const v = {};
		for (const [name, spec] of Object.entries(tpl.params)) {
			const all = values(spec);
			v[name] = all[Math.floor(rand() * all.length)];
		}
		Object.assign(v, tpl.derive ? tpl.derive(v) : {});
		if (tpl.valid && !tpl.valid(v)) continue;
		const a = tpl.answer(v);
		if (!Number.isFinite(a)) continue;
		const clash = (tpl.traps ?? []).some((/** @type {any} */ tr) => {
			const x = tr.value(v);
			return x !== null && Math.abs(x - a) <= 2 * margin(tpl, a);
		});
		if (clash) continue;
		return { v, answer: a };
	}
	return null;
};

/** How far from the answer a reply may be. */
export const margin = (/** @type {any} */ tpl, /** @type {number} */ a) =>
	tpl.tolAbs ?? (tpl.tol ?? 0.025) * Math.abs(a);

/** The shown answer, rounded as the template says. */
export const shown = (/** @type {any} */ tpl, /** @type {number} */ a) =>
	tpl.dec !== undefined ? round(a, { dec: tpl.dec }) : round(a, { sig: tpl.sig ?? 3 });

/** Reads a reply: «2,5», «2.5 Н», «42 000», «6,72·10^5», «6.72e5». Returns null if it is not a number. */
export const parse = (/** @type {string} */ s) => {
	const x = s
		.trim()
		.replace(/[\s  ]/g, '')
		.replace(/[−–]/g, '-')
		.replace(/,/g, '.');
	const m = x.match(/^([-+]?(?:\d+\.?\d*|\.\d+))(?:[*·×x]10\^?\(?([-+]?\d+)\)?|[eE]([-+]?\d+))?(\D*)$/);
	if (!m || /\d/.test(m[4])) return null;
	const exp = m[2] ?? m[3];
	return Number(m[1]) * (exp ? 10 ** Number(exp) : 1);
};

/**
 * Judges a reply.
 * @returns {{ ok: true } | { ok: false, why?: string, scale?: boolean }}
 */
export const judge = (/** @type {any} */ tpl, /** @type {any} */ inst, /** @type {number} */ x) => {
	const a = inst.answer;
	const d = margin(tpl, a);
	if (Math.abs(x - a) <= d) return { ok: true };
	for (const tr of tpl.traps ?? []) {
		const y = tr.value(inst.v);
		if (y !== null && Math.abs(x - y) <= margin(tpl, y)) return { ok: false, why: tr.why };
	}
	if (!tpl.tolAbs) {
		for (const f of [1e3, 1e-3, 1e6, 1e-6, 100, 0.01]) {
			if (Math.abs(x - a * f) <= margin(tpl, a * f)) return { ok: false, scale: true };
		}
	}
	return { ok: false };
};
