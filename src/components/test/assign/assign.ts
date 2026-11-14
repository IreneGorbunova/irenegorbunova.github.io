// «Задание классу»: the teacher's and the pupil's page (markup in Assign.astro). Problems come from the trainer's
// templates and are judged by the trainer's own engine (parse, judge, shown), exactly as in «Решите сами».

import katex from 'katex';
import { judge, n, parse, shown } from '../../trainer/engine.mjs';
import { PROBLEMS } from '../../../data/problems/index.mjs';
import { qrSvg } from '../teacher/qr';
import { SITE } from '../teacher/config';
import { TOPICS } from './topics';
import { fromHash, makeCode, newId, readCode, splitLine, toHash, VARIANTS, type Assignment } from './code';
import { variantTasks, type Task } from './variant';

const PUPIL_KEY = 'ig:assign';
const MADE_KEY = 'ig:assign-made';

// ---------- helpers ---------------------------------------------------------------------------------
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Text with inline math in $…$ (as in the trainer). */
const rich = (s: string) =>
	s
		.split(/(\$[^$]+\$)/)
		.map((p) =>
			p.length > 1 && p.startsWith('$') && p.endsWith('$')
				? katex.renderToString(p.slice(1, -1), { throwOnError: false })
				: esc(p).replace(/(\d) (°C|кДж|Дж|кг)/g, '$1&nbsp;$2'),
		)
		.join('');
const answerText = (tpl: any, a: number) => {
	const o = tpl.dec !== undefined ? { dec: tpl.dec } : { sig: tpl.sig ?? 3 };
	return `${n(shown(tpl, a), o)}&nbsp;${esc(tpl.unit)}`;
};
const randInt = (k: number) => {
	const a = new Uint32Array(1);
	crypto.getRandomValues(a);
	return a[0] % k;
};
const load = <T>(key: string, fallback: T): T => {
	try {
		return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback;
	} catch {
		return fallback;
	}
};
const save = (key: string, v: unknown) => {
	try {
		localStorage.setItem(key, JSON.stringify(v));
	} catch {
		/* storage off: the page still works until it is closed */
	}
};
const tasksWord = (k: number) => {
	const a = k % 10;
	const b = k % 100;
	return a === 1 && b !== 11 ? 'задача' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'задачи' : 'задач';
};
const copy = async (text: string, field?: HTMLInputElement) => {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		if (!field) return false;
		field.select();
		try {
			return document.execCommand('copy');
		} catch {
			return false;
		}
	}
};
const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
/** The address of this page that pupils can open: the live site, or this machine when testing locally. */
const pageUrl = () => {
	const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
	return `${local ? location.origin : SITE}${base}uchebnik/test/zadanie/`;
};
const templatesOf = async (topic: string): Promise<any[]> => {
	const t = TOPICS[topic];
	const loader = t && PROBLEMS[t.slug as keyof typeof PROBLEMS];
	return loader ? (await loader()).default : [];
};

// ---------- the pupil -------------------------------------------------------------------------------
interface PupilState {
	v: number;
	a: ({ x: string; ok: boolean; html: string } | null)[];
}

const pupil = async (root: HTMLElement, a: Assignment) => {
	const topic = TOPICS[a.topic];
	const templates = await templatesOf(a.topic);
	const all = load<Record<string, PupilState>>(PUPIL_KEY, {});
	let st = all[a.id];
	if (!st || !(st.v >= 1 && st.v <= VARIANTS) || st.a?.length !== a.count) {
		st = { v: 1 + randInt(VARIANTS), a: Array(a.count).fill(null) };
		all[a.id] = st;
		save(PUPIL_KEY, all);
	}
	const store = () => {
		const s = load<Record<string, PupilState>>(PUPIL_KEY, {});
		s[a.id] = st;
		save(PUPIL_KEY, s);
	};
	const tasks = variantTasks(templates, topic.order, a, st.v);

	root.innerHTML = '';
	const meta = document.createElement('p');
	meta.className = 'za__meta';
	meta.textContent = `«${topic.title}» · ${a.count} ${tasksWord(a.count)} · вариант ${st.v}`;
	const lead = document.createElement('p');
	lead.className = 'za__lead';
	lead.textContent =
		'Решите задачи в тетради и введите ответы. Каждый ответ можно проверить только один раз. Когда проверите все задачи, появится код: отправьте его учителю.';
	const progress = document.createElement('p');
	progress.className = 'za__progress';
	progress.setAttribute('aria-live', 'polite');
	root.append(meta, lead, progress);

	const sols: HTMLElement[] = [];
	const result = document.createElement('div');
	result.className = 'za__result';
	result.hidden = true;

	const paintProgress = () => {
		const done = st.a.filter(Boolean).length;
		progress.textContent = done < a.count ? `Проверено: ${done} из ${a.count}` : 'Все задачи проверены.';
		if (done === a.count) showResult();
	};

	tasks.forEach((task, i) => {
		const card = document.createElement('div');
		card.className = 'za__task';
		const head = document.createElement('div');
		head.className = 'za__task-head';
		const num = document.createElement('span');
		num.textContent = `Задача ${i + 1} из ${a.count}`;
		const state = document.createElement('span');
		state.className = 'za__task-state';
		head.append(num, state);
		const text = document.createElement('div');
		text.className = 'za__task-text';
		text.innerHTML = rich(task.tpl.text(task.inst.v));
		const form = document.createElement('form');
		form.className = 'za__answer';
		form.autocomplete = 'off';
		const id = `za-${a.id}-${i}`;
		form.innerHTML = `<label for="${id}">Ответ:</label><input id="${id}" class="za__input" type="text" inputmode="decimal" enterkeyhint="done" spellcheck="false" /><span class="za__unit">${esc(task.tpl.unit)}</span><button type="submit" class="za__btn za__btn--primary">Проверить</button>`;
		const input = form.querySelector('input')!;
		const btn = form.querySelector('button')!;
		const fb = document.createElement('p');
		fb.className = 'za__fb';
		fb.setAttribute('aria-live', 'polite');
		const sol = document.createElement('details');
		sol.className = 'za__sol';
		sol.hidden = true;
		sol.innerHTML = `<summary>Решение</summary><ol>${task.tpl
			.solution(task.inst.v)
			.map((s: string | { tex: string }) =>
				typeof s === 'string' ? `<li><p>${rich(s)}</p></li>` : `<li>${katex.renderToString(s.tex, { displayMode: true, throwOnError: false })}</li>`,
			)
			.join('')}</ol>`;
		sols.push(sol);
		card.append(head, text, form, fb, sol);
		root.append(card);

		const lock = (rec: { x: string; ok: boolean; html: string }) => {
			input.value = rec.x;
			input.disabled = true;
			btn.disabled = true;
			btn.hidden = true;
			card.classList.add(rec.ok ? 'is-ok' : 'is-bad');
			state.textContent = rec.ok ? 'верно' : 'неверно';
			state.className = `za__task-state ${rec.ok ? 'is-ok' : 'is-bad'}`;
			fb.className = `za__fb ${rec.ok ? 'is-ok' : 'is-bad'}`;
			fb.innerHTML = rec.html;
		};
		const saved = st.a[i];
		if (saved) lock(saved);

		form.addEventListener('submit', (e) => {
			e.preventDefault();
			if (st.a[i]) return;
			const x = parse(input.value);
			if (x === null) {
				fb.className = 'za__fb';
				fb.innerHTML = 'Введите число, например <b>2,5</b>.';
				return;
			}
			const r = judge(task.tpl, task.inst, x);
			const right = answerText(task.tpl, task.inst.answer);
			let html: string;
			if (r.ok) {
				html = `<b>Верно!</b> Ответ: ${right}.${task.tpl.note ? ' ' + rich(task.tpl.note(task.inst.v)) : ''}`;
			} else {
				const why = r.why
					? rich(r.why)
					: r.scale
						? `Число похоже на верное, но, кажется, в других единицах. Ответ нужен в ${esc(task.tpl.unit)}.`
						: 'Проверьте формулу и вычисления.';
				html = `<b>Неверно.</b> ${why} Правильный ответ: ${right}.`;
			}
			const rec = { x: input.value.trim(), ok: r.ok, html };
			st.a[i] = rec;
			store();
			lock(rec);
			paintProgress();
		});
	});
	root.append(result);

	function showResult() {
		const score = st.a.filter((r) => r?.ok).length;
		const right = st.a.reduce((m, r, i) => (r?.ok ? m | (1 << i) : m), 0);
		const code = makeCode(a, st.v, right);
		result.innerHTML = `<p class="za__score">${score} из ${a.count}</p><p>Ваш код:</p><p><span class="za__code">${code}</span></p><p class="za__row"><button type="button" class="za__btn za__btn--primary">Скопировать</button></p><p class="za__done" aria-live="polite"></p><p>Отправьте этот код учителю. Решения задач открыты выше.</p>`;
		const b = result.querySelector('button')!;
		const msg = result.querySelector<HTMLElement>('.za__done')!;
		b.addEventListener('click', async () => {
			msg.textContent = (await copy(code)) ? 'Код скопирован.' : 'Выделите код и скопируйте его.';
		});
		result.hidden = false;
		for (const s of sols) s.hidden = false;
	}
	paintProgress();
};

// ---------- the teacher -----------------------------------------------------------------------------
interface Made extends Assignment {
	at: number;
}

const teacher = (root: HTMLElement) => {
	const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
	const form = $<HTMLFormElement>('[data-za-form]');
	const topicSel = $<HTMLSelectElement>('[data-za-topic]');
	const countSel = $<HTMLSelectElement>('[data-za-count]');
	const made = $('[data-za-made]');
	const what = $('[data-za-what]');
	const qr = $('[data-za-qr]');
	const link = $<HTMLInputElement>('[data-za-link]');
	const copyBtn = $<HTMLButtonElement>('[data-za-copy]');
	const tryLink = $<HTMLAnchorElement>('[data-za-try]');
	const copied = $('[data-za-copied]');
	const check = $<HTMLFormElement>('[data-za-check]');
	const pick = $<HTMLSelectElement>('[data-za-pick]');
	const paste = $<HTMLInputElement>('[data-za-paste]');
	const codes = $<HTMLTextAreaElement>('[data-za-codes]');
	const msg = $('[data-za-check-msg]');
	const table = $('[data-za-table]');

	const t = new URLSearchParams(location.search).get('t');
	if (t && TOPICS[t]) topicSel.value = t;

	const describe = (a: Assignment) => `«${TOPICS[a.topic]?.title ?? a.topic}», ${a.count} ${tasksWord(a.count)}`;
	const fmtDate = (ms: number) => new Date(ms).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
	const paintPick = (select?: string) => {
		const list = load<Made[]>(MADE_KEY, []);
		pick.innerHTML = list.length
			? list.map((m) => `<option value="${m.id}">${esc(`${describe(m)} · ${fmtDate(m.at)} · ${m.id}`)}</option>`).join('')
			: '<option value="">Пока нет заданий, созданных на этом устройстве</option>';
		pick.disabled = !list.length;
		if (select) pick.value = select;
	};
	paintPick();

	form.addEventListener('submit', (e) => {
		e.preventDefault();
		const a: Assignment = { topic: topicSel.value, count: Number(countSel.value), id: newId(randInt) };
		const list = load<Made[]>(MADE_KEY, []).filter((m) => m.id !== a.id);
		list.unshift({ ...a, at: Date.now() });
		save(MADE_KEY, list.slice(0, 30));
		const url = `${pageUrl()}#${toHash(a)}`;
		what.textContent = `${describe(a)}. Номер задания: ${a.id}.`;
		link.value = url;
		tryLink.href = url;
		qr.innerHTML = qrSvg(url, `QR-код ссылки на задание`);
		copied.textContent = '';
		made.hidden = false;
		paintPick(a.id);
		made.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	});
	copyBtn.addEventListener('click', async () => {
		copied.textContent = (await copy(link.value, link)) ? 'Ссылка скопирована.' : 'Выделите ссылку и скопируйте её.';
	});
	link.addEventListener('focus', () => link.select());

	check.addEventListener('submit', async (e) => {
		e.preventDefault();
		table.innerHTML = '';
		let a: Assignment | null = null;
		if (paste.value.trim()) {
			const i = paste.value.indexOf('#');
			a = i >= 0 ? fromHash(paste.value.slice(i)) : null;
			if (!a) {
				msg.textContent = 'В ссылке нет задания. Скопируйте ссылку целиком, с частью «#a=…».';
				return;
			}
		} else {
			const m = load<Made[]>(MADE_KEY, []).find((x) => x.id === pick.value);
			a = m ? { topic: m.topic, count: m.count, id: m.id } : null;
			if (!a) {
				msg.textContent = 'Выберите задание или вставьте ссылку на него.';
				return;
			}
		}
		if (!TOPICS[a.topic]) {
			msg.textContent = 'Тема этого задания здесь неизвестна.';
			return;
		}
		const lines = codes.value
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean);
		if (!lines.length) {
			msg.textContent = 'Вставьте коды учеников, по одному в строке.';
			return;
		}
		const templates = await templatesOf(a.topic);
		const seen = new Map<number, number>();
		const rows = lines.map((line) => {
			const sp = splitLine(line);
			const res = sp ? readCode(sp.code, a!) : null;
			if (res?.status === 'ok') seen.set(res.v, (seen.get(res.v) ?? 0) + 1);
			return { line, name: sp?.name ?? line, res };
		});
		const ok = rows.filter((r) => r.res?.status === 'ok').length;
		msg.textContent = `${describe(a)}: проверено кодов — ${rows.length}, верных — ${ok}.`;

		const tbl = document.createElement('table');
		tbl.className = 'za__table';
		tbl.innerHTML = '<thead><tr><th>Ученик</th><th>Вариант</th><th>Результат</th><th>Задачи</th><th>Код</th><th></th></tr></thead>';
		const body = document.createElement('tbody');
		for (const r of rows) {
			const tr = document.createElement('tr');
			const res = r.res;
			const name = esc(r.name || '—');
			if (res?.status === 'ok') {
				const marks = Array.from(
					{ length: a.count },
					(_, i) => `<span class="za__mark ${res.right & (1 << i) ? 'is-ok' : 'is-bad'}" title="Задача ${i + 1}: ${res.right & (1 << i) ? 'верно' : 'неверно'}">${i + 1}</span>`,
				).join('');
				const dup = (seen.get(res.v) ?? 0) > 1 ? '<br><small>этот код вставлен не один раз</small>' : '';
				tr.innerHTML = `<td>${name}</td><td>${res.v}</td><td><b>${res.score} из ${a.count}</b></td><td><span class="za__marks">${marks}</span></td><td class="za__status is-ok">верный${dup}</td><td><button type="button" class="za__btn za__btn--small" aria-expanded="false">Вариант ученика</button></td>`;
				const btn = tr.querySelector('button')!;
				let open: HTMLTableRowElement | null = null;
				btn.addEventListener('click', () => {
					if (open) {
						open.remove();
						open = null;
						btn.setAttribute('aria-expanded', 'false');
						return;
					}
					open = document.createElement('tr');
					open.className = 'za__var';
					const tasks: Task[] = variantTasks(templates, TOPICS[a!.topic].order, a!, res.v);
					open.innerHTML = `<td colspan="6"><ol>${tasks
						.map(
							(tk, i) =>
								`<li>${rich(tk.tpl.text(tk.inst.v))}<span class="za__var-ans">Ответ: ${answerText(tk.tpl, tk.inst.answer)} · ${res.right & (1 << i) ? 'ученик ответил верно' : 'ученик ответил неверно'}</span></li>`,
						)
						.join('')}</ol></td>`;
					tr.after(open);
					btn.setAttribute('aria-expanded', 'true');
				});
			} else {
				const why = !res
					? 'кода в строке нет'
					: res.status === 'typo'
						? 'в коде опечатка'
						: 'от другого задания или изменён';
				tr.innerHTML = `<td>${name}</td><td>—</td><td>—</td><td>—</td><td class="za__status is-bad">${why}</td><td></td>`;
			}
			body.append(tr);
		}
		tbl.append(body);
		table.append(tbl);
	});
};

// ---------- start -----------------------------------------------------------------------------------
export const start = () => {
	const root = document.querySelector<HTMLElement>('[data-za]');
	if (!root) return;
	const q = (s: string) => root.querySelector<HTMLElement>(s)!;
	q('[data-za-nojs]').hidden = true;
	let teacherReady = false;
	const route = () => {
		const hash = location.hash;
		const isPupil = /^#a=/.test(hash);
		const a = isPupil ? fromHash(hash) : null;
		q('[data-za-teacher]').hidden = isPupil;
		const known = !!a && !!TOPICS[a.topic];
		q('[data-za-pupil]').hidden = !known;
		q('[data-za-bad]').hidden = !isPupil || known;
		if (known) pupil(q('[data-za-pupil]'), a!);
		else if (!teacherReady) {
			teacher(root);
			teacherReady = true;
		}
	};
	window.addEventListener('hashchange', route);
	route();
};
