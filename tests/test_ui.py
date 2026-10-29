
import os
import time
import urllib.request

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

APP_URL = os.getenv("APP_URL", "http://frontend:3000")
SELENIUM_URL = os.getenv(
    "SELENIUM_URL", "http://selenium:4444"
)


def wait_for_app():
    for attempt in range(60):
        try:
            urllib.request.urlopen(APP_URL, timeout=3)
            return
        except Exception:
            time.sleep(2)

    raise RuntimeError("Frontend did not start in time")


def test_homepage():
    wait_for_app()

    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Remote(
        command_executor=SELENIUM_URL,
        options=options
    )

    try:
        driver.get(APP_URL)

        assert driver.title, "Page title is empty"

        body_text = driver.find_element(
            By.TAG_NAME, "body"
        ).text

        assert body_text.strip(), "Page body is empty"

        print("TC_01 PASSED: Homepage loaded successfully")
        print("Page title:", driver.title)

    finally:
        driver.quit()


if __name__ == "__main__":
    test_homepage()
