/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { defineConfig, Plugin } from 'vite';

function swVersioningPlugin(): Plugin {
  return {
    name: 'sw-versioning-plugin',
    generateBundle(options, bundle) {
      const assetKeys = Object.keys(bundle);
      // Generate a unique, deterministic build ID based on timestamp and chunk hashes
      const contentDigest = crypto
        .createHash('sha256')
        .update(assetKeys.sort().join('|'))
        .digest('hex')
        .substring(0, 10);
      const buildId = `v_${Date.now().toString(36)}_${contentDigest}`;

      const swPath = path.resolve(__dirname, 'public/sw.js');
      if (fs.existsSync(swPath)) {
        let swCode = fs.readFileSync(swPath, 'utf-8');
        swCode = swCode
          .replace(/'__BUILD_ID__'/g, JSON.stringify(buildId))
          .replace(/__BUILD_ASSETS__/g, JSON.stringify(assetKeys));

        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: swCode,
        });
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), swVersioningPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === 'INVALID_ANNOTATION' || warning.message?.includes('@__PURE__')) {
            return;
          }
          warn(warning);
        },
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/recharts')) {
              return 'vendor-recharts';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-lucide';
            }
            if (id.includes('node_modules/motion')) {
              return 'vendor-motion';
            }
            if (id.includes('node_modules/@dnd-kit')) {
              return 'vendor-dnd';
            }
            if (id.includes('node_modules/zod')) {
              return 'vendor-zod';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
