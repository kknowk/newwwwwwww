
import { WebSocketGateway, SubscribeMessage, WebSocketServer, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Socket } from 'socket.io';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameLog } from './game.entity.js';
import { ConfigService } from '@nestjs/config';

interface PlayerState {
    paddleY: number;
    ready: boolean;
    position: 'left' | 'right'; // プレイヤーの位置を左または右に変更
    name: string; // ユーザー名を追加
    score: number;

    userId: number; // ユーザーIDを追加
    // connect: boolean;
}

interface BallState {
    x: number;
    y: number;
    dx: number;
    dy: number;
    radius: number;
}

interface GameRoom {
    players: Record<string, PlayerState>;
    ball: BallState;
    gameInterval: NodeJS.Timeout | null;
    gameStarted: boolean;
    isLunatic: number;
    winnerId?: number;
    loserId?: number;
    gameOver: boolean;

    connect: boolean;
}

// 速度増加係数
const SPEED_INCREASE_FACTOR = 1.05;
// 速度の上限
const MAX_SPEED = 10;

// 最大角度の範囲（ラジアン）
const ANGLE_RANGE = Math.PI / 8;


@WebSocketGateway()
export class GameGateway {
    @WebSocketServer()
    server;

    private sc;
    constructor(
        @InjectRepository(GameLog)
        private gameLogRepository: Repository<GameLog>,
        configService: ConfigService,
    ) {
        this.sc = parseInt(configService.get('GAME_SCORE'), 10);
        if (isNaN(this.sc)) {
            // 数値に変換できない場合の処理
            console.error('GAME_SCORE is not a valid number');
        }
    }


    // GameLog のデータをコンソールに出力するメソッド
    async showGameLogs() {
        const gameLogs = await this.gameLogRepository.find();
        console.log(gameLogs);
    }

    private gameRooms: Record<string, GameRoom> = {};

    async handleDisconnect(client: Socket) {
        const gameRoomId = client.handshake.query.gameRoomId as string;
        const userIdString = client.handshake.query.userId as string; // ユーザーIDを取得
        const userId = Number(userIdString); // 文字列を数値に変換

        const gameRoom = this.gameRooms[gameRoomId];
        if (!gameRoom) return;

        // ゲームをノーコンテストとして扱う
        gameRoom.connect = false;
        console.log(`D gameInterrupted: ${gameRoom.connect}`);

        console.log(`disconnect: ${userId}`);

        Object.keys(gameRoom.players).forEach(clientId => {
            this.server.to(clientId).emit('gameInterrupted');
        });

        console.log(`finish send: ${userId}`);
        // ゲームの更新を停止
        if (gameRoom.gameInterval) {
            clearInterval(gameRoom.gameInterval);
        }

        // ゲームルームのクリア
        // delete this.gameRooms[gameRoomId];
    }

    handleConnection(client: Socket) {
        const gameRoomId = client.handshake.query.gameRoomId as string;
        const userIdString = client.handshake.query.userId as string; // ユーザーIDを取得
        const userId = Number(userIdString); // 文字列を数値に変換

        if (isNaN(userId)) {
            // userIdが数値に変換できない場合の処理
            console.log(`Invalid userId: ${userIdString}`);
            return;
        }
        console.log(`Client connected to Game Room: ${gameRoomId}`);
        console.log(`Client ID: ${client.id}, User ID: ${userId}`);

        if (!this.gameRooms[gameRoomId]) {
            this.gameRooms[gameRoomId] = {
                players: {},
                ball: { x: 450, y: 300, dx: 3, dy: 1, radius: 10 },
                gameInterval: null,
                gameStarted: false,
                isLunatic: 0,
                gameOver: false,
                connect: true
            };
        }

        const gameRoom = this.gameRooms[gameRoomId];
        const position = Object.keys(gameRoom.players).length === 0 ? 'right' : 'left';
        const name = position === 'right' ? 'Player 1' : 'Player 2';


        console.log(`gameInterrupted??: ${gameRoom.connect}`);
        if (gameRoom.connect == false) {
            console.log('final gameInterrupted');
            console.log(`Client Intered? ID: ${client.id}, User ID: ${userId}`);
            // setTimeout(() => {
            //     this.server.to(gameRoomId).emit('gameInterrupted');
            // }, 3000);

            // Object.keys(gameRoom.players).forEach(clientId => {
            this.server.to(client.id).emit('gameInterrupted');
            // });
            console.log(`wasshoy!!!!!!!!!!`);

            // delete this.gameRooms[gameRoomId];
            return;
        }
        
        
        gameRoom.players[client.id] = { paddleY: 300, ready: false, position, name, score: this.sc, userId };
    }

    @SubscribeMessage('playerReady')
    handlePlayerReady(@ConnectedSocket() client: Socket) {
        const gameRoomId = client.handshake.query.gameRoomId as string;

        const gameRoom = this.gameRooms[gameRoomId];
        gameRoom.players[client.id].ready = true;
        this.checkStartGame(gameRoomId);
    }

    @SubscribeMessage('Lunatic')
    handleLunaticReady(@ConnectedSocket() client: Socket) {
        const gameRoomId = client.handshake.query.gameRoomId as string;

        const gameRoom = this.gameRooms[gameRoomId];

        if (!gameRoom) return;
        if (gameRoom.players[client.id]) {
            gameRoom.isLunatic += 1; // ルナティックモードを有効にする
        }
    }

    @SubscribeMessage('movePaddle')
    handleMovePaddle(@MessageBody() data: { paddleY: number }, @ConnectedSocket() client: Socket) {
        const gameRoomId = client.handshake.query.gameRoomId as string;

        const gameRoom = this.gameRooms[gameRoomId];

        if (!gameRoom || !gameRoom.gameStarted)
            return;

        if (gameRoom.players[client.id]) {
            gameRoom.players[client.id].paddleY = data.paddleY; // プレイヤーのパドル位置を更新
        }
    }

    private checkStartGame(gameRoomId: string) {
        const gameRoom = this.gameRooms[gameRoomId];
        if (Object.values(gameRoom.players).every(player => player.ready)) {
            gameRoom.gameStarted = true;


            this.server.emit('startGame', { gameRoomId });
            gameRoom.gameInterval = setInterval(() => {
                this.updateGameState(gameRoomId);
            }, 1000 / 60);
        }
    }

    private async updateGameState(gameRoomId: string) {
        const gameRoom = this.gameRooms[gameRoomId];
        if (!gameRoom || !gameRoom.gameStarted)
            return;

        // console.log(`Before Update - Ball Position: x=${gameRoom.ball.x}, y=${gameRoom.ball.y}`);
        // ボールの位置を更新
        gameRoom.ball.x += gameRoom.ball.dx;
        gameRoom.ball.y += gameRoom.ball.dy;

        // console.log(`After Update - Ball Position: x=${gameRoom.ball.x}, y=${gameRoom.ball.y}`);
        // 上下の壁に衝突した場合の処理
        if (gameRoom.ball.y - gameRoom.ball.radius < 0 || gameRoom.ball.y + gameRoom.ball.radius > 600) {
            gameRoom.ball.dy = -gameRoom.ball.dy;
            if (gameRoom.isLunatic) {
                console.log("Lunatic!!!!!!!!!!!!!!!!!!!!");
                gameRoom.ball.dx = Math.min(gameRoom.ball.dx * 1.5 * gameRoom.isLunatic, MAX_SPEED);
                gameRoom.ball.dy = Math.min(gameRoom.ball.dy * 1.5 * gameRoom.isLunatic, MAX_SPEED);
            }
        }

        // プレイヤーのパドルに衝突した場合の処理
        Object.values(gameRoom.players).forEach(player => {
            if ((player.position === 'left' && gameRoom.ball.x - gameRoom.ball.radius < 10) ||
                (player.position === 'right' && gameRoom.ball.x + gameRoom.ball.radius > 900 - 10)) {

                // パドルの長さ
                const paddleHeight = 75;
                // 8分割
                const segmentHeight = paddleHeight / 8;
                // パドルの上端からボールまでの距離
                const ballPositionOnPaddle = gameRoom.ball.y - player.paddleY;
                if (gameRoom.ball.y > player.paddleY && gameRoom.ball.y < player.paddleY + 75) {

                    // パドルのセグメントに基づいて角度を計算
                    const segmentIndex = Math.floor(ballPositionOnPaddle / segmentHeight);
                    const angleOffset = (segmentIndex - 3.5) * (ANGLE_RANGE / 8);

                    // 反射角度の計算
                    let angle;
                    if (player.position === 'left') {
                        angle = Math.PI / 4 + angleOffset;
                    } else {
                        angle = (3 * Math.PI / 4) - angleOffset; // 右のパドルでは反射角を調整
                    }
                    // 速度ベクトルの計算
                    let speed = Math.sqrt(gameRoom.ball.dx * gameRoom.ball.dx + gameRoom.ball.dy * gameRoom.ball.dy);
                    gameRoom.ball.dx = speed * Math.cos(angle);
                    // ボールが上から来た場合は下に、下から来た場合は上に反射
                    if (gameRoom.ball.dy < 0) {
                        // ボールが上から来ている場合、下に反射
                        gameRoom.ball.dy = -speed * Math.sin(angle);
                    } else {
                        // ボールが下から来ている場合、上に反射
                        gameRoom.ball.dy = speed * Math.sin(angle);
                    }


                    // ボールの速度を増加
                    gameRoom.ball.dx *= SPEED_INCREASE_FACTOR;
                    gameRoom.ball.dy *= SPEED_INCREASE_FACTOR;

                    // 速度が上限を超えないようにする
                    gameRoom.ball.dx = Math.min(gameRoom.ball.dx, MAX_SPEED);
                    gameRoom.ball.dy = Math.min(gameRoom.ball.dy, MAX_SPEED);

                    // // 反転
                    // gameRoom.ball.dx = -gameRoom.ball.dx;
                }
            }
        });

        // ゲームオーバーのチェック
        // 左右の壁に衝突した場合の処理
        if (gameRoom.ball.x - gameRoom.ball.radius < 0 || gameRoom.ball.x + gameRoom.ball.radius > 900) {
            Object.values(gameRoom.players).forEach(player => {
                if (gameRoom.ball.x - gameRoom.ball.radius < 0 && player.position === 'left') {
                    player.score--;
                } else if (gameRoom.ball.x + gameRoom.ball.radius > 900 && player.position === 'right') {
                    player.score--;
                }
                if (player.score <= 0)
                    gameRoom.gameOver = true;
            });

            if (gameRoom.gameOver) {
                // 勝者と敗者を決定
                let winnerId: number | null = null;
                let loserId: number | null = null;

                Object.entries(gameRoom.players).forEach(([clientId, player]) => {
                    if (player.score > 0) {
                        winnerId = player.userId;
                    } else {
                        loserId = player.userId;
                    }
                });

                if (winnerId && loserId) {

                    const gameLog = new GameLog();
                    gameLog.winner_id = (winnerId);
                    gameLog.loser_id = (loserId);
                    gameLog.date = Math.floor(Date.now() / 1000); // 現在のUTC秒

                    // データベースに保存
                    // await this.gameLogRepository.save(gameLog);
                    await this.gameLogRepository.save(gameLog);

                    console.log("finish!!!!!!!!!!!!!!!!!!!!!!");

                    // テスト
                    this.showGameLogs(); // コンストラクタ内で直接呼び出し

                    console.log("hahahahha!!!!!!!!!!!!!!!!!!!!!!");

                    gameRoom.winnerId = winnerId;
                    gameRoom.loserId = loserId;
                    Object.keys(gameRoom.players).forEach(clientId => {
                        this.server.to(clientId).emit('gameOver', { winner: winnerId, loser: loserId });
                    });

                    clearInterval(gameRoom.gameInterval);
                    return;
                }
            }

            // ボールを初期位置にリセット
            gameRoom.ball.x = 450;
            gameRoom.ball.y = 300;
            gameRoom.ball.dx = 3;
            gameRoom.ball.dy = 1;

            clearInterval(gameRoom.gameInterval);


            // 3秒後にゲームを再開
            setTimeout(() => {
                gameRoom.gameStarted = true;
                gameRoom.gameOver = false;
                // gameRoom.isLunatic = false;
                gameRoom.gameInterval = setInterval(() => this.updateGameState(gameRoomId), 1000 / 60);
            }, 3000);
        }


        // ゲーム状態を各クライアントに送信
        Object.keys(gameRoom.players).forEach(clientId => {
            const clientBallX = gameRoom.players[clientId].position === 'right' ? 900 - gameRoom.ball.x : gameRoom.ball.x;
            this.server.to(clientId).emit('gameState', {
                players: gameRoom.players,
                ball: { ...gameRoom.ball, x: clientBallX }
            });
        });
    }
}
