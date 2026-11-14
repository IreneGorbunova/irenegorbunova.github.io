// «Посмотри в телескоп» in the browser (Telescope.astro). One picture of the object is shown twice in the same frame:
// on the left of the dividing line as the chosen telescope shows it, on the right as it is in the best picture.
// What the telescope does to the picture follows from its numbers (./data.ts):
//   - the smallest detail `theta` blurs it (a Gaussian blur whose width on the screen is theta in the frame's scale);
//   - its depth cuts the faint parts off (levels), the eye at the eyepiece and a photographic plate take the color;
//   - a single lens adds colored fringes (the red and the blue image differ in size).
// The round window at the bottom shows the telescope's true field of view: how large the object looked in it.

import type { Scope, Target } from './data';

interface Data {
	scopes: Scope[];
	targets: Target[];
	moons: { name: string; x: number }[];
	how: Record<string, string>;
	base: string;
}

const root = document.querySelector<HTMLElement>('[data-tscope]');
if (root) {
	const data = JSON.parse(root.querySelector('[data-ts-data]')!.textContent!) as Data;
	const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
	const stage = $('[data-ts-stage]');
	const telView = $('[data-ts-tel]');
	const refImg = $<HTMLImageElement>('[data-ts-ref]');
	const layers = [...root.querySelectorAll<HTMLElement>('[data-ts-ch]')];
	const telImgs = layers.map((l) => l.querySelector('img')!);
	const nothing = $('[data-ts-nothing]');
	const split = $('[data-ts-split]');
	const eye = $('[data-ts-eye]');
	const eyeGlass = $('[data-ts-eye-glass]');
	const eyeImg = $<HTMLImageElement>('[data-ts-eye-img]');
	const eyeDot = $('[data-ts-eye-dot]');
	const eyeMoons = $('[data-ts-eye-moons]');
	const EYE_PX = 148;

	let scope = data.scopes[1];
	let target = data.targets[0];
	let cut = 0.5; // the dividing line, share of the stage's width
	let zoom = 1;
	let px = 0; // pan, in pixels of the picture
	let py = 0;
	let sw = 0;
	let sh = 0;
	// «Как в жизни»: the air above a telescope on the ground makes the picture tremble and swim, and a telescope
	// without a clock drive lets the sky drift through its field of view
	let real = false;
	let blurBoost = 1; // the blur breathes with the air
	let shakeX = 0; // the picture's jitter, arc seconds
	let shakeY = 0;
	let drift = 0; // how far the sky has drifted in the eyepiece, arc seconds
	const onGround = () => !['hubble', 'webb'].includes(scope.id);
	const noDrive = () => ['galileo', 'newton', 'herschel', 'rosse'].includes(scope.id);

	// ---------- numbers in words ----------
	const num = (x: number, digits = 0) => x.toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
	const sig = (x: number, n = 2) => {
		const p = Math.pow(10, Math.floor(Math.log10(x)) - n + 1);
		return Math.round(x / p) * p;
	};
	const times = (x: number) => {
		const v = sig(x, 2);
		if (v < 1000) {
			const d = v % 10;
			const dd = v % 100;
			return `в ${num(v)} ${d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? 'раза' : 'раз'}`;
		}
		if (v < 1e6) return `в ${num(v / 1e3, 1)} тыс. раз`;
		if (v < 1e9) return `в ${num(v / 1e6, 0)} млн раз`;
		return `в ${num(v / 1e9, 0)} млрд раз`;
	};
	const diameter = (mm: number) => (mm < 10 ? `${num(mm)} мм` : mm < 1000 ? `${num(mm / 10, 1)} см` : `${num(mm / 1000, 2)} м`);
	const angle = (arcsec: number) => (arcsec >= 3600 ? `${num(arcsec / 3600, 1)}°` : arcsec >= 60 ? `${num(arcsec / 60, 1)}′` : `${num(arcsec, 2)}″`);
	const length = (km: number) => (km >= 100 ? `${num(sig(km))} км` : km >= 1 ? `${num(sig(km), 1)} км` : `${num(sig(km * 1000))} м`);

	// ---------- what the telescope does to the picture ----------
	/** The CSS filter of the telescope's image; `scale` is screen pixels per pixel of the element (blur is set before
	 *  the element's own scaling), `arcsecPerScreenPx` the scale of the view. */
	const looks = (arcsecPerScreenPx: number, scale: number) => {
		const fwhm = scope.theta / arcsecPerScreenPx; // on the screen
		let sigma = fwhm / 2.355 / scale;
		const mono = scope.how === 'plate';
		let t = 0; // the black point: what is fainter than this is not seen
		let gain = 1;
		let sat = mono ? 0 : 1;
		let visible = true;
		if (target.kind === 'stars') {
			t = Math.min(0.85, Math.max(0, 0.8 - (scope.mlim - 6) * 0.062));
			gain = 1 + 1.6 * t; // the few stars that are left are seen at full brightness
			if (scope.how === 'eye' || scope.how === 'visual') sat = 0.35;
		} else if (target.kind === 'faint') {
			const v = target.see?.[scope.id] ?? 1;
			visible = v > 0;
			t = 0.82 * Math.pow(1 - v, 1.2);
			gain = 1 + 0.5 * (1 - v);
			// what is left of a faint object has no sharp outline: at least a pixel and a half of blur
			if (t > 0.2) sigma = Math.max(sigma, 1.5 / scale);
			// the eye does not tell the colors of faint light
			if (scope.how === 'eye' || scope.how === 'visual') sat = 0;
		}
		// first what is too faint goes (out = (in − t) / (1 − t)), then the telescope blurs what is left
		const f = [];
		if (t > 0.005) f.push(`brightness(${(1 / (1 + t)).toFixed(3)})`, `contrast(${((1 + t) / (1 - t)).toFixed(3)})`);
		// (a blur wider than the whole frame is not drawn: paint() shows that the disc is not resolved)
		const shown = Math.min(sigma * blurBoost, 90 / scale);
		if (shown > 0.15) f.push(`blur(${shown.toFixed(2)}px)`);
		if (sat !== 1) f.push(`saturate(${sat})`);
		if (gain !== 1) f.push(`brightness(${gain.toFixed(2)})`);
		const color = mono ? 'plate' : sat < 1 ? 'eye' : 'full';
		return { filter: f.join(' ') || 'none', sigma, visible, color, fwhm };
	};

	// ---------- the frame ----------
	const fitScale = () => Math.min(sw / target.w, sh / target.h);
	const maxZoom = () => Math.max(1, 1.6 / fitScale());
	const clampPan = () => {
		const s = fitScale() * zoom;
		const mx = Math.max(0, (target.w * s - sw) / 2 / s);
		const my = Math.max(0, (target.h * s - sh) / 2 / s);
		px = Math.min(mx, Math.max(-mx, px));
		py = Math.min(my, Math.max(-my, py));
	};
	const paint = () => {
		if (!sw) return;
		zoom = Math.min(maxZoom(), Math.max(1, zoom));
		clampPan();
		const s = fitScale() * zoom;
		const arcsecPerPx = target.width / target.w / s; // per screen pixel
		const tf = (k = 1, jx = 0, jy = 0) =>
			`translate(-50%, -50%) translate(${jx.toFixed(2)}px, ${jy.toFixed(2)}px) scale(${(s * k).toFixed(5)}) translate(${(-px).toFixed(2)}px, ${(-py).toFixed(2)}px)`;
		refImg.style.transform = tf();
		const look = looks(arcsecPerPx, s);
		const chroma = Boolean(scope.chroma);
		telView.classList.toggle('is-chroma', chroma);
		const jx = shakeX / arcsecPerPx;
		const jy = shakeY / arcsecPerPx;
		telImgs.forEach((img, i) => {
			// a single lens: the red image is a little larger than the green one, the blue one smaller and softer
			const k = chroma ? [1.012, 1, 0.986][i] : 1;
			img.style.transform = tf(k, jx, jy);
			img.style.filter = chroma && i === 2 ? `${look.filter === 'none' ? '' : look.filter} blur(${(look.sigma * 0.9 + 1.2 / s).toFixed(2)}px)` : look.filter;
		});
		// a blur wider than the frame: the telescope shows no disc at all, the planet is a point of light
		const point = look.visible && target.kind === 'bright' && look.fwhm > Math.min(sw, sh) * 0.9;
		telView.classList.toggle('is-nothing', !look.visible || point);
		telView.classList.toggle('is-point', point);
		nothing.hidden = look.visible && !point;
		nothing.textContent = point
			? `${scope.id === 'eye' ? 'Глаз' : 'Этот телескоп'} не различает диска: планета видна как звезда. Так она выглядит в окне внизу`
			: scope.id === 'eye'
				? 'Глазом здесь ничего не видно'
				: 'В этот телескоп здесь ничего не видно';
		telView.style.clipPath = `inset(0 ${((1 - cut) * 100).toFixed(2)}% 0 0)`;
		split.style.left = `${(cut * 100).toFixed(2)}%`;
		split.setAttribute('aria-valuenow', String(Math.round(cut * 100)));

		// the true field of view
		const camera = scope.how === 'plate' || scope.how === 'ccd' || scope.how === 'ir';
		eye.classList.toggle('is-camera', camera);
		const es = ((target.width / scope.fov) * EYE_PX) / target.w; // screen pixels per pixel of the picture
		const size = (target.width / scope.fov) * EYE_PX; // the picture's width in the window
		const el = looks(scope.fov / EYE_PX, es);
		const dot = size < 5;
		// without a clock drive the sky drifts west through the field; the observer brings the object back
		const dx = (drift / scope.fov) * EYE_PX;
		eyeImg.hidden = dot || !el.visible;
		eyeImg.style.transform = `translate(-50%, -50%) translate(${dx.toFixed(1)}px, 0) scale(${es.toFixed(6)})`;
		eyeImg.style.filter = el.filter;
		eyeDot.hidden = !(dot && target.kind === 'bright');
		eyeDot.style.transform = `translate(${dx.toFixed(1)}px, 0)`;
		eyeMoons.style.transform = `translate(${dx.toFixed(1)}px, 0)`;
		// Jupiter's four moons: seen by every telescope, lost to the eye in the planet's glare
		const moons = target.id === 'jupiter' && scope.id !== 'eye';
		eyeMoons.replaceChildren(
			...(moons ? data.moons : [])
				.map((m) => ({ ...m, at: (m.x / scope.fov) * EYE_PX }))
				.filter((m) => Math.abs(m.at) < EYE_PX / 2 - 3)
				.map((m) => {
					const d = document.createElement('span');
					d.className = 'ts-eye__moon';
					d.style.left = `calc(50% + ${m.at.toFixed(1)}px)`;
					d.title = m.name;
					return d;
				}),
		);
		$('[data-ts-eye-cap]').textContent =
			scope.how === 'eye' ? `Так на небе: кружок ${angle(scope.fov)}` : camera ? `Кадр камеры: ${angle(scope.fov)}` : `В окуляре: ${scope.mag}×, поле ${angle(scope.fov)}`;
	};

	// ---------- the words ----------
	const describe = () => {
		$('[data-ts-year]').textContent = scope.year === 'всегда' ? 'без телескопа' : `${scope.year} год · ${scope.where}`;
		$('[data-ts-name]').textContent = scope.name;
		$('[data-ts-text]').textContent = scope.text;
		const stat = (k: string, v: string, sub = '') => {
			$(`[data-ts-stat="${k}"] dd`).innerHTML = `${v}${sub ? `<span>${sub}</span>` : ''}`;
		};
		$('[data-ts-stat="d"] dt').textContent = scope.id === 'eye' ? 'Зрачок' : scope.id === 'galileo' ? 'Линза' : 'Зеркало';
		stat('d', diameter(scope.d));
		stat('light', scope.id === 'eye' ? '—' : times((scope.d / 7) ** 2), scope.id === 'eye' ? 'с ним сравниваем' : 'больше, чем глаз');
		stat('theta', angle(scope.theta), target.km ? `${target.where} — от ${length(scope.theta * target.km)}` : '');
		stat('mlim', `${num(scope.mlim, 1)}ᵐ`, scope.id === 'eye' ? 'звёздная величина' : `${times(Math.pow(10, 0.4 * (scope.mlim - 6)))} слабее, чем видит глаз`);
		stat('how', data.how[scope.how]);
		// why the picture on the left may have no color
		const c = looks(1, 1).color;
		stat(
			'color',
			c === 'full' ? 'видны' : 'не видны',
			c === 'plate'
				? 'фотопластинки того времени были чёрно-белыми'
				: c === 'eye'
					? 'при слабом свете глаз различает только яркость, поэтому туманности и галактики в окуляре серые'
					: scope.how === 'eye' || scope.how === 'visual'
						? 'Луна и планеты яркие, их цвет глаз различает'
						: '',
		);
		$('[data-ts-real-note]').textContent = !real
			? ''
			: onGround()
				? noDrive()
					? 'Воздух над телескопом дрожит, и изображение «кипит». Часового привода нет: небо уплывает из поля зрения, и трубу приходится подправлять.'
					: scope.id === 'eye'
						? 'Воздух дрожит, но при таком малом увеличении этого почти не заметно: звёзды только мерцают.'
						: 'Воздух над телескопом дрожит, и изображение «кипит». Телескоп сам поворачивается вслед за небом.'
				: 'Над телескопом нет воздуха: изображение неподвижно.';
		const note = target.notes[scope.id];
		$('[data-ts-note]').textContent = note ?? '';
		$('[data-ts-note]').hidden = !note;
		$('[data-ts-tag-l]').textContent = scope.id === 'eye' ? 'Глазом' : `${scope.short}, ${scope.year}`;
		$('[data-ts-tag-r]').textContent = target.ref;
		$('[data-ts-about]').textContent = `${target.about} ${target.size}.`;
		$('[data-ts-credit]').innerHTML = `Снимок: ${target.credit}, общественное достояние. <a href="${target.source}">Wikimedia Commons</a>`;
		for (const b of root.querySelectorAll<HTMLElement>('[data-scope]')) b.setAttribute('aria-pressed', String(b.dataset.scope === scope.id));
		for (const b of root.querySelectorAll<HTMLElement>('[data-target]')) b.setAttribute('aria-pressed', String(b.dataset.target === target.id));
	};

	const setTarget = (t: Target) => {
		target = t;
		zoom = 1;
		px = py = 0;
		const src = `${data.base}telescope/${t.file}.webp`;
		stage.classList.add('is-loading');
		refImg.onload = () => stage.classList.remove('is-loading');
		for (const img of [refImg, ...telImgs, eyeImg]) {
			img.width = t.w;
			img.height = t.h;
			img.src = src;
		}
		if (refImg.complete) stage.classList.remove('is-loading');
		describe();
		paint();
	};
	const setScope = (s: Scope) => {
		scope = s;
		describe();
		paint();
		root.querySelector<HTMLElement>(`[data-scope="${s.id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
	};

	// ---------- the whole screen ----------
	// The page's column is left for the time (the site's menu would lie over the view); Escape comes back.
	const home = document.createComment('телескоп');
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
		document.documentElement.classList.toggle('ts-lock', on);
		$('[data-ts-full]').setAttribute('aria-pressed', String(on));
		if (!on) stage.scrollIntoView({ block: 'nearest' });
	};
	$('[data-ts-full]').addEventListener('click', () => setFull(!root.classList.contains('is-full')));
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && root.classList.contains('is-full')) setFull(false);
	});

	// ---------- «Как в жизни» ----------
	// The seeing: the picture wanders by about half an arc second and its sharpness breathes (three slow sines stand
	// for the turbulent air). The drift: 15″ of sky per second, as the Earth turns; when the object nears the edge of
	// the field, the observer brings it back.
	const realBtn = $('[data-ts-real]');
	let rafReal = 0;
	let t0 = 0;
	const wave = (t: number, a: number, b: number, c: number) => (Math.sin(a * t) + Math.sin(b * t + 1.3) + Math.sin(c * t + 2.1)) / 3;
	const tick = (now: number) => {
		if (!real) return;
		const t = (now - t0) / 1000;
		if (onGround()) {
			shakeX = 0.55 * wave(t, 5.1, 8.3, 13.7);
			shakeY = 0.55 * wave(t, 4.3, 9.1, 12.2);
			blurBoost = 1 + 0.35 * (0.5 + 0.5 * wave(t, 2.2, 3.9, 6.1));
		} else shakeX = shakeY = 0;
		if (noDrive()) {
			const span = scope.fov * 0.62; // from the east side of the field to the west side, then back
			drift = span / 2 - ((t * 15) % span);
		} else drift = 0;
		paint();
		rafReal = requestAnimationFrame(tick);
	};
	realBtn.addEventListener('click', () => {
		real = !real;
		realBtn.setAttribute('aria-pressed', String(real));
		cancelAnimationFrame(rafReal);
		shakeX = shakeY = drift = 0;
		blurBoost = 1;
		if (real) {
			t0 = performance.now();
			rafReal = requestAnimationFrame(tick);
		}
		describe();
		paint();
	});

	// ---------- choosing ----------
	let timer = 0;
	const play = $('[data-ts-play]');
	const stop = () => {
		clearInterval(timer);
		timer = 0;
		play.setAttribute('aria-pressed', 'false');
		play.querySelector('span')!.textContent = 'Пройти 400 лет';
	};
	root.addEventListener('click', (e) => {
		const el = (e.target as Element).closest<HTMLElement>('[data-scope], [data-target], [data-ts-zoom], [data-ts-play]');
		if (!el) return;
		if (el.dataset.scope) {
			stop();
			setScope(data.scopes.find((s) => s.id === el.dataset.scope)!);
		} else if (el.dataset.target) setTarget(data.targets.find((t) => t.id === el.dataset.target)!);
		else if (el.dataset.tsZoom) {
			zoom *= el.dataset.tsZoom === 'in' ? 1.6 : 1 / 1.6;
			paint();
		} else if (timer) stop();
		else {
			// from the eye to the newest telescope, a step every few seconds
			let i = data.scopes.indexOf(scope) >= data.scopes.length - 1 ? 0 : data.scopes.indexOf(scope);
			setScope(data.scopes[i]);
			play.setAttribute('aria-pressed', 'true');
			play.querySelector('span')!.textContent = 'Остановить';
			timer = window.setInterval(() => {
				i++;
				if (i >= data.scopes.length) return stop();
				setScope(data.scopes[i]);
				if (i === data.scopes.length - 1) stop();
			}, 2600);
		}
	});

	// ---------- the dividing line, dragging, zooming ----------
	const local = (e: { clientX: number; clientY: number }) => {
		const r = stage.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	};
	let dragLine = false;
	split.addEventListener('pointerdown', (e) => {
		dragLine = true;
		split.setPointerCapture(e.pointerId);
		e.stopPropagation();
		e.preventDefault();
	});
	split.addEventListener('pointermove', (e) => {
		if (!dragLine) return;
		cut = Math.min(1, Math.max(0, local(e).x / sw));
		paint();
	});
	const endLine = () => (dragLine = false);
	split.addEventListener('pointerup', endLine);
	split.addEventListener('pointercancel', endLine);
	split.addEventListener('keydown', (e) => {
		if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
		cut = e.key === 'Home' ? 0 : e.key === 'End' ? 1 : Math.min(1, Math.max(0, cut + (e.key === 'ArrowLeft' ? -0.05 : 0.05)));
		e.preventDefault();
		e.stopPropagation();
		paint();
	});

	const pts = new Map<number, { x: number; y: number }>();
	let pinch = 0;
	stage.addEventListener('pointerdown', (e) => {
		if ((e.target as Element).closest('button, [data-ts-split]')) return;
		pts.set(e.pointerId, local(e));
		stage.setPointerCapture(e.pointerId);
		if (pts.size === 2) {
			const [a, b] = [...pts.values()];
			pinch = Math.hypot(a.x - b.x, a.y - b.y);
		}
	});
	stage.addEventListener('pointermove', (e) => {
		const p0 = pts.get(e.pointerId);
		if (!p0) return;
		const p = local(e);
		pts.set(e.pointerId, p);
		const s = fitScale() * zoom;
		if (pts.size === 1) {
			px -= (p.x - p0.x) / s;
			py -= (p.y - p0.y) / s;
			stage.classList.toggle('is-drag', zoom > 1);
		} else if (pts.size === 2) {
			const [a, b] = [...pts.values()];
			const dist = Math.hypot(a.x - b.x, a.y - b.y);
			if (pinch > 0) zoom *= dist / pinch;
			pinch = dist;
		}
		paint();
	});
	const up = (e: PointerEvent) => {
		pts.delete(e.pointerId);
		pinch = 0;
		stage.classList.remove('is-drag');
	};
	stage.addEventListener('pointerup', up);
	stage.addEventListener('pointercancel', up);
	stage.addEventListener(
		'wheel',
		(e) => {
			if (!(e.ctrlKey || e.metaKey)) return; // the page scrolls; with Ctrl (or a pinch on a touchpad) the picture zooms
			e.preventDefault();
			const before = zoom;
			zoom = Math.min(maxZoom(), Math.max(1, zoom * Math.exp(-e.deltaY * (Math.abs(e.deltaY) < 20 ? 0.02 : 0.0022))));
			// the point under the cursor stays where it is
			const { x, y } = local(e);
			const f = fitScale();
			px += (x - sw / 2) / (f * before) - (x - sw / 2) / (f * zoom);
			py += (y - sh / 2) / (f * before) - (y - sh / 2) / (f * zoom);
			paint();
		},
		{ passive: false },
	);
	stage.addEventListener('keydown', (e) => {
		if ((e.target as Element).closest('[data-ts-split]')) return;
		if (e.key === '+' || e.key === '=') zoom *= 1.4;
		else if (e.key === '-') zoom /= 1.4;
		else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
			const i = data.scopes.indexOf(scope) + (e.key === 'ArrowRight' ? 1 : -1);
			if (data.scopes[i]) setScope(data.scopes[i]);
		} else return;
		e.preventDefault();
		paint();
	});

	new ResizeObserver(() => {
		const r = stage.getBoundingClientRect();
		sw = r.width;
		sh = r.height;
		paint();
	}).observe(stage);
	setTarget(target);
}
