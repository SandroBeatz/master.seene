import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import ui from '@nuxt/ui/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    ui({
      ui: {
        colors: {
          primary: 'zinc',
          secondary: 'violet',
          accent: 'amber',
          success: 'green',
          neutral: 'zinc',
        },

        card: {
          slots: {
            root: 'rounded-xl',
          },
          variants: {
            variant: {
              outline: {
                root: 'bg-default ring ring-default divide-y divide-default',
              },
              soft: {
                root: 'bg-elevated/70 divide-y divide-default',
              },
              subtle: {
                root: 'bg-elevated/70 ring ring-default divide-y divide-default',
              },
            },
          },
          defaultVariants: {
            variant: 'outline',
          },
        },

        button: {
          slots: {
            base: 'cursor-pointer rounded-full',
          },
          variants: {
            size: {
              md: {
                base: 'px-3 py-2 text-base gap-1.5',
                leadingIcon: 'size-5',
                leadingAvatarSize: '2xs',
                trailingIcon: 'size-5',
              },
            },
          },
        },

        input: {
          slots: {
            base: 'rounded-3xl',
          },
          variants: {
            size: {
              md: {
                base: 'px-3 py-2.5 text-base gap-1.5',
                leading: 'ps-2.5',
                trailing: 'pe-2.5',
                leadingIcon: 'size-5',
                leadingAvatarSize: '2xs',
                trailingIcon: 'size-5',
              },
            },
          },
        },

        pageCard: {
          slots: {
            root: 'rounded-xl shadow-lg',
          },
          variants: {
            variant: {
              soft: {
                root: 'bg-white dark:bg-zinc-800/80',
                description: 'text-toned',
              },
            },
          },
        },
      },
    }),
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@widgets': fileURLToPath(new URL('./src/widgets', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
})
