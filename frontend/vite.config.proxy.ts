// 自动生成的 Vite proxy 配置 - 支持局域网访问
// 由智能门户系统自动创建，请勿手动修改
//
// ⚠️ 安全依赖（改动前必读）
// 本文件不自己实现管理面守卫，而是通过下面的 loadConfigFromFile 读取
// vite.config.js，并用 mergeConfig 合并上来的：
//   · server.proxy["/api"].bypass  ← 管理面 / External Harness 边缘守卫
//   · server.fs.allow / fs.deny    ← 防止 /@fs/ 暴露 backend/data
// mergeConfig 会保留基础配置里、覆盖块没有写的键（已验证），所以本文件天然继承
// 了那两个守卫；这里的 ws: true 也仍然会被 bypass 覆盖（Vite 8 的 upgrade 分支
// 同样调用 bypass）。
//
// 因此：如果门户系统重新生成本文件时丢掉了 baseConfigFile / loadConfigFromFile
// 这一步（或改成了内置 fallbackConfig），管理面守卫会静默消失。任何重新生成之后
// 都必须确认这两件事仍然成立，或者干脆配置 ADMIN_IMPORT_KEY 作为兜底。
// 详见 README「管理面 / External Harness 面的本机边界」。
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
