# Pilot agent experiment

Section 6.3 of the paper. Eighteen fresh coding agents implement the same feature request
([task.md](task.md)) in copies of the reference implementations that offer one, two or all three
carriers of the standard.

| Condition  | The agent's repository contains                                   |
| ---------- | ----------------------------------------------------------------- |
| `exemplar` | source and behavioural tests only                                 |
| `manifest` | + `AGENTS.md` (with its references to the executable rules removed) |
| `enforced` | + the executable architecture rules: the repository as published  |

3 languages x 3 conditions x 2 models (Claude Haiku 4.5, Claude Sonnet 5), one run per cell,
21 September 2026. `README.md` and `CLAUDE.md` are removed in every condition.

## Files

| File             | What it is                                                                     |
| ---------------- | ------------------------------------------------------------------------------ |
| `prepare.py`     | builds the 18 workspaces under opaque ids; writes the id-to-condition mapping *outside* them |
| `task.md`        | the feature request, identical for every agent                                 |
| `acceptance/`    | the hidden acceptance test (four cases), one per language; never shown to an agent |
| `audit.py`       | the scripted audit; joins the mapping only after every workspace is audited    |
| `runs.json`      | the audited result of every run, with its language, condition and model        |
| `usage.json`     | tokens, tool calls and seconds per run, as reported by the agent harness       |
| `diffs/`         | the complete change each agent made, as a patch against the baseline           |

## Protocol

Each agent was started with no memory, told to work only inside its workspace, given the task
and the command that runs the test suite, and told to make its own decisions. Agents in the
`manifest` and `enforced` conditions were additionally told that the repository has an
`AGENTS.md` which their tooling loads at the start of a session. Nothing else differed.

    python evaluation/agent_experiment/prepare.py <experiment-dir>
    # ... run one agent per workspace ...
    python evaluation/agent_experiment/audit.py <experiment-dir> <python-with-test-deps>

The measures in `audit.py` were fixed before any run was inspected. The script was debugged
against two completed workspaces (w146, w292) before the full audit was run; the audit leaves
each workspace exactly as the agent left it.

## Result in one paragraph

All 18 runs delivered a passing suite, passed all four hidden acceptance cases, and broke no
layer or capability rule. Two runs departed from the conventions, both by the smaller model in
the `exemplar` condition: `w991` (Java) logged the deletion inside the service instead of
publishing an event, and `w146` (Python) did not add the new operation to the in-memory test
double, which only the type checker in the full rule set notices. One run per cell: suggestive,
not significant.
