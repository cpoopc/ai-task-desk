import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from db.session import init_db, engine
from db.models import SQLModel


async def main():
    print("Initializing database...")

    await init_db()

    print("Database initialized successfully!")
    print(f"Database URL: {engine.url}")


if __name__ == "__main__":
    asyncio.run(main())
