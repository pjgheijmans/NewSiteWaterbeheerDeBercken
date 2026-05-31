---
name: restart-dev
description: Restart the Docker web container after backend changes and tail the logs to confirm startup. Use after editing any file in backend/.
disable-model-invocation: true
---

Run the following commands to restart the web container and confirm it started cleanly:

1. `docker compose restart web`
2. `docker logs -f zwembad_web` — stream logs for ~10 seconds, then stop (Ctrl+C).

Report whether the server printed "Server running on port 3000" (or similar) and whether any errors appeared during startup.
