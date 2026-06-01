# tabelog-scraper

食べログの店舗ページから店名・住所・営業時間を取得し、Google マイマップ用の CSV を出力する Python スクリプト。

## はじめに

「行きたいお店をまとめて地図に表示したい」という場面で役立つツールです。

食べログで気になったお店の URL を Google スプレッドシートにリストアップしておくだけで、このスクリプトが自動で各店舗の情報を収集し、Google マイマップにそのままインポートできる CSV を生成します。数十件のお店を手作業でコピーする手間をなくすことが目的です。

## 機能

- Google スプレッドシートに記載した食べログ URL を一括読み込み
- 各店舗ページから以下の情報をスクレイピング
  - 店名
  - 住所
  - 営業時間
- 結果を CSV ファイルに出力（Google マイマップへのインポート対応フォーマット）

## 必要環境

- Python 3.x
- 以下のライブラリ（`requirements.txt` 参照）

```
gspread
google-auth
requests
beautifulsoup4
```

## セットアップ

### 1. ライブラリのインストール

```bash
pip install -r requirements.txt
```

### 2. Google サービスアカウントの準備

Google Cloud Console でサービスアカウントを作成し、JSON キーを `service_account.json` としてこのフォルダに配置する。
スプレッドシートの共有設定でサービスアカウントのメールアドレスを編集者として追加する。

### 3. `main.py` の設定値を変更

```python
SPREADSHEET_ID = 'スプレッドシートのID'  # URLの /d/〇〇/ の部分
SHEET_NAME = 'シート1'                   # シート名
URL_COLUMN = 1                           # URLが入っている列番号（A列=1）
```

## 使い方

### スプレッドシートの準備

A列（`URL_COLUMN = 1` の場合）に食べログの URL を1行1件で入力する。

```
https://tabelog.com/tokyo/A1304/A130401/13299954/
https://tabelog.com/tokyo/A1303/A130301/13298889/
...
```

### 実行

```bash
python main.py
```

### 出力

`restaurants.csv` が生成される（文字コード: UTF-8 BOM 付き、Excel・Google マイマップ対応）。

| 名前 | 住所 | 営業時間 | 食べログURL |
|------|------|----------|-------------|
| 店名A | 東京都... | 月〜金 11:00-22:00 | https://... |

## ファイル構成

```
tabelog-scraper/
├── main.py               # メインスクリプト
├── requirements.txt      # 依存ライブラリ一覧
├── service_account.json  # Google サービスアカウントキー（Git 管理外）
└── restaurants.csv       # 出力ファイル（実行後に生成）
```

## 注意事項

- `service_account.json` は機密情報のため Git にコミットしない
- スクレイピング間隔はデフォルト 2 秒（`SLEEP_SEC`）。短くしすぎると IP ブロックの可能性あり
- 食べログの HTML 構造が変更された場合、セレクターの修正が必要になることがある
