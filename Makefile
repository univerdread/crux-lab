PY := .venv/bin/python
TARGET ?=

.PHONY: setup check providers corpus map run runs export eval demo demo-video smoke serve docs databricks

setup:
	@test -d .venv || (command -v uv >/dev/null && uv venv --python 3.11 .venv || python3.11 -m venv .venv)
	@if command -v uv >/dev/null; then uv pip install --python $(PY) -q -r requirements.txt; else $(PY) -m pip install -q -r requirements.txt; fi
	@-if command -v uv >/dev/null; then uv pip install --python $(PY) -q -r requirements-embed.txt; else $(PY) -m pip install -q -r requirements-embed.txt; fi
	@test -f .env || cp .env.example .env
	@if [ -f web/package.json ]; then cd web && npm install --silent; fi

check:
	$(PY) -m pytest -q -m "not network"
	@if [ -f web/package.json ]; then cd web && npm run -s typecheck; fi

providers:
	$(PY) -m crux_lab.cli providers

corpus:
	$(PY) -m crux_lab.cli corpus

map:
	$(PY) -m crux_lab.cli map

run:
	$(PY) -m crux_lab.cli run $(TARGET)

runs:
	$(PY) -m crux_lab.cli runs

export:
	$(PY) -m crux_lab.cli export

eval:
	$(PY) -m crux_lab.cli eval

demo: export
	cd web && npm run build && npm run preview

# Playwright needs a Chromium; set PW_CHROMIUM=<path to a chrome binary> to reuse one already on disk.
smoke:
	cd web && npm run build && npx playwright test --project=smoke --project=a11y

demo-video:
	cd web && npm run build && npx playwright test --project=demo

serve:
	$(PY) -m crux_lab.cli serve

docs: export
	$(PY) scripts/make_demo_md.py
	$(PY) scripts/readme_results.py
	PYTHONPATH=. $(PY) scripts/audit.py
	$(PY) scripts/make_submission_md.py

databricks:
	$(PY) -m crux_lab.databricks_sync
