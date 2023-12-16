<script lang="ts">
  import type { PageData } from "./$types";
  export let data: PageData;
  let img_count = 0;

  async function submitFunction(ev: SubmitEvent) {
    ev.preventDefault();
    button.disabled = true;
    const formData = new FormData(ev.target as HTMLFormElement);
    {
      const userName = formData.get("user-name")?.valueOf();
      if (userName == null || userName === data.user.displayName) {
        formData.delete("user-name");
      } else if (typeof userName !== "string" || userName.length === 0) {
        showFailure();
        return;
      }
    }
    {
      const userEmail = formData.get("user-email")?.valueOf();
      if (
        userEmail == null ||
        typeof userEmail !== "string"
      ) {
        formData.delete("user-email");
      } else if (userEmail.length === 0 || userEmail === data.email) {
        showFailure();
        return;
      }
    }
    {
      const user2fa = formData.get("user-2fa")?.valueOf();
      if ((user2fa === "on") === data.user.two_factor_authentication_required) {
        formData.delete("user-2fa");
      } else if (user2fa !== "on") {
        formData.set("user-2fa", "off");
      }
    }
    {
      const userIcon = formData.get("user-icon")?.valueOf();
      if (
        userIcon instanceof File &&
        userIcon.type === "image/png" &&
        userIcon.size > 0 &&
        userIcon.size < 2 * 1024 * 1024
      ) {
      } else {
        formData.delete("user-icon");
      }
    }
    const response = await fetch("/api/user/change-settings", {
      method: "POST",
      body: formData,
    });
    if (response.ok) {
      icon.src = icon.src + `?r=${img_count}`;
      img_count++;
      setTimeout(() => {
        button.disabled = false;
      }, 3000);
      return;
    }
    showFailure();
  }

  function showFailure() {
    failureElem.style.display = "block";
    setTimeout(() => {
      failureElem.style.display = "none";
      button.disabled = false;
    }, 3000);
  }

  let icon: HTMLImageElement;
  let failureElem: HTMLDivElement;
  let button: HTMLInputElement;
</script>

<svelte:head>
  <title>Settings for {data.user.displayName}</title>
</svelte:head>

<div bind:this={failureElem} class="failure-div">Your input is invalid.</div>

<form on:submit={submitFunction} class="grid-container">
  <label class="has-one" for="user-name">Name</label>
  <input
    class="has-two"
    id="user-name"
    type="text"
    name="user-name"
    value={data.user.displayName}
  />

  <label class="has-one" for="user-email">Email</label>
  <input class="has-two" id="user-email" type="email" name="user-email" value={data.email ?? ""} />

  <label class="has-one" for="2fa">2 Factor Auth</label>
  <label class="has-two toggle-switch">
    <input
      id="2fa"
      type="checkbox"
      name="user-2fa"
      checked={data.user.two_factor_authentication_required}
    />
  </label>

  <label for="user-icon">Icon{"("}400×400px png {"<"}2MB file{")"}</label>
  <label for="user-icon">
    <img
      src="/api/user/icon/{data.user.id}"
      alt="icon of {data.user.id}"
      width="400"
      height="400"
      bind:this={icon}
    />
  </label>
  <input id="user-icon" type="file" name="user-icon" accept=".png,image/png" />

  <input type="submit" value="Change" bind:this={button} />
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

  form {
    margin-top: 1ex;
    margin-bottom: 0.5em;
  }

  .grid-container {
    display: grid;
    grid-template-columns: auto auto 1fr;
    grid-template-rows: 1fr 1fr 1fr auto 1fr;

    & * {
      margin: 0.5em;
    }

    & .has-one {
      grid-column: 1 / 2;
    }

    & .has-two {
      grid-column: 2 / 4;
    }

    & input[type="submit"] {
      grid-column: 1 / 4;
    }
  }

  label.toggle-switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;

    &::before {
      content: "";
      position: absolute;
      cursor: pointer;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: gainsboro;
      transition: 0.4s;
      border-radius: 34px;
    }

    &::after {
      content: "";
      position: absolute;
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: 0.4s;
      border-radius: 50%;
    }

    &:has(input:checked) {
      &::before {
        background-color: greenyellow;
      }

      &::after {
        transform: translateX(26px);
      }
    }

    & input {
      display: none;
    }
  }

  @media screen and (max-width: 959px) {
    img {
      width: 200px;
      height: 200px;
    }
  }
  @media screen and (max-width: 599px) {
    img {
      width: 50px;
      height: 50px;
    }
  }
</style>
