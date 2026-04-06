#!/usr/bin/env sh
set -e

DB_STATE=$(python - <<'PY'
from sqlalchemy import inspect
from app import app, db

with app.app_context():
		tables = set(inspect(db.engine).get_table_names())
		if 'alembic_version' in tables:
				print('migrated')
		elif tables:
				print('legacy')
		else:
				print('fresh')
PY
)

if [ "$DB_STATE" = "migrated" ]; then
	python -m flask db upgrade
else
	python -m flask db stamp head
fi

exec python app.py