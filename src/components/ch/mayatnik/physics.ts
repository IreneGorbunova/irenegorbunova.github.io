/** Physics shared by the pendulum chapter's models. SI units throughout. */

export const PLANETS = [
	{ id: 'earth', name: 'Земля', g: 9.8 },
	{ id: 'moon', name: 'Луна', g: 1.6 },
	{ id: 'mars', name: 'Марс', g: 3.7 },
] as const;

/** Period of small oscillations of a string pendulum. */
export const periodString = (l: number, g: number) => 2 * Math.PI * Math.sqrt(l / g);

/** Period of a spring pendulum. */
export const periodSpring = (m: number, k: number) => 2 * Math.PI * Math.sqrt(m / k);

/**
 * How many times the true period of a string pendulum swinging with amplitude θ0 (radians)
 * exceeds the small-oscillation period: 1 / AGM(1, cos(θ0/2)).
 */
export const largeAngleFactor = (theta0: number) => {
	let a = 1;
	let b = Math.cos(theta0 / 2);
	for (let i = 0; i < 8; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
	return 1 / a;
};

/** One Runge–Kutta step for x'' = acc(x, v). Returns the new [x, v]. */
export const rk4 = (
	x: number,
	v: number,
	h: number,
	acc: (x: number, v: number) => number,
): [number, number] => {
	const k1x = v;
	const k1v = acc(x, v);
	const k2x = v + (h / 2) * k1v;
	const k2v = acc(x + (h / 2) * k1x, k2x);
	const k3x = v + (h / 2) * k2v;
	const k3v = acc(x + (h / 2) * k2x, k3x);
	const k4x = v + h * k3v;
	const k4v = acc(x + h * k3x, k4x);
	return [x + (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x), v + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)];
};

/** The same Runge–Kutta step for a force that also depends on time: x'' = acc(t, x, v). */
export const rk4t = (
	t: number,
	x: number,
	v: number,
	h: number,
	acc: (t: number, x: number, v: number) => number,
): [number, number] => {
	const k1x = v;
	const k1v = acc(t, x, v);
	const k2x = v + (h / 2) * k1v;
	const k2v = acc(t + h / 2, x + (h / 2) * k1x, k2x);
	const k3x = v + (h / 2) * k2v;
	const k3v = acc(t + h / 2, x + (h / 2) * k2x, k3x);
	const k4x = v + h * k3v;
	const k4v = acc(t + h, x + h * k3x, k4x);
	return [x + (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x), v + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)];
};

/**
 * Swing pushed by short pushes. The seat hangs on ropes of length l; friction makes the swing lose
 * its amplitude as e^(−βt). One push is a force along the path lasting τ, shaped as half a sine;
 * on its own it changes the speed of the seat by dv.
 */
export const SWING = { l: 2.5, g: 9.8, beta: 0.08, tau: 0.25, dv: 0.45 } as const;

/** Acceleration of the seat along its path from one push, s seconds after the push began (m/s²). */
export const pushAcc = (s: number) =>
	s >= 0 && s < SWING.tau ? ((SWING.dv * Math.PI) / (2 * SWING.tau)) * Math.sin((Math.PI * s) / SWING.tau) : 0;

/** Angular acceleration of the swing (exact pendulum equation) with friction and an extra push. */
export const swingAcc = (th: number, w: number, push: number) =>
	-(SWING.g / SWING.l) * Math.sin(th) - 2 * SWING.beta * w + push / SWING.l;

/**
 * Amplitude (largest sideways displacement of the seat, m) that the swing settles to
 * when pushed every Tp seconds, starting from rest. Solved numerically with the same equation as the model.
 */
export const swingSteady = (Tp: number, h = 0.002, tEnd = 90) => {
	let th = 0;
	let w = 0;
	let max = 0;
	const acc = (t: number, x: number, v: number) => swingAcc(x, v, pushAcc(t % Tp));
	const from = tEnd - 2 * Math.max(Tp, 3.2);
	for (let t = 0; t < tEnd; t += h) {
		[th, w] = rk4t(t, th, w, h, acc);
		if (t >= from) max = Math.max(max, Math.abs(th));
	}
	return SWING.l * Math.sin(max);
};
