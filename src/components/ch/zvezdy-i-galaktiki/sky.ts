/**
 * The sky of the opening scenes of «Звёзды и галактики»: where a star stands in the sky of a given place and time, and
 * where it lands in the picture.
 *
 * Time: Greenwich mean sidereal time GMST = 280,46061837° + 360,98564736629° · (JD − 2451545) (IAU 1982, good to a
 * fraction of a second here); local sidereal time = GMST + east longitude. Height and azimuth (from the north through
 * the east) by the usual spherical triangle. Precession from J2000 to 2026 (0,36°) and refraction (half a degree at the
 * horizon) are left out: below a pixel or two at the scales of the scenes.
 *
 * The picture: a stereographic projection around a chosen direction (height, azimuth), k px per radian at the center,
 * east to the left, as the sky looks to a person facing south. Stereographic keeps the shapes of the constellations.
 *
 * Colors of stars by their B−V index (blackbody colors as seen by the eye, after the table of M. Charity, «What color
 * are the stars?»): B−V −0,3 blue-white … 0 white … 0,6 the Sun, yellowish white … 1,5 orange … 1,9 orange-red. The
 * eye sees them paler at night; the picture keeps the hue and gives them a little more saturation.
 * Sizes of the dots by V magnitude (a brighter star is a larger dot): r = 1,5 + 0,6·(2 − V), from 0,55 to 3 px.
 */
export const DEG = Math.PI / 180;

/** Julian date of a moment given in UT. */
export const julian = (y: number, m: number, d: number, hUT: number) => {
	if (m <= 2) {
		y -= 1;
		m += 12;
	}
	const A = Math.floor(y / 100);
	const B = 2 - A + Math.floor(A / 4);
	return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + hUT / 24;
};
/** Local sidereal time, degrees. */
export const lstDeg = (jd: number, lonE: number) => (((280.46061837 + 360.98564736629 * (jd - 2451545) + lonE) % 360) + 360) % 360;

/** Height and azimuth (degrees; azimuth from the north through the east) of a star at RA (h), Dec (°). */
export const altAz = (raH: number, dec: number, lat: number, lst: number) => {
	const H = (lst - raH * 15) * DEG;
	const d = dec * DEG;
	const p = lat * DEG;
	const alt = Math.asin(Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(H));
	const az = Math.atan2(-Math.cos(d) * Math.sin(H), Math.sin(d) * Math.cos(p) - Math.cos(d) * Math.sin(p) * Math.cos(H));
	return { alt: alt / DEG, az: ((az / DEG) % 360 + 360) % 360 };
};

/** Galactic (l, b) to equatorial J2000 (RA h, Dec °). North galactic pole RA 192,85948°, Dec 27,12825°, l of the celestial pole 122,93192°. */
export const galToEq = (l: number, b: number) => {
	const aG = 192.85948 * DEG;
	const dG = 27.12825 * DEG;
	const lN = 122.93192 * DEG;
	const L = l * DEG;
	const B = b * DEG;
	const sd = Math.sin(B) * Math.sin(dG) + Math.cos(B) * Math.cos(dG) * Math.cos(lN - L);
	const ra = aG + Math.atan2(Math.cos(B) * Math.sin(lN - L), Math.sin(B) * Math.cos(dG) - Math.cos(B) * Math.sin(dG) * Math.cos(lN - L));
	return { ra: ((((ra / DEG) % 360) + 360) % 360) / 15, dec: Math.asin(sd) / DEG };
};

export interface View {
	alt0: number; // the center of the picture, degrees
	az0: number;
	k: number; // px per radian at the center
	cx: number; // where the center lands
	cy: number;
}
/** Stereographic projection of (alt, az) for a person facing az0: east (smaller azimuth) to the left. */
export const project = (alt: number, az: number, v: View) => {
	const a = alt * DEG;
	const z = (az - v.az0) * DEG;
	const a0 = v.alt0 * DEG;
	const cosc = Math.sin(a0) * Math.sin(a) + Math.cos(a0) * Math.cos(a) * Math.cos(z);
	const kk = 2 / (1 + cosc);
	const X = kk * Math.cos(a) * Math.sin(z);
	const Y = kk * (Math.cos(a0) * Math.sin(a) - Math.sin(a0) * Math.cos(a) * Math.cos(z));
	return { x: v.cx + v.k * X, y: v.cy - v.k * Y };
};

// the color table: B−V → RGB (M. Charity's blackbody table, rounded)
const BV: [number, [number, number, number]][] = [
	[-0.3, [155, 178, 255]],
	[-0.15, [170, 191, 255]],
	[0.0, [202, 215, 255]],
	[0.3, [248, 247, 255]],
	[0.45, [255, 244, 234]],
	[0.65, [255, 238, 221]],
	[0.85, [255, 228, 196]],
	[1.05, [255, 214, 165]],
	[1.3, [255, 198, 134]],
	[1.55, [255, 184, 108]],
	[1.85, [255, 160, 78]],
];
/** The color of a star of index B−V, a little more saturated than the eye sees it at night (`sat` 1 = the table). */
export const starColor = (bv: number, sat = 1.6) => {
	const x = Math.min(1.85, Math.max(-0.3, bv));
	let i = 0;
	while (i < BV.length - 2 && BV[i + 1][0] < x) i++;
	const [b0, c0] = BV[i];
	const [b1, c1] = BV[i + 1];
	const t = (x - b0) / (b1 - b0);
	const c = c0.map((v, j) => v + (c1[j] - v) * t);
	const m = (c[0] + c[1] + c[2]) / 3;
	const s = c.map((v) => Math.round(Math.min(255, Math.max(0, m + (v - m) * sat))));
	return `rgb(${s[0]} ${s[1]} ${s[2]})`;
};
/** Radius of a star's dot by its V magnitude. */
export const starR = (V: number) => Math.min(3, Math.max(0.55, 1.5 + 0.6 * (2 - V)));
