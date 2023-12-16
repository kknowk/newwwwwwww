<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<slot />

<style>
  :global(body) {
    margin: unset;
  }

  :global(menu) {
    padding-inline-start: unset;
    margin-block-start: unset;
    margin-block-end: unset;
    margin-inline-start: unset;
    margin-inline-end: unset;
  }

  :global(ul) {
    padding-inline-start: unset;
    margin-block-start: unset;
    margin-block-end: unset;
    margin-inline-start: unset;
    margin-inline-end: unset;
  }

  :global(*),
  :global(*):before,
  :global(*):after {
    box-sizing: border-box;
  }

  :global(button) {
    cursor: pointer;
    background-color: unset;
    margin: unset;
    padding: unset;
    color: unset;
    text-align: center;
    border: unset;
    font-style: unset;
    font-variant-ligatures: unset;
    font-variant-caps: unset;
    font-variant-numeric: unset;
    font-variant-east-asian: unset;
    font-variant-alternates: unset;
    font-variant-position: unset;
    font-weight: unset;
    font-stretch: unset;
    font-size: unset;
    font-family: unset;
    font-optical-sizing: unset;
    font-kerning: unset;
    font-feature-settings: unset;
    font-variation-settings: unset;
  }
</style>
