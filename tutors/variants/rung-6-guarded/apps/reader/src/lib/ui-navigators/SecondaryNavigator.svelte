<!--
  The breadcrumb strip: course, topic, then the page you are on. Mirrors upstream SecondaryNavigator
  (packages/svelte/ui-navigators/src/SecondaryNavigator.svelte), which builds its trail from lo.breadCrumbs.
-->
<script lang="ts">
  import type { Lo } from "@ladder/model";
  import { breadCrumbs } from "../course/lo-tree.ts";
  import { currentCourse } from "../runes/index.svelte.ts";

  let { lo }: { lo: Lo } = $props();
  const crumbs = $derived(currentCourse.value ? breadCrumbs(currentCourse.value, lo) : []);
</script>

<nav aria-label="Breadcrumb">
  <ol>
    {#each crumbs as crumb, i (crumb.route)}
      <li>
        {#if i === crumbs.length - 1}
          <span aria-current="page">{crumb.title}</span>
        {:else}
          <a href={crumb.route}>{crumb.title}</a>
        {/if}
      </li>
    {/each}
  </ol>
</nav>

<style>
  ol { display: flex; flex-wrap: wrap; gap: 0.5rem; list-style: none; padding: 0; margin: 0 0 1rem; font-size: 0.9rem; }
  li + li::before { content: "/"; margin-right: 0.5rem; color: var(--muted); }
</style>
