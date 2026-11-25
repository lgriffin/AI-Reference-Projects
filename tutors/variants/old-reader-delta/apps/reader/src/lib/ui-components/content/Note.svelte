<!--
  A page of Markdown: a note, or a talk's talk.md. Mirrors upstream Note
  (packages/svelte/ui-components/src/learning-objects/content/Note.svelte). Upstream shows a talk as its PDF
  or Marp slides (content/talk/); this rung shows the talk's text, which is all tutors.json carries here.
-->
<script lang="ts">
  import type { Note, Talk } from "@ladder/model";
  import Markdown from "../../ui-primitives/Markdown.svelte";
  import SecondaryNavigator from "../../ui-navigators/SecondaryNavigator.svelte";

  let { lo }: { lo: Note | Talk } = $props();
</script>

<SecondaryNavigator {lo} />
<article data-lo-type={lo.type}>
  <Markdown markdown={lo.contentMd} />
</article>
