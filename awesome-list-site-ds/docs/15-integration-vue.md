# 15 · Integration: Vue / Nuxt

> Same primitives, idiomatic Vue API.

## Setup

```
/src/assets/design-system.css     ← was styles.css
/src/composables/designSystem.ts  ← new
/src/lib/design-system.ts          ← was design-systems.jsx
```

## The composable

```ts
// composables/designSystem.ts
import { ref, watch, onMounted } from 'vue';
import { applyDesignSystem, SYSTEM_DEFAULT_ACCENT, type SystemId, type AccentId } from '@/lib/design-system';

const system = ref<SystemId>('editorial');
const accent = ref<AccentId>('crimson');
let initialized = false;

export function useDesignSystem() {
  if (!initialized) {
    initialized = true;
    onMounted(() => {
      const sys = (localStorage.getItem('ds-system') as SystemId) || 'editorial';
      const acc = (localStorage.getItem('ds-accent') as AccentId) || SYSTEM_DEFAULT_ACCENT[sys];
      system.value = sys;
      accent.value = acc;
    });

    watch([system, accent], ([s, a]) => {
      applyDesignSystem(s, a);
      localStorage.setItem('ds-system', s);
      localStorage.setItem('ds-accent', a);
    });
  }

  function setSystem(id: SystemId) {
    const prevNatural = SYSTEM_DEFAULT_ACCENT[system.value];
    if (accent.value === prevNatural) accent.value = SYSTEM_DEFAULT_ACCENT[id];
    system.value = id;
  }

  return { system, accent, setSystem, setAccent: (a: AccentId) => (accent.value = a) };
}
```

## Wire in `App.vue`

```vue
<!-- App.vue -->
<script setup lang="ts">
import '@/assets/design-system.css';
import { useDesignSystem } from '@/composables/designSystem';

// initialize once at app root
useDesignSystem();
</script>

<template>
  <div class="page">
    <div class="grain" />
    <router-view />
  </div>
</template>
```

## A system picker component

```vue
<!-- SystemPicker.vue -->
<script setup lang="ts">
import { DESIGN_SYSTEMS } from '@/lib/design-system';
import { useDesignSystem } from '@/composables/designSystem';

const { system, setSystem } = useDesignSystem();
</script>

<template>
  <div style="display: flex; gap: 6px; flex-wrap: wrap;">
    <button
      v-for="(def, id) in DESIGN_SYSTEMS"
      :key="id"
      class="btn ghost"
      :aria-pressed="system === id"
      @click="setSystem(id as any)"
    >
      {{ def.name }}
    </button>
  </div>
</template>
```

## Component wrappers

Same pattern as React — thin wrappers around classes:

```vue
<!-- Button.vue -->
<script setup lang="ts">
defineProps<{ variant?: 'primary' | 'default' | 'ghost' | 'danger' | 'icon' }>();
</script>

<template>
  <button
    :class="[
      'btn',
      variant === 'primary' && 'primary',
      variant === 'ghost' && 'ghost',
      variant === 'danger' && 'danger',
      variant === 'icon' && 'icon ghost',
    ]"
  >
    <slot />
  </button>
</template>
```

```vue
<!-- Card.vue -->
<script setup lang="ts">
defineProps<{ hoverable?: boolean; glow?: boolean }>();
</script>

<template>
  <article :class="['card', hoverable && 'hoverable', glow && 'glow']">
    <slot />
  </article>
</template>
```

## Nuxt (SSR)

In Nuxt 3, set the attribute in the entry HTML for zero flash:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  css: ['~/assets/design-system.css'],
  app: {
    head: {
      script: [
        {
          children: `
            (function(){
              var SYS_DEFAULT = {
                editorial:'crimson', terminal:'matrix',
                geist:'cyan', brutalist:'amber', swiss:'orange'
              };
              try {
                var sys = localStorage.getItem('ds-system') || 'editorial';
                var acc = localStorage.getItem('ds-accent') || SYS_DEFAULT[sys];
                document.documentElement.setAttribute('data-system', sys);
                document.documentElement.setAttribute('data-accent', acc);
              } catch (e) {}
            })();
          `,
          tagPosition: 'head',
        },
      ],
    },
  },
});
```

Combine with the build-time generated `themes.css` (see
**[14-integration-nextjs](./14-integration-nextjs.md#option-a-recommended--inline-the-tokens-too)**)
to get zero-flash, zero-JS theming.

## SvelteKit, Astro, SolidStart

The pattern is identical:

1. Inline a sync `<script>` in `<head>` that reads localStorage and sets
   `data-system` / `data-accent` on `<html>`.
2. Ship `themes.css` with `[data-system="…"] { ...tokens... }` blocks.
3. Hydrate a reactive store/signal that mirrors the attribute and exposes a
   `setSystem` function.

Astro is the easiest of all because of its component islands — most of the
page is static HTML with classes; only the system picker is hydrated.

---

**Next:** **[16 · Migrating an existing site →](./16-migration.md)**
