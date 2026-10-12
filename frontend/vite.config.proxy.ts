// 自动生成的 Vite proxy 配置 - 支持局域网访问
// 由智能门户系统自动创建，请勿手动修改
import { defineConfig, loadConfigFromFile, mergeConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const baseConfigFile = "vite.config.js"

const fallbackConfig = defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})

const proxyOverrides = defineConfig({
  server: {
    host: '0.0.0.0',  // 支持局域网访问
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8008',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      },
      '/uploads': {
        target: 'http://localhost:8008',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
})

export default defineConfig(async (env) => {
  if (!baseConfigFile) {
    return mergeConfig(fallbackConfig, proxyOverrides)
  }

  try {
    const loadedConfig = await loadConfigFromFile(
      env,
      fileURLToPath(new URL(`./${baseConfigFile}`, import.meta.url))
    )

    return mergeConfig(loadedConfig?.config ?? fallbackConfig, proxyOverrides)
  } catch (error) {
    console.warn('[portal] Failed to load base Vite config, falling back to generated proxy config.', error)
    return mergeConfig(fallbackConfig, proxyOverrides)
  }
})
