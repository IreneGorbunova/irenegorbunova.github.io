// «Карта открытий» in the browser (DiscoveryMap.astro): a map of the world that is dragged, zoomed with the wheel,
// the buttons or two fingers, with a star at every place of a discovery. Stars standing close together merge into a
// cluster with their number; a tap on a cluster zooms into it, a tap on a star opens the card of the discovery.
// The land (land.json, Natural Earth) is drawn on a canvas in Web Mercator; the stars are buttons over it.

import type { Topic } from './discoveries';

interface Item {
	id: string;
	year: number;
	when: string;
	place: string;
	lat: number;
	lon: number;
	who: string;
	portrait: string;
	title: string;
	text: string;
	topic: Topic;
	topicLabel: string;
	href: string;
	chapter: string;
	x: number;
	y: number;
}
interface Cluster {
	items: Item[];
	x: number;
	y: number;
	el?: HTMLButtonElement;
}

const WORLD = 1000;
const Y_TOP = 196; // about 72° N
const Y_BOTTOM = 700; // about 57° S
const project = (lon: number, lat: number): [number, number] => [
	((lon + 180) / 360) * WORLD,
	WORLD / 2 - (WORLD / (2 * Math.PI)) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
];
const REGIONS: Record<string, [number, number, number, number]> = {
	// lon west, lat south, lon east, lat north
	europe: [-11, 36, 33, 61],
	russia: [26, 49, 92, 64],
};
const CLUSTER_PX = 34;

const root = document.querySelector<HTMLElement>('[data-dmap]');
if (root) {
	const view = root.querySelector<HTMLElement>('[data-dmap-view]')!;
	const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
	const pins = root.querySelector<HTMLElement>('[data-dmap-pins]')!;
	const card = root.querySelector<HTMLElement>('[data-dmap-card]')!;
	const hint = root.querySelector<HTMLElement>('[data-dmap-hint]')!;
	const ctx = canvas.getContext('2d')!;
	const all: Item[] = (JSON.parse(root.querySelector('[data-dmap-data]')!.textContent!) as Item[]).map((d) => {
		const [x, y] = project(d.lon, d.lat);
		return { ...d, x, y };
	});
	const byId = new Map(all.map((d) => [d.id, d]));

	// ---------- the view: centre (world units) and scale (screen pixels per world unit) ----------
	let vw = 0;
	let vh = 0;
	let k = 1;
	let cx = WORLD / 2;
	let cy = (Y_TOP + Y_BOTTOM) / 2;
	let kMin = 1;
	const K_MAX = 170;
	const clamp = () => {
		k = Math.min(Math.max(k, kMin), K_MAX);
		const hw = vw / 2 / k;
		const hh = vh / 2 / k;
		cx = hw * 2 >= WORLD ? WORLD / 2 : Math.min(Math.max(cx, hw), WORLD - hw);
		cy = hh * 2 >= Y_BOTTOM - Y_TOP ? (Y_TOP + Y_BOTTOM) / 2 : Math.min(Math.max(cy, Y_TOP + hh), Y_BOTTOM - hh);
	};
	const toScreen = (x: number, y: number): [number, number] => [(x - cx) * k + vw / 2, (y - cy) * k + vh / 2];

	// ---------- the land ----------
	let land: Path2D | null = null;
	let lakes: Path2D | null = null;
	const pathOf = (rings: number[][]) => {
		const p = new Path2D();
		for (const r of rings) {
			p.moveTo(r[0] / 100, r[1] / 100);
			for (let i = 2; i < r.length; i += 2) p.lineTo(r[i] / 100, r[i + 1] / 100);
			p.closePath();
		}
		return p;
	};
	import('./land.json').then((m) => {
		const data = (m.default ?? m) as { land: number[][]; lakes: number[][] };
		land = pathOf(data.land);
		lakes = pathOf(data.lakes);
		draw();
	});
	let colors = { sea: '', land: '', coast: '', grid: '' };
	const readColors = () => {
		const cs = getComputedStyle(root);
		colors = {
			sea: cs.getPropertyValue('--dm-sea').trim(),
			land: cs.getPropertyValue('--dm-land').trim(),
			coast: cs.getPropertyValue('--dm-coast').trim(),
			grid: cs.getPropertyValue('--dm-grid').trim(),
		};
	};
	const draw = () => {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		if (canvas.width !== Math.round(vw * dpr) || canvas.height !== Math.round(vh * dpr)) {
			canvas.width = Math.round(vw * dpr);
			canvas.height = Math.round(vh * dpr);
		}
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.fillStyle = colors.sea;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (vw / 2 - cx * k), dpr * (vh / 2 - cy * k));
		// meridians and parallels every 30°
		ctx.lineWidth = 1 / k;
		ctx.strokeStyle = colors.grid;
		ctx.beginPath();
		for (let lon = -150; lon <= 150; lon += 30) {
			const x = project(lon, 0)[0];
			ctx.moveTo(x, Y_TOP - 50);
			ctx.lineTo(x, Y_BOTTOM + 50);
		}
		for (const lat of [-30, 0, 30, 60]) {
			const y = project(0, lat)[1];
			ctx.moveTo(0, y);
			ctx.lineTo(WORLD, y);
		}
		ctx.stroke();
		if (land && lakes) {
			ctx.fillStyle = colors.land;
			ctx.fill(land, 'evenodd');
			ctx.lineJoin = 'round';
			ctx.lineWidth = 1.1 / k;
			ctx.strokeStyle = colors.coast;
			ctx.stroke(land);
			ctx.fillStyle = colors.sea;
			ctx.fill(lakes, 'evenodd');
			ctx.lineWidth = 0.8 / k;
			ctx.stroke(lakes);
		}
	};

	// ---------- the stars ----------
	let era = 'all';
	const topics = new Set<string>();
	let selected: Item | null = null;
	let clusters: Cluster[] = [];
	let clusteredAt = 0;
	const eraOf = (y: number) => (y < 1600 ? 'a' : y < 1700 ? '17' : y < 1800 ? '18' : y < 1900 ? '19' : '20');
	const shown = () => all.filter((d) => (era === 'all' || eraOf(d.year) === era) && (!topics.size || topics.has(d.topic)));
	const cityOf = (d: Item) => d.place.split(',')[0].replace(/ \(.*$/, '');

	const cluster = () => {
		// greedy: a star joins the first cluster nearer than CLUSTER_PX on the screen, else starts its own
		const out: Cluster[] = [];
		const r = CLUSTER_PX / k;
		for (const d of shown()) {
			const c = out.find((c) => Math.hypot(c.x - d.x, c.y - d.y) < r);
			if (c) {
				c.items.push(d);
				c.x = c.items.reduce((a, i) => a + i.x, 0) / c.items.length;
				c.y = c.items.reduce((a, i) => a + i.y, 0) / c.items.length;
			} else out.push({ items: [d], x: d.x, y: d.y });
		}
		clusters = out;
		clusteredAt = k;
		pins.replaceChildren(
			...out.map((c) => {
				const b = document.createElement('button');
				b.type = 'button';
				const one = c.items.length === 1;
				b.className = one ? 'dm-pin' : 'dm-pin dm-pin--many';
				if (one) {
					const d = c.items[0];
					b.dataset.topic = d.topic;
					b.setAttribute('aria-label', `${d.title}. ${d.who}, ${d.when}, ${d.place}`);
					b.innerHTML = `<span class="dm-pin__star" aria-hidden="true"></span><span class="dm-pin__label">${cityOf(d)}</span>`;
				} else {
					b.setAttribute('aria-label', `Открытий здесь: ${c.items.length}. Приблизить`);
					b.textContent = String(c.items.length);
				}
				b.addEventListener('click', () => {
					if (dragged) return;
					if (one) select(c.items[0], true);
					else openCluster(c);
				});
				c.el = b;
				return b;
			}),
		);
		markSelected();
	};
	const place = () => {
		for (const c of clusters) {
			const [x, y] = toScreen(c.x, c.y);
			c.el!.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
			c.el!.hidden = x < -40 || y < -40 || x > vw + 40 || y > vh + 40;
		}
		pins.classList.toggle('show-labels', k > kMin * 5);
	};
	const markSelected = () => {
		for (const c of clusters) c.el!.classList.toggle('is-sel', !!selected && c.items.includes(selected));
	};

	let raf = 0;
	const render = () => {
		if (raf) return;
		raf = requestAnimationFrame(() => {
			raf = 0;
			clamp();
			if (Math.abs(Math.log(k / clusteredAt)) > 0.04) cluster();
			draw();
			place();
		});
	};

	// ---------- flying ----------
	/** On a wide screen the card covers the east of the view: the free part of the map is narrower by this much. */
	const cardWidth = () => (getComputedStyle(card).position === 'absolute' && getComputedStyle(card).display !== 'none' ? card.offsetWidth + 12 : 0);
	let fly = 0;
	/** Flies so that the world point (tx, ty) comes to the middle of the free part of the map. */
	const flyTo = (tx: number, ty: number, tk: number, ms = 750, free = true) => {
		cancelAnimationFrame(fly);
		const [x0, y0, k0] = [cx, cy, k];
		tk = Math.min(Math.max(tk, kMin), K_MAX);
		if (free) tx += cardWidth() / 2 / tk;
		const t0 = performance.now();
		const step = (t: number) => {
			const u = Math.min(1, (t - t0) / ms);
			const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
			k = k0 * Math.pow(tk / k0, e);
			cx = x0 + (tx - x0) * e;
			cy = y0 + (ty - y0) * e;
			render();
			if (u < 1) fly = requestAnimationFrame(step);
		};
		fly = requestAnimationFrame(step);
	};
	const fitBox = (w: number, s: number, e: number, n: number, ms?: number) => {
		const [x0, y0] = project(w, n);
		const [x1, y1] = project(e, s);
		flyTo((x0 + x1) / 2, (y0 + y1) / 2, Math.min((vw - cardWidth()) / (x1 - x0), vh / (y1 - y0)) * 0.92, ms);
	};
	const fitWorld = (ms?: number) => flyTo(WORLD / 2, (Y_TOP + Y_BOTTOM) / 2, kMin, ms, false);

	// ---------- the card ----------
	const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
	const showIntro = () => {
		selected = null;
		markSelected();
		root.classList.remove('has-card');
		card.querySelector<HTMLElement>('[data-dmap-intro]')!.hidden = false;
		card.querySelector<HTMLElement>('[data-dmap-body]')!.hidden = true;
		paintList();
	};
	const cardBody = card.querySelector<HTMLElement>('[data-dmap-body]')!;
	const fillCard = (html: string) => {
		card.querySelector<HTMLElement>('[data-dmap-intro]')!.hidden = true;
		cardBody.hidden = false;
		cardBody.innerHTML = html;
		root.classList.add('has-card');
		card.scrollTop = 0;
	};
	const select = (d: Item, flyThere: boolean) => {
		selected = d;
		const list = shown();
		const i = list.indexOf(d);
		const prev = list[i - 1];
		const next = list[i + 1];
		fillCard(`
			<button type="button" class="dm-card__close" data-close aria-label="Закрыть карточку">×</button>
			<p class="dm-card__when"><span class="dm-dot" data-topic="${d.topic}"></span>${esc(d.when)} · ${esc(d.place)}</p>
			<h3 class="dm-card__title">${esc(d.title)}</h3>
			<div class="dm-card__who">
				${d.portrait ? `<img class="dm-card__portrait" src="${d.portrait}" alt="" width="72" height="72" loading="lazy" />` : '<span class="dm-card__portrait dm-card__portrait--none" aria-hidden="true"></span>'}
				<span><span class="dm-card__name">${esc(d.who)}</span><span class="dm-card__topic">${esc(d.topicLabel)}</span></span>
			</div>
			<p class="dm-card__text">${esc(d.text)}</p>
			${d.href ? `<a class="dm-card__link" href="${d.href}">Читать в учебнике: ${esc(d.chapter)}</a>` : '<p class="dm-card__soon">Глава об этом в учебнике ещё не написана.</p>'}
			<div class="dm-card__nav">
				<button type="button" class="dm-btn" data-go="${prev?.id ?? ''}" ${prev ? '' : 'disabled'}>← Раньше${prev ? `<span>${esc(prev.when)}</span>` : ''}</button>
				<button type="button" class="dm-btn" data-go="${next?.id ?? ''}" ${next ? '' : 'disabled'}>Позже →${next ? `<span>${esc(next.when)}</span>` : ''}</button>
			</div>`);
		markSelected();
		paintList();
		if (flyThere) flyTo(d.x, d.y, Math.max(k, Math.min(kMin * 9, 60)));
	};
	const openCluster = (c: Cluster) => {
		const spread = Math.max(...c.items.map((i) => Math.hypot(i.x - c.x, i.y - c.y)));
		if (spread * K_MAX > CLUSTER_PX * 1.5 && k < K_MAX * 0.7) {
			// the stars will part when the map comes closer
			const xs = c.items.map((i) => i.x);
			const ys = c.items.map((i) => i.y);
			const w = Math.max(...xs) - Math.min(...xs);
			const h = Math.max(...ys) - Math.min(...ys);
			flyTo((Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2, Math.min(Math.min((vw - cardWidth()) / (w || 1e-9), vh / (h || 1e-9)) * 0.55, K_MAX, Math.max(k * 3.2, kMin * 4)));
			return;
		}
		// one place, several discoveries: the list to choose from
		selected = null;
		fillCard(`
			<button type="button" class="dm-card__close" data-close aria-label="Закрыть карточку">×</button>
			<p class="dm-card__when">${esc(cityOf(c.items[0]))}</p>
			<h3 class="dm-card__title">Открытий здесь: ${c.items.length}</h3>
			<ul class="dm-card__list">${c.items
				.map((d) => `<li><button type="button" class="dm-row" data-go="${d.id}"><span class="dm-dot" data-topic="${d.topic}"></span><span class="dm-row__when">${esc(d.when)}</span><span class="dm-row__title">${esc(d.title)}</span><span class="dm-row__who">${esc(d.who)}</span></button></li>`)
				.join('')}</ul>`);
		for (const x of clusters) x.el!.classList.toggle('is-sel', x === c);
	};
	card.addEventListener('click', (e) => {
		const t = (e.target as Element).closest<HTMLElement>('[data-go], [data-close]');
		if (!t) return;
		if ('close' in t.dataset) showIntro();
		else if (t.dataset.go && byId.has(t.dataset.go)) select(byId.get(t.dataset.go)!, true);
	});

	// ---------- the filters and the list ----------
	const listItems = [...root.querySelectorAll<HTMLElement>('[data-dmap-list] [data-id]')];
	const paintList = () => {
		const ok = new Set(shown().map((d) => d.id));
		for (const li of listItems) {
			li.hidden = !ok.has(li.dataset.id!);
			li.classList.toggle('is-sel', selected?.id === li.dataset.id);
		}
		const n = root.querySelector('[data-dmap-count]');
		if (n) n.textContent = String(ok.size);
	};
	for (const li of listItems) {
		li.querySelector('button')?.addEventListener('click', () => {
			select(byId.get(li.dataset.id!)!, true);
			view.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		});
	}
	const refilter = () => {
		if (selected && !shown().includes(selected)) showIntro();
		cluster();
		place();
		paintList();
	};
	for (const b of root.querySelectorAll<HTMLElement>('[data-era]')) {
		b.addEventListener('click', () => {
			era = b.dataset.era!;
			for (const x of root.querySelectorAll<HTMLElement>('[data-era]')) x.setAttribute('aria-pressed', String(x === b));
			refilter();
		});
	}
	for (const b of root.querySelectorAll<HTMLElement>('[data-topic-filter]')) {
		b.addEventListener('click', () => {
			const t = b.dataset.topicFilter!;
			if (topics.has(t)) topics.delete(t);
			else topics.add(t);
			b.setAttribute('aria-pressed', String(topics.has(t)));
			refilter();
		});
	}

	// ---------- the controls ----------
	const zoomAt = (factor: number, sx = vw / 2, sy = vh / 2) => {
		cancelAnimationFrame(fly);
		const wx = cx + (sx - vw / 2) / k;
		const wy = cy + (sy - vh / 2) / k;
		k = Math.min(Math.max(k * factor, kMin), K_MAX);
		cx = wx - (sx - vw / 2) / k;
		cy = wy - (sy - vh / 2) / k;
		render();
	};
	// on the whole screen the map leaves the page's column (the site's menu would lie over it) and comes back after
	const home = document.createComment('карта открытий');
	const setFull = (on: boolean) => {
		if (on === root.classList.contains('is-full')) return;
		if (on) {
			root.before(home);
			document.body.append(root);
		} else {
			home.after(root);
			home.remove();
		}
		root.classList.toggle('is-full', on);
		document.documentElement.classList.toggle('dm-lock', on);
		root.querySelector('[data-act="full"]')!.setAttribute('aria-pressed', String(on));
		resize();
	};
	root.addEventListener('click', (e) => {
		const act = (e.target as Element).closest<HTMLElement>('[data-act]')?.dataset.act;
		if (!act) return;
		if (act === 'in') flyTo(cx, cy, k * 1.8, 250, false);
		else if (act === 'out') flyTo(cx, cy, k / 1.8, 250, false);
		else if (act === 'world') fitWorld();
		else if (act === 'full') setFull(!root.classList.contains('is-full'));
		else if (REGIONS[act]) fitBox(...REGIONS[act]);
	});

	// dragging and pinching
	const pts = new Map<number, { x: number; y: number }>();
	let dragged = false;
	let moved = 0;
	let pinch = 0;
	const local = (e: PointerEvent) => {
		const r = view.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	};
	view.addEventListener('pointerdown', (e) => {
		if ((e.target as Element).closest('.dm-tools')) return;
		pts.set(e.pointerId, local(e));
		if (pts.size === 1) {
			moved = 0;
			dragged = false;
		}
		if (pts.size === 2) {
			const [a, b] = [...pts.values()];
			pinch = Math.hypot(a.x - b.x, a.y - b.y);
		}
		cancelAnimationFrame(fly);
	});
	view.addEventListener('pointermove', (e) => {
		const p0 = pts.get(e.pointerId);
		if (!p0) return;
		const p = local(e);
		if (pts.size === 1) {
			moved += Math.hypot(p.x - p0.x, p.y - p0.y);
			if (moved > 6) {
				if (!dragged) {
					dragged = true;
					view.setPointerCapture(e.pointerId);
					view.classList.add('is-drag');
				}
				cx -= (p.x - p0.x) / k;
				cy -= (p.y - p0.y) / k;
				render();
			}
			if (dragged) pts.set(e.pointerId, p);
		} else if (pts.size === 2) {
			pts.set(e.pointerId, p);
			const [a, b] = [...pts.values()];
			const dist = Math.hypot(a.x - b.x, a.y - b.y);
			if (pinch > 0 && dist > 0) zoomAt(dist / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
			pinch = dist;
			dragged = true;
		}
	});
	const up = (e: PointerEvent) => {
		pts.delete(e.pointerId);
		view.classList.remove('is-drag');
		pinch = 0;
		// the click that follows a drag is not a click on a star
		if (dragged) setTimeout(() => (dragged = false), 0);
	};
	view.addEventListener('pointerup', up);
	view.addEventListener('pointercancel', up);
	// the wheel: with Ctrl (or a pinch on a touchpad), or freely on the whole-screen map; otherwise the page scrolls
	let hintTimer = 0;
	view.addEventListener(
		'wheel',
		(e) => {
			if (e.ctrlKey || e.metaKey || root.classList.contains('is-full')) {
				e.preventDefault();
				const { x, y } = local(e as unknown as PointerEvent);
				zoomAt(Math.exp(-e.deltaY * (e.ctrlKey && Math.abs(e.deltaY) < 20 ? 0.02 : 0.0022)), x, y);
			} else {
				hint.hidden = false;
				clearTimeout(hintTimer);
				hintTimer = window.setTimeout(() => (hint.hidden = true), 1600);
			}
		},
		{ passive: false },
	);
	view.addEventListener('dblclick', (e) => {
		if ((e.target as Element).closest('button')) return;
		const { x, y } = local(e as unknown as PointerEvent);
		const wx = cx + (x - vw / 2) / k;
		const wy = cy + (y - vh / 2) / k;
		flyTo(wx, wy, k * 2.2, 300, false);
	});
	view.addEventListener('keydown', (e) => {
		if ((e.target as Element).closest('button') && [' ', 'Enter'].includes(e.key)) return;
		const step = 90 / k;
		if (e.key === 'ArrowLeft') cx -= step;
		else if (e.key === 'ArrowRight') cx += step;
		else if (e.key === 'ArrowUp') cy -= step;
		else if (e.key === 'ArrowDown') cy += step;
		else if (e.key === '+' || e.key === '=') k *= 1.5;
		else if (e.key === '-') k /= 1.5;
		else if (e.key === 'Escape' && root.classList.contains('is-full')) setFull(false);
		else return;
		e.preventDefault();
		render();
	});

	// ---------- size, theme, start ----------
	const resize = () => {
		const r = view.getBoundingClientRect();
		if (!r.width || !r.height) return;
		const first = vw === 0;
		const rel = k / kMin;
		vw = r.width;
		vh = r.height;
		kMin = Math.max(vw / WORLD, vh / (Y_BOTTOM - Y_TOP));
		k = first ? kMin : kMin * rel;
		clamp();
		cluster();
		draw();
		place();
	};
	readColors();
	new ResizeObserver(resize).observe(view);
	new MutationObserver(() => {
		readColors();
		draw();
	}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
	resize();
	paintList();
	// a link to one discovery: /uchebnik/otkrytiya/#ohm
	const fromHash = () => {
		const d = byId.get(decodeURIComponent(location.hash.slice(1)));
		if (d) select(d, true);
	};
	addEventListener('hashchange', fromHash);
	fromHash();
}
