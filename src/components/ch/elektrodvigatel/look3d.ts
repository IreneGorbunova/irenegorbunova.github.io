/**
 * A tiny parallel-projection camera for FrameLook.astro.
 *
 * World: x to the right, y up, z towards the viewer (as in motor.ts and FramePic.astro: the field of the magnet
 * points along +x, the axle of the frame is the z axis). The camera is turned by the yaw a (about y) and then by
 * the pitch b (about the screen's horizontal axis); a = b = 0 is the view along the axle, from the front, exactly
 * as FramePic draws it. The projection is parallel, so a rigid frame keeps its true shape and its long sides,
 * parallel to the axle, shrink to points when we look along the axle.
 */
export type V3 = [number, number, number];
export type Cam = { a: number; b: number; s: number; f: V3; cx: number; cy: number };
export type Pr = { x: number; y: number; d: number };

export const camera = (c: Cam) => {
	const ca = Math.cos(c.a);
	const sa = Math.sin(c.a);
	const cb = Math.cos(c.b);
	const sb = Math.sin(c.b);
	const raw = (p: V3): V3 => {
		const x1 = p[0] * ca + p[2] * sa;
		const z1 = -p[0] * sa + p[2] * ca;
		return [x1, p[1] * cb - z1 * sb, p[1] * sb + z1 * cb];
	};
	const f = raw(c.f);
	/** Screen point (SVG units) and depth (larger is nearer the viewer). */
	const P = (p: V3): Pr => {
		const r = raw(p);
		return { x: c.cx + c.s * (r[0] - f[0]), y: c.cy - c.s * (r[1] - f[1]), d: r[2] };
	};
	/** Unit vector from the scene towards the viewer. */
	const dir: V3 = [-sa * cb, sb, ca * cb];
	const facing = (n: V3) => n[0] * dir[0] + n[1] * dir[1] + n[2] * dir[2];
	return { P, dir, facing, s: c.s };
};

export type Camera = ReturnType<typeof camera>;

/** The faces of a box with their outward normals and a shade name (front, top, side). */
export const boxFaces = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
	[
		{ n: [0, 0, 1], shade: 'front', p: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
		{ n: [0, 1, 0], shade: 'top', p: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]] },
		{ n: [0, -1, 0], shade: 'top', p: [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]] },
		{ n: [1, 0, 0], shade: 'side', p: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]] },
		{ n: [-1, 0, 0], shade: 'side', p: [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]] },
	] as { n: V3; shade: 'front' | 'top' | 'side'; p: V3[] }[];

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => {
	const u = clamp01(x);
	return u * u * (3 - 2 * u);
};
