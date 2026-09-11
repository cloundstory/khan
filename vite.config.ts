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
    // Allow the explicitly requested localtunnel preview host while keeping
    // Vite's host validation enabled for normal local development.
    server: { allowedHosts: ['.loca.lt'] },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          // ไม่เอา .wasm เข้า precache — มันหนัก 1 MB และคนส่วนใหญ่ไม่ได้สแกน
          // ปล่อยให้ runtimeCaching ด้านล่างเก็บให้ตอนกดสแกนครั้งแรกแทน
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          // three กับตัวถอดรหัสบาร์โค้ดเป็นของเสริม ไม่ใช่ของที่แอปขาดไม่ได้
          // ออฟไลน์ยังเปิดหน้าเล่มได้ปกติ แค่เห็นปกแบนแทนเล่ม 3D
          // จึงไม่ควรบังคับให้ทุกคนโหลดตอนติดตั้ง — ให้ runtimeCaching เก็บตอนใช้จริง
          globIgnores: ['**/three.module-*.js', '**/ponyfill-*.js', '**/zxing_reader-*.js', '**/ArtLab-*', '**/BookStudy-*', '**/Diorama-*', '**/reading-room-concept-*', '**/concept/**'],
          runtimeCaching: [
            {
              // ปกหนังสือจาก Open Library — เก็บไว้ยาว ๆ ปกไม่เปลี่ยน
              urlPattern: /^https:\/\/covers\.openlibrary\.org\//,
              handler: 'CacheFirst',
              options: {
                // ตั้งชื่อใหม่เพื่อทิ้งแคชเดิมที่มี opaque response ปนอยู่
                cacheName: 'book-covers-v2',
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 365 },
                // ห้ามเก็บ opaque response (status 0) เด็ดขาด
                // ถ้าเก็บ พอ Book3D เรียก fetch แบบ cors จะได้ opaque จากแคชแล้ว fetch ล้มทั้งดุ้น
                // ทำให้ปกจริงหายไปเฉพาะบน production ที่มี service worker
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              // ตัวถอดรหัสบาร์โค้ด ~1 MB — ไม่ precache เพราะคนส่วนใหญ่ไม่สแกน
              // แต่พอโหลดครั้งแรกแล้วเก็บไว้เลย ครั้งต่อไปไม่ต้องรอ
              urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'scanner-wasm',
                expiration: { maxEntries: 4 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // chunk เสริมที่กันไว้ไม่ให้ precache — เก็บตอนโหลดครั้งแรกแทน
              urlPattern: ({ url }) => /\/assets\/(three\.module|ponyfill|zxing_reader)-/.test(url.pathname),
              handler: 'CacheFirst',
              options: {
                cacheName: 'lazy-chunks',
                expiration: { maxEntries: 12 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
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

