// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const grade = (/** @type {number} */ n, /** @type {any[]} */ chapters = []) => ({
	label: `${n} класс`,
	collapsed: chapters.length === 0,
	items: [{ label: 'Содержание', slug: `uchebnik/${n}-klass` }, ...chapters],
});

export default defineConfig({
	site: 'https://irenegorbunova.github.io',
	base: '/IG_physics',
	integrations: [
		starlight({
			title: 'Учебник физики',
			locales: { root: { label: 'Русский', lang: 'ru' } },
			sidebar: [
				{ label: 'Об учебнике', slug: 'uchebnik' },
				grade(7),
				grade(8),
				grade(9),
				grade(10),
				grade(11),
			],
		}),
	],
});
