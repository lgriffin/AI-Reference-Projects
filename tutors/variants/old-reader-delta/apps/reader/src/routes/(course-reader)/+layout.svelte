<!--
  Wraps every course page in the shell. After each navigation, focus moves to the new page's main region,
  so keyboard and screen reader users start reading there. Mirrors upstream
  apps/reader/src/routes/(course-reader)/+layout.svelte, less time tracking, presence and locks.
-->
<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import type { Snippet } from "svelte";
  import TutorsShell from "#lib/ui-navigators/TutorsShell.svelte";
  import { currentCourse, currentLo } from "#lib/runes/index.svelte.ts";

  let { children }: { children: Snippet } = $props();

  afterNavigate(() => document.getElementById("main-content")?.focus({ preventScroll: true }));
</script>

<svelte:head>
  <title>{[currentLo.value?.title, currentCourse.value?.course.title].filter(Boolean).join(" | ")}</title>
</svelte:head>

<TutorsShell>
  {@render children()}
</TutorsShell>
