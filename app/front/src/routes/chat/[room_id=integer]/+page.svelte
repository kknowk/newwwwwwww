<script lang="ts">
  import type { PageData } from "./$types";
  import Message from "$lib/components/message.svelte";
  import EnterKeyTextarea from "$lib/components/enter-key-textarea.svelte";
  import InfiniteScrolling from "$lib/components/infinite-scrolling.svelte";
  import { onDestroy, onMount } from "svelte";
  import type { IChatLog } from "$lib/back/chat-room/chat-room.entity";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { store } from "$lib/skywaybag-store";
  import type { IUserWithRelationship } from "$lib/back/user/user.entity";

  export let data: PageData;
  let logs = data.logs;

  let now = Math.ceil(Date.now() / 1000);
  let intervalId: number | null = null;

  async function polling() {
    now = Math.ceil(Date.now() / 1000);
    const url = `/api/chat-room/logs/${
      data.room.id
    }?order=descending&start_exclusive=${get_start_exclusive_id()}`;
    const response = await fetch(url);
    await renewLogs(response);
  }

  async function get_users(logs: IChatLog[]) {
    if (data.users == null) {
      return;
    }
    let unknown_users: number[] | null = null;
    for (const iterator of logs) {
      if (data.users.has(iterator.id)) {
        continue;
      }
      unknown_users ??= [] as number[];
      unknown_users.push(iterator.id);
    }
    if (unknown_users === null) {
      return;
    }
    const response = await fetch("/api/user/users", {
      method: "POST",
      body: JSON.stringify(unknown_users),
    });
    if (!response.ok) {
      return;
    }
    const users: IUserWithRelationship[] = await response.json();
    for (const iterator of users) {
      data.users.set(iterator.id, iterator);
    }
  }

  async function renewLogs(response: Response) {
    if (response.ok) {
      const new_logs = (await response.json()) as IChatLog[] | null;
      if (new_logs != null && new_logs.length > 0) {
        await get_users(new_logs);
        if (logs) {
          new_logs.push(...logs);
        }
        logs = new_logs;
      }
    }
    now = Math.ceil(Date.now() / 1000);
  }

  function visibilityChangeHandler(this: Document, _: Event) {
    if (this.visibilityState === "hidden") {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      return;
    }
    if (intervalId == null) {
      intervalId = setInterval(polling, 60000) as unknown as number;
    }
    polling();
  }

  function get_start_exclusive_id() {
    if (logs == null || logs.length === 0) {
      return "-1";
    } else {
      return logs[0].id.toString();
    }
  }

  onMount(async () => {
    console.log("skyway on mount");
    if ($store) {
      $store.joinRoom(data.room.id, polling);
      return;
    }
    const { SkyWayBag } = await import("$lib/skyway-bag");
    $store = await SkyWayBag.create(data.user.id);
    if ($store) {
      $store.joinRoom(data.room.id, polling);
      return;
    }
    console.log("fallback to visibility change");
    intervalId = setInterval(polling, 60000) as unknown as number;
    document.addEventListener("visibilitychange", visibilityChangeHandler);
  });

  onDestroy(async () => {
    if (browser) {
      if ($store) {
        await $store.leaveRoom();
        return;
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener("visibilitychange", visibilityChangeHandler);
    }
  });

  const fetchOptions: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
    credentials: "same-origin",
  };

  async function sendMessage(areaElement: HTMLTextAreaElement, buttonElement: HTMLButtonElement) {
    if (areaElement.value.length === 0) {
      return;
    }
    buttonElement.disabled = true;
    try {
      const option = structuredClone(fetchOptions);
      option.body = areaElement.value;
      areaElement.value = "";
      const url = `/api/chat-room/send-message/${
        data.room.id
      }?order=descending&start_exclusive=${get_start_exclusive_id()}`;
      const response = await fetch(url, option);
      await renewLogs(response);
      $store?.send();
    } finally {
      buttonElement.disabled = false;
    }
  }

  async function get_history(): Promise<void> {
    const url = `/api/chat-room/logs/${data.room.id}?order=descending&limit=50&end_exclusive=${
      logs![logs!.length - 1].id
    }`;
    const response = await fetch(url);
    if (!response.ok) {
      return;
    }
    const old_logs = (await response.json()) as IChatLog[] | null;
    if (old_logs != null && old_logs.length > 0) {
      await get_users(old_logs);
      if (logs) {
        logs.push(...old_logs);
        logs = logs;
      } else {
        logs = old_logs;
      }
    }
    now = Math.ceil(Date.now() / 1000);
  }

  $: infiniteDisabled =
    logs == null ||
    logs.length === 0 ||
    logs[logs.length - 1].id === data.room.start_inclusive_log_id;

  async function joinPrivate(ev: Event) {
    if (!(ev.target instanceof HTMLButtonElement)) {
      return;
    }
    ev.target.disabled = true;
    const response = await fetch(`/api/chat-room/approve-invitation/${data.room.id}`, {
      method: "POST",
    });
    if (response.ok && (await response.json())) {
      window.location.reload();
    } else {
      await goto("/home", { invalidateAll: true });
    }
  }

  async function rejectPrivate(ev: Event) {
    if (!(ev.target instanceof HTMLButtonElement)) {
      return;
    }
    ev.target.disabled = true;
    await fetch(`/api/chat-room/reject-invitation/${data.room.id}`, {
      method: "POST",
    });
    await goto("/home", { invalidateAll: true });
  }

  let password_sender: HTMLInputElement;

  async function joinProtected(ev: SubmitEvent) {
    ev.preventDefault();
    await fetch(`/api/chat-room/approve-invitation/${data.room.id}`, {
      method: "POST",
      body: JSON.stringify({ password: password_sender.value }),
    });
    window.location.reload();
  }

  async function joinPublic(ev: Event) {
    if (!(ev.target instanceof HTMLButtonElement)) {
      return;
    }
    ev.target.disabled = true;
    await fetch(`/api/chat-room/approve-invitation/${data.room.id}`, {
      method: "POST",
    });
    window.location.reload();
  }

  function getDisplayName(id: number): string {
    if (id === data.user.id) {
      return data.user.displayName;
    }
    const found = data.users?.get(id);
    if (found == null) {
      return "(banned)";
    }
    return found.displayName;
  }
</script>

<svelte:head>
  <title>{data.room.name}- {data.user.displayName}</title>
</svelte:head>

<main>
  {#if logs}
    <EnterKeyTextarea sendMessageCallback={sendMessage} />
    <div class="chat-container">
    {#each logs as log}
      <div class="message {log.member_id === data.user.id ? 'mine' : 'others'}">
        <Message
          message_id={log.id}
          content={log.content}
          user_id={log.member_id}
          user_name={getDisplayName(log.member_id)}
          utcSeconds={log.date}
          {now}
          is_html={log.is_html}
        />
      </div>
    {/each}
    <InfiniteScrolling disabled={infiniteDisabled} callback={get_history} />
    </div>
  {:else if data.room.kind === 0}
    You have been invited to {data.room.name}.
    <div>
      <button on:click={joinPrivate}>Accept Invitation</button>
      <button on:click={rejectPrivate}>Reject Invitation</button>
    </div>
  {:else if data.room.kind === 1}
    This {data.room.name} is a password-protected chat room.
    <form on:submit={joinProtected}>
      <input
        type="password"
        bind:this={password_sender}
        minlength="8"
        autocomplete="current-password"
      />
      <input type="submit" />
    </form>
  {:else if data.room.kind === 2}
    Are you sure to join the public chat room {data.room.name}?
    <div>
      <button on:click={joinPublic}>Join</button>
      <button on:click={() => goto("/home", { invalidateAll: true })}>Leave</button>
    </div>
  {/if}
</main>

<style>
  .message {
    padding-top: 1ex;
    padding-bottom: 1ex;

    & + .message {
      border-top: solid;
      border-top-color: slategray;
    }
  }

  .chat-container {
    display: flex;
    flex-direction: column;
    margin: auto;
  }

  .message {
    margin: 5px;
    padding: 10px;
    border-radius: 10px;
    max-width: 80%;
    position: relative;
  }

  .mine {
    background-color: #DCF8C6;
    align-self: flex-end;
    border-bottom-right-radius: 0;
  }

  .others {
    background-color: #ECECEC;
    align-self: flex-start;
    border-bottom-left-radius: 0;
	  padding-bottom: 20px;
  }

</style>
