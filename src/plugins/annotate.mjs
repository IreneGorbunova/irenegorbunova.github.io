// Marks quantities and units inside a TeX formula so that they can open a note (MoreSetup.astro):
//   a symbol from the chapter's glossary  → \htmlData{g=<index>}{…}
//   a unit from src/data/units.mjs         → \htmlData{u=<key>}{…}
// Only chapters with a `glossary:` in the frontmatter are annotated.
import { UNIT_BY_TEX } from '../data/units.mjs';

/** Symbol key as written in the glossary: no \text/\mathrm, braces or spaces. Q_{\text{в}} → Q_в. */
export const symKey = (/** @type {string} */ s) =>
	s
		.replace(/\\(text|mathrm|textit|mathit)\s*/g, '')
		.replace(/[{}\s]/g, '');

const GREEK = new Set([
	'alpha', 'beta', 'gamma', 'delta', 'varepsilon', 'epsilon', 'eta', 'theta', 'lambda', 'mu', 'nu', 'rho', 'sigma', 'tau',
	'varphi', 'phi', 'omega', 'upsilon', 'Delta', 'Phi', 'Omega',
]);
// Commands whose braced argument is not math: copied as is (a \text{…} that is a unit gets marked).
const TEXTISH = new Set(['text', 'mathrm', 'operatorname', 'begin', 'end', 'textit', 'mathit', 'textbf', 'htmlData', 'htmlClass']);

/** Index of the brace closing the one at `open`. */
const closing = (/** @type {string} */ s, /** @type {number} */ open) => {
	let depth = 0;
	for (let i = open; i < s.length; i++) {
		if (s[i] === '\\') {
			i++;
			continue;
		}
		if (s[i] === '{') depth++;
		else if (s[i] === '}' && --depth === 0) return i;
	}
	return s.length - 1;
};

const DEG = /^(\{\}\s*)?\^\s*(\\circ|\{\\circ\})\s*\\text\s*\{C\}/;

/**
 * @param {string} tex
 * @param {Map<string, number>} gloss symbol key → index in the glossary
 */
export const annotate = (tex, gloss) => {
	let out = '';
	let i = 0;
	const sym = (/** @type {number} */ start, /** @type {number} */ afterBase) => {
		// optional subscript: _x, _\cmd or _{…}
		let j = afterBase;
		while (tex[j] === ' ') j++;
		if (tex[j] === '_') {
			let k = j + 1;
			while (tex[k] === ' ') k++;
			if (tex[k] === '{') k = closing(tex, k) + 1;
			else if (tex[k] === '\\') {
				const m = /^\\[A-Za-z]+/.exec(tex.slice(k));
				k += m ? m[0].length : 2;
			} else k += 1;
			j = k;
		} else j = afterBase;
		const token = tex.slice(start, j);
		const id = gloss.get(symKey(token));
		out += id === undefined ? token : `\\htmlData{g=${id}}{${token}}`;
		i = j;
	};
	while (i < tex.length) {
		const rest = tex.slice(i);
		const deg = DEG.exec(rest);
		if (deg) {
			out += `\\htmlData{u=C}{${deg[0]}}`;
			i += deg[0].length;
			continue;
		}
		const c = tex[i];
		if (c === '\\') {
			const m = /^\\([A-Za-z]+|.)/.exec(rest);
			const name = m ? m[1] : '';
			if (TEXTISH.has(name)) {
				let k = i + 1 + name.length;
				while (tex[k] === ' ') k++;
				if (tex[k] !== '{') {
					out += tex.slice(i, k);
					i = k;
					continue;
				}
				const end = closing(tex, k);
				let stop = end + 1;
				let unit;
				if (name === 'text') {
					const word = tex.slice(k + 1, end).trim();
					// a power right after the unit belongs to it: \text{м}^3 is «м³», not «м»
					const pow = /^\^\{?([23])\}?/.exec(tex.slice(stop));
					const powered = pow && UNIT_BY_TEX[word + (pow[1] === '2' ? '²' : '³')];
					if (powered) {
						unit = powered;
						stop += pow[0].length;
					} else unit = pow ? undefined : UNIT_BY_TEX[word];
				}
				const whole = tex.slice(i, stop);
				out += unit ? `\\htmlData{u=${unit}}{${whole}}` : whole;
				i = stop;
				continue;
			}
			if (GREEK.has(name)) {
				let end = i + 1 + name.length;
				// \Delta t, \Delta E_{…}: the change of a quantity is one symbol
				if (name === 'Delta') {
					let k = end;
					while (tex[k] === ' ') k++;
					const next = /^(\\[A-Za-z]+|[A-Za-z])/.exec(tex.slice(k));
					if (next && (next[1].length === 1 || GREEK.has(next[1].slice(1)))) end = k + next[1].length;
				}
				sym(i, end);
				continue;
			}
			out += m ? m[0] : c;
			i += m ? m[0].length : 1;
			continue;
		}
		if (/[A-Za-z]/.test(c)) {
			sym(i, i + 1);
			continue;
		}
		out += c;
		i++;
	}
	return out;
};
