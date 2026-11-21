/**
 * Small helpers shared by the pictures and models of «Электростатика» and «Конденсаторы» (client and build side):
 * an arrow as two paths (shaft and head), numbers in the Russian way with powers of ten, and the constants.
 */
export const K = 9e9; // Н·м²/Кл², the constant of Coulomb's law as the school course rounds it
export const E0 = 8.85e-12; // Ф/м, the electric constant
export const QE = 1.6e-19; // Кл, the elementary charge

/** An arrow from (x1, y1) to (x2, y2): the shaft ends where the head begins. Empty when it is shorter than 0,5 px. */
export const arrow = (x1: number, y1: number, x2: number, y2: number, head = 8): { line: string; head: string } => {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const L = Math.hypot(dx, dy);
	if (L < 0.5) return { line: '', head: '' };
	const ux = dx / L;
	const uy = dy / L;
	const h = Math.min(head, L * 0.7);
	const bx = x2 - ux * h;
	const by = y2 - uy * h;
	const w = h * 0.5;
	const f = (v: number) => v.toFixed(1);
	return {
		line: `M${f(x1)} ${f(y1)} L${f(bx)} ${f(by)}`,
		head: `M${f(x2)} ${f(y2)} L${f(bx - uy * w)} ${f(by + ux * w)} L${f(bx + uy * w)} ${f(by - ux * w)} Z`,
	};
};

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

/** 3 significant digits in the Russian way: 0.0123 → «0,0123», 1234 → «1230», 12.0 → «12». */
export const sig = (v: number, n = 3): string => {
	if (v === 0) return '0';
	const p = Math.floor(Math.log10(Math.abs(v)));
	const d = Math.max(0, n - 1 - p);
	let s = (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
	if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
	const [a, b] = s.split('.');
	const int = a.replace('-', '−').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
	return b ? `${int},${b}` : int;
};

/** A number with a power of ten: 2.5e10 → «2,5·10¹⁰» (two significant digits). */
export const sci = (v: number, n = 2): string => {
	if (v === 0) return '0';
	const p = Math.floor(Math.log10(Math.abs(v)));
	let m = v / 10 ** p;
	let pp = p;
	if (Math.abs(Math.round(m * 10 ** (n - 1))) >= 10 ** n) {
		m /= 10;
		pp += 1;
	}
	const ms = (Math.round(m * 10 ** (n - 1)) / 10 ** (n - 1)).toFixed(n - 1).replace(/\.?0+$/, '').replace('.', ',').replace('-', '−');
	return `${ms}·10${String(pp).split('').map((c) => SUP[c]).join('')}`;
};
