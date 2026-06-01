import gspread
from google.oauth2.service_account import Credentials
import requests
from bs4 import BeautifulSoup
import csv
import time
import sys

# ===== 設定 =====
JSON_KEY_PATH = 'service_account.json'  # サービスアカウントJSONのファイル名
SPREADSHEET_ID = '1mZXfx8QavWbqXAtrhEXR-ZxrluYQJCaZRbJriTAEuqo'  # スプレッドシートのID（URLの /d/〇〇/ の部分）
SHEET_NAME = 'シート1'                  # シート名（「Sheet1」や「シート1」など）
URL_COLUMN = 1                          # URLが入っている列番号（A列=1）
OUTPUT_FILE = 'restaurants.csv'         # 出力CSVファイル名
SLEEP_SEC = 2                           # 各リクエスト間の待機秒数

SCOPES = [
	'https://spreadsheets.google.com/feeds',
	'https://www.googleapis.com/auth/drive',
]

HEADERS = {
	'User-Agent': (
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
		'AppleWebKit/537.36 (KHTML, like Gecko) '
		'Chrome/120.0.0.0 Safari/537.36'
	)
}


def get_urls_from_sheet():
	"""スプレッドシートからURLを取得する"""
	creds = Credentials.from_service_account_file(JSON_KEY_PATH, scopes=SCOPES)
	client = gspread.authorize(creds)
	spreadsheet = client.open_by_key(SPREADSHEET_ID)
	worksheet = spreadsheet.worksheet(SHEET_NAME)
	values = worksheet.col_values(URL_COLUMN)
	# 空行と食べログ以外のURLを除外
	urls = [v.strip() for v in values if v and 'tabelog.com' in v]
	return urls


def scrape_restaurant(url):
	"""食べログの店舗ページから店名・住所・営業時間を取得する"""
	try:
		response = requests.get(url, headers=HEADERS, timeout=15)
		response.raise_for_status()
		soup = BeautifulSoup(response.text, 'html.parser')

		# 店名
		name = _get_name(soup)

		# 住所
		address = _get_address(soup)

		# 営業時間
		hours = _get_hours(soup)

		return name, address, hours

	except requests.exceptions.RequestException as e:
		print(f'  [エラー] リクエスト失敗: {e}')
		return '', '', ''
	except Exception as e:
		print(f'  [エラー] 解析失敗: {e}')
		return '', '', ''


def _get_name(soup):
	"""店名を取得する"""
	# 複数のセレクタを試みる
	selectors = [
		('h2', {'class': 'display-name'}),
		('h1', {'itemprop': 'name'}),
		('h1', {'class': 'display-name'}),
	]
	for tag, attrs in selectors:
		elem = soup.find(tag, attrs)
		if elem:
			return elem.get_text(strip=True)
	return ''


def _get_address(soup):
	"""住所を取得する"""
	selectors = [
		('p', {'class': 'rstinfo-table__address'}),
		('span', {'itemprop': 'streetAddress'}),
		('p', {'itemprop': 'address'}),
	]
	for tag, attrs in selectors:
		elem = soup.find(tag, attrs)
		if elem:
			# 「地図を見る」などのリンクテキストを除いてテキストのみ取得
			text = elem.get_text(separator=' ', strip=True)
			return text
	return ''


def _get_hours(soup):
	"""営業時間を取得する"""
	# 「営業時間」ラベルの隣の td から取得
	for th in soup.find_all('th'):
		if '営業時間' in th.get_text():
			td = th.find_next_sibling('td')
			if td:
				text = ' '.join(td.get_text(separator='\n', strip=True).splitlines())
				return text
	return ''


def save_csv(results):
	"""結果をCSVに保存する（Googleマイマップ用フォーマット）"""
	with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8-sig') as f:
		writer = csv.writer(f)
		writer.writerow(['名前', '住所', '営業時間', '食べログURL'])
		writer.writerows(results)


def main():
	print('スプレッドシートからURLを読み込んでいます...')
	try:
		urls = get_urls_from_sheet()
	except Exception as e:
		print(f'スプレッドシートの読み込みに失敗しました: {e}')
		sys.exit(1)

	print(f'{len(urls)} 件のURLを取得しました\n')

	results = []
	for i, url in enumerate(urls, 1):
		print(f'[{i}/{len(urls)}] {url}')
		name, address, hours = scrape_restaurant(url)
		print(f'  店名: {name}')
		print(f'  住所: {address}')
		print(f'  営業時間: {hours[:40]}...' if len(hours) > 40 else f'  営業時間: {hours}')
		results.append([name, address, hours, url])
		time.sleep(SLEEP_SEC)

	save_csv(results)
	print(f'\n完了！ {OUTPUT_FILE} に {len(results)} 件を出力しました。')


if __name__ == '__main__':
	main()
