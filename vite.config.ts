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

        avatar: {
          variants: {
            size: {
              '4xl': {
                root: 'size-18 text-2xl',
              },
            },
          },
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

        switch: {
          slots: {
            base: 'border-0 data-[state=checked]:bg-accent! focus-visible:outline-accent!',
            thumb: 'bg-white! shadow-sm',
          },
          variants: {
            size: {
              md: {
                base: 'w-[68px]',
                container: 'h-10',
                thumb: 'size-8 data-[state=checked]:translate-x-8 data-[state=checked]:rtl:-translate-x-8',
              },
            },
            color: {
              primary: {
                base: 'data-[state=checked]:bg-accent! focus-visible:outline-accent!',
                icon: 'group-data-[state=checked]:text-accent!',
              },
            },
          },
        },

        input: {
          slots: {
            base: 'rounded-md',
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

        textarea: {
          slots: {
            base: 'rounded-md',
          },
          variants: {
            size: {
              md: {
                base: 'px-3 py-2.5 text-base gap-1.5',
                leading: 'ps-2.5 inset-y-2.5',
                trailing: 'pe-2.5 inset-y-2.5',
                leadingIcon: 'size-5',
                leadingAvatarSize: '2xs',
                trailingIcon: 'size-5',
              },
            },
          },
        },

        select: {
          slots: {
            base: 'w-full rounded-md',
            content: 'rounded-md',
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

        selectMenu: {
          slots: {
            base: 'w-full rounded-md',
            content: 'rounded-md',
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

        inputMenu: {
          slots: {
            base: 'rounded-md',
            content: 'rounded-md',
          },
        },

        inputNumber: {
          slots: {
            base: 'rounded-md',
          },
        },

        inputDate: {
          slots: {
            base: 'rounded-md',
          },
        },

        inputTime: {
          slots: {
            base: 'rounded-md',
          },
        },

        inputTags: {
          slots: {
            base: 'rounded-md',
          },
        },

        pinInput: {
          slots: {
            base: 'rounded-md',
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

        // Dark, dimmed scrim behind every overlay. The Nuxt UI default
        // (`bg-elevated/75`) is near-white in light mode and reads as a washed-out
        // backdrop — a black scrim gives proper contrast in both color schemes.
        // The `!` marker is required: the app-config slot value is *merged* with the
        // default, and tailwind-merge doesn't treat the semantic `bg-elevated`
        // utility as conflicting with `bg-black`, so without `!` the default wins.
        modal: {
          slots: {
            overlay: 'fixed inset-0 bg-black/60!',
          },
        },
        slideover: {
          slots: {
            overlay: 'fixed inset-0 bg-black/60!',
          },
        },
        drawer: {
          slots: {
            overlay: 'fixed inset-0 bg-black/60!',
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
