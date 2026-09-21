# Evaluation

Everything Section 6 of the paper reports can be regenerated from here. Each implementation
must first be installed (see its README) so that its verify command runs.

| Script               | Produces        | Paper                                   |
| -------------------- | --------------- | --------------------------------------- |
| `measure.py`         | `metrics.json`  | Table 4 (size of the implementations)   |
| `seed_violations.py` | `results.json`  | Table 5 (violation seeding)             |

    python evaluation/measure.py
    python evaluation/measure.py <other-checkout>    # e.g. the first iteration, for comparison
    python evaluation/seed_violations.py             # all three; roughly ten minutes
    python evaluation/seed_violations.py python      # one implementation

`seed_violations.py` plants one structural mistake at a time, runs the implementation's single
verify command, records the strongest mechanism that objected (compiler, architecture test,
behavioural test, or nothing), and restores the file. It refuses to start unless the
implementation is green, and asserts that it is green again when it finishes. The twelve
violations and their per-language patches are defined at the top of the script.

## A note on the first run

The first run (Python and TypeScript, 21 September 2026) left V9, *the test double drifts from
the real repository*, undetected. The seeded double sorted tasks by title; the contract test
created tasks titled First, Second, Third, whose alphabetical order equals their creation
order, so the test could not fail. The fixture was changed to Write, Review, Publish in all
three implementations, and `results.json` records the run after that correction. The paper
reports the episode.
