# 問診票 OCR & LLM 処理アプリケーション

問診票をスキャンしてOCR処理を行い、その結果をローカルLLM（Gemma等）で処理して電子カルテに入力しやすい形に整形するウェブアプリケーションです。

## 機能概要

- JPEG/PDF形式の問診票ファイルのアップロードとプレビュー表示
- Microsoft Azure Document Intelligence (旧Form Recognizer) を使用したOCR処理
- ローカルで動作するLLM（Gemma等）を利用したテキスト整形
- カスタム可能なプロンプトテンプレート
- 処理結果を簡単に電子カルテにコピーできる機能
- ローカルストレージを使った設定の保存

## 必要要件

- Azure Document Intelligence のアカウント（APIキーとエンドポイント）
- ローカルで動作するLLMサーバー（Ollama, LM Studio等）

## 使い方

1. Azure設定セクションにAPIキーとエンドポイントを入力
2. ローカルLLM設定セクションにエンドポイントとモデル名を入力
3. 必要に応じてLLMプロンプトテンプレートをカスタマイズ
4. 問診票ファイル（JPEGまたはPDF）をアップロード
5. OCR処理開始ボタンをクリック
6. 処理結果タブで整形されたテキストを確認し、コピーボタンで電子カルテにコピー

## ローカル開発環境のセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/ocr-llm-processor.git
cd ocr-llm-processor

# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev
```

## Renderへのデプロイ方法

1. GitHubにリポジトリをアップロード
2. Renderダッシュボードで「New Web Service」を選択
3. GitHubリポジトリを接続
4. 以下の設定でデプロイ
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: 18 以上

## 利用技術

- React
- Bootstrap & React-Bootstrap
- Azure Document Intelligence API
- Express.js (デプロイ用)
- Axios (API通信)

## 注意事項

- このアプリケーションはAzure APIキーをブラウザのLocalStorageに保存します。本番環境では適切なセキュリティ対策を講じてください。
- ローカルLLMへの接続には、LLMが同じネットワーク上で動作している必要があります。
- 大きなファイルや複雑な文書の処理には時間がかかる場合があります。

## ライセンス

MIT
