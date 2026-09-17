# Call System

架電カウント・KPI管理・ステータス分析を行う単一HTMLファイル（`index.html`）+ Firestore構成のアプリです。

## 追加機能

### 1. フローティング小窓モード（最小化）

トップバーの最小化ボタン（⤢アイコン）を押すと、画面全体が小さなフローティングウィンドウに折りたたまれます。

- タイマーの開始・停止・クリアと、架電カウントの各ステータス（受付BK・不通・担当不在・目的訴求・メリット訴求・断りづらい・クロージング・カウンター・★アポ獲得）の＋／−操作がそのまま行えます。
- ヘッダー部分をドラッグして画面上の好きな位置に移動できます（位置はブラウザに保存され、次回起動時も復元されます）。
- 右上の×ボタンで元の全画面表示に戻ります。
- 「全商材まとめ」表示中はカウント操作ができないため、その旨のメッセージのみ表示されます。

他の作業をしながら架電記録だけを続けたい場合に使用してください。

### 2. AI分析（苦手傾向と改善方法）

「ステータス分析」タブの一番下に「AI分析（苦手傾向と改善方法）」カードを追加しました。フィルター（アカウント・商材・期間）を選んで「AIで分析する」を押すと、選択した担当者の架電プロセス（受付突破 → 担当接続 → 目的訴求 → メリット訴求 → 断り対応 → クロージング → アポ獲得）のどこに弱点があるかをAIが分析し、改善方法を提案します。

この機能を使うには、AI APIキーを安全に扱うための Cloud Function を1つデプロイする必要があります（下記手順）。**AI APIキーをフロントエンド（index.html）に直接書き込むことは絶対にしないでください**。誰でもブラウザの開発者ツールから閲覧・抽出できてしまいます。

#### デプロイ手順

1. Firebase CLI をインストールし、このプロジェクト（`callsystem-a29c4`）にログインします。
   ```
   npm install -g firebase-tools
   firebase login
   ```
2. `functions/` ディレクトリの依存パッケージをインストールします。
   ```
   cd functions
   npm install
   cd ..
   ```
3. Anthropic の API キーを Cloud Functions のシークレットとして登録します（値はコマンド実行時にプロンプトで入力するため、リポジトリやシェル履歴には残りません）。
   ```
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```
4. デプロイします。
   ```
   firebase deploy --only functions
   ```
5. デプロイ完了時に表示される関数のURL（例: `https://asia-northeast1-callsystem-a29c4.cloudfunctions.net/analyzeWeakness`）を、`index.html` 内の `AI_ANALYZE_FUNCTION_URL` 定数に設定します。

```js
const AI_ANALYZE_FUNCTION_URL = "https://asia-northeast1-callsystem-a29c4.cloudfunctions.net/analyzeWeakness";
```

設定後、`index.html` を再度公開（デプロイ）してください。

#### 補足

- 既定では Anthropic の Claude API（モデル: `claude-sonnet-5`）を利用します。別のAI APIを使いたい場合は `functions/index.js` の `fetch` 呼び出し部分を変更してください。
- `functions/index.js` はサーバー側（Cloud Functions実行環境）でのみAPIキーを読み込むため、ブラウザにキーが渡ることはありません。
- 呼び出し回数やコストを制限したい場合は、Firebase App Check の導入や、Firestoreへの呼び出しログ記録・レート制限の追加を検討してください（本実装には含まれていません）。
