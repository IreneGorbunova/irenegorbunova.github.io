/**
 * When the pupil has done the action that checks a prediction. Each model reports its state with a CustomEvent
 * 'ig:model-state' on its root element (a non-visual hook, see the models); a trigger reads the event's detail and
 * says whether the outcome the question asks about is now on the screen. A factory, so a trigger may remember
 * earlier states (one memory per question block).
 */
export type Check = (detail: any) => boolean;

type Part = { kind: string; v: number; closed: boolean; broken: boolean; U: number; I: number };

export const TRIGGERS: Record<string, () => Check> = {
	// HeatDeps: the run in mode «Изменение температуры» has finished (all three heaters off).
	'heatdeps-dt': () => (d) => d?.done === true && d.mode === 'dt',

	// HeatRace: all five substances have reached 100 °C (water is the last at any mass).
	'heatrace-done': () => (d) => d?.done === true,

	// CircuitKit: the circuit works (current through the ammeter, a reading on the voltmeter) with one resistor, and its
	// resistance has grown at least twice since the smallest value seen at the same source voltage, while the
	// voltmeter reads the same and the current has dropped.
	'circuit-voltmeter-same': () => {
		let base: { sig: string; R: number; U: number; I: number } | null = null;
		return (d) => {
			const parts: Part[] = Array.isArray(d?.parts) ? d.parts : [];
			const of = (k: string) => parts.filter((p) => p.kind === k);
			const res = of('resistor');
			const am = of('ammeter');
			const vm = of('voltmeter');
			if (res.length !== 1 || !am.length || !vm.length) return false;
			const I = Math.abs(am[0].I);
			const U = Math.abs(vm[0].U);
			if (I < 0.002 || U < 0.05) return false;
			const sig = of('source')
				.map((p) => p.v)
				.join(',');
			const R = res[0].v;
			if (!base || base.sig !== sig || R < base.R) {
				base = { sig, R, U, I };
				return false;
			}
			return R >= 2 * base.R && Math.abs(U - base.U) < 0.05 && I < base.I;
		};
	},

	// OhmLab: the key has been opened.
	'ohmlab-key-open': () => (d) => d?.closed === false,
};
