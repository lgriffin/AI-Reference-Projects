<!--
  One learning object as a card: a link with its title, kind and summary. Mirrors upstream Card
  (packages/svelte/ui-components/src/learning-objects/layout/Card.svelte), which takes the same flattened
  cardDetails. Svelte escapes {cardDetails.summary}, so course text never becomes markup here.
-->
<script lang="ts" module>
  import type { LoType } from "@ladder/model";

  export type CardDetails = { route?: string; title: string; type: LoType; summary: string };
</script>

<script lang="ts">
  import Icon from "../../ui-primitives/Icon.svelte";
  import { loTypeColour } from "../../ui-primitives/lo-colours.ts";

  let { cardDetails }: { cardDetails: CardDetails } = $props();
  // A web link leaves the reader, so it opens in a new tab, as upstream does for "web" and "github".
  const external = $derived(cardDetails.route?.startsWith("http") ?? false);
</script>

<article class="card" data-lo-type={cardDetails.type} style:--accent={loTypeColour[cardDetails.type]}>
  <svelte:element
    this={cardDetails.route ? "a" : "div"}
    class="link"
    href={cardDetails.route}
    target={external ? "_blank" : undefined}
    rel={external ? "noopener noreferrer" : undefined}
  >
    <h3>{cardDetails.title}</h3>
    <Icon type={cardDetails.type} />
    <span class="visually-hidden">{cardDetails.type}</span>
  </svelte:element>
  {#if cardDetails.summary}<p>{cardDetails.summary}</p>{/if}
</article>

<style>
  .card { position: relative; height: 100%; padding: 1rem; border: 1px solid var(--accent); border-block-width: 6px; border-radius: 0.5rem; background: var(--surface); }
  .link { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; color: inherit; text-decoration: none; }
  /* The whole card is the link's target, as upstream's .resource-link::after. */
  a.link::after { content: ""; position: absolute; inset: 0; }
  .card:has(a.link:focus-visible) { outline: 3px solid var(--focus); outline-offset: 2px; }
  a.link:focus-visible { outline: none; }
  h3 { margin: 0; font-size: 1.1rem; }
  p { margin: 0.75rem 0 0; color: var(--muted); font-size: 0.9rem; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
</style>
