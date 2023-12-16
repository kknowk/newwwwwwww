<script lang="ts">
  import type { PageData } from "./$types";
  import { default as SetRelationshipButtons } from "$lib/components/set-relationship-buttons.svelte";

  export let data: PageData;

  function fromSecondsToDate(seconds: number) {
    const date = new Date(seconds * 1000);
    return date;
  }

  async function setRelationship(button: HTMLButtonElement) {
    const user_id = Number.parseInt(button.dataset["id"] ?? "");
    const foundIndex = data.friends.findIndex((value, _, __) => {
      return value.id === user_id;
    });
    if (foundIndex === -1) return;
    data.friends[foundIndex] = data.friends[data.friends.length - 1];
    data.friends.pop();
  }
</script>

<ul>
  {#each data.friends as friend}
    <li>
      <a class="name-link" href="/user/{friend.id}">{friend.displayName}</a>
      <div>
        {#if friend.activity_kind === 0}
          Logout
        {:else if friend.activity_kind === 1}
          Login ({fromSecondsToDate(friend.last_activity_timestamp).toString()})
        {:else}
          In Game
        {/if}
      </div>
      <a href="/home/direct-message/{friend.id}"> Send Direct Message </a>
      <SetRelationshipButtons
        user_id={friend.id}
        user_relationship={1}
        callback={setRelationship}
      />
    </li>
  {/each}
</ul>

<style>
  ul {
    padding-top: 1ex;

    & li {
      padding-top: 1ex;
      padding-bottom: 1ex;

      & * {
        margin-top: 10px;
      }

      & a {
        text-decoration: none;
        background-color: azure;
        color: black;

        &.name-link {
          background-color: unset;
        }
      }

      & + li {
        border-top: solid;
      }
    }
  }
</style>
