from crux_lab.corpus.dedup import work_ids, work_key


def test_versions_merge_but_shared_titles_by_different_authors_do_not():
    corpus = [
        {"id": "a", "title": "Divine Hiddenness", "authors": ["Jane Doe"]},
        {"id": "b", "title": "Divine  hiddenness.", "authors": ["J. Doe"]},
        {"id": "c", "title": "Divine Hiddenness", "authors": ["Max Roe"]},
    ]
    w = work_ids(corpus)
    assert w == {"a": "a", "b": "a", "c": "c"}
    assert work_key(corpus[0]) == "divine hiddenness|doe"
