"""Architecture: the rules of AGENTS.md, executable. If one fails, fix the code, not the test.

Each failure message names the rule, the offender and the fix.
"""

import ast
import sys
from pathlib import Path

import mypy.api
import pytest

from taskboard.api.error_handlers import STATUS_BY_ERROR
from taskboard.domain import errors

ROOT = Path(__file__).parents[2]
SRC = ROOT / "src" / "taskboard"

# Each layer, and the only layers it may import. app.py, the composition root, may import all.
ALLOWED_IMPORTS: dict[str, set[str]] = {
    "domain": set(),
    "config": set(),
    "events": {"domain"},
    "repositories": {"domain"},
    "services": {"domain", "events", "repositories"},
    "api": {"domain", "services"},
}

# Ambient capabilities, and the one layer that may touch each.
RESERVED: dict[str, str] = {
    "os": "config",
    "pydantic_settings": "config",
    "sqlite3": "repositories",
    "fastapi": "api",
    "logging": "events",  # side effects (logs, mail, audit) belong to event handlers
}

# Nodes that make a decision. Routes translate between HTTP and a service call; they decide nothing.
DECISIONS = (ast.If, ast.IfExp, ast.For, ast.While, ast.comprehension, ast.Raise, ast.Try, ast.Match)

MODULES = [p for p in SRC.rglob("*.py") if p.name not in ("app.py", "__init__.py")]


def name_of(path: Path) -> str:
    return path.relative_to(SRC).as_posix()


def layer_of(path: Path) -> str:
    return path.relative_to(SRC).parts[0].removesuffix(".py")


def imports_of(path: Path) -> set[str]:
    nodes = list(ast.walk(ast.parse(path.read_text(encoding="utf-8"))))
    plain = {alias.name for n in nodes if isinstance(n, ast.Import) for alias in n.names}
    return plain | {n.module for n in nodes if isinstance(n, ast.ImportFrom) and n.module}


@pytest.mark.parametrize("path", MODULES, ids=name_of)
def test_layers_only_import_downwards(path: Path) -> None:
    layer = layer_of(path)
    imported = {name.split(".")[1] for name in imports_of(path) if name.startswith("taskboard.")}
    illegal = imported - {layer} - ALLOWED_IMPORTS[layer]
    assert not illegal, (
        f"{name_of(path)} imports {sorted(illegal)}, but {layer} may import only {sorted(ALLOWED_IMPORTS[layer])}. "
        "Move the code to a layer that may import it (AGENTS.md, 'Where things go')."
    )


@pytest.mark.parametrize("path", MODULES, ids=name_of)
def test_ambient_capabilities_stay_in_their_layer(path: Path) -> None:
    used = {name.split(".")[0] for name in imports_of(path)}
    misplaced = {module: RESERVED[module] for module in used & RESERVED.keys() if RESERVED[module] != layer_of(path)}
    assert not misplaced, (
        f"{name_of(path)} uses {sorted(misplaced)}; each may be used only in {misplaced}. "
        "Move that work into the owning layer and call it through a constructor argument or a domain event."
    )


def test_the_domain_is_free_of_frameworks() -> None:
    domain = [path for path in MODULES if layer_of(path) == "domain"]
    imported = {name.split(".")[0] for path in domain for name in imports_of(path)}
    frameworks = imported - sys.stdlib_module_names - {"taskboard"}
    assert not frameworks, f"The domain imports {sorted(frameworks)}. It may use only the standard library; move that code outward."


def test_only_the_composition_root_constructs_collaborators() -> None:
    constructed = {
        f"{name_of(path)}: {node.func.id}"
        for path in MODULES
        for node in ast.walk(ast.parse(path.read_text(encoding="utf-8")))
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
        if node.func.id.endswith(("Repository", "Service", "EventBus", "Settings"))
    }
    assert not constructed, (
        f"{sorted(constructed)}: only app.py constructs collaborators. Take the collaborator as a constructor argument."
    )


def test_every_domain_error_has_an_http_status() -> None:
    declared = {
        cls
        for cls in vars(errors).values()
        if isinstance(cls, type) and issubclass(cls, errors.DomainError)
    }
    missing = declared - {errors.DomainError} - STATUS_BY_ERROR.keys()
    assert not missing, f"{sorted(e.__name__ for e in missing)} have no HTTP status. Add each to STATUS_BY_ERROR in api/error_handlers.py."


@pytest.mark.parametrize("path", [p for p in MODULES if p.name.endswith("_routes.py")], ids=name_of)
def test_routes_decide_nothing(path: Path) -> None:
    decisions = {
        f"line {node.lineno} ({type(node).__name__})" if hasattr(node, "lineno") else type(node).__name__
        for node in ast.walk(ast.parse(path.read_text(encoding="utf-8")))
        if isinstance(node, DECISIONS)
    }
    assert not decisions, (
        f"{name_of(path)} makes decisions at {sorted(decisions)}. Routes translate; "
        "put the rule on the entity if it concerns one task, otherwise in the service."
    )


def test_the_code_type_checks() -> None:
    report, _, exit_code = mypy.api.run(["--config-file", str(ROOT / "pyproject.toml"), str(ROOT)])
    assert exit_code == 0, report
