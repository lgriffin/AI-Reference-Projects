<script lang="ts">
  import Composite from "#lib/ui-components/structure/Composite.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<Composite composite={data.topic} />
