<script lang="ts">
  import UserMenu from "$lib/components/user-menu.svelte";
  import type { UserRelationshipKind } from "$lib/back/user/user.entity";
  import SetRelationshipButtons from "$lib/components/set-relationship-buttons.svelte";
  import type { PageData } from "./$types";
  import { showTimeDiff } from "$lib/time-helper";

  export let data: PageData;

  function relationshipCallback(button: HTMLButtonElement, response: Response) {
    if (!response.ok) {
      return;
    }
    const newValue = button.dataset["new-value"];
    if (newValue == null) {
      return;
    }
    const newRelationship = Number.parseInt(newValue);
    if (newRelationship < -1 || newRelationship > 1) {
      return;
    }
    data.relationship = newRelationship as UserRelationshipKind;
  }

  let now: number = Math.floor(Date.now() / 1000);
</script>

<div class="grid-container">
  <div>
    <UserMenu />
  </div>
  <main class="grid-main">
    <span>Name: {data.user.displayName}</span>
    <div>
      <img
        src="/api/user/icon/{data.user.id}"
        alt="icon of {data.user.id}"
        width="400"
        height="400"
        crossorigin="use-credentials"
        decoding="async"
        loading="lazy"
      />
    </div>
    <SetRelationshipButtons
      user_id={data.user.id}
      user_relationship={data.relationship}
      callback={relationshipCallback}
      --set-relationship-buttons-div-display="block"
    />
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
</div>

<style>
  .grid-container {
    display: grid;
    grid-template-columns: auto 1fr;
    min-height: max(100%, 100vh);
  }

  .grid-main {
    padding-top: 1ex;
    padding-left: 0.5em;
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
