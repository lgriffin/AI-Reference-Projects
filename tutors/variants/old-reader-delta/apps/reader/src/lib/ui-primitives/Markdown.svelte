<!--
  Course Markdown as HTML. The only {@html} in the reader (the architecture test checks): renderMarkdown from
  @ladder/lite escapes every character of its input before it adds a tag, so what it returns is SafeHtml.
  Upstream converts with markdown-it and passes the result through sanitizeHtml (rung 6, Guarded).
-->
<script lang="ts">
  import { renderMarkdown } from "@ladder/lite";

  let { markdown }: { markdown: string } = $props();
  const html = $derived(renderMarkdown(markdown).value);
</script>

<div class="prose">{@html html}</div>

<style>
  .prose :global(pre) { background: var(--code-background); padding: 0.75rem; overflow-x: auto; border-radius: 0.375rem; }
  .prose :global(code) { font-size: 0.9em; }
</style>
