// Checks the card schedule: node scripts/test-leitner.mjs
import assert from 'node:assert/strict';
import { addDays, answer, isDue, order } from '../src/components/formulas/leitner.mjs';

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

console.log('leitner: all checks passed');
