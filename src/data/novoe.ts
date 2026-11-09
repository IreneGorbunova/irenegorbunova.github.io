/**
 * «Новое в учебнике» (home page and «Об учебнике»): the chapters changed last, read from the git history at build
 * time, so a new or edited chapter shows up by itself (deploy.yml checks out the full history for this).
 * A chapter's changes are the commits touching its page (src/content/docs/uchebnik/<grade>/<section>/<slug>.mdx) or
 * its models (src/components/ch/<slug>/). A commit touching SWEEP or more chapters at once is a change across the
 * site (links, a new section in every chapter) and does not count as news. A chapter is «новая» while its last
 * change falls on the day of its first commit or at most NEW_DAYS later (Moscow dates); after that it is «обновлена».
 */
import { execFileSync } from 'node:child_process';
import { getCollection } from 'astro:content';

const SWEEP = 4;
const NEW_DAYS = 1;
/** Day number of a time in Moscow (UTC+3 all year). */
const dayOf = (t: number) => Math.floor((t + 3 * 36e5) / 864e5);

export interface NovoeItem {
	href: string;
	title: string;
	grade: string;
	isNew: boolean;
	date: string;
}

const slugOf = (path: string) =>
	path.match(/^src\/content\/docs\/uchebnik\/\d+-klass\/[^/]+\/([^/]+)\.mdx?$/)?.[1] ?? path.match(/^src\/components\/ch\/([^/]+)\//)?.[1];

let cache: { first: Map<string, number>; last: Map<string, number> } | null | undefined;
/** slug → time of the first commit of its page, and → time of its last change; null without git. */
const history = () => {
	if (cache !== undefined) return cache;
	let log: string;
	try {
		log = execFileSync('git', ['log', '--format=%x01%cI', '--name-status', '-M', '--', 'src/content/docs/uchebnik', 'src/components/ch'], {
			encoding: 'utf8',
			maxBuffer: 64 << 20,
		});
	} catch {
		return (cache = null);
	}
	const first = new Map<string, number>();
	const last = new Map<string, number>();
	// newest commit first: the first time a slug is seen is its last change, the last time is its first commit
	for (const block of log.split('\x01').slice(1)) {
		const [head, ...rows] = block.trim().split('\n');
		const t = Date.parse(head);
		const pages = new Set<string>();
		const touched = new Set<string>();
		for (const row of rows) {
			const path = row.split('\t').pop() ?? '';
			const s = slugOf(path);
			if (!s) continue;
			touched.add(s);
			if (/\.mdx?$/.test(path)) pages.add(s);
		}
		for (const s of pages) first.set(s, t);
		if (touched.size < SWEEP) for (const s of touched) if (!last.has(s)) last.set(s, t);
	}
	return (cache = { first, last });
};

/** The n chapters changed last, newest first. */
export const novoe = async (n = 6): Promise<NovoeItem[]> => {
	const h = history();
	if (!h) return [];
	const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
	const year = new Date().getFullYear();
	const docs = await getCollection('docs', (d) => /^uchebnik\/\d+-klass\/[^/]+\/[^/]+$/.test(d.id) && !d.data.draft);
	return docs
		.flatMap((d) => {
			const slug = d.id.split('/').pop()!;
			const first = h.first.get(slug);
			if (first === undefined) return [];
			const t = Math.max(h.last.get(slug) ?? first, first);
			const when = new Date(t);
			const date = new Intl.DateTimeFormat('ru-RU', {
				day: 'numeric',
				month: 'long',
				...(when.getFullYear() !== year && { year: 'numeric' }),
				timeZone: 'Europe/Moscow',
			}).format(when);
			const item: NovoeItem = {
				href: `${base}${d.id}/`,
				title: d.data.title,
				grade: `${d.id.split('/')[1].split('-')[0]} класс`,
				isNew: dayOf(t) - dayOf(first) <= NEW_DAYS,
				date: date.replace(/ г\.$/, ''),
			};
			return [{ t, item }];
		})
		.sort((a, b) => b.t - a.t)
		.slice(0, n)
		.map((x) => x.item);
};
