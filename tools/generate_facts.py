#!/usr/bin/env python3
"""
Erzeugt data/facts.json – für jede Minute von 00:00 bis 23:59 eine Liste
von Fakten, sortiert nach „Interessantheit“.

Aufruf (aus dem Repo-Hauptordner):   python3 tools/generate_facts.py
Keine externen Abhängigkeiten nötig.
"""
import json
import math
import os
import sys
from math import isqrt

sys.path.insert(0, os.path.dirname(__file__))
from daten import JAHRE, TAGE, UHRZEIT_EREIGNISSE, BEKANNTE_ZAHLEN, VORWAHLEN  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "facts.json")
NACHKOMMA = 20000  # Stellen der Konstanten, die durchsucht werden
sys.set_int_max_str_digits(0)

MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
          "August", "September", "Oktober", "November", "Dezember"]


# ---------------------------------------------------------------- Konstanten
def pi_digits(n):
    """π mit Machin-Formel, liefert die Nachkommastellen als String."""
    guard = 10
    scale = 10 ** (n + guard)

    def arctan_inv(x):
        total = term = scale // x
        x2, k, sign = x * x, 3, -1
        while term:
            term //= x2
            total += sign * (term // k)
            sign, k = -sign, k + 2
        return total

    pi = 4 * (4 * arctan_inv(5) - arctan_inv(239))
    return str(pi)[1:n + 1]


def e_digits(n):
    guard = 10
    scale = 10 ** (n + guard)
    total, term, k = 0, scale, 0
    while term:
        total += term
        k += 1
        term //= k
    return str(total)[1:n + 1]


def sqrt_digits(m, n):
    r = isqrt(m * 10 ** (2 * n))
    s = str(r)
    return s[len(str(isqrt(m))):][:n]


def phi_digits(n):
    r = isqrt(5 * 10 ** (2 * (n + 5)))  # √5 · 10^(n+5)
    phi = (10 ** (n + 5) + r) // 2
    return str(phi)[1:n + 1]


print("Berechne Konstanten …", file=sys.stderr)
KONSTANTEN = [
    ("π", pi_digits(NACHKOMMA)),
    ("e", e_digits(NACHKOMMA)),
    ("√2", sqrt_digits(2, NACHKOMMA)),
    ("φ (Goldener Schnitt)", phi_digits(NACHKOMMA)),
]
assert KONSTANTEN[0][1].startswith("14159265358979"), "π falsch"
assert KONSTANTEN[1][1].startswith("71828182845904"), "e falsch"
assert KONSTANTEN[2][1].startswith("41421356237309"), "√2 falsch"
assert KONSTANTEN[3][1].startswith("61803398874989"), "φ falsch"


# ---------------------------------------------------------------- Zahlenhelfer
def is_prime(n):
    if n < 2:
        return False
    if n % 2 == 0:
        return n == 2
    for d in range(3, isqrt(n) + 1, 2):
        if n % d == 0:
            return False
    return True


PRIMES = [p for p in range(2, 3000) if is_prime(p)]
FIB = [0, 1]
while FIB[-1] < 5000:
    FIB.append(FIB[-1] + FIB[-2])
FIB = set(FIB)
FAKULTAETEN = {1: "1!", 2: "2!", 6: "3!", 24: "4!", 120: "5!", 720: "6!"}
VOLLKOMMEN = {6, 28, 496}

HOCH = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")


def faktoren(n):
    out, d = [], 2
    while d * d <= n:
        k = 0
        while n % d == 0:
            n //= d
            k += 1
        if k:
            out.append(f"{d}{str(k).translate(HOCH) if k > 1 else ''}")
        d += 1
    if n > 1:
        out.append(str(n))
    return " · ".join(out)


def num(n):
    return f"{n:,}".replace(",", ".")


def dreieck(n):
    k = (isqrt(8 * n + 1) - 1) // 2
    return k * (k + 1) // 2 == n and n > 0, k


def zahl_eigenschaften(n):
    """Mathe-Eigenschaften einer Zahl → Liste (score, text)."""
    res = []
    if n < 2:
        return res
    if is_prime(n):
        idx = PRIMES.index(n) + 1
        t = f"{num(n)} ist eine Primzahl – die {idx}. überhaupt."
        if is_prime(n - 2) or is_prime(n + 2):
            partner = n - 2 if is_prime(n - 2) else n + 2
            t += f" Mit {num(partner)} bildet sie einen Primzahlzwilling."
        res.append((48, t))
    r = isqrt(n)
    if r * r == n:
        res.append((62, f"{num(n)} ist eine Quadratzahl: {r}²."))
    c = round(n ** (1 / 3))
    if c ** 3 == n:
        res.append((66, f"{num(n)} ist eine Kubikzahl: {c}³."))
    if n & (n - 1) == 0:
        res.append((64, f"{num(n)} ist eine Zweierpotenz: 2{str(n.bit_length() - 1).translate(HOCH)}."))
    if n in FIB:
        res.append((60, f"{num(n)} ist eine Fibonacci-Zahl."))
    ok, k = dreieck(n)
    if ok and n > 10:
        res.append((44, f"{num(n)} ist eine Dreieckszahl: 1 + 2 + … + {k}."))
    if n in FAKULTAETEN:
        res.append((58, f"{n} = {FAKULTAETEN[n]}"))
    if n in VOLLKOMMEN:
        res.append((72, f"{n} ist eine vollkommene Zahl – gleich der Summe ihrer Teiler."))
    return res


OPS = [
    ("+", lambda a, b: a + b),
    ("−", lambda a, b: a - b),
    ("×", lambda a, b: a * b),
    (":", lambda a, b: a / b if b and a % b == 0 else None),
    ("^", lambda a, b: a ** b if b < 10 else None),
]


def _trivial(sym, rechts):
    return (sym in "+−" and rechts == 0) or (sym in "×:^" and rechts in (0, 1))


def gleichungen(ziffern):
    """Sucht Gleichungen a ∘ b = c bzw. a = b ∘ c in der Ziffernfolge."""
    gef = []
    L = len(ziffern)
    for i in range(1, L - 1):
        for j in range(i + 1, L):
            A, B, C = ziffern[:i], ziffern[i:j], ziffern[j:]
            if any(len(x) > 1 and x[0] == "0" for x in (A, B, C)):
                continue
            a, b, c = int(A), int(B), int(C)
            if a == 0 and b == 0:
                continue
            for sym, f in OPS:
                if sym == "^" and (b < 2 and c < 2):
                    continue
                op = "²" if (sym == "^" and b == 2) else None
                v = f(a, b) if not _trivial(sym, b) else None
                if v is not None and v == c:
                    gef.append(f"{a} {sym} {b} = {c}" if not op else f"{a}² = {c}")
                v2 = f(b, c) if not _trivial(sym, c) else None
                if v2 is not None and v2 == a:
                    gef.append(f"{a} = {b} {sym} {c}" if not (sym == "^" and c == 2) else f"{a} = {b}²")
    return gef


def konstanten_treffer(s):
    best = []
    for name, d in KONSTANTEN:
        pos = d.find(s)
        if pos >= 0:
            best.append((pos + 1, name))
    best.sort()
    return best


# ---------------------------------------------------------------- Generator
def fakten_fuer(h, m):
    key = f"{h:02d}:{m:02d}"
    disp = f"{h:02d}{m:02d}"          # 4 Ziffern wie auf der Uhr
    ohne0 = disp.lstrip("0") or "0"    # Zahl ohne führende Null
    n = int(ohne0)
    F = []  # (score, kategorie, text, extra)

    def add(score, kat, text, **extra):
        F.append((score, kat, text, extra))

    # 1) Was genau zu dieser Uhrzeit passierte
    for t in UHRZEIT_EREIGNISSE.get(key, []):
        add(100, "Moment", t)

    # 2) Bekannte Zahlen & Vorwahlen
    for t in BEKANNTE_ZAHLEN.get(disp, []):
        add(92, "Zahl", t)
    if disp in VORWAHLEN:
        add(70, "Vorwahl", f"{disp} ist die Vorwahl von {VORWAHLEN[disp]}.")

    # 3) Geschichte: Uhrzeit als Jahreszahl
    jahr = n
    if jahr in JAHRE:
        for i, t in enumerate(JAHRE[jahr]):
            add(88 - i * 3 + (4 if jahr >= 1800 else 0), "Geschichte", t, y=jahr)

    # 4) Kalender: Uhrzeit als Datum (Tag.Monat.)
    if 1 <= h <= 31 and 1 <= m <= 12:
        datum = f"{h}. {MONATE[m - 1]}"
        for i, t in enumerate(TAGE.get((h, m), [])):
            add(84 - i * 3, "Kalender", f"Am {datum}: {t}")

    # 5) Ziffernmuster
    if len(set(disp)) == 1:
        add(80, "Muster", f"{h:02d}:{m:02d} – viermal dieselbe Ziffer.")
    elif disp == disp[::-1]:
        add(66, "Muster", f"{h:02d}:{m:02d} ist ein Palindrom – vorwärts wie rückwärts gleich.")
    elif h == m:
        add(56, "Muster", "Stunde und Minute sind gleich.")
    stufe = [int(c) for c in disp]
    if all(stufe[i + 1] - stufe[i] == 1 for i in range(3)):
        add(76, "Muster", "Vier aufeinanderfolgende Ziffern – eine Treppe nach oben.")
    elif all(stufe[i] - stufe[i + 1] == 1 for i in range(3)):
        add(76, "Muster", "Vier absteigende Ziffern – ein Countdown.")
    if h > 1 and m == h * h:
        add(64, "Mathe", f"Die Minute ist das Quadrat der Stunde: {h}² = {m}.")
    elif h > 1 and m == h * 2 and m != h:
        add(40, "Mathe", f"Die Minute ist das Doppelte der Stunde.")

    # 6) Mathe-Eigenschaften der Zahl
    for s, t in zahl_eigenschaften(n):
        add(s, "Mathe", t)

    # 7) Gleichungen in den Ziffern
    ziff = ohne0 if len(ohne0) >= 3 else None
    if ziff:
        gl = gleichungen(ziff)
        if gl:
            add(57, "Mathe", f"Versteckte Rechnung: {gl[0]}.")

    # 8) Ziffernfolge in π, e, √2, φ
    if len(ohne0) >= 3:
        treffer = konstanten_treffer(ohne0)
        if treffer:
            pos, name = treffer[0]
            score = 70 if pos <= 10 else 56 if pos <= 200 else 40 if pos <= 2000 else 22
            add(score, "Konstante",
                f"Die Ziffernfolge {ohne0} taucht in {name} ab der {num(pos)}. Nachkommastelle auf.")

    # 9) Minute des Tages
    md = h * 60 + m
    if md == 0:
        pass
    elif md == 1000:
        add(74, "Tag", "Genau die 1.000. Minute des Tages.")
    elif md == 720:
        add(60, "Tag", "Halbzeit: 720 Minuten sind vorbei, 720 kommen noch.")
    else:
        eig = zahl_eigenschaften(md)
        if eig and md > 10:
            add(30, "Tag", f"Dies ist die {num(md)}. Minute des Tages. " + eig[0][1])

    # 10) Rückfallebene: Primfaktoren & Tagesanteil
    if n > 1 and not zahl_eigenschaften(n):
        add(14, "Mathe", f"{num(n)} = {faktoren(n)}")
    anteil = md / 1440 * 100
    rest = 1440 - md
    add(5, "Tag", f"{anteil:.1f} % des Tages sind vorbei – noch {rest} Minute{'n' if rest != 1 else ''} bis Mitternacht."
        .replace(".", ",", 1))

    F.sort(key=lambda x: -x[0])
    out = []
    seen = set()
    for s, k, t, ex in F:
        if t in seen:
            continue
        seen.add(t)
        d = {"k": k, "t": t}
        d.update(ex)
        out.append(d)
    return out[:7]


def main():
    data = {}
    for h in range(24):
        for m in range(60):
            data[f"{h:02d}:{m:02d}"] = fakten_fuer(h, m)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    # Zusätzlich als JS-Datei: funktioniert auch beim Öffnen per Doppelklick (file://)
    with open(OUT[:-5] + ".js", "w", encoding="utf-8") as f:
        f.write("window.MINUTENMOMENT_FACTS=")
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    # kleine Statistik
    from collections import Counter
    c = Counter(d[0]["k"] for d in data.values())
    hist = sum(1 for d in data.values() if any(x["k"] in ("Geschichte", "Kalender", "Moment") and
                                                 True for x in d))
    print(f"{len(data)} Minuten geschrieben → {os.path.relpath(OUT, ROOT)}", file=sys.stderr)
    print(f"Top-Kategorien: {dict(c)}", file=sys.stderr)
    print(f"Minuten mit Geschichtsbezug: {hist}", file=sys.stderr)


if __name__ == "__main__":
    main()
