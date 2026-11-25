<!--
  A course or a topic: its units as boxes, its loose learning objects as cards, and its side units in a column
  beside them. Mirrors upstream Composite
  (packages/svelte/ui-components/src/learning-objects/structure/Composite.svelte), the same component for both.
-->
<script lang="ts">
  import type { Course, Topic } from "@ladder/model";
  import { arrange } from "../../course/lo-tree.ts";
  import SecondaryNavigator from "../../ui-navigators/SecondaryNavigator.svelte";
  import Cards from "../layout/Cards.svelte";
  import Units from "../layout/Units.svelte";

  let { composite }: { composite: Course | Topic } = $props();
  const { units, sides, standardLos } = $derived(arrange(composite));
</script>

<SecondaryNavigator lo={composite} />
<h1>{composite.title}</h1>
{#if composite.summary}<p class="summary">{composite.summary}</p>{/if}
<div class="columns" class:with-sides={sides.length > 0}>
  <div>
    <Units {units} />
    {#if standardLos.length > 0}
      <h2>{composite.type === "course" ? "Topics" : "Resources"}</h2>
      <Cards los={standardLos} />
    {/if}
  </div>
  {#if sides.length > 0}<aside><Units units={sides} /></aside>{/if}
</div>

<style>
  .summary { color: var(--muted); }
  .with-sides { display: grid; grid-template-columns: minmax(0, 1fr) 16rem; gap: 1rem; }
  @media (max-width: 48rem) { .with-sides { grid-template-columns: minmax(0, 1fr); } }
</style>
