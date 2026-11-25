<script lang="ts">
  import Lab from "#lib/ui-components/content/lab/Lab.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<Lab liveLab={data.liveLab} />
