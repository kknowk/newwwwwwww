<script lang="ts">
  import type { IUserWithRelationship } from "$lib/back/user/user.entity";
  import type { PageData } from "./$types";
  import SetRelationshipButtons from "$lib/components/set-relationship-buttons.svelte";
  import { showTimeDiff } from "$lib/time-helper";

  export let data: PageData;
  let isMatching = false;
  let matchFound = false;
  let matchDetails = null;

  async function startMatchmaking() {
    isMatching = true;
    matchFound = false;
    try {
      const response = await fetch("/api/matchmaking/start", {
        method: "POST",
      });
      const result = await response.json();
      if (result.success) {
        matchDetails = result.match;
        matchFound = true;
        const gameRoomId = matchDetails.gameRoomId; // サーバーから受け取ったゲームルームID
        setTimeout(
          () => (window.location.href = `/game_pong/${gameRoomId}`),
          0,
        );
      }
    } catch (error) {
      console.error("Matchmaking error:", error);
    } finally {
      isMatching = false;
    }
  }

  let user_name: string = "";
  $: users_promise = changeValueFunc(user_name);

  async function changeValueFunc(user_name: string) {
    if (user_name.length === 0) {
      return [];
    }
    console.log(user_name);
    const response = await fetch(
      `/api/user/find-by-partial-name/${encodeURIComponent(user_name)}`,
    );
    if (response.ok) {
      const answer = (await response.json()) as IUserWithRelationship[];
      const spliceIndex = answer.findIndex((value) => {
        if (value.id === data.user?.id) return true;
        return false;
      });
      if (spliceIndex >= 0) {
        answer.splice(spliceIndex, 1);
      }
      return answer;
    } else {
      return [];
    }
  }

  function callbackInvalidate() {
    user_name = "";
  }

  const now = Math.floor(Date.now() / 1000);
</script>

<svelte:head>
  <title>{data.user?.displayName}'s Home</title>
</svelte:head>

<main class="grid-container">
  {#if isMatching}
    <p>マッチング中です。しばらくお待ちください...</p>
    <img src="/loli.jpg" alt="uisama" />
  {:else if matchFound}
    <p>マッチが見つかりました！ゲームがまもなく開始します。</p>
    <img src="/naki.jpeg" alt="uisaman" />
  {:else}
    <button on:click={startMatchmaking}>マッチメイキングを開始</button>
  {/if}

  <div style=" margin-top: 1cm;">
    <search>
      <label>
        Search by user name:
        <input type="search" bind:value={user_name} />
      </label>
    </search>
    <ul>
      {#await users_promise then users}
        {#each users as user}
          {#if user.relationship !== -1}
            <li>
              <a href="/user/{user.id}">{user.displayName}</a>
              <a href="/home/direct-message/{user.id}"> Send Direct Message </a>
              <SetRelationshipButtons
                user_id={user.id}
                user_relationship={user.relationship}
                callback={callbackInvalidate}
              />
            </li>
          {/if}
        {/each}
      {/await}
    </ul>
  </div>
  <div>
    <h2>History - Win: {data.win} Lose: {data.lose}</h2>
    {#each data.logs as log}
      <div class="log-{log.win ? 'win' : 'lose'}">
        <p>
          Result: {log.win ? "win" : "lose"}
          {"("}<time title={new Date(log.date * 1000).toLocaleString()}>
            {showTimeDiff(log.date, now)}
          </time>{")"}
        </p>
        <p><a href="/user/{log.id.toString()}">Opponent: {log.name}</a></p>
      </div>
    {/each}
  </div>
</main>

<style>
  main {
    margin-top: 1ex;
  }

  search {
    margin-top: 1em;
  }

  .grid-container {
    display: grid;
    grid-template-columns: 1fr;

    & button {
      padding: 1em;
      text-align: center;
      background-color: antiquewhite;
    }
  }

  .log-win {
    background-color: aqua;
    padding: 1ex;

    & a {
      text-decoration: none;
    }
  }

  .log-lose {
    background-color: black;
    color: white;
    padding: 1ex;

    & a {
      text-decoration: none;
      color: white;
    }
  }
</style>
