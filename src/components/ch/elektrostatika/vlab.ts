/**
 * Labels of vectors in the pictures and models of «Электростатика» (Irina, 28 Nov 2026: a force, a field strength or
 * any vector named as a vector carries an arrow over its letter). A label is SVG markup: the letter in the italic math
 * font, an optional subscript, and a small arrow drawn as a path over the letter (a combining arrow ⃗ is placed
 * differently by every font). The origin of the markup is the middle of the label on its baseline; the caller moves
 * it with a transform. `fs` is the font size of the letter in user units; the subscript is 0,7 of it.
 * Width estimate: an italic capital about 0,66 fs, a subscript digit about 0,4 fs (used to center the label and by
 * the callers to keep labels apart).
 */
export const vlabWidth = (sub = '', fs = 14, tail = '') => 0.66 * fs + sub.length * 0.4 * fs + (sub ? 0.06 * fs : 0) + tail.length * 0.52 * fs;

/** SVG markup of a vector label centered on (0, 0) at its baseline; `cls` adds a color class (vl--gold, vl--red …); `tail` is plain text after it («/4»). */
export const vlabSvg = (sym: string, sub = '', cls = '', fs = 14, tail = ''): string => {
	const w = vlabWidth(sub, fs, tail);
	const x0 = -w / 2;
	const f = (v: number) => v.toFixed(1);
	// the arrow over the letter: over its upper part, shifted right with the italic slant
	const a0 = x0 + 0.14 * fs;
	const a1 = x0 + 0.8 * fs;
	const y = -0.9 * fs;
	const h = Math.max(1.8, 0.17 * fs);
	const d = `M${f(a0)} ${f(y)} H${f(a1)} M${f(a1 - h)} ${f(y - h * 0.85)} L${f(a1)} ${f(y)} L${f(a1 - h)} ${f(y + h * 0.85)}`;
	const subT = sub ? `<tspan class="vl__sub" style="font-size:${f(0.7 * fs)}px" dy="${f(0.28 * fs)}">${sub}</tspan>` : '';
	const tailT = tail ? `<tspan class="vl__sub" dy="${sub ? f(-0.28 * fs) : 0}">${tail}</tspan>` : '';
	return `<g class="vl ${cls}"><path class="vl__halo" d="${d}"/><path class="vl__arr" d="${d}"/><text class="vl__t" x="${f(x0)}" y="0" style="font-size:${fs}px">${sym}${subT}${tailT}</text></g>`;
};
