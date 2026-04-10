import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fightfocus.fr',
  integrations: [
    sitemap({
      // Exclure pages inutiles pour le crawl budget
      filter: (page) => !page.includes('/recherche'),
      serialize(item) {
        const now = new Date().toISOString().split('T')[0];
        // Pages discipline = priorité haute, re-crawl hebdo
        if (item.url.includes('/discipline/')) {
          return { ...item, priority: 0.9, changefreq: 'weekly', lastmod: now };
        }
        // Articles = priorité normale, crawl mensuel
        if (item.url.includes('/articles/')) {
          return { ...item, priority: 0.7, changefreq: 'monthly' };
        }
        // Pages principales
        const mainPages = ['/', '/guides', '/actualites', '/classements', '/equipement', '/autres-disciplines'];
        if (mainPages.some(p => item.url.endsWith(p) || item.url.endsWith(p + '/'))) {
          return { ...item, priority: 0.8, changefreq: 'weekly', lastmod: now };
        }
        // Pages légales / contact = faible priorité
        if (['/mentions-legales', '/politique-confidentialite', '/a-propos', '/contact'].some(p => item.url.includes(p))) {
          return { ...item, priority: 0.3, changefreq: 'yearly' };
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
