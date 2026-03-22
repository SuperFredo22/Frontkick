import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://frontkick.vercel.app',
  integrations: [sitemap()],
});

