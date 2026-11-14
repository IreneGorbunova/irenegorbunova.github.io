// The first page of the textbook (Hub.astro): the pendulum wave of the hero, «Сегодня» and the stars
// of every grade, from localStorage only (ig:last, ig:sky, ig:cards).
import { load as loadSky, type Step } from '../sky/progress';
import { litCount } from '../sky/constellations';
import { load as loadCards, today, isDue } from '../formulas/leitner.mjs';

interface Ch {
	id: string;
	href: string;
	title: string;
	need: string;
	size: number;
	grade: string;
	keys: string[];
	thumb: string;
}

const root = document.querySelector<HTMLElement>('[data-hub]');
if (root) {
	// ---------- the pendulum wave ----------
	// Pendulum k makes N0 + k swings in the cycle of 60 s: T = 60 / (N0 + k), l = g (T / 2π)². Seen along the row, all
	// the threads start from one point, and the bobs hang at their own depths.
	const canvas = root.querySelector<HTMLCanvasElement>('[data-hub-wave]')!;
	const ctx = canvas.getContext('2d')!;
	const text = root.querySelector<HTMLElement>('.hub-hero__text')!;
	const N = 15;
	const N0 = 51;
	const CYCLE = 60;
	const G = 9.81;
	const A0 = (13 * Math.PI) / 180; // the swing, small enough for the period not to depend on it
	const pend = Array.from({ length: N }, (_, k) => {
		const T = CYCLE / (N0 + k);
		return { T, l: G * (T / (2 * Math.PI)) ** 2 };
	});
	let w = 0;
	let h = 0;
	let t = 0;
	let last = 0;
	let paused = false;
	let onScreen = true;
	const size = () => {
		const r = canvas.getBoundingClientRect();
		const dpr = Math.min(devicePixelRatio || 1, 2);
		w = r.width;
		h = r.height;
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	};
	const draw = () => {
		ctx.clearRect(0, 0, w, h);
		// the wave stands on the right of the text on a wide screen; on a phone, in the room kept free under the text
		const wide = w > 640;
		let cx = w * 0.72;
		let top = h * 0.06;
		let room = h * 0.8 - 12;
		if (!wide) {
			const box = canvas.getBoundingClientRect();
			const tb = text.getBoundingClientRect();
			const free = parseFloat(getComputedStyle(text).paddingBottom);
			cx = w * 0.5;
			top = tb.bottom - box.top - free + 10;
			room = free - 34;
		}
		const scale = Math.min(room / pend[0].l, (wide ? w * 0.5 : w * 0.9) / (2 * pend[0].l * Math.sin(A0)) / 1.15);
		// the bar the threads hang from
		ctx.strokeStyle = 'hsl(230 30% 75% / 0.55)';
		ctx.lineWidth = 3;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(cx - 26, top);
		ctx.lineTo(cx + 26, top);
		ctx.stroke();
		for (let k = 0; k < N; k++) {
			const p = pend[k];
			const a = A0 * Math.cos((2 * Math.PI * t) / p.T);
			const x = cx + p.l * scale * Math.sin(a);
			const y = top + p.l * scale * Math.cos(a);
			ctx.strokeStyle = 'hsl(230 35% 80% / 0.22)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(cx, top);
			ctx.lineTo(x, y);
			ctx.stroke();
			const r = wide ? 7.5 : 6;
			const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
			glow.addColorStop(0, 'hsl(42 95% 68% / 0.5)');
			glow.addColorStop(1, 'hsl(42 95% 68% / 0)');
			ctx.fillStyle = glow;
			ctx.beginPath();
			ctx.arc(x, y, r * 3.2, 0, 2 * Math.PI);
			ctx.fill();
			const ball = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
			ball.addColorStop(0, 'hsl(48, 100%, 92%)');
			ball.addColorStop(1, 'hsl(40, 88%, 56%)');
			ctx.fillStyle = ball;
			ctx.beginPath();
			ctx.arc(x, y, r, 0, 2 * Math.PI);
			ctx.fill();
		}
	};
	const frame = (now: number) => {
		if (!paused && onScreen && !document.hidden) {
			t += Math.min(0.05, (now - last) / 1000);
			draw();
		}
		last = now;
		requestAnimationFrame(frame);
	};
	new ResizeObserver(() => {
		size();
		draw();
	}).observe(canvas);
	new IntersectionObserver((e) => (onScreen = e[0].isIntersecting)).observe(canvas);
	const pause = root.querySelector<HTMLElement>('[data-hub-pause]')!;
	pause.addEventListener('click', () => {
		paused = !paused;
		pause.setAttribute('aria-pressed', String(paused));
		pause.textContent = paused ? 'Пуск' : 'Пауза';
	});
	size();
	requestAnimationFrame((now) => {
		last = now;
		frame(now);
	});

	// ---------- «Сегодня» and the stars of the grades ----------
	const chapters = JSON.parse(root.dataset.chapters!) as Ch[];
	const byId = new Map(chapters.map((c) => [c.id, c]));
	const pic = (ch: Ch | undefined) => {
		const img = document.createElement('img');
		if (!ch?.thumb) return document.createTextNode('');
		img.src = ch.thumb;
		img.alt = '';
		img.width = 480;
		img.height = 320;
		return img;
	};
	const paint = () => {
		const sky = loadSky();
		const cards = loadCards();
		const day = today();
		let last: { id: string; title: string; href: string; h?: string; ht?: string } | null = null;
		try {
			last = JSON.parse(localStorage.getItem('ig:last') ?? 'null');
		} catch {}
		const lit = new Map<string, number>();
		for (const ch of chapters) {
			const done = (sky[ch.id] ?? '').split('').filter((r) => ch.need.includes(r as Step)).length;
			lit.set(ch.id, litCount(ch.size, done, ch.need.length));
		}
		const complete = (c: Ch) => lit.get(c.id)! >= c.size;
		// the grades
		for (const tile of root.querySelectorAll<HTMLElement>('[data-grade]')) {
			const own = chapters.filter((c) => c.grade === tile.dataset.grade);
			const total = own.reduce((a, c) => a + c.size, 0);
			const got = own.reduce((a, c) => a + lit.get(c.id)!, 0);
			tile.querySelector('[data-stars]')!.textContent = `Звёзды: ${got} из ${total}`;
			tile.querySelector<HTMLElement>('[data-bar]')!.style.width = `${total ? (100 * got) / total : 0}%`;
		}
		// «Сегодня»: only for a reader who has been here
		const due = chapters.flatMap((c) => c.keys).filter((k) => isDue(cards[k], day)).length;
		const lastCh = last?.id ? byId.get(last.id) : undefined;
		const touched = chapters.some((c) => sky[c.id]);
		const box = root.querySelector<HTMLElement>('[data-hub-today]')!;
		box.hidden = !(lastCh || touched || due);
		const row = (name: string) => box.querySelector<HTMLElement>(`[data-row="${name}"]`)!;
		const cont = row('continue');
		cont.hidden = !lastCh || !last;
		if (lastCh && last) {
			cont.setAttribute('href', last.h ? `${last.href}#${last.h}` : last.href);
			cont.querySelector('[data-pic]')!.replaceChildren(pic(lastCh));
			cont.querySelector('[data-title]')!.textContent = lastCh.title;
			cont.querySelector('[data-sub]')!.textContent = last.ht ? `С раздела «${last.ht}»` : 'С начала главы';
			const cta = root.querySelector<HTMLAnchorElement>('[data-hub-cta]')!;
			cta.textContent = 'Продолжить чтение';
			cta.href = cont.getAttribute('href')!;
		}
		row('due').hidden = !due;
		row('due').querySelector('[data-n]')!.textContent = String(due);
		// «Дальше»: the next chapter after the one being read whose stars are not all lit, in the order of the course
		const from = lastCh ? chapters.indexOf(lastCh) + 1 : 0;
		const next = [...chapters.slice(from), ...chapters.slice(0, from)].find((c) => !complete(c) && c !== lastCh);
		const nx = row('next');
		nx.hidden = !next || !(lastCh || touched);
		if (next) {
			nx.setAttribute('href', next.href);
			nx.querySelector('[data-pic]')!.replaceChildren(pic(next));
			nx.querySelector('[data-title]')!.textContent = next.title;
			nx.querySelector('[data-sub]')!.textContent = next.grade;
		}
	};
	paint();
	addEventListener('pageshow', (e) => e.persisted && paint());
	addEventListener('storage', (e) => ['ig:sky', 'ig:cards', 'ig:last'].includes(e.key ?? '') && paint());
}
