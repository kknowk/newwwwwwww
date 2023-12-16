<script lang="ts">
  import type { PageData } from "./$types";
  import CreateNewChatRoomForm from "$lib/components/create-new-chat-room-form.svelte";
  import type { ChatRoomKind } from "$lib/back/chat-room/chat-room.entity";
  import { goto } from "$app/navigation";

  export let data: PageData;
  let rooms = data.rooms;
  let notMemberRooms = data.notMemberRooms;

  async function createNewChatRoom(
    _: HTMLButtonElement,
    name: string,
    kind: ChatRoomKind,
    password?: string
  ): Promise<boolean> {
    const response = await fetch("/api/chat-room/create", {
      method: "POST",
      body: JSON.stringify({
        name,
        kind,
        password,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.ok) {
      const room_id = await response.text();
      await goto(`/chat/${room_id}`, { invalidateAll: true });
      return true;
    } else {
      console.error(response);
      return false;
    }
  }
</script>

<svelte:head>
  <title>{data.user.displayName}'s Chats</title>
</svelte:head>

<div class="grid-container">
  <ul class="grid-main room-mine">
    {#each rooms as room}
      <li>
        <a href="/chat/{room.id}">{room.name}</a>
      </li>
    {/each}
  </ul>
  <ul class="grid-main room-public">
    {#each notMemberRooms as room}
      <li>
        <a href="/chat/{room.id}">{room.name}</a>
      </li>
    {/each}
  </ul>
  <details>
    <summary>Create New Chat Room</summary>
    <CreateNewChatRoomForm callback={createNewChatRoom} />
  </details>
</div>

<style>
  .grid-container {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: 1fr 1fr;
    height: 100%;
    width: 100%;

    & ul.grid-main {
      padding-top: 1ex;
      padding-left: 0.5em;
      padding-right: 0.5em;
      list-style: none;
      grid-column: 1 / 2;

      & li {
        padding-top: 1ex;
        padding-bottom: 1ex;
      }

      &.room-mine::before {
        content: "Rooms you are belonging to";
      }

      &.room-public::before {
        content: "Public Rooms";
      }
    }

    & details {
      padding: 0.5em;
      padding-top: 1ex;
      background-color: blanchedalmond;
      min-height: 100%;
      position: sticky;
      top: 0;
      grid-column: 2 / 3;
      grid-row: 1 / 3;

      & summary {
        list-style: none;
        font-size: larger;

        &::before {
          content: "☰ ";
          font-size: larger;
          transition: background-color 0.2s;
        }

        &:hover::before {
          background-color: rgba(0, 0, 0, 0.13);
        }
      }
    }
  }
</style>
