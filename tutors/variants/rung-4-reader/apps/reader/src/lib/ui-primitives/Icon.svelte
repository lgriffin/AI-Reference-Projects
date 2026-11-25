<!--
  The badge that names a learning object's kind. Upstream's Icon (packages/svelte/ui-primitives/src/components/
  Icon.svelte) draws an Iconify icon from the theme; this one draws the kind's first letter in its colour.
  Decorative: the card says the kind in text for screen readers, so the badge is hidden from them.
-->
<script lang="ts">
  import type { LoType } from "@ladder/model";
  import { loTypeColour } from "./lo-colours.ts";

  let { type }: { type: LoType } = $props();
</script>

<span class="icon" style:--colour={loTypeColour[type]} aria-hidden="true">{type.charAt(0).toUpperCase()}</span>

<style>
  .icon { display: inline-grid; place-items: center; width: 2rem; height: 2rem; flex: none; border-radius: 50%; background: var(--colour); color: #fff; font-weight: 700; }
</style>
