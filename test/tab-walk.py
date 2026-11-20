#!/usr/bin/env python3
"""ScoutScope tab-walk regression test (Playwright, sync API).

Serves the app locally, then for every team x map filter clicks all six
tabs and fails on ANY pageerror or console error.

Usage:
    ~/workspace/.venvs/playwright/bin/python test/tab-walk.py [--port 8322]

Exit 0 = all 2 teams x 2 maps x 6 tabs rendered with zero JS errors.
"""
import subprocess
import sys
import time
import urllib.request

sys.path.insert(0, "/home/hatch/workspace/.venvs/playwright/lib/python3.12/site-packages")
from playwright.sync_api import sync_playwright

PORT = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 8322
URL = f"http://localhost:{PORT}/index.html"
TEAMS = ["C9", "FUR"]  # select values (labels: Cloud9, FURIA)
MAPS = ["Bind", "Haven"]
TABS = ["Overview", "Utility Heatmap", "Operator Profiler", "Anti-Strat", "Planner", "Data & Evidence"]

srv = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(PORT)],
    cwd="/home/hatch/workspace/hackathons/cloud9-jetbrains-2026",
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
try:
    for _ in range(30):
        try:
            urllib.request.urlopen(URL, timeout=2)
            break
        except Exception:
            time.sleep(0.5)
    errors = []
    combos = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.goto(URL, wait_until="networkidle")
        page.wait_for_timeout(800)
        for team in TEAMS:
            page.locator("#f-team").select_option(value=team)
            page.wait_for_timeout(300)
            for map_name in MAPS:
                page.locator("#f-map").select_option(label=map_name)
                page.wait_for_timeout(300)
                for tab in TABS:
                    page.get_by_text(tab, exact=True).first.click()
                    page.wait_for_timeout(400)
                    combos += 1
        browser.close()
    print(f"tab renders attempted: {combos} (2 teams x 2 maps x 6 tabs)")
    if errors:
        print(f"FAIL — {len(errors)} JS error(s):")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    print("PASS — zero JS errors on every tab under every filter")
finally:
    srv.terminate()
