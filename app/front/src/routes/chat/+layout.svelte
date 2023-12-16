<script lang="ts">
  import UserMenu from "$lib/components/user-menu.svelte";
</script>

<div class="grid-container">
  <div>
    <UserMenu />
  </div>
  <div class="grid-main">
    <slot />
  </div>
</div>

<style>
  .grid-container {
    display: grid;
    grid-template-columns: auto 1fr;
    min-height: max(100%, 100vh);
  }
</style>
