# 業務課 依頼管理ツール (gyomu-task-manager)

企画課の依頼管理ツールをベースに、業務課（Operation Department）での「納期確認」「見積依頼」「サンプル手配」等の進捗確認・回答管理をスムーズに行うための専用Webシステムです。

## 主な機能

- **依頼登録フォーム (`/request/new`)**
  - 「納期確認」「見積依頼」「サンプル手配」「その他」のカテゴリ別入力
  - 依頼者（営業 / CCR / 手入力）、得意先、仕上げ希望日、依頼内容詳細
  - 参考ファイル添付サポート（ドラッグ＆ドロップ対応）
  - 入力文字数カウント＆XSS対策サニタイズ
- **進捗確認ダッシュボード (`/`)**
  - ステータス別集計表示（未着手、確認中、回答済み、完了、保留）
  - カテゴリ別・ステータス別の即時フィルタリング
  - 依頼番号、件名、得意先、依頼者によるキーワード検索
  - テーブル表示 / カード表示のワンタッチ切り替え
  - クイックステータス変更＆業務課回答入力モーダル
- **通知メール設定機能**
  - 担当者（営業・CCR・業務課）ごとの通知先メールアドレス設定
  - 新規受付時、回答更新時、完了時の自動メール送信サポート (Nodemailer)
- **データ管理**
  - 特別なDBサーバー構築なしで即座に動作するJSONファイル保存
  - 将来的な本格データベース（SQLite / PostgreSQL等）への拡張性を備えたデータリポジトリ構成

---

## 動作環境・技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript (Strict)
- **UI / スタイリング**: Tailwind CSS, Lucide React (Icons)
- **バリデーション**: Zod
- **メール送信**: Nodemailer
- **テスト**: Vitest

---

## セットアップ & 起動手順

### 1. 依存ライブラリのインストール

```bash
npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスします。
- 進捗確認ダッシュボード: `http://localhost:3000/`
- 新規依頼登録画面: `http://localhost:3000/request/new`

### 3. 環境変数（オプション: メール送信設定）

メール通知機能を実際のSMTPサーバー経由で運用する場合は、ルート直下に `.env.local` ファイルを作成してください。
（設定がない場合は開発コンソールに送信内容がログ出力されるシミュレーションモードで動作します）

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASS=your_password
SMTP_FROM=gyomu-tool@example.com
```

### 4. テストの実行

```bash
# 単体テスト実行
npm run test

# ビルドチェック
npm run build
```

---

## プロジェクト構造

```
業務課ツール/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── requests/
│   │   │   │   ├── route.ts            # GET/POST 依頼一覧・新規登録
│   │   │   │   └── [id]/route.ts       # GET/PATCH 依頼詳細・回答更新
│   │   │   └── settings/notifications/ # GET/POST メール通知設定
│   │   ├── request/new/page.tsx        # 新規依頼登録画面
│   │   ├── page.tsx                    # ダッシュボード・進捗ビューア
│   │   ├── layout.tsx                  # ルートレイアウト
│   │   └── globals.css                 # グローバルスタイル
│   ├── components/
│   │   ├── Header.tsx                  # 共通ヘッダー
│   │   ├── NotificationModal.tsx       # メール通知設定モーダル
│   │   ├── RequestResponseModal.tsx    # 業務課回答・ステータス更新モーダル
│   │   └── RequestDetailModal.tsx      # 依頼詳細表示モーダル
│   ├── lib/
│   │   ├── storage.ts                  # データ保存ストレージ層
│   │   ├── validation.ts               # Zodバリデーション・サニタイズ
│   │   └── mailer.ts                   # メール通知サービス
│   └── types/
│       └── request.ts                  # TypeScript型定義
├── tests/                              # Vitest ユニットテスト
├── package.json
└── README.md
```
