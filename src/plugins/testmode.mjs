// Test mode (pilot features, 14 Nov 2026): things being tried out are built into the pages but stay hidden.
// A visitor who opens any page with ?test=1 (or switches it on at /uchebnik/test/) sees them on this device;
// ?test=0 switches it off. Everybody else sees the approved pages unchanged.
//  - a block wrapped in an element with `data-ig-test` shows only in test mode;
//  - an element with `data-ig-test-hide` hides in test mode;
//  - scripts check `document.documentElement.dataset.igTestmode === '1'`.
// The two CSS rules are at the end of src/styles/textbook.css.

export const TEST_KEY = 'ig:test';

export const TEST_SCRIPT = `(() => {
	try {
		const q = new URLSearchParams(location.search).get('test');
		if (q === '1') localStorage.setItem('${TEST_KEY}', '1');
		if (q === '0') localStorage.removeItem('${TEST_KEY}');
		if (localStorage.getItem('${TEST_KEY}') === '1') document.documentElement.dataset.igTestmode = '1';
	} catch {}
})();`;
