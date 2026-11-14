/** Build-time text helpers of Predict.astro (server only). */
import katex from 'katex';

const UNITS = '°C|кДж|Дж|кг|Ом|В|А|с|раза?';

/** $…$ → KaTeX HTML; a space after a number (before its unit or «раза») → a no-break space. */
export const html = (s: string) =>
	s
		.split(/(\$[^$]+\$)/g)
		.map((part) =>
			part.length > 2 && part.startsWith('$') && part.endsWith('$')
				? katex.renderToString(part.slice(1, -1), { throwOnError: false, strict: 'ignore' })
				: part.replace(new RegExp(`(\\d) (${UNITS})(?=[\\s.,:;!?)»]|$)`, 'g'), '$1 $2'),
		)
		.join('');
