<script lang="ts">
  import type { IUserWithRelationship } from "$lib/back/user/user.entity";
  import type { PageData } from "./$types";

  export let data: PageData;

  let user_name: string = "";

  async function searchByName(user_name: string): Promise<IUserWithRelationship[]> {
    if (user_name.length === 0) return [];
    const response = await fetch(`/api/user/find-by-partial-name/${encodeURIComponent(user_name)}`);
    return await response.json();
  }

  $: users_promise = searchByName(user_name);

  function is_invitable(user: IUserWithRelationship) {
    if (user.relationship === -1)
      if (user.id === data.user.id) {
        return false;
      }
    return !data.members.has(user.id);
  }

  async function submitFunction(ev: SubmitEvent) {
    ev.preventDefault();
    if (!(ev.target instanceof HTMLFormElement)) {
      return;
    }
    const numbers: number[] = [];
    const formData = new FormData(ev.target);
    for (const [key, _] of formData) {
      const id = Number.parseInt(key);
      if (Number.isSafeInteger(id)) {
        numbers.push(id);
      }
    }
    const response = await fetch(`/api/chat-room/invite/${data.room.id}`, {
      method: "POST",
      body: JSON.stringify(numbers),
      headers: {
        "Content-Type": "application/json",
      },
    });
    user_name = "";
  }
</script>

<search>
  <div class="sticky">
    <form
      on:submit={(ev) => {
        ev.preventDefault();
      }}
    >
      <label>
        Search by user name:
        <input type="search" bind:value={user_name} />
      </label>
    </form>
    <input type="submit" form="main-form" value="Invite" />
  </div>
  <form id="main-form" on:submit={submitFunction}>
    {#await users_promise then users}
      {#each users as user}
        {#if is_invitable(user)}
          <div>
            <label>
              <input type="checkbox" name={user.id.toString()} />
              <span class="rel-{user.relationship}">{user.displayName}</span>
              <a href="/user/{user.id}">(profile)</a>
            </label>
          </div>
        {/if}
      {/each}
    {/await}
  </form>
</search>

<style>
  .sticky {
    position: sticky;
    top: 0;
    padding: 0.5em;
    padding-top: 1ex;
  }

  #main-form {
    padding: 1em;

    & div {
      margin-top: 0.5em;
    }
  }

  input[form="main-form"] {
    min-width: 20%;
  }

  input[type="submit"] {
    background-color: azure;
    padding: 1ex;
  }
</style>
