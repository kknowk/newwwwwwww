<script lang="ts">
  import type { DefaultEventsMap } from "@socket.io/component-emitter";
  import type { Socket } from "socket.io-client";
  import { onMount } from "svelte";
  import { page } from "$app/stores"; // SvelteKitのpageストアをインポート
  import { goto } from "$app/navigation";

  // import type { UserRelationshipKind } from "$lib/back/user/user.entity";
  // import SetRelationshipButtons from "$lib/components/set-relationship-buttons.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  const userId = data.user_id; // ユーザーIDを取得

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let socket: Socket<DefaultEventsMap, DefaultEventsMap>;
  let playerReady = false;
  let LunaticReady = false;
  let gameOver = false;
  let isWinner = false;
  let isDisconnect = false;

  let timer: number | undefined; // タイマーを保持するための変数

  interface PlayerState {
    paddleY: number;
    score: number; // スコアを追加
    name: string; // プレイヤー名も追加
    position: "top" | "bottom"; // プレイヤーの位置も追加
    ready: boolean; // プレイヤーの準備状況も追加
  }

  interface BallState {
    x: number;
    y: number;
    radius: number;
    // ボールの動きに関連する追加のプロパティがあればここに追加
  }

  interface GameState {
    players: Record<string, PlayerState>;
    ball: BallState;
  }

  let gameState: GameState = {
    players: {},
    ball: { x: 450, y: 300, radius: 10 },
  };

  let upPressed = false;
  let downPressed = false;

  function emit(value: string, obj?: any) {
    socket.emit(value, obj);
    if (obj) {
      console.log("Emit: " + value);
    } else {
      console.log("Emit:" + value + ", Obj: " + JSON.stringify(obj));
    }
  }

  function handleReady() {
    playerReady = true;
    emit("playerReady");
  }

  function handle_LunaticReady() {
    LunaticReady = true;
    emit("Lunatic");
  }

  onMount(async () => {
    const { io } = await import("socket.io-client");
    const gameRoomId = $page.params.gameRoomId;

    timer = setTimeout(() => {
      goto("/home", {invalidateAll: true});
    }, 120000) as any as number; // 120000ミリ秒 = 2分

    // ゲームルームIDを使用してソケット接続を確立
    socket = io(`https://${$page.url.host}`, {
      query: { gameRoomId, userId },
    });

    socket.on("gameState", (state) => {
      gameState = state;
      drawGame();
    });

    socket.on("gameOver", (data) => {
      gameOver = true;

      console.log(`front winner ID: ${data.winner}`);

      isWinner = data.winner === userId;
      // 3秒後にホーム画面にリダイレクト
      setTimeout(() => {
        goto("/home", {invalidateAll: true});
      }, 3000);
    });

    socket.on("gameInterrupted", () => {
      isDisconnect = true;
      console.log("front gameInterrupted");
      // alert("Connection lost. Redirecting to home.");
      // 3秒後にホーム画面にリダイレクト
      setTimeout(() => {
        goto("/home", {invalidateAll: true});
      }, 3000);
    });

    window.addEventListener("keydown", keyDownHandler);
    window.addEventListener("keyup", keyUpHandler);

    if (canvas) {
      const context = canvas.getContext("2d");
      if (context) {
        ctx = context;
        gameLoop();
      }
    }

    socket.on("startGame", () => {
      // ゲーム開始のロジック

      clearTimeout(timer); // タイマーをキャンセル
      gameLoop();
    });
  });

  function keyDownHandler(e: KeyboardEvent) {
    if (e.key === "Up" || e.key === "ArrowUp") {
      upPressed = true;
    } else if (e.key === "Down" || e.key === "ArrowDown") {
      downPressed = true;
    }
  }

  function keyUpHandler(e: KeyboardEvent) {
    if (e.key === "Up" || e.key === "ArrowUp") {
      upPressed = false;
    } else if (e.key === "Down" || e.key === "ArrowDown") {
      downPressed = false;
    }
  }

  function updatePaddlePosition() {
    let oldPaddleY = gameState.players[socket.id]?.paddleY ?? 0;
    let newPaddleY = oldPaddleY;
    if (upPressed) {
      newPaddleY -= 7;
      if (newPaddleY < 0) {
        newPaddleY = 0;
      }
    } else if (downPressed) {
      newPaddleY += 7;
      if (newPaddleY + 75 > canvas.height) {
        newPaddleY = canvas.height - 75;
      }
    }
    if (newPaddleY !== oldPaddleY) {
      emit("movePaddle", { paddleY: newPaddleY });
    }
  }

  function gameLoop() {
    setInterval(async () => {
      updatePaddlePosition();
      drawGame();
    }, 1000 / 60);
  }

  function drawGame() {
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 真ん中の白い点線を描く
    ctx.beginPath();
    ctx.setLineDash([5, 15]); // 点線のパターン（線の長さ、空白の長さ）
    ctx.moveTo(canvas.width / 2, 0); // 点線の開始位置（キャンバスの中央）
    ctx.lineTo(canvas.width / 2, canvas.height); // 点線の終了位置
    ctx.strokeStyle = "white";
    ctx.stroke();

    // プレイヤーのパドルの描画
    Object.entries(gameState.players).forEach(([id, player]) => {
      ctx.beginPath();
      const paddleX = id === socket.id ? 0 : canvas.width - 10;
      ctx.rect(paddleX, player.paddleY, 10, 75); // パドルのサイズと位置を変更
      ctx.fillStyle = id === socket.id ? "white" : "white";
      ctx.fill();
      ctx.closePath();

      // // プレイヤーのスコアの描画
      ctx.font = "20px Arial";
      ctx.fillStyle = id === socket.id ? "white" : "white";
      const scoreText = `${player.name}: ${player.score}`;
      const scoreX = id === socket.id ? 50 : canvas.width - 200;
      const scoreY = 30;
      ctx.fillText(scoreText, scoreX, scoreY);
    });

    // ボールの描画
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.closePath();
  }
</script>

<svelte:head>
  <title>Multiplayer Pong Game</title>
</svelte:head>

<div class="game-container">
  {#if gameOver}
    <img src={isWinner ? "/winner.jpg" : "/you_lose.jpg"} alt="Game Over" />
  {:else if isDisconnect}
    <img src={"/Nocontest.jpg"} alt="No contest" />
  {:else}
    <div>
      <canvas bind:this={canvas} width="900" height="600" />
    </div>
    <button on:click={handleReady} disabled={playerReady}>準備完了</button>
    <button on:click={handle_LunaticReady} disabled={LunaticReady}>ルナティックモード</button>
  {/if}
</div>

<style>
  .game-container {
    text-align: center;
    margin-top: 50px;

    display: grid;
    & button {
      border: solid;
      padding: 1em;
    }
  }
  canvas {
    border: 1px solid #ddd;
    background-color: black; /* キャンバスの背景色を黒に設定 */
  }
</style>
