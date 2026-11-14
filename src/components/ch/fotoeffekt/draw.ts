/**
 * Drawing helpers shared by the pictures and the opening scenes of «Фотоэффект» (server and client side).
 */

/**
 * A photon drawn as a short wave packet: centre (x, y), direction `ang` (rad, 0 = to the right, y down),
 * length `len`, wavelength `wl` and amplitude `amp` in SVG units. The envelope is cos², so the ends are flat.
 */
export const packet = (x: number, y: number, ang: number, len: number, wl: number, amp: number) => {
	const c = Math.cos(ang);
	const s = Math.sin(ang);
	const n = Math.max(16, Math.round(len / 1.2));
	let d = '';
	for (let i = 0; i <= n; i++) {
		const u = -len / 2 + (len * i) / n;
		const env = Math.cos((Math.PI * u) / len) ** 2;
		const w = amp * env * Math.sin((2 * Math.PI * u) / wl);
		d += `${i ? 'L' : 'M'}${(x + u * c - w * s).toFixed(1)} ${(y + u * s + w * c).toFixed(1)}`;
	}
	return d;
};

/** Smoothstep on [0, 1], clamped. */
export const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Linear interpolation. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
