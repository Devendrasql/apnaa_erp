import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || '';
  const target = proxyTarget || env.VITE_DEV_API_URL || env.VITE_API_URL || 'http://localhost:3002';
  const useProxy = !!proxyTarget && String(env.VITE_USE_PROXY ?? 'true').toLowerCase() === 'true';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
        '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
        '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
        '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
        '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      },
    },
    server: useProxy
      ? {
          proxy: {
            // Adjust if your API prefix differs
            '/api': {
              target,
              changeOrigin: true,
              secure: false,
              configure: (proxy) => {
                // Swallow connection refused noise during dev when backend is down
                proxy.on('error', (err, req, res) => {
                  // Optional: console.warn('[proxy]', err?.code || err?.message);
                });
              },
            },
          },
        }
      : undefined,
  };
});
