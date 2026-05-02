import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useLocalChat =
    env.LOCAL_CHAT === '1' ||
    env.LOCAL_CHAT === 'true' ||
    env.VITE_LOCAL_CHAT === 'true'
  const apiTarget = env.VITE_API_TARGET || 'http://159.75.169.224:1235'
  const chatTarget = env.VITE_CHAT_SERVER || 'http://127.0.0.1:8787'

  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/api/psychological-chat/completion-stream': {
          target: chatTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/api/local-agent': {
          target: chatTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        ...(useLocalChat
          ? {
              '/api/psychological-chat': {
                target: chatTarget,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
              },
            }
          : {}),
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
