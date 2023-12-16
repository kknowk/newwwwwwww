<script lang="ts">
  export let user_id: number;
  export let user_relationship: number;
  export let callback: null | ((button: HTMLButtonElement, response: Response) => unknown) = null;

  let add_friend_button: HTMLButtonElement;
  async function add_friend_clickFunc() {
    add_friend_button.disabled = true;
    const response = await fetch(`/api/user/set-relationship/${user_id}/1`, { method: "POST" });
    user_relationship = 1;
    if (callback) {
      callback(add_friend_button, response);
    }
  }

  let remove_friend_button: HTMLButtonElement;
  async function reove_friend_clickFunc() {
    remove_friend_button.disabled = true;
    const response = await fetch(`/api/user/set-relationship/${user_id}/0`, { method: "POST" });
    user_relationship = 0;
    if (callback) {
      callback(remove_friend_button, response);
    }
  }

  let ban_button: HTMLButtonElement;
  async function ban_button_clickFunc() {
    ban_button.disabled = true;
    const response = await fetch(`/api/user/set-relationship/${user_id}/-1`, { method: "POST" });
    user_relationship = -1;
    if (callback) {
      callback(ban_button, response);
    }
  }
</script>

{#if user_relationship <= 0}
  <button
    data-kind="add-friend"
    data-id={user_id}
    data-new-value="1"
    on:click={add_friend_clickFunc}
    bind:this={add_friend_button}>Add Friend</button
  >
{:else}
  <button
    data-kind="remove-friend"
    data-id={user_id}
    data-new-value="0"
    on:click={reove_friend_clickFunc}
    bind:this={remove_friend_button}>Remove Friend</button
  >
{/if}
<button
  data-kind="ban"
  data-id={user_id}
  data-new-value="-1"
  on:click={ban_button_clickFunc}
  bind:this={ban_button}>Ban</button
>

<style>
  button {
    display: var(--set-relationship-buttons-div-display, inline);
    &:not(:first-child) {
      margin-left: var(--set-relationship-buttons-button-margin-left, 10px);
      margin-top: var(--set-relationship-buttons-button-margin-top, 0);
      margin-right: var(--set-relationship-buttons-button-margin-right, 10px);
      margin-bottom: var(--set-relationship-buttons-button-margin-bottom, 0);
    }
    background-color: var(--set-relationship-buttons-button-background-color, azure);
  }
</style>
