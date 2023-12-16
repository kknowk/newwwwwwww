<script lang="ts">
  import type { PageData } from "./$types";
  import { page } from "$app/stores";
  import SetRelationshipButtons from "$lib/components/set-relationship-buttons.svelte";
  import { goto } from "$app/navigation";

  export let data: PageData;
  let administrators: number[] = [];
  let normalMembers: number[] = [];
  let inviteeMembers: number[] = [];

  $: (() => {
    administrators.splice(0, administrators.length);
    normalMembers.splice(0, normalMembers.length);
    inviteeMembers.splice(0, inviteeMembers.length);
    if (data.members == null) {
      return;
    }
    for (const [key, kind] of data.members) {
      if (kind === 2) {
        administrators.push(key);
      } else if (kind === 1) {
        normalMembers.push(key);
      } else if (kind === 0) {
        inviteeMembers.push(key);
      }
    }
    administrators = administrators;
    normalMembers = normalMembers;
    inviteeMembers = inviteeMembers;
  })();

  async function inviteFunc() {
    if (data.members === null) {
      return;
    }
    const invitees = [] as number[];
    for (const id of data.members.keys()) {
      if (id === data.user.id) {
        continue;
      }
      const user = data.users.get(id);
      if (user == null || user.relationship === -1) {
        continue;
      }
      invitees.push(id);
      inviteeMembers.push(id);
    }
    const response = await fetch("/api/matchmaking/invite", {
      method: "POST",
      body: JSON.stringify(invitees),
    });
    if (response.ok) {
      const { gameRoomId } = await response.json();
      await goto(`/game_pong/${gameRoomId}`, { invalidateAll: true });
    }
  }

  async function leaveFunc() {
    await fetch(`/api/chat-room/${data.room.id}`, {
      method: "POST",
      body: `[${data.user.id}]`,
    });
    await goto("/home", { invalidateAll: true });
  }
</script>

<div class="grid-container">
  <div class="grid-main">
    <slot />
  </div>
  {#if data.logs}
    <menu class="grid-menu">
      <button on:click={inviteFunc}>Invite to New Game</button>
      {#if data.members?.get(data.user.id) === 2}
        {#if data.room.kind === 0}
          <a href="/chat/{data.room.id}/invite">Invite New Member</a>
        {/if}
        <a href="/chat/{data.room.id}/kick">Kick</a>
        <a href="/chat/{data.room.id}/mute">Mute</a>
        <a href="/chat/{data.room.id}/ban">Ban</a>
        {#if data.room.owner_id === data.user.id}
          <a href="/chat/{data.room.id}/setting">Setting</a>
        {/if}
        {#if $page.url.pathname !== `/chat/${data.room.id}`}
          <a href="/chat/{data.room.id}">Chat Room</a>
        {/if}
      {:else}
        <button on:click={leaveFunc}>Leave</button>
      {/if}
    </menu>
    {#if data.members}
      <details class="member-list">
        <summary>Members</summary>
        <div>
          {#if administrators.length > 0}
            <h3>Administrators</h3>
            <ul>
              {#each administrators as member_id}
                {#if member_id === data.user.id}
                  <li>
                    <a href="/user/{data.user.id}">{data.user.displayName}</a>
                  </li>
                {:else if (data.users.get(member_id)?.relationship ?? -1) >= 0}
                  <li>
                    <a href="/user/{member_id}">{data.users.get(member_id)?.displayName}</a>
                  </li>
                {/if}
              {/each}
            </ul>
          {/if}
          {#if normalMembers.length > 0}
            <h3>Members</h3>
            <ul>
              {#each normalMembers as member_id}
                {#if member_id === data.user.id}
                  <li>
                    <a href="/user/{data.user.id}">{data.user.displayName}</a>
                  </li>
                {:else if (data.users.get(member_id)?.relationship ?? -1) >= 0}
                  <li>
                    <a href="/user/{member_id}">{data.users.get(member_id)?.displayName}</a>
                  </li>
                {/if}
              {/each}
            </ul>
          {/if}
          {#if inviteeMembers.length > 0}
            <h3>Invitees</h3>
            <ul>
              {#each inviteeMembers as member_id}
                {#if member_id === data.user.id}
                  <li>
                    <a href="/user/{data.user.id}">{data.user.displayName}</a>
                  </li>
                {:else if (data.users.get(member_id)?.relationship ?? -1) >= 0}
                  <li>
                    <a href="/user/{member_id}">{data.users.get(member_id)?.displayName}</a>
                  </li>
                {/if}
              {/each}
            </ul>
          {/if}
        </div>
      </details>
    {/if}
  {/if}
</div>

<style>
  a:hover {
    text-decoration: underline;
  }

  .grid-container {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto 1fr;
    min-height: max(100%, 100vh);

    & .grid-main {
      padding-top: 1vh;
      grid-row: 1 / 3;
      grid-column: 1 / 2;
      padding-left: 0.5em;
      padding-right: 0.5em;
    }

    & .grid-menu {
      grid-row: 1 / 2;
      grid-column: 2 / 3;
      padding-left: 0.5em;
      padding-right: 0.5em;

      & button {
        display: block;
        align-items: flex-start;
        width: 100%;
        padding-top: 1ex;
        padding-bottom: 1ex;
        color: blue;
      }

      & a {
        display: block;
        width: 100%;
        text-decoration: unset;
        padding-top: 1ex;
        padding-bottom: 1ex;
        text-align: center;
        border-top: solid;
        border-color: mediumslateblue;
        color: blue;
      }
    }

    & details.member-list {
      grid-column: 2 / 3;
      grid-row: 2 / 3;
      background-color: blanchedalmond;
      padding: 0.5em;
      padding-top: 0.3em;

      & summary {
        text-align: center;
        cursor: pointer;
        list-style: none;
        font-size: larger;
      }

      & summary::before {
        content: "☰ ";
        transition: background-color 0.2s;
      }

      & summary:hover::before {
        background-color: rgba(0, 0, 0, 0.13);
      }
      & p {
        text-align: center;

        & h3 {
          text-decoration: underline;
        }
      }

      & ul {
        list-style: none;

        & li {
          & a {
            display: block;
            text-decoration: none;
            text-align: center;
            width: 100%;
          }
        }
      }
    }
  }
</style>
