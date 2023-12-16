<script lang="ts">
  let area: HTMLTextAreaElement;
  let button: HTMLButtonElement;

  export let sendMessageCallback: (
    areaElement: HTMLTextAreaElement,
    buttonElement: HTMLButtonElement
  ) => Promise<void> | void;

  async function keydownHook(event: KeyboardEvent) {
    if (event.key !== "Enter") {
      return;
    }
    if (!event.shiftKey) {
      event.preventDefault();
      button.click();
    } else {
      const currentHeight = area.style.height ?? "4lh";
      const lineHeight = Number.parseInt(currentHeight.slice(0, currentHeight.length - 2)) + 1;
      area.style.height = `${lineHeight}lh`;
    }
  }

  async function submitCallback(ev: SubmitEvent) {
    ev.preventDefault();
    await sendMessageCallback(area, button);
  }
</script>

<form on:submit={submitCallback}>
  <label class="no-show">
    <span>Input Message Text Area:</span>
    <textarea bind:this={area} on:keydown={keydownHook} maxlength="140" />
  </label>
  <button type="submit" bind:this={button}>Send</button>
</form>

<style>
  .no-show span {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  form {
    & textarea {
      width: 100%;
      height: 4lh;
    }

    & button {
      display: block;
      align-items: flex-start;
      padding-top: 1ex;
      padding-bottom: 1ex;
      border: unset;
      width: 100%;
      background-color: lavenderblush;
    }
  }
</style>
