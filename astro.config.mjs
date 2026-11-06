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
				grade(7),
				grade(8),
				grade(9),
				grade(10, [
					{
						label: 'Кинематика',
						items: [{ slug: 'uchebnik/10-klass/kinematika/brosok-pod-uglom' }],
					},
				]),
				grade(11),
				{ label: 'Источники иллюстраций', slug: 'uchebnik/istochniki' },
			],
		}),
	],
});
