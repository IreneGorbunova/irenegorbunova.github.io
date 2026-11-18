/**
 * People and hands for the pictures of «Атмосферное давление», drawn in the style of the person of «Давление. Закон
 * Паскаля» (davlenie-zakon-paskalya/person.ts): flat colors, a dark outline, a round head in profile with a nose, an
 * eye, an ear and a cheek; arms and fingers as thick round strokes over a slightly thicker dark stroke (the outline).
 * Every function returns SVG markup in its own coordinates; the caller places it with a transform. Colors come from the
 * classes `ah-*` defined in AtmStyles.astro (fixed skin and hair colors, the outline adapts to the theme).
 */

const f = (v: number) => (Math.round(v * 10) / 10).toString();

/** A limb or a finger: a round stroke of width w over its outline. */
export const limb = (d: string, w: number, cls = 'ah-skin-s') =>
	`<path class="ah-outline" stroke-width="${f(w + 1.8)}" d="${d}"/><path class="${cls}" stroke-width="${f(w)}" d="${d}"/>`;

export type Mouth = 'smile' | 'purse' | 'open' | 'line';

/**
 * A head of radius r in profile, facing right, its center at (0, 0): hair over the top and the back, the ear, the eye
 * with a brow, the nose, a cheek and the mouth. `purse`: lips pursed on a straw at (0,93r; 0,56r).
 */
export const head = (r: number, mouth: Mouth = 'smile', hair = 'ah-hair') => {
	const p = (x: number, y: number) => `${f(x * r)} ${f(y * r)}`;
	let m = '';
	if (mouth === 'smile') m = `<path class="ah-mouth" d="M${p(0.6, 0.6)} Q${p(0.75, 0.68)} ${p(0.86, 0.57)}"/>`;
	if (mouth === 'line') m = `<path class="ah-mouth" d="M${p(0.62, 0.62)} L${p(0.86, 0.6)}"/>`;
	if (mouth === 'open') m = `<ellipse class="ah-mouth-open" cx="${f(0.8 * r)}" cy="${f(0.6 * r)}" rx="${f(0.09 * r)}" ry="${f(0.12 * r)}"/>`;
	if (mouth === 'purse') m = `<ellipse class="ah-lips" cx="${f(0.93 * r)}" cy="${f(0.56 * r)}" rx="${f(0.1 * r)}" ry="${f(0.085 * r)}"/>`;
	return (
		`<circle class="ah-skin" r="${f(r)}"/>` +
		`<path class="ah-skin" d="M${p(0.9, -0.05)} Q${p(1.32, 0.22)} ${p(0.92, 0.38)} Z"/>` +
		`<path class="${hair}" d="M${p(-0.92, 0.55)} Q${p(-1.18, -0.5)} ${p(-0.35, -1.04)} Q${p(0.55, -1.22)} ${p(1.0, -0.4)} Q${p(0.8, -0.46)} ${p(0.64, -0.6)} Q${p(0.38, -0.4)} ${p(0.02, -0.5)} Q${p(-0.32, -0.2)} ${p(-0.4, 0.22)} Q${p(-0.52, 0.62)} ${p(-0.78, 0.8)} Z"/>` +
		`<ellipse class="ah-skin ah-ear" cx="${f(-0.16 * r)}" cy="${f(0.12 * r)}" rx="${f(0.17 * r)}" ry="${f(0.23 * r)}"/>` +
		`<path class="ah-ear-in" d="M${p(-0.12, 0.02)} Q${p(-0.24, 0.12)} ${p(-0.12, 0.24)}"/>` +
		`<circle class="ah-cheek" cx="${f(0.5 * r)}" cy="${f(0.36 * r)}" r="${f(0.2 * r)}"/>` +
		`<circle class="ah-eye" cx="${f(0.56 * r)}" cy="${f(0.02 * r)}" r="${f(Math.max(1, 0.09 * r))}"/>` +
		`<path class="ah-brow" d="M${p(0.44, -0.16)} Q${p(0.56, -0.24)} ${p(0.7, -0.17)}"/>` +
		m
	);
};

/**
 * A hand gripping a vertical rod of radius a (px) whose axis is x = 0: the palm on the right of the rod, four fingers
 * across the near side of the rod from y0 down, each fw thick, their tips curling round the left edge. The thumb goes
 * from the top of the palm to `thumb` (a point in the same coordinates; null: no thumb, the caller draws it from
 * `thumbRoot`). The wrist is at the right; returns the markup and the wrist point, where the caller attaches the
 * forearm.
 */
export const fist = (a: number, y0: number, fw: number, thumb: { x: number; y: number } | null) => {
	const h = 4 * fw;
	const px = a + 0.3 * fw; // the edge of the palm at the rod
	const pw = 2.6 * fw; // palm thickness seen from the side
	const palm = `<path class="ah-skin" d="M${f(px)} ${f(y0 - 0.6 * fw)} Q${f(px + pw)} ${f(y0 - 1.3 * fw)} ${f(px + pw + 0.4 * fw)} ${f(y0 + 0.5 * h)} Q${f(px + pw)} ${f(y0 + h + 0.4 * fw)} ${f(px)} ${f(y0 + h)} Z"/>`;
	let fingers = '';
	for (let i = 0; i < 4; i++) {
		const y = y0 + (i + 0.5) * fw;
		fingers += limb(`M${f(px + 0.9 * fw)} ${f(y)} L${f(-a - 0.15 * fw)} ${f(y + 0.12 * fw)}`, fw * 0.92);
	}
	const t0 = { x: px + 0.6 * fw, y: y0 - 0.2 * fw };
	const thumbD = thumb ? thumbPath(t0, thumb, fw) : '';
	const nail = `<ellipse class="ah-nail" cx="${f(-a + 0.25 * fw)}" cy="${f(y0 + 0.5 * fw)}" rx="${f(0.3 * fw)}" ry="${f(0.22 * fw)}"/>`;
	return {
		svg: palm + fingers + nail + (thumb ? limb(thumbD, fw * 1.05) : ''),
		wrist: { x: px + pw * 0.8, y: y0 + 0.5 * h },
		thumbRoot: t0,
	};
};

/** The path of a thumb from its root to the tip, bulging away from the palm. */
export const thumbPath = (t0: { x: number; y: number }, tip: { x: number; y: number }, fw: number) =>
	`M${f(t0.x)} ${f(t0.y)} Q${f((t0.x + tip.x) / 2 + 0.6 * fw)} ${f(Math.min(t0.y, tip.y) - 0.4 * fw)} ${f(tip.x)} ${f(tip.y)}`;

/**
 * A hand held flat, palm down, seen from the thumb side: the wrist at (0, 0), the fingers to the left (fingertips at
 * x ≈ −97), the palm 22 px thick, the thumb under the index finger. About 0,55 px per millimeter: the hand is 18 см
 * long. The caller adds the forearm to the right of the wrist.
 */
export const flatHand = () =>
	`<path class="ah-skin" d="M-2 -10 Q-22 -12 -44 -9 L-52 -7 Q-56 0 -51 7 L-42 9 Q-20 12 0 9 Z"/>` +
	limb('M-46 -3 L-88 -1 Q-94 -0.5 -96 1', 9) +
	limb('M-45 2 L-86 4 Q-92 4.5 -94 6', 8) +
	`<path class="ah-nail" d="M-93 -3.4 Q-97 -3 -97 0 L-92 -0.2 Z"/>` +
	limb('M-16 6 Q-32 14 -50 13 L-60 12', 9) +
	`<path class="ah-crease" d="M-22 -6 Q-32 -4 -40 -5"/>`;

/**
 * A grown-up standing, in profile, facing right, its feet at (0, 0) and its height H px (about 7½ heads): head with
 * hair, neck, a shirt, the near arm hanging with the hand, trousers and shoes. For small figures that show a scale.
 */
export const standing = (H: number, shirt = 'ah-shirt') => {
	const u = H;
	const r = 0.066 * u;
	const hip = -0.5 * u;
	const sh = -0.8 * u;
	const W = 0.15 * u; // depth of the body
	const leg = 0.062 * u;
	return (
		limb(`M${f(-0.015 * u)} ${f(hip)} L${f(-0.03 * u)} ${f(-0.03 * u)}`, leg, 'ah-pants-s') +
		limb(`M${f(0.02 * u)} ${f(hip)} L${f(0.025 * u)} ${f(-0.03 * u)}`, leg, 'ah-pants-s') +
		`<path class="ah-shoe" d="M${f(-0.07 * u)} 0 V${f(-0.035 * u)} H${f(0.02 * u)} Q${f(0.08 * u)} ${f(-0.03 * u)} ${f(0.08 * u)} 0 Z"/>` +
		`<path class="ah-shoe" d="M${f(-0.035 * u)} 0 V${f(-0.035 * u)} H${f(0.055 * u)} Q${f(0.115 * u)} ${f(-0.03 * u)} ${f(0.115 * u)} 0 Z"/>` +
		`<path class="ah-skin" d="M${f(-0.03 * u)} ${f(sh + 0.02 * u)} V${f(sh - 0.05 * u)} H${f(0.03 * u)} V${f(sh + 0.02 * u)} Z"/>` +
		`<path class="${shirt}" d="M${f(-W / 2)} ${f(hip + 0.03 * u)} L${f(-W / 2)} ${f(sh + 0.03 * u)} Q${f(-W / 2)} ${f(sh)} ${f(-W / 4)} ${f(sh)} H${f(W / 4)} Q${f(W / 2)} ${f(sh)} ${f(W / 2 + 0.01 * u)} ${f(sh + 0.04 * u)} L${f(W / 2)} ${f(hip + 0.03 * u)} Z"/>` +
		`<path class="ah-pants" d="M${f(-W / 2)} ${f(hip + 0.02 * u)} H${f(W / 2)} V${f(hip + 0.07 * u)} H${f(-W / 2)} Z"/>` +
		limb(`M0 ${f(sh + 0.03 * u)} L${f(0.03 * u)} ${f(-0.5 * u)}`, 0.05 * u) +
		limb(`M0 ${f(sh + 0.03 * u)} L${f(0.012 * u)} ${f(sh + 0.15 * u)}`, 0.06 * u, shirt === 'ah-shirt' ? 'ah-sleeve-s' : 'ah-sleeve-b-s') +
		`<circle class="ah-skin" cx="${f(0.032 * u)}" cy="${f(-0.48 * u)}" r="${f(0.03 * u)}"/>` +
		`<g transform="translate(${f(0.01 * u)} ${f(sh - 0.05 * u - r * 0.9)})">${head(r)}</g>`
	);
};
