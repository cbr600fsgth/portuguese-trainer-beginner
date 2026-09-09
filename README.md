# ポルトガル語トレーナー（Beginner版）

[portuguese-trainer](https://github.com/cbr600fsgth/portuguese-trainer) から分岐した妻用の派生アプリ。
本家とは別リポジトリ・別デプロイ先で、互いに影響しない。本家の150文から妻が実際に使う10文だけに
絞り込んである。話者は女性（妻）固定で、性別で形が変わる語は女性形にしてある。

ポルトガル旅行に向けた旅行会話トレーナー。ヨーロッパポルトガル語（pt-PT）専用。
フレームワークなし、単一ページ、バニラJS。`package.json` は持たない。

公開先: https://cbr600fsgth.github.io/portuguese-trainer-beginner/

## 出題の仕様

日付に依存しない。毎回すべてのフレーズを1回ずつ出す。それだけ。

- 順序は毎回シャッフルする。並び順で答えを思い出す癖がつくと、現地で日本語から出てこないため
- 日本語だけを見せ、ポルトガル語を声に出してから「答えを見る」を押す。押すと答えと音声が出る
- 採点は「できた」「だめ」の2択。「だめ」を押したフレーズはそのセッションの末尾にもう一度出る。
  全部「できた」になったら終了
- 採点は翌日以降の出題内容に影響しない。翌日もまた全フレーズ出る
- 1日に何回でも回せる。連続日数は1日1回だけ加算される

出発日は持たない。残り日数で出題を変える仕組みを入れると、始めた時期によって
「対象フレーズが1件もない日」が生じるため、日付をスケジューラから外してある。

## 起動

```bash
cd ~/dev/ai_sandbox/portuguese-trainer-beginner && python3 tools/serve.py
```

ブラウザで http://localhost:8766 を開く。`file://` では ES モジュールと `fetch` が動かないため
必ずHTTPで開く。止めるときは Ctrl+C。

`python3 -m http.server` でも配信はできるが、ブラウザが js をキャッシュするため、
コードを更新したのに古いモジュールが読み込まれて壊れることがある。`tools/serve.py` は
`Cache-Control: no-store` を付けてこれを防ぐので、開発中はこちらを使う。

### 画面が壊れたとき

設定画面の「ビルド」欄に版番号（`js/app.js` の `APP_VERSION`）が出る。
更新したはずの番号と違えばキャッシュが残っているので、スーパーリロードする。

- macOS の Chrome / Safari: Cmd+Shift+R
- それでも直らない場合は開発者ツールを開いた状態でリロード

`Cannot read properties of null (reading 'addEventListener')` は、
古い app.js が現在の index.html に無い要素を参照したときに出る典型的な症状。

## テスト

```bash
cd ~/dev/ai_sandbox/portuguese-trainer-beginner && node tools/test-session.mjs
```

`js/session.js` を検証する。全フレーズが1回ずつ出ること、シャッフルで欠落・重複が出ないこと、
出題が日付に依存しないこと、連続日数の判定に使う日付ユーティリティ（月・年・閏日をまたぐ計算）を含む。

## 手動での動作確認

### 1. ホーム

```
http://localhost:8766/
```

出発日の入力画面は無い。開くとすぐホームが出る。

表示: 「今日の確認 / 10フレーズ」、連続日数、のべ回数、「まだ今日の確認をしていない」

### 2. セッション

「はじめる」を押すと10枚が順不同で出る。カードは日本語だけが見えている状態で始まる。

「答えを見る」を押すとポルトガル語・カナ・イタリア語・メモが出て、音声が再生される。
「もう一度聞く」「ゆっくり」で聞き直せる。

採点は「だめ」「できた」の2択。「だめ」を押すと分母が1増え、そのフレーズが末尾に再出題される。
1枚目で「だめ」を押すと次のカードが「2/11」になり、最後に同じカードが「11/11」として出る。
これは意図した動作。

Macではキーボードでも操作できる。スペース/Enterで答えを見る、1で「だめ」、2で「できた」。

### 3. 完了

「完了 / N日連続 / 全 10 フレーズ確認」と出る。
「だめ」を押したフレーズがあれば「つまずいた N枚: ...」としてポルトガル語が並ぶ。

ホームに戻ると「今日はもう確認した」に変わる。もう一度「はじめる」を押せば何回でも回せるが、
連続日数は増えない。

### 4. 音声

設定を開き「音声」の行を見る。期待する表示は次の形。

```
ヨーロッパポルトガル語（pt-PT）の音声を使用中: <音声名> / MP3 0件
```

話者は妻（女性）なので、`<音声名>` が女性の声であることも確認する。
`js/audio.js` は既知の女性名（`Joana`。iOS/macOSのpt-PT標準音声）や名前に `female` を含む音声を
優先して選ぶが、Web Speech APIには性別を示すプロパティが無いため名前ベースの推測にすぎない。

### 5. 音が出ないとき

表示されるメッセージで切り分ける。

| 設定画面の表示 | 意味 | 対処 |
|---|---|---|
| pt-PTの音声を使用中 | 正常 | - |
| pt-PT音声なし。ブラジル音声で代用中 | 端末にpt-PTの音声データが無い | OSの設定でポルトガル語（ポルトガル）の音声データを追加する |
| ポルトガル語の音声が見つかりません | 端末にポルトガル語の音声データが無い | 同上 |
| この端末は音声合成に未対応 | ブラウザが `window.speechSynthesis` を持っていない | 下記 |

`window.speechSynthesis` が無いのは、多くの場合アプリ内ブラウザ（WebView）で開いているため。
LINEやメールのリンクをタップして開いた場合がこれに該当する。Android WebViewはWeb Speech APIを
実装していない（[Chromiumのissue](https://issues.chromium.org/issues/40417848)）。
URLをコピーしてChromeなどのブラウザで開き直す。ホーム画面へのアイコン追加も、そのブラウザで
開いた状態からやり直す。

Androidの音声データ追加手順: 設定 → ユーザー補助 → テキスト読み上げの出力 →
エンジンの歯車 → 音声データをインストール → Portuguese を選ぶ。

## カンペの印刷

現地に持ち歩く1枚ものの早見表を `data/phrases.json` から生成する。

未対応: `tools/make_cheatsheet.py` の `GROUPS`/`COLUMN_BREAKS` は本家（150文・20グループ）の
レイアウトのままで、この10文版には未追随。今のまま実行すると `GROUPS` が参照するidが
`data/phrases.json` に無く不整合になる。10文用にレイアウトを作り直すまでは実行しない。

## 構成

```
index.html               画面シェル（ホーム / セッション / 完了 / 設定）
css/style.css            アズレージョ青 + テラコッタ。ライト/ダーク両対応
js/app.js                画面遷移・セッション進行・描画
js/session.js            出題キューの生成（全件シャッフル）と日付ユーティリティ。純関数のみ
js/audio.js              音声の抽象化。MP3優先 → 内蔵TTSフォールバック
js/store.js              localStorage とエクスポート/インポート
data/phrases.json        フレーズ本体
tools/serve.py           開発用の配信サーバー。キャッシュ無効
tools/test-session.mjs   session.js のテスト
tools/make_cheatsheet.py A4横1枚のカンペ（cheatsheet.xlsx）を生成。10文版には未追随
audio/                   MP3（未配置。.gitignore 済み）
```

## フレーズの追加

`data/phrases.json` の `phrases` 配列に足す。出題は毎回シャッフルするので、配列の順序は
出題順に影響しない。

```json
{
  "id": "rest-order-99",
  "scene": "restaurante",
  "week": 1,
  "jp": "これをください",
  "pt": "Queria isto, por favor.",
  "kana": "キリア イシュトゥ、プル ファヴォール",
  "it": "Vorrei questo, per favore",
  "note": "Queria は Eu quero より丁寧",
  "tags": ["core", "must"]
}
```

`scene` は greet / basic / numero / pedir / restaurante / cafe / transporte / hotel /
compras / problema。追加する場合は `js/app.js` の `SCENE_LABELS` にも日本語名を足す。
`it` はイタリア語ブリッジ（イタリア語検定4級の知識を転用するための対応付け）。
`kana` はpt-PTの実際の発音に寄せる。語末sは「シュ」、無強勢のeは脱落。
`week` と `tags` はアプリでは使わない。`tools/make_cheatsheet.py` が参照する。

## 音声

`audio/{id}.mp3` があればそれを再生し、なければブラウザ内蔵TTSで `lang='pt-PT'` を使う。
MP3の有無は `data/audio-manifest.json`（ID配列）で判定する。このファイルが無い間はTTSのみで動く。

ブラジル音声(pt-BR)で代用すると発音を誤学習するため、pt-PT音声が無い端末では警告を出す。
端末の音声一覧は設定画面で確認できる。

端末やブラウザによる差をなくすには、pt-PTの女性音声でMP3を事前生成して `audio/` に置く。
macOSなら `say -v Joana -o out.aiff "..."` で無料・オフラインで作れる（要ffmpegでの形式変換）。

## 記録データ

localStorage の `ptb.meta` だけを使う。中身は連続日数・最後に完了した日・のべ回数。
フレーズごとの箱や期限は持たない（毎回全フレーズ出すので不要）。

本家(`pt.*`)とは別名前空間にしてある。GitHub Pagesはproject サイトのpathが違ってもoriginは
同じ(cbr600fsgth.github.io)で、localStorageはorigin単位のため、接頭辞を分けないと
同じブラウザで両アプリを開いたときに記録が混線する。

iOSのPWAは長期未使用でストレージが破棄されうるため、設定画面からJSONを書き出せる。
消えても失うのは連続日数だけで、学習内容には影響しない。

## 実装状況

- [x] 全フレーズを毎日確認するサイクル、内蔵TTS（女性声優先）、10文の抜粋
- [ ] pt-PT音声のMP3事前生成（端末差をなくす）
- [ ] 10文用のカンペレイアウト
