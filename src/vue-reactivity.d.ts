import type { Time } from '@internationalized/date'
import type { Formats } from '@shared/lib/formats'

// Tell Vue's type system not to deeply unwrap Time class instances.
// Without this, TypeScript loses the class identity of Time due to its #private field,
// causing type errors when binding Time objects to UInputTime v-model.
declare module '@vue/reactivity' {
  export interface RefUnwrapBailTypes {
    internationalizedTime: Time
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $f: Formats
  }
}
