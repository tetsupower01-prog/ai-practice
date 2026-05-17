# EMA + Wick Signal インジケーター

TradingView用のPine Scriptインジケーター。
EMAの傾きでトレンドを判定し、EMAに重なるヒゲの長いローソク足でロング・ショートシグナルを表示する。

---

## シグナルロジック

### ロングシグナル
- 60EMAが上向き（傾き）
- ローソク足が選択したEMAに重なる
- 下ヒゲが実体の指定倍数以上
- 上ヒゲが実体の指定倍数以下（十字足フィルター）
- サイズフィルター通過

### ショートシグナル
- 60EMAが下向き（傾き）
- ローソク足が選択したEMAに重なる
- 上ヒゲが実体の指定倍数以上
- 下ヒゲが実体の指定倍数以下（十字足フィルター）
- サイズフィルター通過

---

## 設定パラメータ

| グループ | 設定項目 | デフォルト |
|---|---|---|
| EMA設定 | EMA1・2・3の期間 | 13 / 60 / 200 |
| EMA重なり設定 | どのEMAで判定するかチェックボックス | EMA1・2がON |
| ヒゲ設定 | シグナルヒゲ/実体の最小比率 | 3.0倍 |
| ヒゲ設定 | 反対ヒゲ/実体の最大比率（十字足フィルター） | 2.0倍 |
| サイズフィルター | ATRフィルター（ON/OFF・期間・倍率） | ON / 14 / 0.5 |
| サイズフィルター | Pipsフィルター（ON/OFF・最小Pips） | OFF / 10 |

---

## Pine Scriptコード

```pine
//@version=5
indicator("EMA + Wick Signal", overlay=true)

// ═══════════════════════════════════════
// EMA設定
// ═══════════════════════════════════════
ema1_len = input.int(13,  "EMA1 期間", minval=1, group="EMA設定")
ema2_len = input.int(60,  "EMA2 期間", minval=1, group="EMA設定")
ema3_len = input.int(200, "EMA3 期間", minval=1, group="EMA設定")

// ═══════════════════════════════════════
// EMA重なり判定の選択
// ═══════════════════════════════════════
use_ema1 = input.bool(true,  "EMA1 で重なりを判定", group="EMA重なり設定")
use_ema2 = input.bool(true,  "EMA2 で重なりを判定", group="EMA重なり設定")
use_ema3 = input.bool(false, "EMA3 で重なりを判定", group="EMA重なり設定")

// ═══════════════════════════════════════
// ヒゲ設定
// ═══════════════════════════════════════
wick_ratio           = input.float(3.0, "シグナルヒゲ/実体 比率（最小）",   minval=0.1, step=0.1, group="ヒゲ設定",
     tooltip="シグナル方向のヒゲが実体の何倍以上でシグナルとみなすか")
opposite_wick_ratio  = input.float(2.0, "反対ヒゲ/実体 比率（最大）",   minval=0.1, step=0.1, group="ヒゲ設定",
     tooltip="十字足フィルター: 反対方向のヒゲが実体のこの値を超えたらシグナル除外")

// ═══════════════════════════════════════
// サイズフィルター
// ═══════════════════════════════════════
use_atr_filter  = input.bool(true,  "ATRフィルターを使用",           group="サイズフィルター")
atr_len         = input.int(14,     "ATR 期間",          minval=1,   group="サイズフィルター")
atr_mult        = input.float(0.5,  "最小ローソク足サイズ（ATR倍率）", minval=0.0, step=0.1, group="サイズフィルター",
     tooltip="ローソク足のレンジが ATR × この値 以上でないと無視")

use_pips_filter = input.bool(false, "Pipsフィルターを使用",           group="サイズフィルター")
min_pips        = input.float(10.0, "最小ローソク足サイズ（Pips）",   minval=0.0, step=1.0,  group="サイズフィルター",
     tooltip="ローソク足のレンジが この値(Pips) 以上でないと無視")

// ═══════════════════════════════════════
// EMA計算
// ═══════════════════════════════════════
ema1 = ta.ema(close, ema1_len)
ema2 = ta.ema(close, ema2_len)
ema3 = ta.ema(close, ema3_len)

// ═══════════════════════════════════════
// EMAプロット
// ═══════════════════════════════════════
plot(ema1, "EMA1", color=color.new(color.blue,   0), linewidth=1)
plot(ema2, "EMA2", color=color.new(color.orange, 0), linewidth=2)
plot(ema3, "EMA3", color=color.new(color.red,    0), linewidth=2)

// ═══════════════════════════════════════
// トレンド判定（EMA2=60EMAの傾き）
// ═══════════════════════════════════════
is_uptrend   = ema2 > ema2[1]
is_downtrend = ema2 < ema2[1]

// ═══════════════════════════════════════
// EMAとの重なり判定
// ローソク足のヒゲを含む全体レンジがEMAを挟んでいるか
// ═══════════════════════════════════════
overlaps_ema1 = use_ema1 and (high >= ema1 and low <= ema1)
overlaps_ema2 = use_ema2 and (high >= ema2 and low <= ema2)
overlaps_ema3 = use_ema3 and (high >= ema3 and low <= ema3)
overlaps_any  = overlaps_ema1 or overlaps_ema2 or overlaps_ema3

// ═══════════════════════════════════════
// ローソク足の各部分の計算
// ═══════════════════════════════════════
body        = math.abs(close - open)
lower_wick  = math.min(close, open) - low
upper_wick  = high - math.max(close, open)
candle_range = high - low

// ═══════════════════════════════════════
// ヒゲ条件
// 実体が0のDoji足は除外
// 十字足フィルター: 反対方向のヒゲが大きすぎる場合も除外
// ═══════════════════════════════════════
long_lower_wick = body > 0 and lower_wick >= body * wick_ratio and upper_wick <= body * opposite_wick_ratio
long_upper_wick = body > 0 and upper_wick >= body * wick_ratio and lower_wick <= body * opposite_wick_ratio

// ═══════════════════════════════════════
// サイズフィルター判定
// pip_sizeはsyminfo.mintickから自動計算（JPYペアも対応）
// ═══════════════════════════════════════
atr      = ta.atr(atr_len)
pip_size = syminfo.mintick * 10

atr_ok  = not use_atr_filter  or (candle_range >= atr * atr_mult)
pips_ok = not use_pips_filter or (candle_range >= min_pips * pip_size)
size_ok = atr_ok and pips_ok

// ═══════════════════════════════════════
// シグナル生成
// ═══════════════════════════════════════
long_signal  = is_uptrend   and overlaps_any and long_lower_wick and size_ok
short_signal = is_downtrend and overlaps_any and long_upper_wick and size_ok

// ═══════════════════════════════════════
// シグナルのプロット
// ═══════════════════════════════════════
plotshape(long_signal,  "Long",  shape.triangleup,   location.belowbar, color.new(color.green, 0), size=size.normal)
plotshape(short_signal, "Short", shape.triangledown, location.abovebar, color.new(color.red,   0), size=size.normal)

// ═══════════════════════════════════════
// アラート
// ═══════════════════════════════════════
alertcondition(long_signal,  "Long Signal",  "EMA Wick: Long シグナル発生 ({{ticker}} {{interval}})")
alertcondition(short_signal, "Short Signal", "EMA Wick: Short シグナル発生 ({{ticker}} {{interval}})")
```

---

## TradingViewへの導入手順

1. 上記コードをコピー
2. TradingViewの「Pineエディタ」を開いてペースト
3. 「追加」ボタンでチャートに適用

---

## 注意事項

- Pip sizeはJPYペアも含め`syminfo.mintick * 10`で自動計算
- アラートメッセージにティッカーと時間足が自動表示（`{{ticker}} {{interval}}`）
- Doji足（実体ゼロ）は自動除外
