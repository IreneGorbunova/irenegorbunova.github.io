import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

/**
 * A formula or concept card of a chapter. Strings may hold inline math in $…$.
 * A formula card has `tex`; a concept card has `def` (the definition) instead.
 */
const formula = z
	.object({
		id: z.string().regex(/^[a-z0-9-]+$/),
		name: z.string(),
		tex: z.string().optional(),
		def: z.string().optional(),
		/** Question on the front of the card; defaults to the name. */
		ask: z.string().optional(),
		symbols: z
			.array(z.object({ s: z.string(), is: z.string(), unit: z.string().optional() }))
			.optional(),
		/** What to remember about it: when it applies, a typical value. */
		note: z.string().optional(),
	})
	.refine((f) => Boolean(f.tex) !== Boolean(f.def), {
		message: 'a card needs either tex (a formula) or def (a definition)',
	});

const formulas = z
	.array(formula)
	.refine((list) => new Set(list.map((f) => f.id)).size === list.length, {
		message: 'card ids must be unique within a chapter',
	});

/**
 * Quantities of a chapter that open a note when hovered or tapped in its formulas: `s` is the symbol as written in TeX
 * (t_1, Q_{\text{в}}, \theta), `is` what it means, `unit` its unit. See src/plugins/annotate.mjs.
 */
const glossary = z.array(z.object({ s: z.string(), is: z.string(), unit: z.string().optional() }));

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({ extend: z.object({ formulas: formulas.optional(), glossary: glossary.optional() }) }),
	}),
};
