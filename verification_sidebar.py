from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_sidebar(page: Page):
    # 1. Go to the app
    page.goto("http://localhost:5173")

    # Wait for hydration/load
    page.wait_for_timeout(2000)

    # 2. Check for buttons
    # "Data Overview" should be a button now
    overview_btn = page.get_by_role("button", name="Data Overview")
    expect(overview_btn).to_be_visible()

    # "Starred List" should be a button
    list_btn = page.get_by_role("button", name="Starred List")
    expect(list_btn).to_be_visible()

    # "All repositories" button
    # When expanded, the button contains "All" text.
    all_btn = page.get_by_role("button").filter(has_text="All").first
    expect(all_btn).to_be_visible()

    # 3. Focus on "Starred List" to verify it's focusable
    list_btn.focus()

    # 4. Take screenshot
    page.screenshot(path="/home/jules/verification/sidebar_verification.png")
    print("Screenshot taken at /home/jules/verification/sidebar_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Set viewport to desktop to ensure sidebar is expanded
        page.set_viewport_size({"width": 1280, "height": 720})
        try:
            verify_sidebar(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
