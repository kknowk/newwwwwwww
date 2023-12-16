<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  onMount(async () => {
    console.log("hash: " + $page.url.hash);
    if ($page.url.hash.length === 0) {
      await goto("/#main", { invalidateAll: true });
    }
  });
</script>

<div>
  <h1>Pong Online</h1>
</div>
<div>
  <h2>You are not logged in.</h2>
</div>
<div>
  <a href="/auth">Login</a>
</div>

<style>
  div {
    width: 100vw;

    & * {
      text-align: center;
      width: 100%;
    }

    & a {
      display: block;
      text-decoration: none;
      font-size: xx-large;
    }
  }
</style>
