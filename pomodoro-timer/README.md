# Focus Loop

集中時間と休憩時間を自由に設定できる、インストール対応のポモドーロタイマーです。

## 主な機能

- 集中時間・休憩時間の設定
- 開始、一時停止、リセット、モード切替
- セッション数とサイクル進捗の保存
- 自動スタート、終了音、デスクトップ通知
- Service Workerによるオフライン利用
- スマートフォン・デスクトップ対応

## ローカルでの確認

Service Workerと通知はHTTP経由で動作するため、静的Webサーバーを使用します。

```powershell
python -m http.server 8000
```

ブラウザーで `http://localhost:8000/pomodoro-timer/` を開きます。

## 公開

このリポジトリをGitHub Pages、Netlify、Cloudflare Pagesなどの静的ホスティングへ公開できます。
GitHub Pagesでは公開元をリポジトリのルートに設定し、`/pomodoro-timer/` にアクセスします。
