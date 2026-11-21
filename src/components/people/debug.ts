/**
 * The people kit, debug hook. With `?people-debug` in the page URL every figure publishes, each time it is posed, its
 * joints, bone lengths (declared), joint angles, hand poses, declared contacts (hand ↔ object point) and feet to
 * `window.__people[id]`; `window.__peopleFrames` counts the poses. The checker (physics_website_skill/scripts/
 * check_people.mjs) reads them. Without the flag nothing is computed.
 */
import { debugOn } from './core';

declare global {
	interface Window {
		__people?: Record<string, unknown>;
		__peopleFrames?: number;
	}
}

/** Publishes the state of figure `id`; `data` is only called when the debug flag is on. */
export const publish = (id: string, data: () => Record<string, unknown>) => {
	if (!debugOn()) return;
	const w = window;
	w.__people ??= {};
	w.__people[id] = { id, ...data() };
	w.__peopleFrames = (w.__peopleFrames ?? 0) + 1;
};
