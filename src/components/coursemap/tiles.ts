/**
 * The course map in the browser (CourseMap.astro): the state of every tile and section, from localStorage only.
 *  ig:last — the chapter opened last (../global/LastVisit.astro): a chapter opened counts as started, and its section
 *            opens on the first paint;
 *  ig:sky  — the steps done per chapter, lit as «Моё небо» lights them (sky/progress.ts, litCount).
 * The block «Сегодня» was removed (Irina, 23 Nov 2026). The server already rendered the first visit, so with empty
 * storage nothing changes.
 */
import { load as loadSky, type Step } from '../sky/progress';
import { litCount } from '../sky/constellations';

interface Ch {
	id: string;
	href: string;
	need: string;
	size: number;
	sec: number;
}
interface Last {
	id: string;
}
type State = 'new' | 'started' | 'done';
const STATE_LABEL: Record<State, string> = { new: 'не начата', started: 'начата', done: 'пройдена' };

const root = document.querySelector<HTMLElement>('[data-kmap]');

const readLast = (): Last | null => {
	try {
		const v = JSON.parse(localStorage.getItem('ig:last') ?? 'null');
		return v && typeof v.id === 'string' ? v : null;
	} catch {
		return null;
	}
};

if (root) {
	const chapters = JSON.parse(root.dataset.chapters!) as Ch[];
	const byId = new Map(chapters.map((c) => [c.id, c]));
	const tiles = new Map([...root.querySelectorAll<HTMLElement>('[data-ch]')].map((t) => [t.dataset.ch!, t]));
	const secs = [...root.querySelectorAll<HTMLElement>('[data-sec]')];
	let firstPaint = true;

	const paint = () => {
		const sky = loadSky();
		const last = readLast();

		// every chapter: the steps done and the stars lit, exactly as «Моё небо» counts them (Constellation.astro)
		const info = new Map<string, { k: number; done: number; state: State }>();
		for (const ch of chapters) {
			const done = (sky[ch.id] ?? '').split('').filter((r) => ch.need.includes(r as Step)).length;
			const k = litCount(ch.size, done, ch.need.length);
			const complete = ch.size > 0 ? k === ch.size : done === ch.need.length;
			const state: State = complete ? 'done' : done > 0 || last?.id === ch.id ? 'started' : 'new';
			info.set(ch.id, { k, done, state });
		}
		const next = chapters.find((c) => info.get(c.id)!.state !== 'done');

		// tiles
		for (const ch of chapters) {
			const t = tiles.get(ch.id);
			if (!t) continue;
			const { k, state } = info.get(ch.id)!;
			t.dataset.state = state;
			t.classList.toggle('is-next', ch === next);
			t.querySelector('[data-state-label]')!.textContent = STATE_LABEL[state];
			const stars = t.querySelector<HTMLElement>('[data-stars]')!;
			stars.querySelectorAll('.kstar').forEach((s, i) => s.classList.toggle('is-lit', i < k));
			stars.setAttribute('aria-label', `Звёзды главы: ${k} из ${ch.size}`);
		}

		// sections: stars of the constellation, done / current; on the first paint the section of the first unfinished
		// chapter opens, and the one of the chapter opened last too when the pupil reads elsewhere
		const lastSec = last ? byId.get(last.id)?.sec : undefined;
		secs.forEach((el, i) => {
			const own = chapters.filter((c) => c.sec === i);
			const lit = own.reduce((a, c) => a + info.get(c.id)!.k, 0);
			const label = el.querySelector<HTMLElement>('[data-sec-stars]')!;
			label.textContent = label.textContent!.replace(/\d+ из/, `${lit} из`);
			el.classList.toggle('is-done', own.every((c) => info.get(c.id)!.state === 'done'));
			el.classList.toggle('is-current', next?.sec === i);
			if (firstPaint && !('openAll' in root.dataset)) el.querySelector('details')!.open = next?.sec === i || (lastSec !== undefined && lastSec === i);
		});
		firstPaint = false;
	};

	paint();
	// after a return with «Назад» (the page may come from the back-forward cache), and when another tab changes the
	// progress
	addEventListener('pageshow', (e) => e.persisted && paint());
	addEventListener('storage', (e) => ['ig:sky', 'ig:last'].includes(e.key ?? '') && paint());
}
