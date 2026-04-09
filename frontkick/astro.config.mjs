import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fightfocus.fr',
  integrations: [
    sitemap({
      // Prioriser les articles récents et les pages discipline
      serialize(item) {
        // Pages de disciplines = priorité haute
        if (item.url.includes('/discipline/')) {
          return { ...item, priority: 0.9, changefreq: 'weekly' };
        }
        // Articles = priorité normale
        if (item.url.includes('/articles/')) {
          return { ...item, priority: 0.7, changefreq: 'monthly' };
        }
        // Pages statiques principales
        if (['/', '/guides', '/actualites', '/classements', '/equipement', '/autres-disciplines'].some(p => item.url.endsWith(p) || item.url.endsWith(p + '/'))) {
          return { ...item, priority: 0.8, changefreq: 'weekly' };
        }
        return { ...item, priority: 0.5, changefreq: 'monthly' };
      }
    }),
  ],
  // Compression et optimisation du build
  build: {
    // Inline les petits assets pour réduire les requêtes HTTP
    inlineStylesheets: 'auto',
  },
  // Vite optimisations
  vite: {
    build: {
      // Chunking pour améliorer le cache navigateur
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
      // Minification CSS
      cssMinify: true,
    },
  },
});
