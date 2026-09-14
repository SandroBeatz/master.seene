import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults, type ConfigEnv } from 'vitest/config'
import viteConfig from './vite.config'

// vite.config now exports a function (desktop vs mobile target). Resolve it to
// the desktop config for the test environment before merging.
const viteEnv: ConfigEnv = { command: 'serve', mode: 'test' }
const resolvedViteConfig =
  typeof viteConfig === 'function' ? viteConfig(viteEnv) : viteConfig

export default mergeConfig(
  resolvedViteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
