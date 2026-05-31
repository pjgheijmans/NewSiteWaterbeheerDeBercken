---
name: db-reset
description: Wipe the database volume and start fresh. Use when you need a clean slate (e.g., schema changes to init.sql, corrupted state, or testing with seed data only).
disable-model-invocation: true
---

Warn the user: **this destroys all data in the running database volume.** Ask for confirmation before proceeding.

Once confirmed:

1. `docker compose down -v` — stops containers and removes the DB volume.
2. `docker compose up -d` — starts fresh; init.sql re-runs on startup and seeds default data.
3. `docker logs -f zwembad_web` — tail logs for ~15 seconds to confirm the DB retry loop succeeded and the server is listening.

Report when the server is up and confirm no errors appeared.
