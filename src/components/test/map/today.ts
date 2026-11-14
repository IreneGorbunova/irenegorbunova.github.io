/**
 * The course map in the browser (CourseMap.astro): «Сегодня» and the state of every tile, from localStorage only.
 *  ig:last  — the chapter opened last and the section reached (../global/LastVisit.astro);
 *  ig:sky   — the steps done per chapter, lit as «Моё небо» lights them (sky/progress.ts, litCount);
 *  ig:cards — the Leitner boxes of the formula cards (formulas/leitner.mjs).
 * Does nothing outside test mode. The server already rendered the first visit, so with empty storage nothing changes.
 */
import { load as loadSky, type Step } from '../../sky/progress';
import { litCount } from '../../sky/constellations';
import { load as loadCards, today, isDue, addDays } from '../../formulas/leitner.mjs';
import { plural } from './words';

interface Ch {
	id: string;
	href: string;
	title: string;
	need: string;
	size: number;
	sec: number;
	keys: string[];
	dark: string;
	light: string;
}
interface Last {
	id: string;
	title: string;
	href: string;
	h?: string;
	ht?: string;
}
type State = 'new' | 'started' | 'done';
const STATE_LABEL: Record<State, string> = { new: 'не начата', started: 'начата', done: 'пройдена' };

const root = document.querySelector<HTMLElement>('[data-kmap]');

const readLast = (): Last | null => {
	try {
		const v = JSON.parse(localStorage.getItem('ig:last') ?? 'null');
		return v && typeof v.id === 'string' && typeof v.href === 'string' && typeof v.title === 'string' ? v : null;
	} catch {
		return null;
	}
};

/** A thumbnail for a row, the same markup as Thumb.astro. */
const thumb = (ch: Ch | undefined) => {
	const box = document.createElement('span');
	box.className = 'kthumb';
	if (ch?.dark && ch.light) {
		for (const theme of ['dark', 'light'] as const) {
			const img = document.createElement('img');
			img.className = `kthumb__img kthumb__img--${theme}`;
			img.src = theme === 'dark' ? ch.dark : ch.light;
			img.width = 480;
			img.height = 320;
			img.alt = '';
			img.decoding = 'async';
			img.loading = 'lazy'; // the other theme's picture stays display: none and is never fetched
			box.append(img);
		}
	} else {
		const none = document.createElement('span');
		none.className = 'kthumb__none';
		box.append(none);
	}
	return box;
};

/** «завтра», «послезавтра», «через 3 дня» from today to the day given (YYYY-MM-DD, later than today). */
const whenDue = (day: string, now: string) => {
	let n = 1;
	while (n < 400 && addDays(now, n) < day) n++;
	return n === 1 ? 'завтра' : n === 2 ? 'послезавтра' : `через ${plural(n, 'день', 'дня', 'дней')}`;
};

if (root && document.documentElement.dataset.igTestmode === '1') {
	const chapters = JSON.parse(root.dataset.chapters!) as Ch[];
	const byId = new Map(chapters.map((c) => [c.id, c]));
	const tiles = new Map([...root.querySelectorAll<HTMLElement>('[data-ch]')].map((t) => [t.dataset.ch!, t]));
	const secs = [...root.querySelectorAll<HTMLElement>('[data-sec]')];
	const allKeys = chapters.flatMap((c) => c.keys);
	const row = (name: string) => root.querySelector<HTMLElement>(`[data-row="${name}"]`)!;
	let firstPaint = true;

	const paint = () => {
		const sky = loadSky();
		const last = readLast();
		const cards = loadCards();
		const day = today();

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

		// sections: stars of the constellation, done / current; on the first paint the section of «Дальше» opens, and
		// the one of «Продолжить» too when the pupil reads elsewhere
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

		// «Сегодня»
		const due = allKeys.filter((k) => isDue(cards[k], day));
		const studied = allKeys.filter((k) => cards[k]);
		const touched = chapters.some((c) => sky[c.id]);
		const fresh = !last && !touched && !studied.length;
		root.querySelector<HTMLElement>('[data-first]')!.hidden = !fresh;
		root.querySelector<HTMLElement>('[data-back]')!.hidden = fresh;
		if (fresh) return;

		// Продолжить: the chapter opened last, from the section reached
		const cont = row('continue');
		const lastCh = last ? byId.get(last.id) : undefined;
		cont.hidden = !last;
		if (last) {
			cont.setAttribute('href', last.h ? `${last.href}#${last.h}` : last.href);
			cont.querySelector('[data-pic]')!.replaceChildren(thumb(lastCh));
			cont.querySelector('[data-title]')!.textContent = lastCh?.title ?? last.title;
			const parts = [last.ht ? `С раздела «${last.ht}»` : 'С начала главы'];
			if (lastCh && lastCh === next && info.get(lastCh.id)!.k < lastCh.size)
				parts.push(`звёзды главы: ${info.get(lastCh.id)!.k} из ${lastCh.size}`);
			cont.querySelector('[data-sub]')!.textContent = parts.join(' · ');
		}

		// Повторить карточки: N / Учить карточки / all repeated for today
		row('due').hidden = !due.length;
		row('due').querySelector('[data-title]')!.textContent = `Повторить карточки:\u00a0${due.length}`;
		row('due').querySelector('[data-due-n]')!.textContent = String(due.length);
		const learnFrom = [lastCh, next].find((c) => c && c.keys.length);
		row('learn').hidden = Boolean(studied.length) || !learnFrom;
		if (learnFrom) {
			row('learn').dataset.deckKeys = learnFrom.keys.join(' ');
			row('learn').querySelector('[data-sub]')!.textContent =
				`${plural(learnFrom.keys.length, 'карточка', 'карточки', 'карточек')} главы «${learnFrom.title}»`;
		}
		const rested = row('rested');
		rested.hidden = !studied.length || due.length > 0;
		if (!rested.hidden) {
			const soon = studied.map((k) => cards[k].due).sort()[0];
			rested.querySelector('[data-sub]')!.textContent = soon ? `Следующие — ${whenDue(soon, day)}.` : '';
		}

		// Дальше: the first chapter in course order whose stars are not all lit; or the course is done
		const nx = row('next');
		nx.hidden = !next || next === lastCh;
		if (next && next !== lastCh) {
			const { k, state } = info.get(next.id)!;
			nx.setAttribute('href', next.href);
			nx.querySelector('[data-pic]')!.replaceChildren(thumb(next));
			nx.querySelector('[data-title]')!.textContent = next.title;
			nx.querySelector('[data-sub]')!.textContent =
				state === 'new' ? 'Глава ещё не начата' : `Звёзды главы: ${k} из ${next.size}`;
		}
		row('finished').hidden = Boolean(next);
	};

	paint();
	// after a session with the cards, after a return with «Назад» (the page may come from the back-forward cache),
	// and when another tab changes the progress
	root.querySelector('dialog')?.addEventListener('close', paint);
	addEventListener('pageshow', (e) => e.persisted && paint());
	addEventListener('storage', (e) => ['ig:sky', 'ig:cards', 'ig:last'].includes(e.key ?? '') && paint());
}
