// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { satteri } from '@astrojs/markdown-satteri';
import { katexPlugin } from './src/plugins/katex.mjs';

const grade = (/** @type {number} */ n, /** @type {any[]} */ chapters = []) => ({
	label: `${n} класс`,
	collapsed: chapters.length === 0,
	items: [{ label: 'Содержание', slug: `uchebnik/${n}-klass` }, ...chapters],
});

const section = (/** @type {string} */ label, /** @type {string} */ dir, /** @type {string[]} */ slugs) => ({
	label,
	items: slugs.map((slug) => ({ slug: `uchebnik/${dir}/${slug}` })),
});

export default defineConfig({
	site: 'https://irenegorbunova.github.io',
	markdown: {
		processor: satteri({ features: { math: true }, mdastPlugins: [katexPlugin] }),
	},
	integrations: [
		starlight({
			title: 'Учебник физики',
			locales: { root: { label: 'Русский', lang: 'ru' } },
			components: { Footer: './src/components/Footer.astro' },
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
					section('Тепловые явления', '8-klass/teplovye-yavleniya', ['vnutrennyaya-energiya']),
					section('Электрические явления', '8-klass/elektricheskie-yavleniya', ['zakon-oma']),
					section('Световые явления', '8-klass/svetovye-yavleniya', ['linzy']),
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
				]),
				{ label: 'Источники иллюстраций', slug: 'uchebnik/istochniki' },
			],
		}),
	],
});
