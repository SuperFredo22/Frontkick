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
  }),
});

export const collections = { articles };
