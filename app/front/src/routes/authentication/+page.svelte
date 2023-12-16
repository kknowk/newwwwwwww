<script lang="ts">
  import { onMount } from "svelte";
  import type { PageData } from "./$types";
  import { goto } from "$app/navigation";

  export let data: PageData;

  let success: boolean | null = null;
  let recommendation = false;
  let submit_button: HTMLInputElement;

  const sendMail = async () => {
    if (data.user?.is_two_factor_authenticated) {
      goto("/home", { invalidateAll: true });
    }
    recommendation = false;
    submit_button.setAttribute("disabled", "disabled");
    const response = await fetch("/auth/send-mail", {
      method: "POST",
      credentials: "same-origin",
      mode: "same-origin",
      cache: "no-cache",
    });
    if (response.ok) {
      submit_button.removeAttribute("disabled");
    } else {
      recommendation = true;
    }
  };

  onMount(sendMail);

  async function submitFunction(ev: SubmitEvent) {
    ev.preventDefault();
    const formData = new FormData(ev.target as HTMLFormElement);
    const challenge = formData.get("challenge")?.valueOf();
    if (typeof challenge !== "string") {
      return;
    }
    const response = await fetch(`/auth/challenge/${challenge.trim()}`, {
      method: "POST",
    });
    success = response.ok;
    if (success) {
      await goto("/home", {
        invalidateAll: true,
        replaceState: true,
      });
    }
  }
</script>

<svelte:head>
  <title>Two Factor Authentication Page</title>
</svelte:head>
<form method="post" on:submit={submitFunction}>
  <label>
    Challenge Code (6 digit):
    <input name="challenge" type="text" pattern="[0-9]{'{'}6{'}'}" />
  </label>
  <input disabled bind:this={submit_button} type="submit" />
  {#if success === false}
    <p>Challenge code is invalid. Please retry.</p>
  {/if}
</form>

<h1 style="display: {recommendation ? 'unset' : 'none'};">You should resend challenge code.</h1>

<button on:click={sendMail}>Re-send Challenge Code</button>

<style>
  form {
    padding: 0.5em;
    padding-top: 1ex;
  }
</style>
