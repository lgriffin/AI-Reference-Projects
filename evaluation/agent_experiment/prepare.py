"""Build the workspaces for the agent experiment.

    python evaluation/agent_experiment/prepare.py <experiment-dir>

Each run gets an isolated copy of one reference implementation under an opaque id, in one of
three conditions that add the carriers of the standard one at a time:

    exemplar   source and behavioural tests only
    manifest   + AGENTS.md (given to the agent as its tool would inject it)
    enforced   + the executable architecture rules

The mapping from run id to (language, condition, model) is written NEXT TO the experiment
directory, not inside it, so that nothing an agent can see reveals its condition.
"""

from __future__ import annotations

import json
import random
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LANGUAGES = ["java", "python", "typescript"]
CONDITIONS = ["exemplar", "manifest", "enforced"]
MODELS = ["haiku", "sonnet"]
IGNORE = shutil.ignore_patterns(
    "node_modules", ".venv", "target", "__pycache__", ".pytest_cache", ".mypy_cache", "*.db", ".env",
    "CLAUDE.md", "README.md",
)

ARCHITECTURE = {
    "java": "src/test/java/com/example/taskboard/ArchitectureTest.java",
    "python": "tests/architecture",
    "typescript": "tests/architecture",
}

# Sentences of the manifest that refer to the executable rules; removed when the rules are absent.
RULE_SENTENCES = {
    "java": [
        " It is short on purpose:\nanything a test can check lives in `ArchitectureTest`, not here.",
        "One command compiles the code and runs the architecture rules (ArchUnit) and the unit,\nintegration and API tests.",
        " If an architecture test fails,\nchange the code, not the test.",
        "- Changing `ArchitectureTest` or this file.\n",
    ],
    "python": [
        " It is short on purpose:\nanything a test can check lives in `tests/architecture/`, not here.",
        "One command runs the type checker (`mypy --strict`), the architecture rules, and the unit,\nintegration and API tests.",
        " If an architecture test fails,\nchange the code, not the test.",
        "- Changing `tests/architecture/` or this file.\n",
    ],
    "typescript": [
        " It is short on\npurpose: anything a test can check lives in `tests/architecture/`, not here.",
        "One command runs the type checker (`tsc`, strict), the architecture rules, and the unit,\nintegration and API tests.",
        " If an architecture test fails,\nchange the code, not the test.",
        "- Changing `tests/architecture/` or this file.\n",
    ],
}
REPLACEMENT = {1: "One command runs the unit, integration and API tests."}


def manifest_without_rules(language: str, text: str) -> str:
    for index, sentence in enumerate(RULE_SENTENCES[language]):
        assert text.count(sentence) == 1, (language, sentence[:40])
        text = text.replace(sentence, REPLACEMENT.get(index, ""))
    return text


def main() -> None:
    experiment = Path(sys.argv[1]).resolve()
    random.seed(20260921)
    runs = [(l, c, m) for l in LANGUAGES for c in CONDITIONS for m in MODELS]
    ids = random.sample(range(100, 1000), len(runs))
    mapping = {}
    for run_id, (language, condition, model) in zip(ids, runs):
        name = f"w{run_id}"
        workspace = experiment / language / name
        shutil.copytree(ROOT / language, workspace, ignore=IGNORE)
        rules = workspace / ARCHITECTURE[language]
        manifest = workspace / "AGENTS.md"
        if condition != "enforced":
            shutil.rmtree(rules) if rules.is_dir() else rules.unlink()
            manifest.write_text(manifest_without_rules(language, manifest.read_text(encoding="utf-8")), encoding="utf-8", newline="\n")
        if condition == "exemplar":
            manifest.unlink()
        mapping[name] = {"language": language, "condition": condition, "model": model}
    (experiment.parent / f"{experiment.name}-mapping.json").write_text(json.dumps(mapping, indent=2), encoding="utf-8")
    print(f"{len(mapping)} workspaces prepared in {experiment}")


if __name__ == "__main__":
    main()
