#!/usr/bin/env python3
"""The land of «Карта открытий» (src/components/map/land.json) from Natural Earth (public domain,
naturalearthdata.com): ne_50m_land and the large lakes of ne_50m_lakes, in Web Mercator.

    python3 scripts/make-land.py /path/to/dir/with/ne_50m_land.geojson+ne_50m_lakes.geojson

World coordinates: x = (lon + 180) / 360 * 1000, y = 500 - 1000 / (2 pi) * ln(tan(pi / 4 + lat / 2)); stored as
integers of hundredths. Outlines are simplified (Douglas-Peucker): finer in Europe, where most markers stand and
the reader zooms in, coarser elsewhere; specks of islands are dropped; Antarctica is left out (below 60 S).
"""
import json
import math
import sys
from pathlib import Path

SRC = Path(sys.argv[1])
OUT = Path(__file__).resolve().parent.parent / 'src/components/map/land.json'


def fine(lon, lat):
    return -25 <= lon <= 62 and 28 <= lat <= 72


def project(lon, lat):
    lat = max(min(lat, 84.0), -84.0)
    x = (lon + 180.0) / 360.0 * 1000.0
    y = 500.0 - 1000.0 / (2 * math.pi) * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    return x, y


def simplify(pts, tol):
    """Douglas-Peucker on a closed ring (the first point is kept as both ends)."""
    if len(pts) < 5:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]
        bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        d2 = dx * dx + dy * dy
        worst, at = 0.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if d2 == 0:
                dist = math.hypot(px - ax, py - ay)
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / d2))
                dist = math.hypot(px - ax - t * dx, py - ay - t * dy)
            if dist > worst:
                worst, at = dist, i
        if worst > tol and at > 0:
            keep[at] = True
            stack.append((a, at))
            stack.append((at, b))
    return [p for p, k in zip(pts, keep) if k]


def rings_of(file, min_span_fine, min_span_coarse):
    out = []
    for ft in json.load(open(SRC / file))['features']:
        g = ft['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            for ring in poly:
                lons = [p[0] for p in ring]
                lats = [p[1] for p in ring]
                if max(lats) < -60:
                    continue
                cx, cy = sum(lons) / len(lons), sum(lats) / len(lats)
                is_fine = fine(cx, cy) or (min(lons) < 62 and max(lons) > -25 and min(lats) < 72 and max(lats) > 28)
                span = math.hypot(max(lons) - min(lons), max(lats) - min(lats))
                if span < (min_span_fine if is_fine else min_span_coarse):
                    continue
                pts = [(p[0], max(p[1], -60.0)) for p in ring]
                pts = simplify(pts, 0.018 if is_fine else 0.07)
                if len(pts) < 4:
                    continue
                flat = []
                for lon, lat in pts:
                    x, y = project(lon, lat)
                    flat += [round(x * 100), round(y * 100)]
                out.append(flat)
    return out


land = rings_of('ne_50m_land.geojson', 0.12, 0.45)
lakes = rings_of('ne_50m_lakes.geojson', 0.9, 2.2)
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({'land': land, 'lakes': lakes}, separators=(',', ':')))
n = lambda rs: sum(len(r) // 2 for r in rs)
print(f'land: {len(land)} rings, {n(land)} points; lakes: {len(lakes)} rings, {n(lakes)} points; {OUT.stat().st_size / 1024:.0f} KB')
