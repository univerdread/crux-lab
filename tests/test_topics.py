import os
import subprocess
import sys

from crux_lab import config


def test_default_topic_keeps_original_paths():
    assert config.DEFAULT_TOPIC == "divine-hiddenness"
    p = config.topic_paths("divine-hiddenness")
    assert p["corpus"] == config.ROOT / "data" / "corpus.jsonl"
    assert p["web"] == config.ROOT / "web" / "public" / "data"
    assert p["results"] == config.ROOT / "results"


def test_other_topic_gets_its_own_dirs():
    p = config.topic_paths("fine-tuning")
    assert p["corpus"] == config.ROOT / "data" / "topics" / "fine-tuning" / "corpus.jsonl"
    assert p["web"] == config.ROOT / "web" / "public" / "data" / "topics" / "fine-tuning"
    assert p["index"] == config.ROOT / "cache" / "index" / "fine-tuning"


def test_every_topic_config_is_complete():
    for slug, t in config.TOPICS.items():
        for key in ("slug", "name", "description", "area", "queries", "fresh_queries", "relevant",
                    "relevance_levels", "schools"):
            assert t.get(key), (slug, key)
        assert len(t["relevance_levels"]) == 4 and len(t["schools"]) >= 2


def test_hiddenness_queries_unchanged():
    from crux_lab.corpus import openalex
    assert openalex.QUERIES == ["divine hiddenness", "nonresistant nonbelief", "divine silence", "hiddenness of God",
                                "skeptical theism hiddenness", "Schellenberg hiddenness argument"]
    assert openalex.SEARCH_STRINGS["divine hiddenness"] == '"divine hiddenness"'


def test_topic_env_switches_queries_and_schools():
    code = ("from crux_lab.corpus import openalex; from crux_lab.lab import generators; "
            "print(openalex.QUERIES[0]); print(generators.SCHOOLS[0])")
    env = {**os.environ, "CRUX_LAB_TOPIC": "fine-tuning"}
    out = subprocess.run([sys.executable, "-c", code], env=env, capture_output=True, text=True, check=True).stdout
    assert out.splitlines() == ["fine-tuning argument", "Bayesian confirmation theory"]
