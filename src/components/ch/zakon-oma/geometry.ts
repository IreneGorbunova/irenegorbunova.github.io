/**
 * Geometry of the circuit drawing in OhmLab (SVG units, viewBox 560 × 340) and of its graph.
 * Shared by the markup and the client script so that both draw the same picture.
 */
export const C = {
	W: 560,
	H: 340,
	XL: 40, // left side of the loop
	XR: 520, // right side of the loop
	YT: 100, // wire through the rheostat
	YS: 52, // wire from the rheostat slider
	YB: 270, // bottom wire (source, key, ammeter)
	XA: 150, // rheostat: the connected end
	XE: 390, // rheostat: the free end
	XBP: 143, // source: long plate «+»
	XBN: 157, // source: short plate «−»
	XK1: 318, // key: hinge
	XK2: 370, // key: contact
	XAM: 458, // ammeter centre (on the bottom wire)
	RAM: 32,
	XN1: 100, // voltmeter branch, left node (on the wire to the rheostat)
	XN2: 470, // voltmeter branch, right node (on the slider wire)
	XV: 290, // voltmeter centre
	YV: 185,
	RV: 36,
} as const;

/** Ranges of the model. */
export const RANGE = { UMAX: 12, RMIN: 4, RMAX: 40, IMAX: 3 } as const;

/** Slider position on the rheostat for the resistance r: the resistance is proportional to the included length. */
export const sliderX = (r: number) => C.XA + (r / RANGE.RMAX) * (C.XE - C.XA);

/** Graph I(U): viewBox 560 × 300. */
export const G = { W: 560, H: 300, X0: 64, Y0: 250, PW: 456, PH: 210 } as const;
export const gx = (u: number) => G.X0 + (u / RANGE.UMAX) * G.PW;
export const gy = (i: number) => G.Y0 - (i / RANGE.IMAX) * G.PH;

/**
 * A meter dial: the pivot sits below the centre, the scale is an arc of ±55°.
 * Returns the pivot, the needle length and the tick lines for the given number of divisions.
 */
export const dial = (cx: number, cy: number, r: number, divisions: number, majorEvery: number) => {
	const px = cx;
	const py = cy + 0.38 * r;
	const ra = 0.86 * r;
	const ticks = Array.from({ length: divisions + 1 }, (_, k) => {
		const a = ((-55 + (110 * k) / divisions) * Math.PI) / 180;
		const major = k % majorEvery === 0;
		const r1 = ra * (major ? 0.8 : 0.88);
		return {
			x1: px + r1 * Math.sin(a),
			y1: py - r1 * Math.cos(a),
			x2: px + ra * Math.sin(a),
			y2: py - ra * Math.cos(a),
			major,
		};
	});
	const arcStart = { x: px + ra * Math.sin((-55 * Math.PI) / 180), y: py - ra * Math.cos((55 * Math.PI) / 180) };
	const arcEnd = { x: px + ra * Math.sin((55 * Math.PI) / 180), y: arcStart.y };
	return { px, py, len: 0.92 * ra, ra, ticks, arcStart, arcEnd };
};
