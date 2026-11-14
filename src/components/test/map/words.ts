/** Russian number agreement for the course map: «1 глава», «2 главы», «5 глав» (with a no-break space). */
export const word = (n: number, one: string, few: string, many: string) => {
	const d = n % 10;
	const dd = n % 100;
	return d === 1 && dd !== 11 ? one : d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many;
};
export const plural = (n: number, one: string, few: string, many: string) => `${n} ${word(n, one, few, many)}`;
/** «из 1 звезды», «из 5 звёзд», «из 21 звезды» (as in sky/Constellation.astro) */
export const ofStars = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'звезды' : 'звёзд');
