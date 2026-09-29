# Evaluation

Everything Section 6 of the paper reports can be regenerated from here. Each implementation
must first be installed (see its README) so that its verify command runs.

| Script               | Produces        | Paper                                   |
| -------------------- | --------------- | --------------------------------------- |
| `measure.py`         | `metrics.json`  | Table 4 (size of the implementations)   |
| `seed_violations.py` | `results.json`  | Table 5 (violation seeding)             |
| [`agent_experiment/`](agent_experiment/) | `runs.json`, `diffs/` | Table 6 (pilot agent experiment) |

    python evaluation/measure.py
    python evaluation/measure.py <other-checkout>    # e.g. the first iteration, for comparison
    python evaluation/seed_violations.py             # all three; roughly ten minutes
    python evaluation/seed_violations.py python      # one implementation

`seed_violations.py` plants one mistake at a time, runs the implementation's single verify
command, records the strongest mechanism that objected (compiler, architecture test, requirement
check, behavioural test, or nothing), and restores the file. It refuses to start unless the
implementation is green, and asserts that it is green again when it finishes. The fourteen
violations (twelve structural, V13 and V14 in the trace between `REQUIREMENTS.md` and the
scenarios) and their per-language patches are defined at the top of the script.

The first paper reports the repository at commit `8c4a74a`. Its size and seeding results are kept
as `metrics-8c4a74a.json` and `results-8c4a74a.json`; `metrics.json` and `results.json` describe
the current repository. The pilot agent experiment was run against `8c4a74a` and has not been
repeated since.

## A note on the first run

The first run (Python and TypeScript, 21 September 2026) left V9, *the test double drifts from
the real repository*, undetected. The seeded double sorted tasks by title; the contract test
created tasks titled First, Second, Third, whose alphabetical order equals their creation
order, so the test could not fail. The fixture was changed to Write, Review, Publish in all
three implementations, and `results.json` records the run after that correction. The paper
reports the episode.

## A note on the second run

The first paper's run left two violations uncaught in every language: V8, *a side effect inlined
in the service*, and V10, *a business rule placed in the route*. Both preserve behaviour, so no
behavioural test can see them. The Assertion Ladder work (29 September 2026) added two structural
rules: logging and notification belong to the events layer, and routes make no decisions (in
Java, controllers construct no domain errors). It also added the requirement check and V13 and
V14 to exercise it, and gave every rule a failure message that names the fix. The second run
catches 42 of 42 seeded mistakes. The new routes rule also catches V7 in Python and TypeScript,
which a behavioural test caught before.
