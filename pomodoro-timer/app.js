'use strict';

const STORAGE_KEY = 'focus_loop_state_v1';
const SETTINGS_VERSION = 3;
const RING_CIRCUMFERENCE = 2 * Math.PI * 145;
const FLASH_DURATION = 1600;

const default_state = {
	mode: 'focus',
	focus_minutes: 25,
	break_minutes: 5,
	sessions_per_cycle: 4,
	auto_start: true,
	sound_enabled: true,
	notifications_enabled: true,
	focus_count: 0,
	cycle_count: 0,
	count_date: get_date_key(),
	settings_version: SETTINGS_VERSION,
};

let state = load_state();
let remaining_seconds = get_mode_seconds(state.mode);
let total_seconds = remaining_seconds;
let timer_id = null;
let target_time = null;
let toast_id = null;

const elements = {
	timer_display: document.getElementById('timer_display'),
	timer_hint: document.getElementById('timer_hint'),
	mode_label: document.getElementById('mode_label'),
	progress_ring: document.getElementById('progress_ring'),
	start_button: document.getElementById('start_button'),
	start_label: document.getElementById('start_label'),
	start_icon: document.getElementById('start_icon'),
	reset_button: document.getElementById('reset_button'),
	skip_button: document.getElementById('skip_button'),
	focus_mode_button: document.getElementById('focus_mode_button'),
	break_mode_button: document.getElementById('break_mode_button'),
	focus_count: document.getElementById('focus_count'),
	cycle_dots: document.getElementById('cycle_dots'),
	settings_button: document.getElementById('settings_button'),
	close_settings_button: document.getElementById('close_settings_button'),
	settings_panel: document.getElementById('settings_panel'),
	panel_backdrop: document.getElementById('panel_backdrop'),
	settings_form: document.getElementById('settings_form'),
	reset_all_button: document.getElementById('reset_all_button'),
	focus_minutes: document.getElementById('focus_minutes'),
	break_minutes: document.getElementById('break_minutes'),
	sessions_per_cycle: document.getElementById('sessions_per_cycle'),
	auto_start: document.getElementById('auto_start'),
	sound_enabled: document.getElementById('sound_enabled'),
	notifications_enabled: document.getElementById('notifications_enabled'),
	toast: document.getElementById('toast'),
	screen_flash: document.getElementById('screen_flash'),
};

/** ローカル日付を保存用の文字列にする */
function get_date_key() {
	const now = new Date();
	return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/** 保存済み設定を読み込む */
function load_state() {
	try {
		const saved_state = JSON.parse(localStorage.getItem(STORAGE_KEY));
		const merged_state = { ...default_state, ...saved_state };

		if ((saved_state?.settings_version || 1) < 2) {
			merged_state.auto_start = true;
		}

		if ((saved_state?.settings_version || 1) < 3) {
			merged_state.notifications_enabled = true;
			merged_state.settings_version = SETTINGS_VERSION;
		}

		if (merged_state.count_date !== get_date_key()) {
			merged_state.focus_count = 0;
			merged_state.count_date = get_date_key();
		}

		return merged_state;
	} catch {
		return { ...default_state };
	}
}

/** 現在の設定と実績を保存する */
function save_state() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** モードに対応する秒数を返す */
function get_mode_seconds(mode) {
	const minutes = mode === 'focus' ? state.focus_minutes : state.break_minutes;
	return minutes * 60;
}

/** 残り時間を分秒表示にする */
function format_time(seconds) {
	const minutes = Math.floor(seconds / 60);
	const remainder = seconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

/** タイマーと進捗表示を更新する */
function render_timer() {
	const progress = total_seconds === 0 ? 0 : remaining_seconds / total_seconds;
	const offset = -RING_CIRCUMFERENCE * (1 - progress);
	const formatted_time = format_time(remaining_seconds);

	elements.timer_display.textContent = formatted_time;
	elements.timer_display.dateTime = `PT${remaining_seconds}S`;
	elements.progress_ring.style.strokeDasharray = RING_CIRCUMFERENCE;
	elements.progress_ring.style.strokeDashoffset = offset;
	document.title = `${formatted_time} | ${state.mode === 'focus' ? '集中' : '休憩'} - Focus Loop`;
}

/** モードとセッション実績を画面へ反映する */
function render_state() {
	const is_focus = state.mode === 'focus';
	document.body.dataset.mode = state.mode;
	elements.mode_label.textContent = is_focus ? '集中する時間' : 'ひと息つく時間';
	elements.focus_mode_button.classList.toggle('is_active', is_focus);
	elements.break_mode_button.classList.toggle('is_active', !is_focus);
	elements.focus_mode_button.setAttribute('aria-selected', String(is_focus));
	elements.break_mode_button.setAttribute('aria-selected', String(!is_focus));
	elements.focus_count.textContent = `${state.focus_count} セッション`;
	render_cycle_dots();
	render_timer();
}

/** サイクルの進み具合を点で表示する */
function render_cycle_dots() {
	elements.cycle_dots.innerHTML = '';

	for (let index = 0; index < state.sessions_per_cycle; index += 1) {
		const dot = document.createElement('span');
		dot.className = 'cycle_dot';
		dot.classList.toggle('is_complete', index < state.cycle_count);
		elements.cycle_dots.appendChild(dot);
	}

	elements.cycle_dots.setAttribute(
		'aria-label',
		`${state.sessions_per_cycle}回中${state.cycle_count}回完了`
	);
}

/** 開始・一時停止ボタンの表示を切り替える */
function render_running_state(is_running) {
	elements.start_label.textContent = is_running ? '一時停止' : 'スタート';
	elements.start_icon.innerHTML = is_running
		? '<path d="M8 6v12M16 6v12"/>'
		: '<path d="m9 6 9 6-9 6V6Z"/>';
	elements.start_icon.style.fill = is_running ? 'none' : 'currentColor';
	elements.start_icon.style.stroke = is_running ? 'currentColor' : 'none';
	elements.timer_hint.textContent = is_running
		? (state.mode === 'focus' ? '目の前のひとつに集中' : 'ゆっくり休みましょう')
		: '準備ができたら始めましょう';
}

/** 終了予定時刻を基準に残り時間を進める */
function tick() {
	remaining_seconds = Math.max(0, Math.ceil((target_time - Date.now()) / 1000));
	render_timer();

	if (remaining_seconds === 0) {
		complete_timer();
	}
}

/** タイマーを開始する */
function start_timer() {
	if (timer_id !== null) {
		return;
	}

	target_time = Date.now() + remaining_seconds * 1000;
	timer_id = window.setInterval(tick, 250);
	render_running_state(true);
}

/** タイマーを一時停止する */
function pause_timer() {
	if (timer_id === null) {
		return;
	}

	window.clearInterval(timer_id);
	timer_id = null;
	tick();
	render_running_state(false);
}

/** 開始と一時停止を切り替える */
function toggle_timer() {
	if (timer_id === null) {
		start_timer();
	} else {
		pause_timer();
	}
}

/** 現在のモードを最初からやり直す */
function reset_timer() {
	stop_interval();
	remaining_seconds = get_mode_seconds(state.mode);
	total_seconds = remaining_seconds;
	render_running_state(false);
	render_timer();
	show_toast('タイマーをリセットしました');
}

/** タイマーと本日の実績を初期状態へ戻す */
function reset_all() {
	const should_reset = window.confirm(
		'時間設定を25分・5分・4回に戻し、タイマーと実績もすべてリセットしますか？'
	);

	if (!should_reset) {
		return;
	}

	stop_interval();
	state = {
		...default_state,
		count_date: get_date_key(),
	};
	remaining_seconds = get_mode_seconds('focus');
	total_seconds = remaining_seconds;
	save_state();
	populate_settings();
	render_running_state(false);
	render_state();
	set_settings_open(false);
	show_toast('すべて初期状態に戻しました');
}

/** インターバルだけ停止する */
function stop_interval() {
	if (timer_id !== null) {
		window.clearInterval(timer_id);
		timer_id = null;
	}
}

/** タイマー完了を記録して次のモードへ切り替える */
function complete_timer() {
	stop_interval();

	if (state.mode === 'focus') {
		state.focus_count += 1;
		state.cycle_count = (state.cycle_count + 1) % state.sessions_per_cycle;
		state.count_date = get_date_key();
	}

	const completed_mode = state.mode;
	switch_mode(completed_mode === 'focus' ? 'break' : 'focus', false);
	flash_screen(state.mode);
	play_chime();
	send_notification(completed_mode);
	show_toast(completed_mode === 'focus' ? '集中完了。休憩しましょう' : '休憩完了。次の集中へ');
	save_state();

	if (state.auto_start) {
		start_timer();
	}
}

/** モード切替時に画面全体を柔らかく発光させる */
function flash_screen(next_mode) {
	const flash_class = next_mode === 'focus' ? 'is_focus' : 'is_break';
	elements.screen_flash.classList.remove('is_focus', 'is_break');
	void elements.screen_flash.offsetWidth;
	elements.screen_flash.classList.add(flash_class);

	window.setTimeout(() => {
		elements.screen_flash.classList.remove(flash_class);
	}, FLASH_DURATION);
}

/** 表示モードを切り替える */
function switch_mode(mode, show_message = true) {
	stop_interval();
	state.mode = mode;
	remaining_seconds = get_mode_seconds(mode);
	total_seconds = remaining_seconds;
	render_running_state(false);
	render_state();
	save_state();

	if (show_message) {
		show_toast(mode === 'focus' ? '集中モードに切り替えました' : '休憩モードに切り替えました');
	}
}

/** Web Audio APIで短い終了音を鳴らす */
function play_chime() {
	if (!state.sound_enabled) {
		return;
	}

	const audio_context = new (window.AudioContext || window.webkitAudioContext)();
	const notes = [659.25, 783.99, 987.77];

	notes.forEach((frequency, index) => {
		const oscillator = audio_context.createOscillator();
		const gain = audio_context.createGain();
		const start_time = audio_context.currentTime + index * 0.16;

		oscillator.frequency.value = frequency;
		oscillator.type = 'sine';
		gain.gain.setValueAtTime(0.0001, start_time);
		gain.gain.exponentialRampToValueAtTime(0.18, start_time + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.0001, start_time + 0.42);
		oscillator.connect(gain).connect(audio_context.destination);
		oscillator.start(start_time);
		oscillator.stop(start_time + 0.45);
	});
}

/** 許可済みの場合にデスクトップ通知を送る */
function send_notification(completed_mode) {
	if (
		!state.notifications_enabled
		|| !('Notification' in window)
		|| Notification.permission !== 'granted'
	) {
		return;
	}

	const title = completed_mode === 'focus' ? '集中時間が終わりました' : '休憩時間が終わりました';
	const body = completed_mode === 'focus' ? 'ひと息ついて、頭を休めましょう。' : '次の集中を始める準備ができました。';
	new Notification(title, { body, icon: './icon.svg' });
}

/** 設定パネルを開閉する */
function set_settings_open(is_open) {
	elements.settings_panel.classList.toggle('is_open', is_open);
	elements.settings_panel.setAttribute('aria-hidden', String(!is_open));
	elements.settings_button.setAttribute('aria-expanded', String(is_open));
	elements.panel_backdrop.hidden = !is_open;

	if (is_open) {
		elements.focus_minutes.focus();
	} else {
		elements.settings_button.focus();
	}
}

/** 現在の設定値をフォームに反映する */
function populate_settings() {
	elements.focus_minutes.value = state.focus_minutes;
	elements.break_minutes.value = state.break_minutes;
	elements.sessions_per_cycle.value = state.sessions_per_cycle;
	elements.auto_start.checked = state.auto_start;
	elements.sound_enabled.checked = state.sound_enabled;
	elements.notifications_enabled.checked = state.notifications_enabled;
}

/** フォームから設定を保存する */
async function save_settings(event) {
	event.preventDefault();

	const wants_notifications = elements.notifications_enabled.checked;
	let notifications_enabled = wants_notifications;

	if (wants_notifications && 'Notification' in window && Notification.permission !== 'granted') {
		const permission = await Notification.requestPermission();
		notifications_enabled = permission === 'granted';
		elements.notifications_enabled.checked = notifications_enabled;
	}

	if (wants_notifications && !('Notification' in window)) {
		notifications_enabled = false;
		elements.notifications_enabled.checked = false;
		show_toast('このブラウザーは通知に対応していません');
	}

	state.focus_minutes = clamp_number(elements.focus_minutes.value, 1, 180);
	state.break_minutes = clamp_number(elements.break_minutes.value, 1, 60);
	state.sessions_per_cycle = clamp_number(elements.sessions_per_cycle.value, 1, 10);
	state.auto_start = elements.auto_start.checked;
	state.sound_enabled = elements.sound_enabled.checked;
	state.notifications_enabled = notifications_enabled;
	state.cycle_count %= state.sessions_per_cycle;
	save_state();
	reset_timer();
	render_state();
	set_settings_open(false);
	show_toast('設定を保存しました');
}

/** 数値入力を指定範囲に収める */
function clamp_number(value, minimum, maximum) {
	const number = Number.parseInt(value, 10);
	return Math.min(maximum, Math.max(minimum, Number.isNaN(number) ? minimum : number));
}

/** 画面下部に短いメッセージを表示する */
function show_toast(message) {
	window.clearTimeout(toast_id);
	elements.toast.textContent = message;
	elements.toast.classList.add('is_visible');
	toast_id = window.setTimeout(() => elements.toast.classList.remove('is_visible'), 2200);
}

/** 操作イベントを登録する */
function bind_events() {
	elements.start_button.addEventListener('click', toggle_timer);
	elements.reset_button.addEventListener('click', reset_timer);
	elements.skip_button.addEventListener('click', () => switch_mode(state.mode === 'focus' ? 'break' : 'focus'));
	elements.focus_mode_button.addEventListener('click', () => switch_mode('focus'));
	elements.break_mode_button.addEventListener('click', () => switch_mode('break'));
	elements.settings_button.addEventListener('click', () => set_settings_open(true));
	elements.close_settings_button.addEventListener('click', () => set_settings_open(false));
	elements.panel_backdrop.addEventListener('click', () => set_settings_open(false));
	elements.settings_form.addEventListener('submit', save_settings);
	elements.reset_all_button.addEventListener('click', reset_all);

	document.addEventListener('keydown', (event) => {
		if (event.code === 'Space' && !event.target.matches('input, button')) {
			event.preventDefault();
			toggle_timer();
		}

		if (event.key === 'Escape' && elements.settings_panel.classList.contains('is_open')) {
			set_settings_open(false);
		}
	});

	document.addEventListener('visibilitychange', () => {
		if (!document.hidden && timer_id !== null) {
			tick();
		}
	});
}

/** オフライン利用のためService Workerを登録する */
function register_service_worker() {
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', () => {
			navigator.serviceWorker.register('./service-worker.js').catch(() => {
				// 登録に失敗してもタイマー本体は利用できる
			});
		});
	}
}

/** アプリを初期化する */
function init() {
	populate_settings();
	render_running_state(false);
	render_state();
	bind_events();
	register_service_worker();
}

init();
