# 概論

PONGという1対1ゲームを実行するWEBサービス

# バックエンド Nest.js

以下2つのpathに対するリクエストはNest.js内に定義されたControllerが処理します。

- `/auth/*`
- `/api/*`

## /auth/*

主に認証を司ります。
このため、ブラウザから直接アクセスされることを想定しています。
認可に関しては`/api/*`の方で個別に扱うため、こちらでは取り扱っていません。

### index

[Passport.js(passport-oauth2)](https://www.passportjs.org/packages/passport-oauth2/)を利用して42のOAuth2認証を受けます。
リダイレクト先は`/auth/callback`です。
42認証を以てユーザー登録とします。
認証情報はHttpOnlyかつHTTPSでSame-Site=strictなcookieにJWTとして保存します。

### pseudo

チームメンバーが3～5人であることを鑑みると検証する時に必要な人数を満たせないでしょう。
故に42認証に依存しないユーザー登録の方法を用意しました。

### logout

実際ユーザーのclientがcookieを削除すれば実質的にlogoutしたことになりますが、今回の課題では`The user should be able to add other users as friends and see their current status (online, offline, in a game, and so forth).`とのことなので、サーバー側でもlogout用apiを用意しました。

## /api/*