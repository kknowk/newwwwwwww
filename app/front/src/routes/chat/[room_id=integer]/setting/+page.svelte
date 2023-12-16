<script lang="ts">
  import { onMount } from "svelte";
  import type { PageData } from "./$types";
  import { goto } from "$app/navigation";

  let button: HTMLButtonElement;
  let nameElem: HTMLInputElement;
  let passwordElem: HTMLInputElement;
  let failureElem: HTMLDivElement;

  export let data: PageData;

  function changeRadio(ev: Event) {
    if (ev.target == null || !("value" in ev.target)) {
      return;
    }
    const value = Number.parseInt(ev.target.value as string);
    if (value === 0 || value === 1 || value === 2) {
      data.room.kind = value;
    }
  }

  onMount(() => {
    const element = document.querySelector(`input[name="kind"][value="${data.room.kind}"]`);
    if (element == null) {
      return;
    }
    (element as any).checked = true;
  });

  async function submitCallback() {
    const response = await fetch(`/api/chat-room/update/${data.room.id}`, {
      method: "POST",
      body: JSON.stringify({
        name: nameElem.value,
        kind: data.room.kind,
        password: data.room.kind === 1 ? passwordElem.value : undefined,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.ok) {
      await goto(`/chat/${data.room.id}`, { invalidateAll: true });
      return true;
    } else {
      console.error(response);
      return false;
    }
  }

  async function submitFunc(ev: SubmitEvent) {
    ev.preventDefault();
    button.disabled = true;
    let success = false;
    if (nameElem.checkValidity()) {
      if (data.room.kind === 1) {
        if (passwordElem.checkValidity()) {
          success = await submitCallback();
        }
      } else {
        success = await submitCallback();
      }
    }
    if (!success) {
      failureElem.style.display = "block";
      setTimeout(() => {
        failureElem.style.display = "none";
        button.disabled = false;
      }, 3000);
    }
  }
</script>

<form on:submit={submitFunc}>
  <label>
    Name:
    <input
      type="text"
      bind:this={nameElem}
      value={data.room.name}
      required
      minlength="1"
      maxlength="32"
    />
  </label>
  <fieldset>
    <legend>Chat Room Accessibility Kind</legend>
    <div>
      <label>
        <input type="radio" value="0" name="kind" on:change={changeRadio} />
        Private
      </label>
    </div>
    <div>
      <label>
        <input type="radio" value="1" name="kind" on:change={changeRadio} />
        Protected
      </label>
    </div>
    <div>
      <label>
        <input type="radio" value="2" name="kind" on:change={changeRadio} />
        Public
      </label>
    </div>
  </fieldset>
  <label>
    Password(Minimum 8 letters):
    <input
      type="password"
      name="password"
      bind:this={passwordElem}
      disabled={data.room.kind !== 1}
      minlength="8"
      autocomplete="current-password"
    />
  </label>
  <div>
    <button type="submit" bind:this={button}>Update Chat Room Setting</button>
  </div>
</form>

<div bind:this={failureElem} class="failure-div">Your input is invalid.</div>

<style>
  .failure-div {
    display: none;
    position: fixed;
    top: 20px;
    left: 20px;
    border: 1px solid #ddd;
    background-color: red;
    color: white;
    padding: 15px;
    box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);
    z-index: 1000;
  }

  form {
    padding-top: 1ex;
    padding: 1em;
  }
</style>
