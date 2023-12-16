<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.user.displayName}'s Direct Messages</title>
</svelte:head>

<ul>
  {#each data.rooms as room}
    <li>
      <a href="/home/direct-message/{room.counterpart_id}">
        {room.counterpart_name}
      </a>
    </li>
  {/each}
</ul>

<style>
  ul {
    list-style: none;
    padding-top: 1ex;

    & li {
      padding-top: 1ex;
      padding-bottom: 1ex;
    }
  }
</style>