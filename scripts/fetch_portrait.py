#!/usr/bin/env python3
"""Download a public-domain portrait from Wikimedia Commons into the site.

    python3 scripts/fetch_portrait.py "File:Justus Sustermans - Portrait of Galileo Galilei, 1636.jpg" galileo "Галилео Галилей"
    python3 scripts/fetch_portrait.py "File:Emil_Lenz.jpg" lenz "Эмилий Ленц" "неизвестен"   # override a messy author

Saves public/portraits/<slug>.jpg (square crop, 480 px) and src/data/portraits/<slug>.json
with the source page, author and license for the credits page. Refuses anything that is not
public domain or CC0.
"""

import io
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
API = 'https://commons.wikimedia.org/w/api.php'
UA = {'User-Agent': 'ig-physics-site/1.0 (educational site; portrait fetcher)'}
SIZE = 480


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()


def plain(html: str) -> str:
    html = re.sub(r'<(\w+)[^>]*display:\s*none[^>]*>.*?</\1>', '', html or '', flags=re.S)  # Commons hides a duplicate
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html)).strip()


def artist(meta: dict) -> str:
    name = plain(meta.get('Artist', {}).get('value', ''))
    return 'неизвестен' if re.fullmatch(r'(unknown( author)?)?', name, re.I) else name


def main() -> None:
    if len(sys.argv) not in (4, 5):
        sys.exit(__doc__)
    title, slug, person = sys.argv[1], sys.argv[2], sys.argv[3]
    author = sys.argv[4] if len(sys.argv) == 5 else None
    if not title.startswith('File:'):
        title = 'File:' + title
    if not re.fullmatch(r'[a-z0-9-]+', slug):
        sys.exit('slug: lowercase latin letters, digits and hyphens only')

    query = urllib.parse.urlencode({
        'action': 'query', 'titles': title, 'prop': 'imageinfo', 'format': 'json',
        'iiprop': 'url|extmetadata', 'iiurlwidth': 900,
    })
    page = next(iter(json.loads(get(f'{API}?{query}'))['query']['pages'].values()))
    if 'imageinfo' not in page:
        sys.exit(f'not found on Commons: {title}')
    info = page['imageinfo'][0]
    meta = info['extmetadata']
    license_name = plain(meta.get('LicenseShortName', {}).get('value', ''))
    if not re.search(r'public domain|\bPD\b|CC0', license_name, re.I):
        sys.exit(f'REFUSED: license is "{license_name}", only public domain or CC0 are allowed')

    img = Image.open(io.BytesIO(get(info['thumburl']))).convert('RGB')
    w, h = img.size
    side = min(w, h)
    top = 0  # tall portraits: keep the top part, where the face is
    left = (w - side) // 2
    img = img.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.LANCZOS)
    out = ROOT / 'public' / 'portraits' / f'{slug}.jpg'
    img.save(out, 'JPEG', quality=85, optimize=True, progressive=True)

    record = {
        'file': f'{slug}.jpg',
        'person': person,
        'source': info['descriptionurl'],
        'author': author or artist(meta),
        'license': license_name,
    }
    (ROOT / 'src' / 'data' / 'portraits' / f'{slug}.json').write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'saved {out.relative_to(ROOT)} ({license_name}); author: {record["author"]}')


if __name__ == '__main__':
    main()
