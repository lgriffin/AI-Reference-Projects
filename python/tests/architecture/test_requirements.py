"""Requirements: every rule in REQUIREMENTS.md has a scenario, and every scenario cites a rule."""

import ast
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).parents[2]
TESTS = ROOT / "tests"
ID = re.compile(r"\bR-[A-Z]+-\d+\b")

# Scenarios describe the board's behaviour; the contract and architecture tests check machinery.
SCENARIOS = [path for folder in ("unit", "api") for path in sorted((TESTS / folder).glob("test_*.py"))]


def scenario_docstrings(path: Path) -> dict[str, str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    return {
        node.name: ast.get_docstring(node) or ""
        for node in tree.body
        if isinstance(node, ast.FunctionDef) and node.name.startswith("test_")
    }


def test_every_requirement_has_a_scenario_and_every_citation_is_a_requirement() -> None:
    required = set(ID.findall((ROOT / "REQUIREMENTS.md").read_text(encoding="utf-8")))
    cited = {
        found
        for folder in ("unit", "api", "integration")
        for path in (TESTS / folder).glob("test_*.py")
        for found in ID.findall(path.read_text(encoding="utf-8"))
    }
    assert not required - cited, (
        f"{sorted(required - cited)} have no scenario. Add a test whose docstring opens with the id."
    )
    assert not cited - required, (
        f"{sorted(cited - required)} are cited by tests but not stated in REQUIREMENTS.md. State the rule first."
    )


@pytest.mark.parametrize("path", SCENARIOS, ids=lambda path: path.relative_to(TESTS).as_posix())
def test_every_scenario_cites_a_requirement(path: Path) -> None:
    uncited = sorted(name for name, doc in scenario_docstrings(path).items() if not ID.match(doc))
    assert not uncited, (
        f"{uncited} cite no requirement. Open each docstring with the ids it covers, "
        "then given / when / then, e.g. 'R-WIP-1: given a full board, when ..., then ...'."
    )
