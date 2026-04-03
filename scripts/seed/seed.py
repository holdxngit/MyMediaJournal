#!/usr/bin/env python3
"""
Fallback seed script for environments without Go.
Requires: psycopg (already in backend/requirements.txt)

Run from project root:
    python scripts/seed/seed.py

Or via the backend venv directly:
    backend/venv/bin/python scripts/seed/seed.py
"""

import json
import os
import sys

try:
    import psycopg
except ImportError:
    print("psycopg not found. Activate the backend venv first:")
    print("  source backend/venv/bin/activate")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

SEED_FILE = os.path.join(os.path.dirname(__file__), "seed.json")
ENV_FILE = os.path.join(os.path.dirname(__file__), "../../backend/.env")

if load_dotenv:
    load_dotenv(ENV_FILE)

db_url = os.getenv("DATABASE_URL", "postgresql+psycopg://mmj_user:mmj_password@localhost:5432/mymediajournal")
db_url = db_url.replace("postgresql+psycopg://", "postgresql://")

with open(SEED_FILE) as f:
    seed = json.load(f)

with psycopg.connect(db_url) as conn:
    with conn.cursor() as cur:

        for u in seed["users"]:
            cur.execute(
                'INSERT INTO "user" (user_id, email) VALUES (%s, %s) ON CONFLICT DO NOTHING',
                (u["user_id"], u["email"]),
            )
        print(f"✓ {len(seed['users'])} users")

        for g in seed["genres"]:
            cur.execute(
                "INSERT INTO genre (genre_id, title) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (g["genre_id"], g["title"]),
            )
        print(f"✓ {len(seed['genres'])} genres")

        for s in seed["sources"]:
            cur.execute(
                "INSERT INTO source (source_id, title) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (s["source_id"], s["title"]),
            )
        print(f"✓ {len(seed['sources'])} sources")

        for m in seed["media_items"]:
            cur.execute(
                "INSERT INTO media_item (media_id, title, media_type) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                (m["media_id"], m["title"], m["media_type"]),
            )
        print(f"✓ {len(seed['media_items'])} media items")

        for fr in seed["friendships"]:
            cur.execute(
                "INSERT INTO friendship (friend_id, user_id, date_friended) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                (fr["friend_id"], fr["user_id"], fr["date_friended"]),
            )
        print(f"✓ {len(seed['friendships'])} friendships")

        for mg in seed["media_item_genres"]:
            cur.execute(
                "INSERT INTO media_item_genre (media_id, genre_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (mg["media_id"], mg["genre_id"]),
            )
        print(f"✓ {len(seed['media_item_genres'])} media item genres")

        for ms in seed["media_item_sources"]:
            cur.execute(
                "INSERT INTO media_item_source (media_id, source_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (ms["media_id"], ms["source_id"]),
            )
        print(f"✓ {len(seed['media_item_sources'])} media item sources")

        for gs in seed["genre_similarities"]:
            cur.execute(
                "INSERT INTO genre_similarity (genre_id_1, genre_id_2) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (gs["genre_id_1"], gs["genre_id_2"]),
            )
        print(f"✓ {len(seed['genre_similarities'])} genre similarities")

        for cl in seed["consumption_logs"]:
            cur.execute(
                """INSERT INTO consumption_log (log_id, user_id, media_id, date_consumed, time_consumed)
                   VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING""",
                (cl["log_id"], cl["user_id"], cl["media_id"], cl["date_consumed"], cl["time_consumed"]),
            )
        print(f"✓ {len(seed['consumption_logs'])} consumption logs")

        for g in seed["goals"]:
            cur.execute(
                """INSERT INTO goal (goal_id, user_id, genre_id, title, media_type, quantity, start_date)
                   VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING""",
                (g["goal_id"], g["user_id"], g.get("genre_id"), g["title"], g.get("media_type"), g["quantity"], g["start_date"]),
            )
        print(f"✓ {len(seed['goals'])} goals")

        for wr in seed["wrapped_reports"]:
            cur.execute(
                """INSERT INTO wrapped_report (report_id, user_id, most_used_media, goal)
                   VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING""",
                (wr["report_id"], wr["user_id"], wr.get("most_used_media"), wr.get("goal")),
            )
        print(f"✓ {len(seed['wrapped_reports'])} wrapped reports")

        # Reset sequences
        sequences = [
            ('SELECT setval(pg_get_serial_sequence(\'\"user\"\', \'user_id\'), COALESCE(MAX(user_id), 1)) FROM "user"',),
            ("SELECT setval(pg_get_serial_sequence('genre', 'genre_id'), COALESCE(MAX(genre_id), 1)) FROM genre",),
            ("SELECT setval(pg_get_serial_sequence('source', 'source_id'), COALESCE(MAX(source_id), 1)) FROM source",),
            ("SELECT setval(pg_get_serial_sequence('media_item', 'media_id'), COALESCE(MAX(media_id), 1)) FROM media_item",),
            ("SELECT setval(pg_get_serial_sequence('consumption_log', 'log_id'), COALESCE(MAX(log_id), 1)) FROM consumption_log",),
            ("SELECT setval(pg_get_serial_sequence('goal', 'goal_id'), COALESCE(MAX(goal_id), 1)) FROM goal",),
            ("SELECT setval(pg_get_serial_sequence('wrapped_report', 'report_id'), COALESCE(MAX(report_id), 1)) FROM wrapped_report",),
        ]
        for (q,) in sequences:
            try:
                cur.execute(q)
            except Exception as e:
                print(f"warning: sequence reset failed: {e}")

    conn.commit()

print("\nSeeding complete!")
