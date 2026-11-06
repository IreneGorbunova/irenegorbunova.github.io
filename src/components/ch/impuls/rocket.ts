/**
 * A rocket at rest far from planets throws its fuel back as gas, in N equal portions.
 * Each portion leaves with speed u relative to the rocket (after the separation), so for one
 * ejection momentum conservation gives  0 = (M − Δm)·Δυ + Δm·(Δυ − u)  ⇒  Δυ = u·Δm / M,
 * where M is the mass before the ejection (frame of the rocket just before the ejection).
 * For N → ∞ the final speed tends to Tsiolkovsky's u·ln(M0/M).
 * Masses in tonnes, speeds in km/s, momenta in t·km/s = 10⁶ kg·m/s.
 */
export const MK = 1; // rocket without fuel, t

export interface Step {
	burned: number; // fuel thrown out so far, t
	M: number; // rocket mass after this ejection, t
	V: number; // rocket speed after this ejection, km/s
	g: number; // velocity of this portion of gas, km/s (negative = backwards)
}

export function burn(mt: number, u: number, N: number): Step[] {
	const dm = mt / N;
	let M = MK + mt;
	let V = 0;
	const out: Step[] = [];
	for (let k = 0; k < N; k++) {
		V += (u * dm) / M;
		M -= dm;
		out.push({ burned: (k + 1) * dm, M, V, g: V - u });
	}
	return out;
}

export const tsiolkovsky = (u: number, M0: number, M: number) => u * Math.log(M0 / M);
