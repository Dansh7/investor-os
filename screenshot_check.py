"""Take screenshots of the dashboard for Polish Pass validation."""
import os
from playwright.sync_api import sync_playwright

OUT = r"C:\Projects\investor-os\screenshots"
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    print("Navigating to http://localhost:3000 ...")
    page.goto("http://localhost:3000", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(2000)

    # Full page screenshot
    page.screenshot(path=os.path.join(OUT, "01_full.png"), full_page=True)
    print("01_full.png saved")

    # MacroStrip (top bar)
    strip = page.locator("div").filter(has_text="PULSE").first
    try:
        strip.screenshot(path=os.path.join(OUT, "02_macro_strip.png"))
        print("02_macro_strip.png saved")
    except Exception as e:
        print(f"strip screenshot failed: {e}")

    # Above fold (viewport)
    page.screenshot(path=os.path.join(OUT, "03_above_fold.png"))
    print("03_above_fold.png saved")

    # Scroll to holdings table
    page.evaluate("window.scrollTo(0, 300)")
    page.wait_for_timeout(500)
    page.screenshot(path=os.path.join(OUT, "04_holdings.png"))
    print("04_holdings.png saved")

    # Scroll to attention queue
    page.evaluate("window.scrollTo(0, 900)")
    page.wait_for_timeout(500)
    page.screenshot(path=os.path.join(OUT, "05_attention_queue.png"))
    print("05_attention_queue.png saved")

    # Scroll to tabs
    page.evaluate("window.scrollBy(0, 600)")
    page.wait_for_timeout(500)
    page.screenshot(path=os.path.join(OUT, "06_tabs.png"))
    print("06_tabs.png saved")

    browser.close()
    print("\nAll screenshots saved to", OUT)
