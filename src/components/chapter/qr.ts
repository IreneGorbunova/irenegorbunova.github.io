// A small QR code encoder (byte mode, error correction level M, versions 1-40), written for this site so that no
// library is needed (first for the teacher's kit, now for «Конспект главы»). It follows ISO/IEC 18004: Reed-Solomon
// codes over GF(256), block interleaving, the eight masks scored by the standard penalty rules. Output: a module
// matrix or a self-contained SVG string. Only erasable TypeScript syntax, so Node runs it directly for tests.

/** Error-correction codewords per block, level M, index = version. */
const ECC_PER_BLOCK = [
	-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28,
	28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
];
/** Number of error-correction blocks, level M, index = version. */
const NUM_BLOCKS = [
	-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33,
	35, 37, 38, 40, 43, 45, 47, 49,
];
const ECL_BITS_M = 0;

/** Multiplication in GF(2^8) modulo x^8 + x^4 + x^3 + x^2 + 1. */
const gfMul = (x: number, y: number): number => {
	let z = 0;
	for (let i = 7; i >= 0; i--) {
		z = (z << 1) ^ ((z >>> 7) * 0x11d);
		z ^= ((y >>> i) & 1) * x;
	}
	return z & 0xff;
};

const rsDivisor = (degree: number): number[] => {
	const r: number[] = new Array(degree).fill(0);
	r[degree - 1] = 1;
	let root = 1;
	for (let i = 0; i < degree; i++) {
		for (let j = 0; j < degree; j++) {
			r[j] = gfMul(r[j], root);
			if (j + 1 < degree) r[j] ^= r[j + 1];
		}
		root = gfMul(root, 0x02);
	}
	return r;
};

const rsRemainder = (data: number[], divisor: number[]): number[] => {
	const r: number[] = divisor.map(() => 0);
	for (const b of data) {
		const factor = b ^ (r.shift() as number);
		r.push(0);
		divisor.forEach((d, i) => (r[i] ^= gfMul(d, factor)));
	}
	return r;
};

const rawDataModules = (ver: number): number => {
	let n = (16 * ver + 128) * ver + 64;
	if (ver >= 2) {
		const a = Math.floor(ver / 7) + 2;
		n -= (25 * a - 10) * a - 55;
		if (ver >= 7) n -= 36;
	}
	return n;
};

const dataCodewords = (ver: number): number => Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[ver] * NUM_BLOCKS[ver];

const alignmentPositions = (ver: number): number[] => {
	if (ver === 1) return [];
	const size = ver * 4 + 17;
	const n = Math.floor(ver / 7) + 2;
	const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
	const r = [6];
	for (let pos = size - 7; r.length < n; pos -= step) r.splice(1, 0, pos);
	return r;
};

const bit = (x: number, i: number): boolean => ((x >>> i) & 1) !== 0;

/** Encodes a string (UTF-8) as a QR code; returns the matrix of dark modules, [row][column]. */
export const qrMatrix = (text: string, forceMask = -1): boolean[][] => {
	const bytes = Array.from(new TextEncoder().encode(text));
	let ver = 1;
	for (; ver <= 40; ver++) {
		const countBits = ver <= 9 ? 8 : 16;
		if (4 + countBits + bytes.length * 8 <= dataCodewords(ver) * 8) break;
	}
	if (ver > 40) throw new Error('QR: text too long');
	const size = ver * 4 + 17;
	const capacity = dataCodewords(ver) * 8;

	// data bits: mode 0100 (byte), the count, the bytes, terminator, padding
	const bits: number[] = [];
	const put = (val: number, len: number) => {
		for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
	};
	put(0b0100, 4);
	put(bytes.length, ver <= 9 ? 8 : 16);
	for (const b of bytes) put(b, 8);
	put(0, Math.min(4, capacity - bits.length));
	put(0, (8 - (bits.length % 8)) % 8);
	for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) put(pad, 8);
	const data: number[] = [];
	for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));

	// blocks with their error-correction codewords, then interleaved
	const numBlocks = NUM_BLOCKS[ver];
	const eccLen = ECC_PER_BLOCK[ver];
	const raw = Math.floor(rawDataModules(ver) / 8);
	const numShort = numBlocks - (raw % numBlocks);
	const shortLen = Math.floor(raw / numBlocks);
	const divisor = rsDivisor(eccLen);
	const blocks: number[][] = [];
	for (let i = 0, k = 0; i < numBlocks; i++) {
		const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1));
		k += dat.length;
		const ecc = rsRemainder(dat, divisor);
		if (i < numShort) dat.push(0);
		blocks.push(dat.concat(ecc));
	}
	const codewords: number[] = [];
	for (let i = 0; i < blocks[0].length; i++)
		blocks.forEach((b, j) => {
			if (i !== shortLen - eccLen || j >= numShort) codewords.push(b[i]);
		});

	// function patterns
	const mod: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
	const fn: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
	const setF = (x: number, y: number, dark: boolean) => {
		mod[y][x] = dark;
		fn[y][x] = true;
	};
	for (let i = 0; i < size; i++) {
		setF(6, i, i % 2 === 0);
		setF(i, 6, i % 2 === 0);
	}
	const finder = (cx: number, cy: number) => {
		for (let dy = -4; dy <= 4; dy++)
			for (let dx = -4; dx <= 4; dx++) {
				const d = Math.max(Math.abs(dx), Math.abs(dy));
				const x = cx + dx;
				const y = cy + dy;
				if (x >= 0 && x < size && y >= 0 && y < size) setF(x, y, d !== 2 && d !== 4);
			}
	};
	finder(3, 3);
	finder(size - 4, 3);
	finder(3, size - 4);
	const al = alignmentPositions(ver);
	al.forEach((ax, i) =>
		al.forEach((ay, j) => {
			if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return;
			for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setF(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
		}),
	);
	const drawFormat = (mask: number) => {
		const d = (ECL_BITS_M << 3) | mask;
		let rem = d;
		for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
		const b = ((d << 10) | rem) ^ 0x5412;
		for (let i = 0; i <= 5; i++) setF(8, i, bit(b, i));
		setF(8, 7, bit(b, 6));
		setF(8, 8, bit(b, 7));
		setF(7, 8, bit(b, 8));
		for (let i = 9; i < 15; i++) setF(14 - i, 8, bit(b, i));
		for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(b, i));
		for (let i = 8; i < 15; i++) setF(8, size - 15 + i, bit(b, i));
		setF(8, size - 8, true);
	};
	drawFormat(0); // reserves the format area; redrawn with the chosen mask
	if (ver >= 7) {
		let rem = ver;
		for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
		const b = (ver << 12) | rem;
		for (let i = 0; i < 18; i++) {
			const a = size - 11 + (i % 3);
			const c = Math.floor(i / 3);
			setF(a, c, bit(b, i));
			setF(c, a, bit(b, i));
		}
	}

	// codewords in the zigzag order
	let i = 0;
	for (let right = size - 1; right >= 1; right -= 2) {
		if (right === 6) right = 5;
		for (let vert = 0; vert < size; vert++)
			for (let j = 0; j < 2; j++) {
				const x = right - j;
				const up = ((right + 1) & 2) === 0;
				const y = up ? size - 1 - vert : vert;
				if (!fn[y][x] && i < codewords.length * 8) {
					mod[y][x] = bit(codewords[i >>> 3], 7 - (i & 7));
					i++;
				}
			}
	}

	const masked = (m: number): boolean[][] =>
		mod.map((row, y) =>
			row.map((v, x) => {
				if (fn[y][x]) return v;
				let inv: boolean;
				switch (m) {
					case 0: inv = (x + y) % 2 === 0; break;
					case 1: inv = y % 2 === 0; break;
					case 2: inv = x % 3 === 0; break;
					case 3: inv = (x + y) % 3 === 0; break;
					case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
					case 5: inv = ((x * y) % 2) + ((x * y) % 3) === 0; break;
					case 6: inv = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
					default: inv = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
				}
				return v !== inv;
			}),
		);

	const penalty = (g: boolean[][]): number => {
		let p = 0;
		const lines = [...g, ...g[0].map((_, x) => g.map((r) => r[x]))];
		for (const line of lines) {
			let run = 1;
			for (let k = 1; k <= line.length; k++) {
				if (k < line.length && line[k] === line[k - 1]) run++;
				else {
					if (run >= 5) p += run - 2;
					run = 1;
				}
			}
			// finder-like 1011101 with four light modules on a side
			const s = line.map((v) => (v ? '1' : '0')).join('');
			const padded = '0000' + s + '0000';
			for (let k = padded.indexOf('1011101'); k !== -1; k = padded.indexOf('1011101', k + 1)) {
				if (padded.slice(k - 4, k) === '0000' || padded.slice(k + 7, k + 11) === '0000') p += 40;
			}
		}
		for (let y = 0; y + 1 < size; y++)
			for (let x = 0; x + 1 < size; x++) {
				const v = g[y][x];
				if (v === g[y][x + 1] && v === g[y + 1][x] && v === g[y + 1][x + 1]) p += 3;
			}
		const dark = g.reduce((a, r) => a + r.filter(Boolean).length, 0);
		p += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
		return p;
	};

	let best: boolean[][] = mod;
	let bestScore = Infinity;
	for (let m = 0; m < 8; m++) {
		if (forceMask >= 0 && m !== forceMask) continue;
		drawFormat(m);
		const g = masked(m);
		const sc = penalty(g);
		if (sc < bestScore) {
			bestScore = sc;
			best = g;
		}
	}
	return best;
};

/** The QR code as an SVG string: black modules on white with a quiet zone of 4 modules. */
export const qrSvg = (text: string, label = ''): string => {
	const m = qrMatrix(text);
	const n = m.length + 8;
	let d = '';
	m.forEach((row, y) =>
		row.forEach((v, x) => {
			if (v) d += `M${x + 4} ${y + 4}h1v1h-1z`;
		}),
	);
	const aria = label ? ` role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : ' aria-hidden="true"';
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"${aria}><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
};
