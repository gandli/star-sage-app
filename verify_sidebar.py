from playwright.sync_api import sync_playwright
import os

def verify_sidebar():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        # Go to app
        print("Navigating to http://localhost:5173/ ...")
        page.goto("http://localhost:5173/")

        # Wait for load
        try:
            page.wait_for_load_state("networkidle", timeout=5000)
        except:
            print("Network idle timeout, continuing...")

        # Wait for sidebar with short timeout to catch errors early
        try:
            page.wait_for_selector("aside", timeout=5000)
        except:
            print("Sidebar 'aside' not found in 5s.")
            print("Body content:")
            print(page.inner_html("body"))

        # Check for buttons
        # Data Overview
        print("Checking for Data Overview button...")
        data_overview = page.get_by_role("button", name="Data Overview")

        if data_overview.count() > 0 and data_overview.first.is_visible():
            print("✅ Data Overview button found and visible")
            data_overview.first.focus()
        else:
            print("❌ Data Overview button NOT found or not visible")

        # Starred List
        starred_list = page.get_by_role("button", name="Starred List")
        if starred_list.count() > 0 and starred_list.first.is_visible():
            print("✅ Starred List button found and visible")
        else:
             print("❌ Starred List button NOT found or not visible")

        # Take screenshot
        os.makedirs("/home/jules/verification", exist_ok=True)
        page.screenshot(path="/home/jules/verification/sidebar.png")
        print("📸 Screenshot taken at /home/jules/verification/sidebar.png")

        browser.close()

if __name__ == "__main__":
    try:
        verify_sidebar()
    except Exception as e:
        print(f"Error: {e}")
