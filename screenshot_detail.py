import sys
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://localhost:3000")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    # Full page screenshot
    page.screenshot(path="C:/Projects/investor-os/ss_full.png", full_page=True)

    # Hero section crop
    page.screenshot(path="C:/Projects/investor-os/ss_hero.png", clip={"x": 0, "y": 0, "width": 1440, "height": 220})

    # MacroStrip crop
    page.screenshot(path="C:/Projects/investor-os/ss_macro.png", clip={"x": 0, "y": 215, "width": 1440, "height": 80})

    # 2-column section (holdings + attention)
    page.screenshot(path="C:/Projects/investor-os/ss_2col.png", clip={"x": 0, "y": 300, "width": 1440, "height": 500})

    # Critical Today (right column)
    page.screenshot(path="C:/Projects/investor-os/ss_attention.png", clip={"x": 860, "y": 300, "width": 580, "height": 500})

    # Extract text for validation
    hero_el = page.query_selector("p[style*='font-size: 72px'], p[style*='fontSize: 72px']")
    print("Hero element found:", hero_el is not None)

    # Get all visible Hebrew text
    text = page.evaluate("""() => {
        const all = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
            const t = node.textContent.trim();
            if (t && /[א-ת]/.test(t)) all.push(t);
        }
        return all.slice(0, 50);
    }""")
    print("Hebrew text found:")
    for t in text:
        print(" -", t.encode('utf-8').decode('utf-8'))

    browser.close()
    print("Done")
