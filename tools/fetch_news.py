#!/usr/bin/env python3
"""
Holt aktuelle Schlagzeilen aus RSS/Atom-Feeds und schreibt data/news.json.
Läuft automatisch per GitHub Action (.github/workflows/pages.yml) alle 30 Minuten.
Keine externen Abhängigkeiten. Fällt ein Feed aus, wird er einfach übersprungen.
"""
import json
import os
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "news.json")
PRO_QUELLE = 15

# id, Anzeigename, Feed-URL  – gern erweitern!
FEEDS = [
    ("tagesschau", "tagesschau", "https://www.tagesschau.de/infoservices/alle-meldungen-100~rss2.xml"),
    ("dlf", "Deutschlandfunk", "https://www.deutschlandfunk.de/nachrichten-100.rss"),
    ("spiegel", "SPIEGEL", "https://www.spiegel.de/schlagzeilen/index.rss"),
    ("zeit", "ZEIT ONLINE", "https://newsfeed.zeit.de/index"),
    ("heise", "heise online", "https://www.heise.de/rss/heise-atom.xml"),
]

ATOM = "{http://www.w3.org/2005/Atom}"


def zeit(s):
    if not s:
        return None
    s = s.strip()
    try:
        d = parsedate_to_datetime(s)  # RSS: RFC 822
    except (TypeError, ValueError):
        try:
            d = datetime.fromisoformat(s.replace("Z", "+00:00"))  # Atom: ISO 8601
        except ValueError:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.astimezone(timezone.utc).isoformat(timespec="seconds")


def parse(xml_bytes):
    root = ET.fromstring(xml_bytes)
    items = []
    if root.tag == ATOM + "feed":
        for e in root.findall(ATOM + "entry"):
            link = e.find(ATOM + "link[@rel='alternate']")
            if link is None:
                link = e.find(ATOM + "link")
            items.append({
                "t": (e.findtext(ATOM + "title") or "").strip(),
                "u": link.get("href") if link is not None else "",
                "d": zeit(e.findtext(ATOM + "updated") or e.findtext(ATOM + "published")),
            })
    else:
        for i in root.iter("item"):
            items.append({
                "t": (i.findtext("title") or "").strip(),
                "u": (i.findtext("link") or "").strip(),
                "d": zeit(i.findtext("pubDate") or i.findtext("{http://purl.org/dc/elements/1.1/}date")),
            })
    return [x for x in items if x["t"] and x["u"].startswith("http")]


def holen(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Minutenmoment/1.0 (+https://github.com/TBR-BRD/minutenmoment)"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def main():
    quellen = []
    for fid, name, url in FEEDS:
        try:
            items = parse(holen(url))
            items.sort(key=lambda x: x["d"] or "", reverse=True)
            quellen.append({"id": fid, "name": name, "items": items[:PRO_QUELLE]})
            print(f"✓ {name}: {len(items)} Meldungen", file=sys.stderr)
        except Exception as e:  # noqa: BLE001
            print(f"✗ {name}: {e}", file=sys.stderr)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"stand": datetime.now(timezone.utc).isoformat(timespec="seconds"), "quellen": quellen},
                  f, ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
