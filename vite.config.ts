import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'SmartHouse 3D',
        short_name: 'SmartHouse',
        description: 'Controle visual 3D local para apartamento inteligente',
        lang: 'pt-BR',
        display: 'standalone',
        background_color: '#070708',
        theme_color: '#070708',
        orientation: 'any',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,glb}'],
        navigateFallbackDenylist: [/^\/api\//, /^\/ws/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 750,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-three', test: /[\\/]node_modules[\\/]three[\\/]/, priority: 30 },
            {
              name: 'vendor-r3f',
              test: /[\\/]node_modules[\\/](@react-three|three-stdlib|its-fine|suspend-react)[\\/]/,
              priority: 25,
            },
            {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|zustand)[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
