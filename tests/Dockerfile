
FROM python:3.11-slim

WORKDIR /tests

RUN pip install --no-cache-dir selenium

COPY test_ui.py .

CMD ["python", "test_ui.py"]
