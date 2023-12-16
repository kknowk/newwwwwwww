<script lang="ts">
  import type { PageData } from "./$types";

  export let data: PageData;

  async function submitFunction(ev: SubmitEvent) {
    ev.preventDefault();
    if (!(ev.target instanceof HTMLFormElement)) {
      return;
    }
    const numbers: number[] = [];
    const formData = new FormData(ev.target);
    for (const [key, _] of formData) {
      const parsed = Number.parseInt(key);
      numbers.push(parsed);
    }
    const response = await fetch(`/api/chat-room/kick/${data.room.id}`, {
      method: "POST",
      body: JSON.stringify(numbers),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.ok && data.members) {
      for (const iterator of numbers) {
        data.members.set(iterator, -2);
      }
      return;
    }
  }
</script>

<div class="sticky">
  <input form="main-form" type="submit" value="Kick" />
</div>

<form id="main-form" on:submit={submitFunction}>
  {#if data.members}
    {#each data.members as [member_id, member_kind]}
      {#if member_id !== data.user.id && member_kind > 0}
        <div>
          <label title={member_id.toString()}>
            <input type="checkbox" name={member_id.toString()} />
            <span class="kind-{member_kind} rel-{data.users.get(member_id)?.relationship}"
              >{data.users.get(member_id)?.displayName}</span
            >
            <a href="/user/{member_id}">(profile)</a>
          </label>
        </div>
      {/if}
    {/each}
  {/if}
</form>

<style>
  .sticky {
    position: sticky;
    padding: 0.5em;
    padding-top: 1ex;
  }

  form {
    padding: 1em;

    & div {
      margin-top: 0.5em;
    }
  }

  & input[type="submit"] {
    background-color: azure;
    padding: 1ex;
  }
</style>
