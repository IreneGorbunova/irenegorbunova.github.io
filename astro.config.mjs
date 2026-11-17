// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { satteri } from '@astrojs/markdown-satteri';
import { katexPlugin } from './src/plugins/katex.mjs';
import { motionCss, MOTION_SCRIPT } from './src/plugins/motion.mjs';
import { TEST_SCRIPT, SHORT_SCRIPT } from './src/plugins/testmode.mjs';
import { dedupeScripts } from './src/plugins/dedupe-scripts.mjs';

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
	// «Отражение и преломление света» was split in two (14 Nov 2026): the old address leads to its first part
	redirects: {
		'/uchebnik/8-klass/svetovye-yavleniya/otrazhenie-i-prelomlenie': '/uchebnik/8-klass/svetovye-yavleniya/otrazhenie-sveta/',
	},
	// animations play whatever the system's «reduce motion» setting says (src/plugins/motion.mjs)
	vite: { css: { postcss: { plugins: [motionCss()] } } },
	markdown: {
		processor: satteri({ features: { math: true }, mdastPlugins: [katexPlugin] }),
	},
	integrations: [
		starlight({
			title: 'Учебник физики',
			locales: { root: { label: 'Русский', lang: 'ru' } },
			// our own «page not found» in the style of the home page: src/pages/404.astro
			disable404Route: true,
			head: [
				{ tag: 'script', content: MOTION_SCRIPT },
				// pilot features are hidden unless the visitor switched test mode on (/uchebnik/test/)
				{ tag: 'script', content: TEST_SCRIPT },
				{ tag: 'script', content: SHORT_SCRIPT },
				// visit counter, no cookies: https://irenegorbunova.goatcounter.com
				{ tag: 'script', attrs: { 'data-goatcounter': GOATCOUNTER, async: true, src: '//gc.zgo.at/count.js' } },
			],
			components: {
				Footer: './src/components/Footer.astro',
				Head: './src/components/Head.astro',
				PageTitle: './src/components/PageTitle.astro',
				ThemeProvider: './src/components/theme/ThemeProvider.astro',
				ThemeSelect: './src/components/theme/ThemeSelect.astro',
			},
			customCss: [
				'katex/dist/katex.min.css',
				'@fontsource/alice',
				'@fontsource/great-vibes',
				'./src/styles/textbook.css',
			],
			sidebar: [
				{ label: 'Об учебнике', slug: 'uchebnik' },
				grade(7, [
					section('Введение', '7-klass/vvedenie', ['chto-izuchaet-fizika', 'fizicheskie-velichiny', 'tochnost-izmereniy']),
					section('Первоначальные сведения о строении вещества', '7-klass/stroenie-veshchestva', ['molekuly-diffuziya', 'vzaimodeystvie-molekul', 'tri-sostoyaniya-veshchestva']),
					section('Взаимодействие тел', '7-klass/vzaimodeystvie-tel', ['mehanicheskoe-dvizhenie', 'inerciya-massa-plotnost', 'sila', 'slozhenie-sil-trenie']),
					section('Давление твёрдых тел, жидкостей и газов', '7-klass/davlenie', ['davlenie-zakon-paskalya', 'davlenie-v-zhidkosti', 'atmosfernoe-davlenie', 'arhimedova-sila']),
					section('Работа и мощность. Энергия', '7-klass/rabota-i-energiya', ['mehanicheskaya-rabota', 'prostye-mehanizmy', 'kpd', 'potencialnaya-i-kineticheskaya-energiya']),
				]),
				grade(8, [
					section('Тепловые явления', '8-klass', [
						'teplovye-yavleniya/vnutrennyaya-energiya',
						'teplovye-yavleniya/kolichestvo-teploty',
						'teplovye-yavleniya/energiya-topliva',
						'teplovye-yavleniya/zakon-sohraneniya-energii',
						'agregatnye-sostoyaniya/plavlenie',
						'agregatnye-sostoyaniya/vlazhnost',
						'agregatnye-sostoyaniya/isparenie-i-kipenie',
						'agregatnye-sostoyaniya/teplovye-dvigateli',
					]),
					section('Электрические явления', '8-klass/elektricheskie-yavleniya', ['elektrizaciya', 'elektricheskiy-tok', 'sila-toka-napryazhenie-soprotivlenie', 'zakon-oma', 'soedinenie-provodnikov', 'rabota-i-moshchnost-toka']),
					section('Электромагнитные явления', '8-klass/elektromagnitnye-yavleniya', ['magnitnoe-pole-toka', 'elektromagnity', 'postoyannye-magnity', 'magnitnoe-pole-zemli', 'elektrodvigatel']),
					section('Световые явления', '8-klass/svetovye-yavleniya', ['istochniki-sveta', 'otrazhenie-sveta', 'prelomlenie-sveta', 'linzy', 'glaz-i-zrenie']),
				]),
				grade(9, [
					section('Законы взаимодействия и движения тел', '9-klass/zakony-dvizheniya', ['zakony-nyutona', 'zakon-vsemirnogo-tyagoteniya']),
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
					section('Строение Вселенной', '11-klass/stroenie-vselennoy', ['zemlya', 'luna', 'solnechnaya-sistema', 'zvezdy', 'vselennaya']),
				]),
				{ label: 'Формулы', slug: 'uchebnik/formuly' },
				{ label: 'Моё небо', slug: 'uchebnik/nebo' },
				{ label: 'Карта открытий', slug: 'uchebnik/otkrytiya' },
				{ label: 'Посмотри в телескоп', slug: 'uchebnik/teleskop' },
			],
		}),
		// a component used several times on a page keeps one copy of its script (src/plugins/dedupe-scripts.mjs)
		dedupeScripts(),
	],
});
