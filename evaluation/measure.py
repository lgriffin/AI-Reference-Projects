"""Measure the three reference implementations, so that every number in the paper is reproducible.

    python evaluation/measure.py

Lines of code are physical lines that are neither blank nor comment-only (docstrings count as
comments). Results are written to evaluation/metrics.json and printed. Pass a directory to measure
another checkout (for instance an earlier iteration) without overwriting the results.
"""

from __future__ import annotations

import json
import re
import sys
import tomllib
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else HERE.parent  # optional: another checkout

LAYOUT = {
    "java": ("src/main/java", "src/test/java", "*.java"),
    "python": ("src", "tests", "*.py"),
    "typescript": ("src", "tests", "*.ts"),
}
LAYERS = {"domain", "repository", "repositories", "service", "services", "events", "api", "config"}


def code_lines(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    text = re.sub(r'"""[\s\S]*?"""', "", text)  # Python docstrings
    text = re.sub(r"/\*[\s\S]*?\*/", "", text)  # block comments
    lines = (line.strip() for line in text.splitlines())
    return sum(1 for line in lines if line and not line.startswith(("#", "//")))


def layer_of(path: Path, source_root: Path) -> str:
    parts = [part.removesuffix(path.suffix) for part in path.relative_to(source_root).parts]
    found = [part for part in parts if part in LAYERS]
    name = found[0] if found else "composition root"
    return {"repository": "repositories", "service": "services"}.get(name, name)


def dependencies(name: str) -> dict[str, int]:
    cwd = ROOT / name
    if name == "python":
        project = tomllib.loads((cwd / "pyproject.toml").read_text(encoding="utf-8"))["project"]
        return {"runtime": len(project["dependencies"]), "development": len(project["optional-dependencies"]["dev"])}
    if name == "typescript":
        package = json.loads((cwd / "package.json").read_text(encoding="utf-8"))
        return {"runtime": len(package["dependencies"]), "development": len(package["devDependencies"])}
    ns = {"m": "http://maven.apache.org/POM/4.0.0"}
    declared = ET.parse(cwd / "pom.xml").getroot().findall("m:dependencies/m:dependency", ns)
    test = sum(1 for dep in declared if dep.findtext("m:scope", namespaces=ns) == "test")
    return {"runtime": len(declared) - test, "development": test}


def measure(name: str) -> dict[str, object]:
    source_dir, test_dir, pattern = LAYOUT[name]
    source_root, test_root = ROOT / name / source_dir, ROOT / name / test_dir
    sources = [p for p in source_root.rglob(pattern) if p.name != "__init__.py" and "node_modules" not in p.parts]
    tests = [p for p in test_root.rglob(pattern) if p.name != "__init__.py"]
    by_layer: dict[str, int] = {}
    for path in sources:
        layer = layer_of(path, source_root)
        by_layer[layer] = by_layer.get(layer, 0) + code_lines(path)
    manifest_file = ROOT / name / "AGENTS.md"
    manifest = manifest_file.read_text(encoding="utf-8") if manifest_file.exists() else ""
    return {
        "source_files": len(sources),
        "source_loc": sum(by_layer.values()),
        "largest_source_file_loc": max(code_lines(p) for p in sources),
        "loc_by_layer": dict(sorted(by_layer.items())),
        "test_files": len(tests),
        "test_loc": sum(code_lines(p) for p in tests),
        "manifest_words": len(manifest.split()),
        "dependencies": dependencies(name),
    }


if __name__ == "__main__":
    metrics = {name: measure(name) for name in LAYOUT}
    if len(sys.argv) == 1:
        (HERE / "metrics.json").write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics, indent=2))
