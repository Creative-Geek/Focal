import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 375, "height": 667},  # Mobile viewport
        is_mobile=True,
        device_scale_factor=2,
    )
    page = context.new_page()

    try:
        # 1. Register a new user
        page.goto("http://localhost:3000/login")
        page.get_by_role("button", name="Register").click()

        email = f"testuser_{random_string(10)}@example.com"
        password = "password123"

        page.get_by_label("Email").fill(email)
        page.get_by_label("Password").fill(password)
        page.get_by_role("button", name="Create Account").click()

        # Wait for navigation to the home page
        expect(page).to_have_url(re.compile(r"/home"))

        # 2. Verify Settings Page
        page.goto("http://localhost:3000/settings")
        expect(page.get_by_role("heading", name="Settings")).to_be_visible()
        expect(page.get_by_label("API Key")).to_be_visible()
        expect(page.get_by_label("Currency")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/settings_page.png")

        # 3. Verify Dashboard Mobile Layout
        page.goto("http://localhost:3000/home")
        scan_button = page.get_by_role("button", name="Scan Receipt")
        upload_button = page.get_by_role("button", name="Upload Photo")
        manual_button = page.get_by_role("button", name="Manual Entry")

        expect(scan_button).to_be_visible()
        expect(upload_button).to_be_visible()
        expect(manual_button).to_be_visible()

        page.screenshot(path="jules-scratch/verification/dashboard_mobile_layout.png")

        # 4. Verify Expense Drawer Confirmation
        manual_button.click()

        # Make a change to the form
        page.get_by_label("Merchant").fill("Test Merchant")

        # Try to close the drawer
        page.get_by_role("button", name="Cancel").click()

        # Check for confirmation dialog
        expect(page.get_by_role("heading", name="You have unsaved changes")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/expense_drawer_confirmation.png")

        # Discard changes
        page.get_by_role("button", name="Discard Changes").click()
        expect(page.get_by_role("heading", name="You have unsaved changes")).not_to_be_visible()

    finally:
        context.close()
        browser.close()

def random_string(length):
    import random
    import string
    return ''.join(random.choice(string.ascii_lowercase) for i in range(length))

with sync_playwright() as playwright:
    run(playwright)