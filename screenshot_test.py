from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://localhost:3000")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    page.screenshot(path="C:/Projects/investor-os/screenshot_homepage.png", full_page=True)
    print("Screenshot saved")

    # Also capture the page HTML for text analysis
    content = page.content()
    # Extract visible text
    text = page.evaluate("() => document.body.innerText")
    print("=== VISIBLE TEXT ===")
    print(text[:3000])
    browser.close()
