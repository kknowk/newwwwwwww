<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { PageData } from "./$types";
  import { browser } from "$app/environment";
  import { showTimeDiff } from "$lib/time-helper";
  import { invalidateAll } from "$app/navigation";

  export let data: PageData;

  let now = Math.floor(Date.now() / 1000);
  let intervalId: number | null = null;
  function calcDate(seconds: number) {
    const date = new Date(seconds * 1000);
    return date.toString();
  }

  onMount(async () => {
    intervalId = setInterval(() => {
      now = Math.floor(Date.now() / 1000);
    }, 600000) as any as number;
  });

  onDestroy(() => {
    if (browser && intervalId !== null) {
      clearInterval(intervalId);
    }
  });

  async function clearNoticeFunc() {
    await fetch(`/api/user/clear-notice`, {
      method: "POST",
    });
    await invalidateAll();
  }
</script>

<main>
  {#if data.notices.length !== 0}
    <button on:click={clearNoticeFunc}>Clear</button>
  {:else}
    <h1>No Notice is Available</h1>
  {/if}
  <ul>
    {#each data.notices as notice}
      <li id="notice-{notice.id.toString()}">
        <article>
          {@html notice.content}
          <time title={calcDate(notice.date)}>{showTimeDiff(notice.date, now)}</time>
        </article>
      </li>
    {/each}
  </ul>
</main>

<style>
  main {
    padding-top: 1ex;

    & li {
      list-style: none;
      padding-top: 1ex;
    }
  }
</style>
