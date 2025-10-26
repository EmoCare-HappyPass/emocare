# ECAI Backend - Django REST Framework API

Empathic Care AI（ECAI）のバックエンドAPI。

## 技術スタック

- **Python**: 3.12+
- **Framework**: Django 5.2+ / Django REST Framework 3.16+
- **Database**: PostgreSQL 15+
- **Package Manager**: uv
- **Task Queue**: Celery + Redis
- **WebSocket**: Django Channels


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

