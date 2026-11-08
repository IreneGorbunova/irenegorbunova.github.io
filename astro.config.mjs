// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { satteri } from '@astrojs/markdown-satteri';
import { katexPlugin } from './src/plugins/katex.mjs';
import { motionCss, MOTION_SCRIPT } from './src/plugins/motion.mjs';

const GOATCOUNTER = 'https://irenegorbunova.goatcounter.com/count';

const grade = (/** @type {number} */ n, /** @type {any[]} */ chapters = []) => ({
	label: `${n} класс`,
	collapsed: true,
	items: [{ label: 'Содержание', slug: `uchebnik/${n}-klass` }, ...chapters],
});

// Groups start closed; Starlight still opens the group of the page being read.
const section = (/** @type {string} */ label, /** @type {string} */ dir, /** @type {string[]} */ slugs) => ({
	label,
	collapsed: true,
	items: slugs.map((slug) => ({ slug: `uchebnik/${dir}/${slug}` })),
});

export default defineConfig({
	site: 'https://irenegorbunova.github.io',
	// animations play whatever the system's «reduce motion» setting says (src/plugins/motion.mjs)
	vite: { css: { postcss: { plugins: [motionCss()] } } },
	markdown: {
		processor: satteri({ features: { math: true }, mdastPlugins: [katexPlugin] }),
	},
	integrations: [
		starlight({
			title: 'Учебник физики',
			locales: { root: { label: 'Русский', lang: 'ru' } },
			head: [
				{ tag: 'script', content: MOTION_SCRIPT },
				// visit counter, no cookies: https://irenegorbunova.goatcounter.com
				{ tag: 'script', attrs: { 'data-goatcounter': GOATCOUNTER, async: true, src: '//gc.zgo.at/count.js' } },
			],
			components: { Footer: './src/components/Footer.astro', PageTitle: './src/components/PageTitle.astro' },
			customCss: [
				'katex/dist/katex.min.css',
				'@fontsource/alice',
				'@fontsource/great-vibes',
				'./src/styles/textbook.css',
			],
			sidebar: [
				{ label: 'Об учебнике', slug: 'uchebnik' },
				grade(7, [
					section('Давление твёрдых тел, жидкостей и газов', '7-klass/davlenie', ['atmosfernoe-davlenie', 'arhimedova-sila']),
				]),
				grade(8, [
					section('Тепловые явления', '8-klass', [
						'teplovye-yavleniya/vnutrennyaya-energiya',
						'teplovye-yavleniya/kolichestvo-teploty',
						'teplovye-yavleniya/energiya-topliva',
						'teplovye-yavleniya/zakon-sohraneniya-energii',
						'agregatnye-sostoyaniya/plavlenie',
						'agregatnye-sostoyaniya/isparenie-i-kipenie',
						'agregatnye-sostoyaniya/vlazhnost',
						'agregatnye-sostoyaniya/teplovye-dvigateli',
					]),
					section('Электрические явления', '8-klass/elektricheskie-yavleniya', ['elektrizaciya', 'elektricheskiy-tok', 'zakon-oma', 'soedinenie-provodnikov', 'rabota-i-moshchnost-toka']),
					section('Электромагнитные явления', '8-klass/elektromagnitnye-yavleniya', ['magnitnoe-pole-toka', 'postoyannye-magnity', 'elektrodvigatel']),
					section('Световые явления', '8-klass/svetovye-yavleniya', ['istochniki-sveta', 'otrazhenie-i-prelomlenie', 'linzy']),
				]),
				grade(9, [
					section('Законы взаимодействия и движения тел', '9-klass/zakony-dvizheniya', ['zakony-nyutona']),
					section('Механические колебания и волны. Звук', '9-klass/kolebaniya-i-volny', ['mayatnik']),
				]),
				grade(10, [
					section('Кинематика', '10-klass/kinematika', ['brosok-pod-uglom']),
					section('Законы сохранения', '10-klass/zakony-sohraneniya', ['impuls']),
					section('Молекулярная физика и термодинамика', '10-klass/molekulyarnaya-fizika', ['gazovye-zakony']),
				]),
				grade(11, [
					section('Электродинамика', '11-klass/elektrodinamika', ['elektromagnitnaya-indukciya']),
					section('Квантовая физика', '11-klass/kvantovaya-fizika', ['fotoeffekt']),
					section('Строение Вселенной', '11-klass/stroenie-vselennoy', ['vselennaya']),
				]),
				{ label: 'Формулы', slug: 'uchebnik/formuly' },
				{ label: 'Моё небо', slug: 'uchebnik/nebo' },
				{ label: 'Источники иллюстраций', slug: 'uchebnik/istochniki' },
			],
		}),
	],
});
