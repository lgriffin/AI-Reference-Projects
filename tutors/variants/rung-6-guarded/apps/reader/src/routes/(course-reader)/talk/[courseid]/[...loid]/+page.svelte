<script lang="ts">
  import Note from "#lib/ui-components/content/Note.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<Note lo={data.lo} />
