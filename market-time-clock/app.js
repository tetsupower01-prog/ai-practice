'use strict';

/** 表示対象の都市定義 */
const CITIES = [
	{ id: 'tokyo', name: '東京', name_en: 'Tokyo', timeZone: 'Asia/Tokyo' },
	{ id: 'taipei', name: '台北', name_en: 'Taipei', timeZone: 'Asia/Taipei' },
	{ id: 'london', name: 'ロンドン', name_en: 'London', timeZone: 'Europe/London' },
	{ id: 'new_york', name: 'ニューヨーク', name_en: 'New York', timeZone: 'America/New_York' },
	{ id: 'sydney', name: 'シドニー', name_en: 'Sydney', timeZone: 'Australia/Sydney' },
];

const REFERENCE_TIME_ZONE = 'Asia/Tokyo';

/** 夏時間状態の表示ラベル */
const DST_LABELS = {
	dst: '夏時間中',
	standard: '標準時間中',
	no_dst: '夏時間なし',
};

/** 夏時間状態に対応するバッジCSSクラス */
const DST_BADGE_CLASS = {
	dst: 'badge--dst',
	standard: 'badge--standard',
	no_dst: 'badge--no-dst',
};

/** 指定タイムゾーンのUTCからのオフセット（分）を取得 */
function get_offset_minutes(time_zone, date) {
	const utc_date = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
	const tz_date = new Date(date.toLocaleString('en-US', { timeZone: time_zone }));
	return (tz_date - utc_date) / 60000;
}

/** 夏時間の有無と現在の状態を判定 */
function get_dst_status(time_zone, date) {
	const year = date.getFullYear();
	const jan_offset = get_offset_minutes(time_zone, new Date(year, 0, 15));
	const jul_offset = get_offset_minutes(time_zone, new Date(year, 6, 15));

	if (jan_offset === jul_offset) {
		return 'no_dst';
	}

	const standard_offset = Math.min(jan_offset, jul_offset);
	const current_offset = get_offset_minutes(time_zone, date);

	return current_offset > standard_offset ? 'dst' : 'standard';
}

/** 東京から見た時差を文字列で返す */
function format_offset_from_tokyo(target_offset, tokyo_offset) {
	const diff_hours = (target_offset - tokyo_offset) / 60;

	if (diff_hours === 0) {
		return '東京と同時刻';
	}

	const sign = diff_hours > 0 ? '+' : '';
	const label = diff_hours > 0 ? '時間遅れ' : '時間早い';
	const abs_hours = Math.abs(diff_hours);

	if (Number.isInteger(abs_hours)) {
		return `東京より ${sign}${diff_hours}時間（${abs_hours}${label}）`;
	}

	return `東京より ${sign}${diff_hours.toFixed(1)}時間`;
}

/** 時刻・日付のフォーマッタを生成 */
function create_formatters(time_zone) {
	return {
		time: new Intl.DateTimeFormat('ja-JP', {
			timeZone: time_zone,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		}),
		date: new Intl.DateTimeFormat('ja-JP', {
			timeZone: time_zone,
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			weekday: 'short',
		}),
	};
}

/** 都市カードのHTMLを生成 */
function render_city_card(city, now, tokyo_offset) {
	const formatters = create_formatters(city.timeZone);
	const dst_status = get_dst_status(city.timeZone, now);
	const city_offset = get_offset_minutes(city.timeZone, now);
	const offset_text = format_offset_from_tokyo(city_offset, tokyo_offset);

	return `
		<li class="city-card" data-city="${city.id}">
			<div class="city-card__region">
				<span class="city-card__name">${city.name}</span>
				<span class="city-card__timezone">${city.name_en}</span>
				<span class="badge ${DST_BADGE_CLASS[dst_status]}">${DST_LABELS[dst_status]}</span>
				<span class="city-card__offset">${city.id === 'tokyo' ? '<strong>基準都市</strong>' : `<strong>${offset_text}</strong>`}</span>
			</div>
			<time class="city-card__date" datetime="${now.toISOString()}">${formatters.date.format(now)}</time>
			<time class="city-card__time" datetime="${now.toISOString()}">${formatters.time.format(now)}</time>
		</li>
	`;
}

/** 画面全体を更新 */
function update_clock() {
	const now = new Date();
	const tokyo_offset = get_offset_minutes(REFERENCE_TIME_ZONE, now);
	const city_list = document.getElementById('city-list');
	const tokyo_reference = document.getElementById('tokyo-reference');
	const last_updated = document.getElementById('last-updated');

	const tokyo_formatter = create_formatters(REFERENCE_TIME_ZONE);

	city_list.innerHTML = CITIES.map((city) =>
		render_city_card(city, now, tokyo_offset)
	).join('');

	tokyo_reference.textContent = `基準: 東京 ${tokyo_formatter.time.format(now)}`;
	last_updated.textContent = `最終更新: ${tokyo_formatter.time.format(now)}`;
}

/** Service Worker を登録（GitHub Pages 対応） */
function register_service_worker() {
	if (!('serviceWorker' in navigator)) {
		return;
	}

	window.addEventListener('load', () => {
		navigator.serviceWorker.register('./service-worker.js').catch(() => {
			// 登録失敗時もアプリ本体は動作する
		});
	});
}

/** 初期化 */
function init() {
	update_clock();
	setInterval(update_clock, 1000);
	register_service_worker();
}

init();
