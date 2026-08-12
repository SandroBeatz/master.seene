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
              'top-[calc(var(--safe-area-top)+0.75rem)]! left-1/2! right-auto! w-full! max-w-[calc(100vw-1rem)] -translate-x-1/2! items-center sm:top-8! sm:max-w-[calc(100vw-2rem)]',
            base: 'mx-auto w-fit! max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)]',
          },
        },

        toast: {
          slots: {
            root: 'min-h-0 w-fit max-w-[calc(100vw-1rem)] items-center gap-2 rounded-xl bg-zinc-950! px-3 py-2 text-white shadow-xl shadow-zinc-950/15 ring-0 sm:max-w-[calc(100vw-2rem)] sm:gap-3 sm:rounded-full sm:px-5 sm:py-4 sm:shadow-2xl dark:bg-white! dark:text-zinc-950 dark:shadow-black/25',
            wrapper: 'w-auto min-w-0 flex-[0_1_auto] justify-center',
            title:
              'truncate text-sm font-medium leading-5 text-white sm:text-base sm:font-semibold sm:leading-none dark:text-zinc-950',
            description:
              'text-xs leading-4 text-zinc-300 sm:text-sm sm:leading-5 dark:text-zinc-600',
            icon: 'size-4 shrink-0 self-center sm:size-5',
            actions: 'hidden',
            close: 'hidden',
            progress: 'hidden',
          },
          variants: {
            color: {
              primary: {
                icon: 'text-zinc-300 dark:text-zinc-600',
              },
              secondary: {
                icon: 'text-violet-400 dark:text-violet-600',
              },
              success: {
                icon: 'text-emerald-400 dark:text-emerald-600',
              },
              info: {
                icon: 'text-sky-400 dark:text-sky-600',
              },
              warning: {
                icon: 'text-amber-400 dark:text-amber-600',
              },
              error: {
                icon: 'text-rose-400 dark:text-rose-600',
              },
              neutral: {
                icon: 'text-zinc-300 dark:text-zinc-600',
              },
            },
            orientation: {
              horizontal: {
                root: 'items-center',
              },
              vertical: {
                root: 'items-center',
              },
            },
            title: {
              true: {
                description: 'mt-0.5 sm:mt-1',
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

        // Selected radio fill follows `primary` (zinc), which is near-invisible on
        // the dark surface. Force a light fill in dark mode so the checked state
        // reads clearly; the inner `after` dot stays `bg-default` (dark) for contrast.
        radioGroup: {
          slots: {
            indicator: 'dark:bg-white!',
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
        //
        // `z-50` on both overlay and content: Nuxt UI ships these with no z-index
        // (z-index: auto), relying on DOM order (teleported to end of body) to paint
        // above the rest of the page. `#app` has no z-index, so it doesn't establish
        // a stacking context — its positioned mobile chrome (tab bar `z-40`, floating
        // push header `z-30`) therefore competes directly in the root stacking context
        // with the teleported overlays, and any positive z-index always wins over
        // `auto` regardless of DOM order. Pinning overlay + content to `z-50` puts
        // every dialog above that chrome. Content must *match* overlay's z-index (not
        // just exceed the chrome) so their relative order still falls back to DOM
        // order (overlay is rendered before content), keeping content above the scrim.
        modal: {
          slots: {
            overlay: 'bg-black/60! z-50',
            content: 'z-50',
          },
        },
        slideover: {
          slots: {
            overlay: 'bg-black/60! z-50',
            content: 'z-50',
          },
        },
        drawer: {
          slots: {
            overlay: 'bg-black/60! z-50',
            content: 'z-50',
          },
        },

        // Floating menus (select, dropdown, popover, tooltip) are teleported to the
        // end of <body> with no z-index (`z-index: auto`), just like the overlays
        // above. Once modal/slideover/drawer content is pinned to `z-50`, a menu
        // opened *inside* one of those dialogs would paint behind it — `auto` always
        // loses to a positive z-index regardless of DOM order. Pinning their content
        // to `z-[60]` keeps these menus above dialog content (and its scrim).
        select: {
          slots: {
            content: 'z-[60]',
          },
        },
        selectMenu: {
          slots: {
            content: 'z-[60]',
          },
        },
        dropdownMenu: {
          slots: {
            content: 'z-[60]',
          },
        },
        popover: {
          slots: {
            content: 'z-[60]',
          },
        },
        tooltip: {
          slots: {
            content: 'z-[60]',
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
