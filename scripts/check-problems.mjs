// Checks every «Решите сами» template over many draws: node scripts/check-problems.mjs [samples per template]
// Fails if a template cannot draw a problem, prints NaN/undefined, gives a non-finite or non-positive answer,
// lets a trap come within the tolerance of the answer, has TeX that KaTeX cannot parse, or ends its solution
// with a number other than the answer.
// Prints a few drawn problems with their answers so they can be recomputed by hand or in Python.
import katex from 'katex';
import { generate, margin, shown, t } from '../src/components/trainer/engine.mjs';
import { PROBLEMS } from '../src/data/problems/index.mjs';

const SEEDS = 5000;
const SHOW = Number(process.argv[2] ?? 3);
let bad = 0;
const fail = (/** @type {string} */ msg) => {
	bad += 1;
	if (bad <= 40) console.log('  FAIL', msg);
};

for (const [slug, load] of Object.entries(PROBLEMS)) {
	const templates = (await load()).default;
	const ids = new Set();
	console.log(`\n${slug}: ${templates.length} templates`);
	for (const tpl of templates) {
		if (ids.has(tpl.id)) fail(`${slug}: duplicate id ${tpl.id}`);
		ids.add(tpl.id);
		const seen = new Set();
		let none = 0;
		const samples = [];
		for (let seed = 1; seed <= SEEDS; seed++) {
			const inst = generate(tpl, seed);
			if (!inst) {
				none += 1;
				continue;
			}
			const { v, answer } = inst;
			const where = `${slug}/${tpl.id} seed ${seed}`;
			const text = tpl.text(v);
			const steps = tpl.solution(v);
			const note = tpl.note ? tpl.note(v) : '';
			const all = [text, note, ...steps.map((s) => (typeof s === 'string' ? s : s.tex))].join(' ');
			if (/NaN|undefined|Infinity|\[object/.test(all)) fail(`${where}: bad text ${all.slice(0, 160)}`);
			const maths = [...all.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
			for (const s of steps) if (typeof s !== 'string') maths.push(s.tex);
			for (const m of maths) {
				try {
					katex.renderToString(m, { throwOnError: true });
				} catch (e) {
					fail(`${where}: KaTeX ${e.message.slice(0, 120)}`);
				}
			}
			if (!(answer > 0) || !Number.isFinite(answer)) fail(`${where}: answer ${answer}`);
			for (const tr of tpl.traps ?? []) {
				const y = tr.value(v);
				if (y !== null && Math.abs(y - answer) <= margin(tpl, answer)) fail(`${where}: trap ${y} = answer ${answer}`);
			}
			const last = steps[steps.length - 1];
			const o = tpl.dec !== undefined ? { dec: tpl.dec } : { sig: tpl.sig ?? 3 };
			const want = t(shown(tpl, answer), o);
			if (typeof last === 'string' || !last.tex.includes(want)) {
				fail(`${where}: last step lacks ${want}: ${typeof last === 'string' ? last : last.tex}`);
			}
			seen.add(text);
			if (samples.length < SHOW && seed % 97 === 0) samples.push({ text, answer: shown(tpl, answer), unit: tpl.unit });
		}
		if (none > SEEDS * 0.01) fail(`${slug}/${tpl.id}: no problem for ${none} of ${SEEDS} seeds`);
		console.log(`  ${tpl.id}: ${seen.size} different problems, ${none} seeds without one`);
		for (const s of samples) console.log(`    ${s.text}\n      → ${s.answer} ${s.unit}`);
	}
}
console.log(bad ? `\n${bad} failures` : '\nall templates pass');
process.exit(bad ? 1 : 0);
