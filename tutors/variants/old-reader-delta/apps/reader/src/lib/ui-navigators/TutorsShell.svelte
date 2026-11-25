<!--
  The frame around every course page: a skip link, the top bar and the main region. Mirrors upstream
  TutorsShell (packages/svelte/ui-navigators/src/TutorsShell.svelte) without its menus, search and presence.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { currentCourse } from "../runes/index.svelte.ts";

  let { children }: { children: Snippet } = $props();
  const course = $derived(currentCourse.value?.course);
</script>

<a class="skip" href="#main-content">Skip to content</a>
<header>
  <a href="/">Tutors ladder reader</a>
  {#if course}<a class="course" href={course.route}>{course.title}</a>{/if}
</header>
<!-- tabindex -1: the course layout moves focus here after each navigation, so a screen reader starts on the new page. -->
<main id="main-content" tabindex="-1">
  {@render children()}
</main>

<style>
  header { display: flex; flex-wrap: wrap; gap: 1rem; align-items: baseline; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
  .course { font-weight: 600; }
  main { max-width: 64rem; margin: 0 auto; padding: 1rem; outline: none; }
  .skip { position: absolute; left: -999px; }
  .skip:focus { left: 1rem; top: 0.5rem; background: var(--surface); padding: 0.25rem 0.5rem; }
</style>
