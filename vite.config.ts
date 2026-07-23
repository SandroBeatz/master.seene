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
          compoundVariants: [
            {
              color: 'primary',
              variant: 'solid',
              class:
                'dark:bg-white! dark:text-zinc-950! dark:hover:bg-white/90! dark:active:bg-white/80! dark:disabled:bg-white! dark:aria-disabled:bg-white!',
            },
          ],
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

        toaster: {
          slots: {
            viewport:
              'top-8! left-1/2! right-auto! w-full! max-w-[calc(100vw-2rem)] -translate-x-1/2! items-center',
            base: 'w-fit! max-w-[calc(100vw-2rem)] mx-auto',
          },
        },

        toast: {
          slots: {
            root: "min-h-0 w-fit max-w-[calc(100vw-2rem)] rounded-full bg-zinc-950! px-5 py-4 shadow-2xl shadow-zinc-950/15 ring-0 gap-3 text-white before:flex before:size-7 before:shrink-0 before:items-center before:justify-center before:rounded-full before:text-base before:font-bold before:leading-none before:text-white before:content-['\\2713'] dark:bg-white! dark:text-zinc-950 dark:shadow-black/25",
            wrapper: 'w-auto min-w-0 flex-none',
            title: 'truncate text-base font-semibold leading-none text-white dark:text-zinc-950',
            description: 'mt-1 text-sm leading-5 text-zinc-300 dark:text-zinc-600',
            icon: '',
            actions: 'hidden',
            close: 'hidden',
            progress: 'hidden',
          },
          variants: {
            color: {
              primary: {
                root: 'before:bg-zinc-600 dark:before:bg-zinc-500',
              },
              secondary: {
                root: 'before:bg-violet-500',
              },
              success: {
                root: 'before:bg-emerald-500',
              },
              info: {
                root: "before:bg-sky-500 before:content-['i']",
              },
              warning: {
                root: "before:bg-amber-500 before:content-['!']",
              },
              error: {
                root: "before:bg-rose-500 before:content-['\\00D7']",
              },
              neutral: {
                root: 'before:bg-zinc-600 dark:before:bg-zinc-500',
              },
            },
          },
        },

        switch: {
          slots: {
            root: 'relative flex items-center',
            base: 'border-0 p-1 data-[state=checked]:bg-accent! focus-visible:outline-accent!',
            thumb: 'bg-white! shadow-sm',
            wrapper: 'ms-4',
          },
          variants: {
            size: {
              md: {
                base: 'w-12',
                container: 'h-7',
                thumb:
                  'size-5 data-[state=checked]:translate-x-5 data-[state=checked]:rtl:-translate-x-5',
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
