/**
 * Geometry and physics of the DC motor model.
 *
 * 3D frame of reference: x to the right, y up, z towards the viewer. The field of the magnet points
 * along +x (from N on the left to S on the right). The axis of the frame is the z axis.
 * Oblique projection: planes z = const are drawn undistorted, so the frame turns on screen exactly
 * as it turns in reality; going back (z < 0) moves a point up and to the right.
 *
 * Physics (one rectangular frame, no iron): each long side of the frame carries the current i,
 * the field pushes it with the force F = k_F·|i|, always vertical (the side is perpendicular to the field).
 * The turning moment is M = F·d, the arm d = r·|cos φ|. With a commutator the current in the side on the
 * right always flows away from the viewer (for i > 0), so the moment always turns the frame the same way.
 * A turning frame is also a generator: the back emf e = k·ω·(arm factor) lowers the current, i = (U − e)/R.
 * That is why the current is largest when the motor starts and smaller when it runs fast.
 */
export const M = {
	W: 560,
	H: 430,
	CX: 288,
	CY: 170,
	AX: -0.5, // screen shift per unit of z (towards the viewer: left and down)
	AY: 0.32,
	r: 64, // radius of the frame, px
	L2: 120, // half-length of the long sides
	RP: 162, // inner faces of the poles
	PW: 58, // width of a pole
	PH: 88, // half-height of a pole
	D: 72, // half-depth of the magnet
	BASE: 38, // thickness of the bottom bar of the horseshoe magnet
	RC: 17, // radius of the commutator
	ZC: 150, // middle of the commutator along the axis
	ZR1: 138, // slip rings (mode without a commutator)
	ZR2: 164,
	GAP: 8, // half-width of the insulating gap between the half-rings, degrees
} as const;

export type Pt = [number, number];

export const P = (x: number, y: number, z: number): Pt => [M.CX + x + z * M.AX, M.CY - y + z * M.AY];

/** Physical constants of the model (SI units; the motor turns slowly on purpose). */
export const PH = {
	R: 2, // resistance of the winding, Ohm
	k: 0.4, // torque constant, N·m/A (= V·s)
	J: 0.05, // moment of inertia, kg·m²
	b: 0.05, // viscous friction, N·m·s
	t0: 0.02, // dry friction, N·m
};

export type State = { phi: number; w: number; i: number };

/** Arm factor: with a commutator |cos φ| (the right side always gets the same current direction). */
export const armFactor = (phi: number, comm: boolean) => (comm ? Math.abs(Math.cos(phi)) : Math.cos(phi));

/** Are the brushes on the insulating gaps between the half-rings? */
export const onGap = (phi: number) => Math.abs(Math.cos(phi)) < Math.sin((M.GAP * Math.PI) / 180);

/** Current through the battery (positive: it enters the frame through the right brush). */
export const current = (phi: number, w: number, V: number, comm: boolean, on: boolean) => {
	if (!on) return 0;
	if (comm && onGap(phi)) return 0;
	return (V + PH.k * w * armFactor(phi, comm)) / PH.R;
};

/** One step of the motion (semi-implicit Euler). Positive w is anticlockwise as seen from the front. */
export const step = (s: State, dt: number, V: number, comm: boolean, on: boolean) => {
	const i = current(s.phi, s.w, V, comm, on);
	const drive = -PH.k * i * armFactor(s.phi, comm) - PH.b * s.w;
	if (s.w === 0) {
		// at rest: dry friction holds the frame unless the moment is larger
		if (Math.abs(drive) > PH.t0) s.w = ((drive - PH.t0 * Math.sign(drive)) / PH.J) * dt;
	} else {
		const w1 = s.w + ((drive - PH.t0 * Math.sign(s.w)) / PH.J) * dt;
		s.w = Math.sign(w1) !== Math.sign(s.w) ? 0 : w1; // friction stops the frame, it never reverses it
	}
	s.phi += s.w * dt;
	s.i = i;
};
