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
					section('Электрические явления', '8-klass/elektricheskie-yavleniya', ['zakon-oma']),
					section('Световые явления', '8-klass/svetovye-yavleniya', ['linzy']),
				]),
				grade(9, [
					section('Законы взаимодействия и движения тел', '9-klass/zakony-dvizheniya', ['zakony-nyutona']),
				]),
				grade(10, [
					section('Кинематика', '10-klass/kinematika', ['brosok-pod-uglom']),
				]),
				grade(11),
				{ label: 'Источники иллюстраций', slug: 'uchebnik/istochniki' },
			],
		}),
	],
});
