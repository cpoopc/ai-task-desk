FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml ./
RUN pip install uv && uv sync --frozen

COPY src ./src

ENV PYTHONPATH=/app

CMD ["uv", "run", "uvicorn", "mission_control.main:app", "--host", "0.0.0.0", "--port", "8000"]