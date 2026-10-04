"""Every Makefile target also runs as: python -m crux_lab.cli <cmd>."""
from __future__ import annotations

import argparse
import asyncio
import logging
import subprocess
import sys

from crux_lab.config import ROOT


def _providers(a):
    from crux_lab.llm.resolve import main
    main()


def _corpus(a):
    from crux_lab.corpus.build import main
    main(skip_fulltext=a.skip_fulltext)


def _map(a):
    from crux_lab.graph.build import main
    asyncio.run(main(targets_only=a.targets_only))


def _run(a):
    from crux_lab.lab.run import main
    asyncio.run(main(a.target))


def _runs(a):
    from crux_lab.lab.run import main_all
    asyncio.run(main_all())


def _export(a):
    from crux_lab.export import main
    main()


def _eval(a):
    from crux_lab.eval.run_all import main
    asyncio.run(main(only=a.only))


def _check(a):
    rc = subprocess.call([sys.executable, "-m", "pytest", "-q", "-m", "not network"], cwd=ROOT)
    if rc == 0 and (ROOT / "web" / "package.json").exists():
        rc = subprocess.call(["npm", "run", "-s", "typecheck"], cwd=ROOT / "web")
    sys.exit(rc)


def _demo(a):
    web = ROOT / "web"
    subprocess.check_call(["npm", "run", "build"], cwd=web)
    subprocess.call(["npm", "run", "preview"], cwd=web)


def _demo_video(a):
    subprocess.check_call(["npx", "playwright", "test", "demo.spec.ts"], cwd=ROOT / "web")


def _serve(a):
    import uvicorn
    uvicorn.run("crux_lab.api.server:app", host="127.0.0.1", port=a.port)


def main(argv=None):
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    p = argparse.ArgumentParser(prog="crux_lab")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("providers").set_defaults(f=_providers)
    c = sub.add_parser("corpus")
    c.add_argument("--skip-fulltext", action="store_true")
    c.set_defaults(f=_corpus)
    m = sub.add_parser("map")
    m.add_argument("--targets-only", action="store_true")
    m.set_defaults(f=_map)
    r = sub.add_parser("run")
    r.add_argument("target")
    r.set_defaults(f=_run)
    sub.add_parser("runs").set_defaults(f=_runs)
    sub.add_parser("export").set_defaults(f=_export)
    e = sub.add_parser("eval")
    e.add_argument("--only", default="")
    e.set_defaults(f=_eval)
    sub.add_parser("check").set_defaults(f=_check)
    sub.add_parser("demo").set_defaults(f=_demo)
    sub.add_parser("demo-video").set_defaults(f=_demo_video)
    s = sub.add_parser("serve")
    s.add_argument("--port", type=int, default=8765)
    s.set_defaults(f=_serve)
    a = p.parse_args(argv)
    a.f(a)


if __name__ == "__main__":
    main()
