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
	/** The city under the star or under a circle whose discoveries share one place; empty for a mixed circle. */
	city?: string;
}

const WORLD = 1000;
const Y_TOP = 166; // about 76° N: room above the northernmost stars (70° N) for the row of buttons
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
/** Stars nearer than this (world units, about 5–10 km) stand in one town: the Panthéon and the Observatory are Paris. */
const TOWN = 0.3;

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
	// The map goes round the globe: along the horizontal it repeats every WORLD units and scrolls without an end;
	// along the vertical it stops at the edges.
	const clamp = () => {
		k = Math.min(Math.max(k, kMin), K_MAX);
		const hh = vh / 2 / k;
		cy = hh * 2 >= Y_BOTTOM - Y_TOP ? (Y_TOP + Y_BOTTOM) / 2 : Math.min(Math.max(cy, Y_TOP + hh), Y_BOTTOM - hh);
	};
	/** The copy of the world point x that is nearest to the centre of the view. */
	const near = (x: number) => x + Math.round((cx - x) / WORLD) * WORLD;
	const toScreen = (x: number, y: number): [number, number] => [(near(x) - cx) * k + vw / 2, (y - cy) * k + vh / 2];

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
		// every copy of the world that the view touches
		const first = Math.floor((cx - vw / 2 / k) / WORLD);
		const lastCopy = Math.floor((cx + vw / 2 / k) / WORLD);
		for (let n = first; n <= lastCopy; n++) {
			ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (vw / 2 - (cx - n * WORLD) * k), dpr * (vh / 2 - cy * k));
			// meridians and parallels every 30°
			ctx.lineWidth = 1 / k;
			ctx.strokeStyle = colors.grid;
			ctx.beginPath();
			for (let lon = -180; lon < 180; lon += 30) {
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

	/** The difference a − b of two world x, the short way round the globe. */
	const dx = (a: number, b: number) => a - b - Math.round((a - b) / WORLD) * WORLD;
	const centre = (c: Cluster) => {
		const x0 = c.items[0].x;
		c.x = x0 + c.items.reduce((a, i) => a + dx(i.x, x0), 0) / c.items.length;
		c.y = c.items.reduce((a, i) => a + i.y, 0) / c.items.length;
	};
	const cluster = () => {
		// greedy: a star joins the first cluster nearer than CLUSTER_PX on the screen, else starts its own
		const out: Cluster[] = [];
		const r = CLUSTER_PX / k;
		for (const d of shown()) {
			const c = out.find((c) => Math.hypot(dx(c.x, d.x), c.y - d.y) < r);
			if (c) {
				c.items.push(d);
				centre(c);
			} else out.push({ items: [d], x: d.x, y: d.y });
		}
		// a cluster's centre drifts as stars join it and may come onto a neighbour: such circles would cover each
		// other (Paris, London and Cambridge on a phone), so they merge until every two stand apart
		for (let again = true; again; ) {
			again = false;
			for (let i = 0; i < out.length && !again; i++) {
				for (let j = i + 1; j < out.length; j++) {
					if (Math.hypot(dx(out[i].x, out[j].x), out[i].y - out[j].y) < r) {
						out[i].items.push(...out[j].items);
						out.splice(j, 1);
						centre(out[i]);
						again = true;
						break;
					}
				}
			}
		}
		for (const c of out) {
			c.items.sort((a, b) => a.year - b.year);
			const d = c.items[0];
			// the circle is named after the name most of its stars carry, when they all stand in one town or when
			// three quarters of them carry it (London with Slough)
			const n = new Map<string, number>();
			for (const i of c.items) n.set(cityOf(i), (n.get(cityOf(i)) ?? 0) + 1);
			const [name, most] = [...n].sort((a, b) => b[1] - a[1])[0];
			c.city = most >= 0.75 * c.items.length || c.items.every((i) => Math.hypot(dx(i.x, d.x), i.y - d.y) < TOWN) ? name : '';
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
					b.innerHTML = `<span class="dm-pin__star" aria-hidden="true"></span><span class="dm-pin__label" aria-hidden="true">${esc(cityOf(d))}</span>`;
				} else {
					b.setAttribute('aria-label', c.city ? `${c.city}: открытий здесь ${c.items.length}` : `Открытий рядом: ${c.items.length}. Приблизить`);
					b.textContent = String(c.items.length);
					b.insertAdjacentHTML('beforeend', `<span class="dm-pin__label" aria-hidden="true">${esc(c.city!)}</span>`);
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
	};
	// The names of the cities: shown when the map is close (and always at the chosen star), each to the right of its
	// star or, when that place is taken, to the left; a name that would cover another name or a star is left out.
	// The chosen star goes first, then the circles with more discoveries, then the single stars.
	let labelsAll = false;
	const measure = document.createElement('canvas').getContext('2d')!;
	const layoutLabels = () => {
		const cs = getComputedStyle(pins);
		const fs = 0.78 * parseFloat(getComputedStyle(document.documentElement).fontSize);
		measure.font = `${fs}px ${cs.fontFamily}`;
		const h = fs * 1.5;
		const pad = fs * 0.77; // the label's padding, 0.3rem on each side
		const all = (labelsAll = k > kMin * 5);
		const pos = clusters.map((c) => [dx(c.x, cx) * k, (c.y - cy) * k]);
		const rad = clusters.map((c) => (c.items.length > 1 ? 16 : 8));
		const boxes: number[][] = [];
		const free = (b: number[], own: number) =>
			boxes.every((o) => b[0] >= o[2] || o[0] >= b[2] || b[1] >= o[3] || o[1] >= b[3]) &&
			pos.every(([x, y], i) => i === own || b[0] >= x + rad[i] || x - rad[i] >= b[2] || b[1] >= y + rad[i] || y - rad[i] >= b[3]);
		const order = clusters
			.map((c, i) => i)
			.sort((a, b) => Number(clusters[b].el!.classList.contains('is-sel')) - Number(clusters[a].el!.classList.contains('is-sel')) || clusters[b].items.length - clusters[a].items.length);
		for (const i of order) {
			const c = clusters[i];
			const el = c.el!;
			let side = '';
			const sel = el.classList.contains('is-sel');
			// a circle of several places that holds the chosen star is named by the chosen star's city
			const text = c.city || (sel && selected ? cityOf(selected) : '');
			if (c.items.length > 1) el.querySelector('.dm-pin__label')!.textContent = text;
			if (text && (all || sel)) {
				const w = measure.measureText(text).width + pad;
				const off = c.items.length > 1 ? 14 : 12; // as in the CSS: the label starts 30 px from the button's edge
				const [x, y] = pos[i];
				const right = [x + off, y - h / 2, x + off + w, y + h / 2];
				const left = [x - off - w, y - h / 2, x - off, y + h / 2];
				if (free(right, i)) side = 'right';
				else if (free(left, i)) side = 'left';
				else if (sel) side = 'right'; // the chosen star is always named; it lies above its neighbours
				if (side) boxes.push(side === 'right' ? right : left);
			}
			el.classList.toggle('has-label', !!side);
			el.classList.toggle('dm-pin--left', side === 'left');
		}
	};
	const markSelected = () => {
		for (const c of clusters) c.el!.classList.toggle('is-sel', !!selected && c.items.includes(selected));
		layoutLabels();
	};

	let raf = 0;
	const render = () => {
		if (raf) return;
		raf = requestAnimationFrame(() => {
			raf = 0;
			clamp();
			if (Math.abs(Math.log(k / clusteredAt)) > 0.04) cluster();
			else if (k > kMin * 5 !== labelsAll) layoutLabels();
			draw();
			place();
		});
	};

	// ---------- flying ----------
	/** On a wide screen the card covers the east of the view: the free part of the map is narrower by this much. */
	const cardWidth = () => (!card.hidden && !cardMoved && getComputedStyle(card).position === 'absolute' ? card.offsetWidth + 12 : 0);
	let fly = 0;
	/** Flies so that the world point (tx, ty) comes to the middle of the free part of the map. */
	const flyTo = (tx: number, ty: number, tk: number, ms = 750, free = true) => {
		cancelAnimationFrame(fly);
		const [x0, y0, k0] = [cx, cy, k];
		tk = Math.min(Math.max(tk, kMin), K_MAX);
		tx = near(tx);
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
			else {
				cx = ((cx % WORLD) + WORLD) % WORLD;
				clusteredAt = 0; // the last frame is clustered at the final scale
			}
		};
		fly = requestAnimationFrame(step);
	};
	const fitBox = (w: number, s: number, e: number, n: number, ms?: number) => {
		const [x0, y0] = project(w, n);
		const [x1, y1] = project(e, s);
		flyTo((x0 + x1) / 2, (y0 + y1) / 2, Math.min((vw - cardWidth()) / (x1 - x0), vh / (y1 - y0)) * 0.92, ms);
	};
	const fitWorld = (ms?: number) => flyTo(WORLD / 2, (Y_TOP + Y_BOTTOM) / 2, kMin, ms, false);
	/** After a drag the centre comes back into the first copy of the world (nothing moves on the screen). */
	const settle = () => {
		cx = ((cx % WORLD) + WORLD) % WORLD;
	};

	// ---------- the card ----------
	const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
	/** The address carries the chosen discovery (/uchebnik/otkrytiya/#ohm), so the link can be shared. */
	const setHash = (id: string) => {
		if (location.hash.slice(1) !== id) history.replaceState(history.state, '', id ? `#${id}` : location.pathname + location.search);
	};
	const showIntro = () => {
		setHash('');
		selected = null;
		markSelected();
		root.classList.remove('has-card');
		card.hidden = false;
		card.querySelector<HTMLElement>('[data-dmap-intro]')!.hidden = false;
		card.querySelector<HTMLElement>('[data-dmap-body]')!.hidden = true;
		paintList();
	};
	/** The card goes away altogether; the button «i» on the map brings the first one back. */
	const closeCard = () => {
		setHash('');
		selected = null;
		markSelected();
		root.classList.remove('has-card');
		const focused = card.contains(document.activeElement);
		card.hidden = true;
		paintList();
		// the focus does not get lost with the card
		if (focused) view.focus({ preventScroll: true });
	};
	const cardBody = card.querySelector<HTMLElement>('[data-dmap-body]')!;
	const fillCard = (html: string) => {
		card.querySelector<HTMLElement>('[data-dmap-intro]')!.hidden = true;
		cardBody.hidden = false;
		cardBody.innerHTML = html;
		card.hidden = false;
		root.classList.add('has-card');
		card.scrollTop = 0;
	};
	/** The scale at which the star d parts from its nearest neighbour at another place. */
	const partingScale = (d: Item) => {
		let m = Infinity;
		for (const o of shown()) {
			const r = Math.hypot(dx(o.x, d.x), o.y - d.y);
			if (r >= TOWN) m = Math.min(m, r);
		}
		return (CLUSTER_PX * 1.3) / m;
	};
	const select = (d: Item, flyThere: boolean) => {
		selected = d;
		setHash(d.id);
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
		// close enough that the chosen star is not hidden in a circle with its neighbours (but not closer than a region)
		if (flyThere) flyTo(d.x, d.y, Math.max(k, Math.min(kMin * 9, 60), Math.min(partingScale(d), kMin * 24)));
		card.hidden = false;
	};
	const openCluster = (c: Cluster) => {
		const spread = Math.max(...c.items.map((i) => Math.hypot(near(i.x) - near(c.x), i.y - c.y)));
		if (spread * K_MAX > CLUSTER_PX * 1.5 && k < K_MAX * 0.7) {
			// the stars will part when the map comes closer
			const xs = c.items.map((i) => near(i.x));
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
			<p class="dm-card__when">${esc(c.city || cityOf(c.items[0]))}</p>
			<h3 class="dm-card__title">Открытий здесь: ${c.items.length}</h3>
			<ul class="dm-card__list">${c.items
				.map((d) => `<li><button type="button" class="dm-row" data-go="${d.id}"><span class="dm-dot" data-topic="${d.topic}"></span><span class="dm-row__when">${esc(d.when)}</span><span class="dm-row__title">${esc(d.title)}</span><span class="dm-row__who">${esc(d.who)}</span></button></li>`)
				.join('')}</ul>`);
		for (const x of clusters) x.el!.classList.toggle('is-sel', x === c);
	};
	card.addEventListener('click', (e) => {
		const t = (e.target as Element).closest<HTMLElement>('[data-go], [data-close]');
		if (!t) return;
		if ('close' in t.dataset) closeCard();
		else if (t.dataset.go && byId.has(t.dataset.go)) {
			const had = t === document.activeElement;
			const nav = [...card.querySelectorAll('.dm-card__nav .dm-btn')].indexOf(t);
			select(byId.get(t.dataset.go)!, true);
			// the card is drawn anew: the focus goes to the same button «Раньше» or «Позже» (or to the card's title)
			if (had) {
				const btns = [...card.querySelectorAll<HTMLButtonElement>('.dm-card__nav .dm-btn')];
				const to = nav >= 0 ? (btns[nav].disabled ? btns[1 - nav] : btns[nav]) : card.querySelector<HTMLElement>('[data-close]');
				to?.focus({ preventScroll: true });
			}
		}
	});
	// Escape closes the card first (when the focus is on the map or the map fills the screen), then the whole-screen view
	document.addEventListener('keydown', (e) => {
		if (e.key !== 'Escape' || e.defaultPrevented) return;
		const full = root.classList.contains('is-full');
		if (root.classList.contains('has-card') && (full || root.contains(document.activeElement))) closeCard();
		else if (full) setFull(false);
		else return;
		e.preventDefault();
	});

	// the floating card is moved by its grip (a wide screen only: on a phone the card stands under the map)
	let cardMoved = false;
	const grip = card.querySelector<HTMLElement>('[data-dmap-grip]')!;
	let g0: { x: number; y: number; tx: number; ty: number } | null = null;
	let tx = 0;
	let ty = 0;
	grip.addEventListener('pointerdown', (e) => {
		if (getComputedStyle(card).position !== 'absolute') return;
		g0 = { x: e.clientX, y: e.clientY, tx, ty };
		grip.setPointerCapture(e.pointerId);
		e.preventDefault();
	});
	grip.addEventListener('pointermove', (e) => {
		if (!g0) return;
		const box = view.getBoundingClientRect();
		const c = card.getBoundingClientRect();
		// the card stays inside the map
		const nx = g0.tx + e.clientX - g0.x;
		const ny = g0.ty + e.clientY - g0.y;
		tx = Math.min(Math.max(nx, tx + box.left - c.left + 6), tx + box.right - c.right - 6);
		ty = Math.min(Math.max(ny, ty + box.top - c.top + 6), Math.max(ty + box.top - c.top + 6, ty + box.bottom - c.bottom - 6));
		card.style.transform = `translate(${tx.toFixed(0)}px, ${ty.toFixed(0)}px)`;
		cardMoved = true;
	});
	const drop = () => (g0 = null);
	grip.addEventListener('pointerup', drop);
	grip.addEventListener('pointercancel', drop);

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
		// a card moved by hand comes back to its corner: the map has another size now
		tx = ty = 0;
		cardMoved = false;
		card.style.transform = '';
		document.documentElement.classList.toggle('dm-lock', on);
		root.querySelector('[data-act="full"]')!.setAttribute('aria-pressed', String(on));
		resize();
		// moving the map in the page drops the focus: it comes back to the map, so the keys work at once
		view.focus({ preventScroll: true });
	};
	root.addEventListener('click', (e) => {
		const act = (e.target as Element).closest<HTMLElement>('[data-act]')?.dataset.act;
		if (!act) return;
		if (act === 'in') flyTo(cx, cy, k * 1.8, 250, false);
		else if (act === 'out') flyTo(cx, cy, k / 1.8, 250, false);
		else if (act === 'world') fitWorld();
		else if (act === 'info') (card.hidden || !card.querySelector<HTMLElement>('[data-dmap-intro]')!.hidden ? (card.hidden ? showIntro() : closeCard()) : showIntro());
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
		if (!pts.size) settle();
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
