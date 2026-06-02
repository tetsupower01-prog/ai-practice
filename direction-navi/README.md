# 目的地方向ナビ

地図をタップして目的地を設定すると、現在地からの「方向」と「距離」を大きな矢印で表示するシンプルなPWAです。

## アプリ概要

GoogleマップのようなルートガイドではなくGPS/コンパスを使って「目的地はだいたいこの方向」を直感的に示します。散歩・自転車・街歩きに最適です。

## 使い方

1. アプリを開くと地図が表示されます
2. 地図をタップして目的地を選択します（赤ピンが立ちます）
3. 「ナビ開始」ボタンを押します
4. 矢印が目的地の方向を指します
5. 「← 変更」ボタンで目的地を変更できます

## ローカルでの起動方法

位置情報・DeviceOrientation APIは **HTTPS または localhost** が必要です。

### 方法1: Python の http.server (最も簡単)

```bash
cd direction-navi
python -m http.server 8080
# ブラウザで http://localhost:8080 を開く
```

### 方法2: Node.js の http-server

```bash
npx http-server direction-navi -p 8080
# ブラウザで http://localhost:8080 を開く
```

### 方法3: VS Code の Live Server 拡張機能

拡張機能「Live Server」をインストールして index.html を右クリック → "Open with Live Server"

## スマホで試す方法

ローカルネットワーク経由でスマホからアクセスします。

```bash
# PCのIPアドレスを調べる (例: 192.168.1.5)
ipconfig   # Windows
ip a       # Mac/Linux

# Python でサーバー起動
python -m http.server 8080

# スマホブラウザで以下を開く
# http://192.168.1.5:8080
```

> 注意: 位置情報はHTTPSが必要なため、ローカルネットワーク経由では動作しない場合があります。  
> HTTPS対応ホスティング（後述）を使うと確実に動作します。

### HTTPS でホスティングする場合

- [GitHub Pages](https://pages.github.com/) にアップロードすれば無料でHTTPS公開できます
- Netlify や Vercel のドラッグ&ドロップデプロイも可能です

## PWAとしてホーム画面に追加する方法

### iPhone (Safari)

1. Safariでアプリを開く（HTTPSのURL）
2. 画面下部の共有ボタン（□↑）をタップ
3. 「ホーム画面に追加」を選択
4. 「追加」をタップ

### Android (Chrome)

1. Chromeでアプリを開く
2. アドレスバー右のメニュー（⋮）をタップ
3. 「アプリをインストール」または「ホーム画面に追加」を選択

## iPhone / Android での注意点

### iPhone

- **コンパス許可**: iOS 13以降、DeviceOrientation APIの使用にはユーザーの許可が必要です
- ナビ画面に「コンパスを有効にする」ボタンが表示されたらタップしてください
- 許可しない場合でも、北を基準とした方位角で矢印は表示されます

### Android

- Chromeは自動でコンパスを使用できます
- 初回アクセス時に位置情報の許可を求めるダイアログが表示されます

### 共通

- **屋外での使用を推奨**: GPSは屋外で精度が高くなります
- **スマホを水平に持つ**: コンパス精度が向上します
- **金属の近くは避ける**: コンパスに影響が出ることがあります

## ファイル構成

```
direction-navi/
├── index.html         # メインHTML（地図画面・ナビ画面）
├── style.css          # スタイルシート
├── app.js             # アプリロジック
├── manifest.json      # PWAマニフェスト
├── service-worker.js  # オフラインキャッシュ
├── icon.svg           # アプリアイコン
└── README.md          # このファイル
```

## 今後の拡張案

- 目的地の履歴保存 (localStorage)
- 検索フォームから住所・施設名で目的地設定
- 現在地・目的地間のルート線を地図に表示
- 到着通知 (Vibration API)
- ダークモード対応
- 複数目的地のウェイポイント機能
- 速度・移動方向表示 (Geolocation の heading/speed)
