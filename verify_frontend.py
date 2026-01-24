from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        try:
            print("Navigating to app...")
            page.goto("http://localhost:4173/")

            page.wait_for_load_state("networkidle")

            # Wait specifically for the title "StarSage" or h1
            try:
                page.wait_for_selector("h1", timeout=5000)
                print("Found h1 element.")
            except:
                print("Could not find h1 element.")

            print("Taking screenshot...")
            page.screenshot(path="verification.png")
            print("Screenshot saved to verification.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
