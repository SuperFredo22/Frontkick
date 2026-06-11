import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    sport: z.string(),
    category: z.string(),
    date: z.string(),
    excerpt: z.string().optional(),
    featured: z.boolean().optional().default(false),
    // Visuel dédié de l'article (chemin public, ex. /images/articles/mon-slug.jpg).
    // Optionnel : fallback sur la bannière de la discipline.
    image: z.string().optional(),
  }),
});

export const collections = { articles };
