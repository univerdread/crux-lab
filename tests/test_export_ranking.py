from crux_lab.export import rank_directions


def b(id_, run, survival, novelty):
    return {"id": id_, "run_id": run, "survival": survival, "novelty": novelty}


def test_round_robin_across_runs_best_first():
    briefs = [b("a1", "A", 0.8, 0.9), b("a2", "A", 0.8, 0.85), b("a3", "A", 0.8, 0.8),
              b("b1", "B", 0.8, 0.5), b("c1", "C", 0.3, 0.9)]
    out = rank_directions(briefs)
    assert [x["id"] for x in out] == ["a1", "b1", "c1", "a2", "a3"]
    assert [x["tier"] for x in out] == [0, 0, 0, 1, 2]
    assert out[0]["score"] == 0.72 and out[2]["score"] == 0.27


def test_empty():
    assert rank_directions([]) == []
