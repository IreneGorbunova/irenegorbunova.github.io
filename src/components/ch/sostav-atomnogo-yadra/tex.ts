/**
 * Build-time KaTeX for this chapter: nuc(A, Z, 'U') writes ᴬ_Z U with A and Z in the chapter's two colors (classes nA and
 * nZ, NucStyles.astro); tex() renders a formula string (trust is on only for these classes).
 */
import katex from 'katex';

export const nuc = (A: number | string, Z: number | string, X: string) =>
	`{}^{\\htmlClass{nA}{${A}}}_{\\htmlClass{nZ}{${Z}}}\\mathrm{${X}}`;
export const tex = (s: string) => katex.renderToString(s, { throwOnError: false, trust: (c) => c.command === '\\htmlClass', strict: false });
