<!--
  A grid of cards, one per learning object. Mirrors upstream Cards
  (packages/svelte/ui-components/src/learning-objects/layout/Cards.svelte), less hiding and locking (rung 6).
-->
<script lang="ts">
  import type { Lo } from "@ladder/model";
  import { cardRoute } from "../../course/lo-tree.ts";
  import Card from "./Card.svelte";

  let { los = [] }: { los?: Lo[] } = $props();
</script>

{#if los.length > 0}
  <ul class="cards">
    {#each los as lo (lo.route)}
      <li><Card cardDetails={{ route: cardRoute(lo), title: lo.title, type: lo.type, summary: lo.summary }} /></li>
    {/each}
  </ul>
{/if}

<style>
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 1rem; padding: 0; margin: 0; list-style: none; }
</style>
