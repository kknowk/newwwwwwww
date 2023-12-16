<script lang="ts">
  import type { PageData } from "./$types";
  import SetRelationshipButtons from "$lib/components/set-relationship-buttons.svelte";
  import EnterKeyTextArea from "$lib/components/enter-key-textarea.svelte";
  import Message from "$lib/components/message.svelte";
  import InfiniteScrolling from "$lib/components/infinite-scrolling.svelte";
  import { goto } from "$app/navigation";
  import type { IDirectMessageLog } from "$lib/back/direct-message-room/direct-message-room.entity";
  import { onDestroy, onMount } from "svelte";
  import { browser } from "$app/environment";

  export let data: PageData;
  let logs = data.logs;

  let now = Math.ceil(Date.now() / 1000);
  let intervalId: number | null = null;

  async function polling() {
    now = Math.ceil(Date.now() / 1000);
    const url = `/api/direct-message-room/logs/${
      data.counterpart.id
    }?order=descending&start_exclusive=${get_start_exclusive_id()}`;
    const response = await fetch(url);
    await renewLogs(response);
  }

  async function renewLogs(response: Response) {
    if (response.ok) {
      const new_logs = (await response.json()) as IDirectMessageLog[] | null;
      if (new_logs != null && new_logs.length > 0) {
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

  onMount(() => {
    intervalId = setInterval(polling, 60000) as unknown as number;
    document.addEventListener("visibilitychange", visibilityChangeHandler);
  });

  onDestroy(() => {
    if (browser) {
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener("visibilitychange", visibilityChangeHandler);
    }
  });

  async function relationshipCallback(element: HTMLButtonElement, response: Response) {
    if (response.ok && element.dataset.kind === "ban") {
      return await goto("/home/direct-message/list", { invalidateAll: true });
    }
  }

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
    const option = structuredClone(fetchOptions);
    option.body = areaElement.value;
    areaElement.value = "";
    let url = `/api/direct-message-room/send-message/${data.counterpart.id}?order=descending&start_exclusive=`;
    if (logs == null) {
      url += "-1";
    } else {
      const last_message_id = logs.length === 0 ? -1 : logs[0].id;
      url += last_message_id.toString();
    }
    const response = await fetch(url, option);
    await renewLogs(response);
    buttonElement.disabled = false;
  }

  async function getHistory(): Promise<void> {
    const url = `/api/direct-message-room/logs/${
      data.counterpart.id
    }?order=descending&limit=50&end_exclusive=${logs![logs!.length - 1].id}`;
    const response = await fetch(url);
    if (!response.ok) {
      return;
    }
    const old_logs = (await response.json()) as IDirectMessageLog[] | null;
    if (old_logs != null && old_logs.length > 0) {
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
    data.room == null ||
    logs == null ||
    logs.length === 0 ||
    logs[logs.length - 1].id === data.room.start_inclusive_log_id;

  async function inviteFunc() {
    const response = await fetch("/api/matchmaking/invite", {
      method: "POST",
      body: JSON.stringify([data.counterpart.id]),
    });
    if (response.ok) {
      const { gameRoomId } = await response.json();
      await goto(`/game_pong/${gameRoomId}`, { invalidateAll: true });
    }
  }

  async function hideFunc() {
    if (data.room == null) {
      return;
    }
    if (logs == null || logs.length === 0) {
      return;
    }
    const response = await fetch(`/api/direct-message-room/hide/${data.room.id}/${logs[0].id}`, {
      method: "POST",
    });
    if (response.ok) {
      await goto("/home", { invalidateAll: true });
    }
  }

  async function toggleLike(index: number) {
    const option = structuredClone(fetchOptions);
    // console.log("before: ", logs![index].is_liked);
    logs![index].is_liked = !logs![index].is_liked;
    // console.log("after: ", logs![index].is_liked);
    let url = `/api/direct-message-room/like/${data.counterpart.id}/${logs![index].id}/${logs![index].is_liked}`;
    const response = await fetch(url, option);
    console.log(response);
  }
</script>

<svelte:head>
  <title>
    {data.user.displayName}'s Direct Message between
    {data.counterpart.displayName}
  </title>
</svelte:head>

<div class="grid-container">
  <div class="grid-main">
    <EnterKeyTextArea sendMessageCallback={sendMessage} />
    <main class="chat-container">
      {#if logs}
        {#each logs as log, index}
          <div class="message {log.member_id === data.user.id ? 'mine' : 'others'}">
            <Message
              message_id={log.id}
              user_id={log.member_id}
              user_name={log.member_id === data.user.id
                ? data.user.displayName
                : data.counterpart.displayName}
              utcSeconds={log.date}
              content={log.content}
              {now}
              is_html={log.is_html}
            />
            <button
              class="like-button"
              on:click={() => toggleLike(index)}
              disabled={log.member_id === data.user.id ? true : false}
            >
              {log.is_liked ? '♥' : '♡'} Like
            </button>
          </div>
        {/each}
        <InfiniteScrolling disabled={infiniteDisabled} callback={getHistory} />
      {/if}
    </main>
  </div>
  <menu class="grid-nav">
    <button on:click={inviteFunc}>Invite to New Game</button>
    <SetRelationshipButtons
      user_id={data.counterpart.id}
      user_relationship={1}
      callback={relationshipCallback}
    />
    <button on:click={hideFunc}>Hide This Direct Messages</button>
  </menu>
</div>

<style>
  .grid-container {
    display: grid;
    grid-template-columns: 1fr auto;
    min-height: max(100%, 100vh);

    & .grid-main {
      padding-top: 1ex;
      padding-right: 0.5em;
    }

    & .grid-nav {
      position: sticky;
      top: 0;
      height: 100vh;
      display: grid;
      grid-template-rows: 2fr 1fr 1fr 1fr;
      background-color: blanchedalmond;

      & button {
        display: block;
        color: unset;
        text-align: center;
        align-items: flex-start;
        cursor: pointer;
        background-color: unset;
        margin: unset;
        padding: unset;
        border: unset;
        width: 100%;

        & + button {
          border-top: solid;
        }
      }
    }
  }

  .message + .message {
    border-top: solid;
    border-top-color: slategray;
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

  .like-button {
    position: absolute;
    bottom: 5px;
    right: 5px;
    background-color: transparent;
    border: none;
    cursor: pointer;
    color: #555;
  }
  
  .like-button:disabled, .like-button:disabled:hover{
    cursor: default;
    color: #555;
  }

  .like-button:hover {
    color: #d00;
  }
</style>