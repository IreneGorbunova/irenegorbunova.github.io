/**
 * The Sun as seen from the Earth in 2026 (low-precision formulas of the Astronomical Almanac, good to ~0,01°
 * in the Sun's longitude and ~0,0001 AU in distance — far more than the pictures need).
 */

export const DEG = Math.PI / 180;
export const AU_MKM = 149.598; // 1 а.е. в миллионах км
export const I0_MEAN = 1361; // Вт/м² at 1 AU (the solar constant)
export const EPS = 23.44; // the tilt of the Earth's axis, degrees

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/** Days from J2000.0 (1 Jan 2000, 12:00 UT) to noon UT of the given day of 2026 (0 = 1 January). */
const D0 = (Date.UTC(2026, 0, 1, 12) - Date.UTC(2000, 0, 1, 12)) / 864e5;

export interface SunAt {
	/** The Sun's ecliptic longitude, degrees (0 at the March equinox, 90 at the June solstice). */
	lon: number;
	/** The Earth–Sun distance, AU. */
	r: number;
	/** The Sun's declination, degrees. */
	dec: number;
}

export const sunAt = (day: number, tilt = EPS): SunAt => {
	const d = D0 + day;
	const g = (357.529 + 0.98560028 * d) * DEG;
	const q = 280.459 + 0.98564736 * d;
	const lon = (((q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360) + 360) % 360;
	const r = 1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g);
	const dec = Math.asin(Math.sin(tilt * DEG) * Math.sin(lon * DEG)) / DEG;
	return { lon, r, dec };
};

/** «21 июня» for a day of 2026 (0 = 1 January). */
export const dateLabel = (day: number) => {
	const t = new Date(Date.UTC(2026, 0, 1 + Math.round(day)));
	return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}`;
};

/** Noon height of the Sun, degrees (negative: the Sun stays below the horizon all day). */
export const noonHeight = (lat: number, dec: number) => 90 - Math.abs(lat - dec);

/**
 * Length of the day in hours from cos H₀ = −tg φ · tg δ (the centre of the Sun, no refraction).
 * Returns 24 for the polar day and 0 for the polar night.
 */
export const dayLength = (lat: number, dec: number) => {
	if (Math.abs(lat) > 89.999) return dec * Math.sign(lat) > 0 ? 24 : dec * Math.sign(lat) < 0 ? 0 : 12;
	const c = -Math.tan(lat * DEG) * Math.tan(dec * DEG);
	if (c <= -1) return 24;
	if (c >= 1) return 0;
	return (2 * Math.acos(c)) / DEG / 15;
};
