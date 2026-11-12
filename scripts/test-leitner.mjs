// Checks the card schedule: node scripts/test-leitner.mjs
import assert from 'node:assert/strict';
import { KEY, MOVED, addDays, answer, isDue, load, order } from '../src/components/formulas/leitner.mjs';

assert.equal(addDays('2026-01-31', 1), '2026-02-01');
assert.equal(addDays('2026-12-31', 1), '2027-01-01');
assert.equal(addDays('2028-02-28', 1), '2028-02-29');
assert.equal(addDays('2026-03-28', 2), '2026-03-30'); // daylight-saving weekend

const day = '2026-11-07';
assert.deepEqual(answer(undefined, true, day), { box: 2, due: '2026-11-09' });
assert.deepEqual(answer(undefined, false, day), { box: 1, due: '2026-11-08' });
assert.deepEqual(answer({ box: 4, due: day }, true, day), { box: 5, due: '2026-11-23' });
assert.deepEqual(answer({ box: 5, due: day }, true, day), { box: 5, due: '2026-11-23' });
assert.deepEqual(answer({ box: 5, due: day }, false, day), { box: 1, due: '2026-11-08' });

assert.equal(isDue(undefined, day), false);
assert.equal(isDue({ box: 2, due: day }, day), true);
assert.equal(isDue({ box: 2, due: '2026-11-08' }, day), false);

const states = { a: { box: 3, due: '2026-11-20' }, b: { box: 1, due: '2026-11-07' }, d: { box: 2, due: '2026-11-01' } };
assert.deepEqual(order(['a', 'b', 'c', 'd', 'e'], states, day), ['d', 'b', 'c', 'e', 'a']);

// cards moved to another chapter keep their progress
const tok = 'uchebnik/8-klass/elektricheskie-yavleniya/elektricheskiy-tok';
const sila = 'uchebnik/8-klass/elektricheskie-yavleniya/sila-toka-napryazhenie-soprotivlenie';
const pole = 'uchebnik/8-klass/elektromagnitnye-yavleniya/magnitnoe-pole-toka';
const em = 'uchebnik/8-klass/elektromagnitnye-yavleniya/elektromagnity';
assert.equal(Object.keys(MOVED).length, 13);
assert.equal(MOVED[`${tok}/reostat`], `${sila}/reostat`);
assert.equal(MOVED[`${pole}/rele`], `${em}/rele`);
assert.equal(MOVED[`${pole}/katushka`], undefined);
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v) };
store[KEY] = JSON.stringify({
	[`${tok}/sila-toka`]: { box: 3, due: '2026-11-10' },
	[`${pole}/zvonok`]: { box: 2, due: '2026-11-09' },
	[`${pole}/elektromagnit`]: { box: 4, due: '2026-11-20' },
	[`${em}/elektromagnit`]: { box: 1, due: '2026-11-08' },
	[`${pole}/katushka`]: { box: 5, due: '2026-11-30' },
});
assert.deepEqual(load(), {
	[`${sila}/sila-toka`]: { box: 3, due: '2026-11-10' },
	[`${em}/zvonok`]: { box: 2, due: '2026-11-09' },
	[`${em}/elektromagnit`]: { box: 1, due: '2026-11-08' }, // a state already saved under the new key wins
	[`${pole}/katushka`]: { box: 5, due: '2026-11-30' },
});

console.log('leitner: all checks passed');
