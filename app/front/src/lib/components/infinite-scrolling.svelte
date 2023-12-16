<script lang="ts">
  import { browser } from '$app/environment';
  import { onDestroy, onMount } from 'svelte';

  export let callback: () => Promise<void>;
  export let disabled: boolean;

  const intersectionCallback: IntersectionObserverCallback = async (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
    for (const iterator of entries) {
      if (iterator.isIntersecting) {
        await callback();
      }
    }
  };

  let observer: IntersectionObserver | null = null;
  let div: HTMLDivElement;

  onMount(() => {
    observer = new IntersectionObserver(intersectionCallback);
    observer.observe(div);
  });

  $: (() => {
    if (disabled && observer) {
      observer.disconnect();
      observer = null;
    }
  })();

  onDestroy(() => {
    if (browser && observer) {
      observer.disconnect();
    }
  });
</script>

<div bind:this={div} />
