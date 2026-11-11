/** Geometry shared by ElectroscopeScheme (markup and script) and EscInstrument, in SVG units. */
export const G = {
	VH: 336, // height of one instrument with its stand
	BY: 44, // centre of the ball
	BR: 20,
	CY: 214, // centre of the case
	RC: 78,
	PIV_L: 200, // the leaves hang from here
	LEAF: 74,
	PIV_N: 220, // axis of the needle
	SPAN: 6, // degrees per division of the scale
	NDIV: 10,
	RS: 54, // radius of the scale
	LEAF_MAX: 50, // degrees: the leaves never open wider
	Q_HALF: 3, // charge at which the leaves open to half of LEAF_MAX
} as const;
