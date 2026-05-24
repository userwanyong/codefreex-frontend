import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { apiConfig } from './config/api'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  server: {
    proxy: {
      [apiConfig.baseURL]: {
        target: apiConfig.proxyTarget,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, _req, res) => {
            // SSE 流式响应：禁止缓冲，立即转发
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              proxyRes.headers['cache-control'] = 'no-cache'
              proxyRes.headers['x-accel-buffering'] = 'no'
              proxyRes.headers['connection'] = 'keep-alive'
              // 禁用 TCP Nagle 算法，确保每个 SSE 帧立即发送
              if (res.socket) {
                res.socket.setNoDelay(true)
              }
            }
          })
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
