import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * dev อยู่ที่ root — เปิด http://localhost:5173/ ได้เหมือนเดิม
 * build ไปอยู่ใต้ /khan/ เพราะ GitHub Pages เสิร์ฟที่ cloundstory.github.io/khan/
 * scope/start_url ของ service worker ต้องตรงกับ base ไม่งั้น register ไม่ติด
 */
export default defineConfig(({ command }) => {
  const base = command === 'build' ? '/khan/' : '/';

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          id: base,
          name: 'คั่น',
          short_name: 'คั่น',
          description: 'ชั้นหนังสือที่จำได้ว่าคุณคิดอะไรอยู่',
          lang: 'th',
          theme_color: '#141a18',
          background_color: '#141a18',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
  };
});
