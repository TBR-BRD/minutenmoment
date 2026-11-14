# Minutenmoment ⏱️

**Jede Minute eine Geschichte.**

👉 **Live-Version: https://tbr-brd.github.io/minutenmoment/**

Eine Uhr im LED-Look, die zu jeder Minute des Tages einen Fakt zeigt –
auf Deutsch: Geschichte, Kalenderdaten, Ereignisse genau zu dieser Uhrzeit, Mathe und Kurioses.
Dazu auf Wunsch **Datum**, **Wetter** und aktuelle **Schlagzeilen**.

![Minutenmoment](docs/screenshot.png)

- **19:45** → *Geschichte · 1945: Ende des Zweiten Weltkriegs in Europa.*
- **21:17** → *20. Juli 1969, 21:17 Uhr deutscher Zeit: „The Eagle has landed“.*
- **09:11** → *Kalenderblatt: Am 9. November – Schicksalstag der Deutschen.*
- **08:15** → *Null-acht-fünfzehn: benannt nach dem MG 08/15.*
- **17:29** → *1729 – die Taxi-Zahl von Ramanujan.*

## Funktionen

| | |
|---|---|
| 🕰️ **LED-Uhr** | 7-Segment-Anzeige mit Ziffern-Scramble beim Minutenwechsel, 6 Farben, optional Sekunden |
| 📜 **Geschichte** | Uhrzeit als Jahreszahl (14:15 → 1415), als Datum (09:11 → 9. November) und Ereignisse, die genau zu dieser Uhrzeit geschahen – mit „vor X Jahren“ |
| 🔢 **Mathe** | Primzahlen, Quadrat-/Kubikzahlen, Fibonacci, Palindrome, versteckte Rechnungen, Ziffernfolgen in π, e, √2 und φ |
| ☎️ **Kurioses** | Ortsvorwahlen (02:21 → Köln), Notrufnummern, bekannte Zahlen |
| 📅 **Datum** | z. B. „Samstag, 14. November 2026“ |
| 🌤️ **Wetter** | aktuelle Temperatur, Tageshöchst-/-tiefstwert; Ort per Suche oder Standort, °C/°F ([Open-Meteo](https://open-meteo.com/), ohne API-Schlüssel) |
| 📰 **Schlagzeilen** | tagesschau, Deutschlandfunk, SPIEGEL, ZEIT ONLINE, heise online oder alle gemischt – wechseln alle 9 s, Klick öffnet den Artikel |
| ⭐ **Eigene Momente** | Geburtstage & Jahrestage erscheinen zur passenden Uhrzeit, am Tag selbst auch neben dem Datum |
| 📱 **Wanduhr-Modus** | Vollbild, Bildschirm wach halten, als App installierbar (PWA), offline nutzbar |

Datum, Wetter, Schlagzeilen, Sekunden und Faktenwechsel (nie / 10–30 s) lassen sich in den Einstellungen einzeln ein- und ausschalten.

**Bedienung:** Auf den Fakt tippen oder <kbd>→</kbd> = nächster Fakt · <kbd>F</kbd> = Vollbild · <kbd>S</kbd> = Einstellungen

## Datenbestand

| Kategorie | Umfang |
|---|---|
| Jahreszahlen (9 n. Chr. bis 2038) | 261 Jahre, 294 Ereignisse |
| Kalendertage | 76 Tage, 90 Einträge |
| Ereignisse auf die Minute genau | 26 |
| Bekannte Zahlen & Vorwahlen | 35 + 39 |
| Mathe-Fakten | für alle 1.440 Minuten berechnet |

Rund 340 Minuten des Tages haben einen Geschichtsbezug. Nicht jedes Jahr passt auf die Uhr:
Nur Jahre, deren letzte zwei Ziffern unter 60 liegen, lassen sich als Uhrzeit darstellen – 1989 etwa nicht,
der Mauerfall erscheint deshalb über das Datum (09:11 → 9. November).

## Projektstruktur

```
index.html                 Seite
css/style.css              Gestaltung
js/app.js                  Uhr, Fakten, Wetter, Schlagzeilen, Einstellungen
data/facts.json|.js        vorberechnete Fakten (aus tools/generate_facts.py)
tools/daten.py             kuratierte Geschichtsdaten, Zahlen, Vorwahlen
tools/generate_facts.py    erzeugt die Fakten-Dateien
tools/fetch_news.py        holt die Schlagzeilen (läuft in der GitHub Action)
.github/workflows/pages.yml  veröffentlicht die Seite, alle 30 Minuten neu
sw.js, manifest.webmanifest  Offline-Cache und App-Installation
```

## Fakten erweitern

Neue Einträge in [`tools/daten.py`](tools/daten.py) ergänzen:

- `JAHRE` – Jahreszahl → Ereignisse
- `TAGE` – (Tag, Monat) → Ereignisse (nur Tage 1–23, da die Stunde den Tag darstellt)
- `UHRZEIT_EREIGNISSE` – Dinge, die genau zu einer Uhrzeit passierten
- `BEKANNTE_ZAHLEN`, `VORWAHLEN`

Danach neu erzeugen (Python 3, keine Abhängigkeiten) und beide Dateien in `data/` committen:

```bash
python3 tools/generate_facts.py
```

## Schlagzeilen-Quellen

Die Feeds stehen in der Liste `FEEDS` in [`tools/fetch_news.py`](tools/fetch_news.py) und können dort ergänzt werden
(RSS oder Atom). Die GitHub Action holt sie bei jedem Push und alle 30 Minuten; ein Feed, der nicht antwortet,
wird übersprungen. Ob alle Quellen liefern, steht im Log des Workflows unter **Actions**.

Voraussetzung: **Settings → Pages → Source: „GitHub Actions“**.

## Lokal testen

`index.html` per Doppelklick öffnen – Uhr, Fakten und Wetter funktionieren sofort.
Schlagzeilen gibt es nur online, weil `data/news.json` erst von der GitHub Action erzeugt wird.
Wer sie lokal sehen möchte:

```bash
python3 tools/fetch_news.py
python3 -m http.server 8000   # dann http://localhost:8000 öffnen
```

## Datenschutz

Keine Cookies, kein Tracking. Einstellungen und eigene Momente liegen nur im `localStorage` des Browsers.
Für das Wetter wird der eingestellte Ort (Koordinaten) an [Open-Meteo](https://open-meteo.com/) übermittelt.
Schlagzeilen werden nicht vom Browser, sondern von der GitHub Action aus den öffentlichen RSS-Feeds der
Redaktionen geholt; angezeigt werden nur Titel, Uhrzeit und Link zum Originalartikel.

## Inspiration & Lizenz

Inspiriert von der Idee hinter „Momentous“ von Andy Isaacson – Minutenmoment ist eine eigenständige,
deutschsprachige Neuumsetzung mit eigenen Daten und eigenem Code.

MIT-Lizenz © 2026 Thoralf Brandt
