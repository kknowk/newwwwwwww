<script lang="ts">
  import { browser } from "$app/environment";
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  let noticeCount: number = 0;

  async function periodicFunc() {
    const response = await fetch("/api/user/get-notice-count");
    if (response.ok) {
      const result = await response.json();
      if (typeof result === "number") {
        noticeCount = result;
      }
    }
  }

  onMount(() => {
    const intervalId = setInterval(periodicFunc, 300000);
    if ($page.url.pathname === "/home/notice") {
      noticeCount = 0;
    } else {
      periodicFunc();
    }
    return () => {
      if (browser) {
        clearInterval(intervalId);
      }
    };
  });

  afterNavigate((navigation) => {
    const target = navigation.to;
    if (target == null) {
      return;
    }
    console.log("called after navigate: " + target.url.pathname);
    if (target.url.pathname === "/home/notice") {
      noticeCount = 0;
    } else {
      periodicFunc();
    }
  });
</script>

<details open>
  <summary data-count={noticeCount}>☰</summary>
  <nav>
    <menu>
      <ul>
        <li>
          <a href="/home">Home</a>
        </li>
        <li>
          <a href="/home/setting">Personal Setting</a>
        </li>
        <li>
          <a href="/home/friend">My Friends</a>
        </li>
        <li>
          <a href="/home/direct-message/list">Direct Messages</a>
        </li>
        <li>
          <a href="/home/chat/list">Chats</a>
        </li>
        <li>
          <a href="/home/notice" class="notice" data-count={noticeCount}>Notice</a>
        </li>
        <li>
          <form method="post" action="/auth/logout">
            <input type="submit" value="Logout" />
          </form>
        </li>
      </ul>
    </menu>
  </nav>
</details>

<style>
  a:hover {
    text-decoration: underline;
  }

  .notice::after {
    content: " (" attr(data-count) ")";
    color: deeppink;
  }

  .notice[data-count="0"]::after {
    display: none;
  }

  details {
    & summary[data-count]::after {
      display: block;
      content: " (" attr(data-count) ")";
      color: deeppink;
    }

    & summary[data-count="0"]::after {
      display: none;
    }

    &[open] summary::after {
      display: none;
    }

    & summary {
      cursor: pointer;
      list-style: none;
      font-size: x-large;
      transition: background-color 0.2s;
    }
	
    & summary:hover {
      background-color: rgba(0, 0, 0, 0.13);
    }

    padding: 0.5em;
    padding-top: 1ex;
    background-color: honeydew;
    min-height: 100vh;
    position: sticky;
    top: 0;

    & menu {
      & ul {
        list-style: none;

        & li {
          margin-top: 0.5em;
          margin-bottom: 0.5em;

          & a {
            text-decoration: none;
            padding-right: 1em;
            display: block;
          }

          & form {
            & input {
              background: none;
              color: blue;
              border: none;
              padding: 0;
              margin: 0;
              font-family: inherit;
              font-size: inherit;
              cursor: pointer;
              text-align: left;
              width: 100%;
            }
          }
        }
      }
    }
  }
</style>
