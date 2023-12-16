<script lang="ts">
  import type { ChatRoomKind } from "$lib/back/chat-room/chat-room.entity";

  let selectedKind: ChatRoomKind = 0;

  export let callback: (
    button: HTMLButtonElement,
    name: string,
    kind: ChatRoomKind,
    password?: string
  ) => Promise<boolean>;

  let button: HTMLButtonElement;
  let nameElem: HTMLInputElement;
  let passwordElem: HTMLInputElement;
  let failureElem: HTMLDivElement;

  async function submitFunc(ev: SubmitEvent) {
    ev.preventDefault();
    button.disabled = true;
    let success = false;
    if (nameElem.checkValidity()) {
      const name = nameElem.value;
      if (selectedKind === 1) {
        if (passwordElem.checkValidity()) {
          success = await callback(button, name, 1, passwordElem.value);
        }
      } else {
        success = await callback(button, name, selectedKind);
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

  function changeRadio(ev: Event) {
    if (ev.target == null || !("value" in ev.target)) {
      return;
    }
    const value = Number.parseInt(ev.target.value as string);
    if (value === 0 || value === 1 || value === 2) {
      selectedKind = value;
    }
  }
</script>

<div bind:this={failureElem} class="failure-div">Your input is invalid.</div>

<form on:submit={submitFunc}>
  <label class="grid-container">
    Name:
    <input type="text" bind:this={nameElem} minlength="1" maxlength="32" autocomplete="off" />
  </label>
  <fieldset>
    <legend>Chat Room Accessibility Kind</legend>
    <div>
      <label>
        <input type="radio" value="0" name="kind" on:change={changeRadio} checked />
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
      disabled={selectedKind !== 1}
      minlength="8"
      autocomplete="off"
    />
  </label>
  <div>
    <button type="submit" bind:this={button}>Create New Chat Room</button>
  </div>
</form>

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

  .grid-container {
    display: grid;
    grid-template-columns: auto 1fr;

    & input[type="text"] {
      width: 100%;
    }
  }

  fieldset {
    margin-top: 1ex;
    margin-bottom: 1ex;
  }

  fieldset + label {
    display: block;
    margin-top: 1ex;
    margin-bottom: 1ex;
  }

  button {
    padding: 1ex;
    width: 100%;
	transition: background-color 0.2s;
  }

  button:hover {
	background-color: #f0ab5b;
  }
</style>
