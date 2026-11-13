/**
 * Which steps a chapter really has, read from its .mdx at build time (server only: never import it in a client
 * script). A chapter counts «вывод» only if its page has a step-by-step <Derivation> (directly or inside a component
 * it uses), and «вопрос» only if it uses a quiz that marks the right answer with .is-right. Otherwise the step could
 * never light and the chapter's stars would never be complete.
 */
import { PROBLEMS } from '../../data/problems/index.mjs';
import { needOf, type Step } from './progress';

const PAGES = import.meta.glob('/src/content/docs/uchebnik/**/*.mdx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const COMPONENTS = import.meta.glob('/src/components/**/*.astro', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** Does the page use (as a tag) a component imported from @components whose file passes the test? */
const uses = (page: string, test: (path: string, src: string) => boolean): boolean => {
	for (const m of page.matchAll(/^import\s+(\w+)\s+from\s+['"]@components\/([^'"]+\.astro)['"]/gm)) {
		const path = `/src/components/${m[2]}`;
		const src = COMPONENTS[path];
		if (src !== undefined && test(path, src) && new RegExp(`<${m[1]}[\\s/>]`).test(page)) return true;
	}
	return false;
};

const derivation = (path: string, src: string) => path.endsWith('/Derivation.astro') || src.includes('<Derivation');
const quiz = (path: string, src: string) => !path.endsWith('/sky/ChapterSky.astro') && src.includes('is-right');

/** The steps of the chapter with this entry id («uchebnik/8-klass/…/slug»). */
export const stepsOf = (id: string): Step[] => {
	const page = PAGES[`/src/content/docs/${id}.mdx`] ?? '';
	const slug = id.split('/').pop()!;
	return needOf(slug in PROBLEMS, uses(page, derivation), uses(page, quiz));
};
