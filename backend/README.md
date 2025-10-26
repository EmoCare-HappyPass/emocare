# ECAI Backend - Django REST Framework API

Empathic Care AI（ECAI）のバックエンドAPI。

## 技術スタック

- **Python**: 3.12+
- **Framework**: Django 5.2+ / Django REST Framework 3.16+
- **Database**: PostgreSQL 15+
- **Package Manager**: uv
- **Task Queue**: Celery + Redis
- **WebSocket**: Django Channels

## プロジェクト構成

```
backend/
├── config/                 # Django設定
│   ├── settings/
│   │   ├── base.py        # 共通設定
│   │   ├── development.py # 開発環境設定
│   │   └── production.py  # 本番環境設定
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── apps/                   # Djangoアプリケーション
│   ├── core/              # 共通モデル・ユーティリティ
│   ├── patients/          # 患者管理
│   ├── conversations/     # 会話管理
│   ├── emotions/          # 感情分析
│   └── alerts/            # アラート管理
├── manage.py
├── pyproject.toml         # uv設定
└── .env                   # 環境変数（.gitignoreに追加）
```

## セットアップ

### 1. uvのインストール

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. 依存関係のインストール

```bash
cd backend
uv sync
```

### 3. 環境変数の設定

```bash
cp .env.example .env
# .envファイルを編集
```

### 4. データベースのマイグレーション

```bash
uv run python manage.py makemigrations
uv run python manage.py migrate
```

### 5. スーパーユーザーの作成

```bash
uv run python manage.py createsuperuser
```

### 6. 開発サーバーの起動

```bash
uv run python manage.py runserver
```

API: http://localhost:8000/api/v1/
管理画面: http://localhost:8000/admin/

## API エンドポイント

### 患者管理
- `GET /api/v1/patients/` - 患者一覧
- `POST /api/v1/patients/` - 患者作成
- `GET /api/v1/patients/{id}/` - 患者詳細
- `GET /api/v1/patients/{id}/dashboard/` - 患者ダッシュボード

### 会話管理
- `POST /api/v1/sessions/start/` - 会話開始
- `POST /api/v1/sessions/{id}/end/` - 会話終了
- `GET /api/v1/sessions/` - セッション一覧
- `POST /api/v1/conversations/process_audio/` - 音声処理

### 感情分析
- `GET /api/v1/emotions/` - 感情分析一覧
- `GET /api/v1/emotions/timeline/` - 感情タイムライン
- `GET /api/v1/emotions/wheel/` - 感情ホイールデータ

### アラート管理
- `GET /api/v1/alerts/` - アラート一覧
- `PATCH /api/v1/alerts/{id}/acknowledge/` - アラート確認
- `PATCH /api/v1/alerts/{id}/resolve/` - アラート解決

## データベースモデル

詳細は `docs/develop.md` を参照してください。

- **Patient**: 患者情報
- **ConversationSession**: 会話セッション
- **ConversationTurn**: 会話ターン
- **EmotionAnalysis**: 感情分析結果
- **Alert**: アラート通知

## 開発コマンド

### マイグレーション

```bash
# マイグレーションファイル作成
uv run python manage.py makemigrations

# マイグレーション実行
uv run python manage.py migrate

# マイグレーション確認
uv run python manage.py showmigrations
```

### テスト

```bash
# 全テスト実行
uv run python manage.py test

# 特定アプリのテスト
uv run python manage.py test apps.patients
```

### Django Shell

```bash
uv run python manage.py shell
```

### 静的ファイル収集

```bash
uv run python manage.py collectstatic
```

## 依存関係の追加

```bash
# パッケージ追加
uv add package-name

# 開発用パッケージ追加
uv add --dev package-name
```

## 環境変数

主な環境変数（`.env.example`参照）:

- `DJANGO_SECRET_KEY`: Djangoシークレットキー
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`: データベース接続情報
- `OPENAI_API_KEY`: OpenAI API キー（STT/TTS/LLM用）
- `REDIS_URL`: Redis接続URL

## TODO

- [ ] STT/TTS/LLMサービス実装
- [ ] 感情分析ロジック実装
- [ ] アラート検出ロジック実装
- [ ] WebSocket対応（リアルタイム通信）
- [ ] Celeryタスク実装
- [ ] テストコード作成
- [ ] API認証強化
- [ ] S3ストレージ連携

## ライセンス

Proprietary
