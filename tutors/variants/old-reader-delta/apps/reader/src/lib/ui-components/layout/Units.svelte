<!--
  Each unit (or side) as a box with a heading and its cards. Mirrors upstream Units
  (packages/svelte/ui-components/src/learning-objects/layout/Units.svelte).
-->
<script lang="ts">
  import type { Side, Unit } from "@ladder/model";
  import Cards from "./Cards.svelte";

  let { units }: { units: (Unit | Side)[] } = $props();
</script>

{#each units as unit (unit.id)}
  <section class="unit" aria-labelledby={unit.id}>
    <h2 id={unit.id}>{unit.title}</h2>
    <Cards los={unit.los} />
  </section>
{/each}

<style>
  .unit { border: 1px solid var(--border); border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; }
  h2 { margin: 0 0 1rem; font-size: 1.2rem; }
</style>
