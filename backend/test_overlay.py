import time, requests, json
time.sleep(3)
try:
    r = requests.post(
        "http://localhost:8000/overlay/analyze",
        json={
            "slide_text": "Photosynthesis converts sunlight to chemical energy stored in glucose",
            "transcript": "I want to talk about football and sports championships"
        },
        timeout=20
    )
    print(json.dumps(r.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
