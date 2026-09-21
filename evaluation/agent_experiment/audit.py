"""Audit the workspaces of the agent experiment. Fully scripted: no human judges a run.

    python evaluation/agent_experiment/audit.py <experiment-dir> <python-interpreter>

For each workspace (identified only by its opaque id) the script records:

  delivered_green   the repository's own verify command passes as the agent left it
  acceptance        a hidden acceptance test of the feature request (4 cases)
  rule_failures     the FULL canonical architecture rules, restored if the condition removed them
  rules_modified    the agent edited the architecture rules it was given
  notify_layer      layer(s) of the source files that contain the "Task deleted" log message
  rule_layer        layer(s) from which the new domain error is raised
  error_in_domain   the new error is declared in the domain
  double_updated    the in-memory repository double gained the new operation
  contract_updated  the repository contract test gained a case for it
  tests_touched     test directories the agent changed
  lines_added       size of the change

Only after every workspace is audited is the mapping to (language, condition, model) joined on.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
WINDOWS = sys.platform == "win32"
LAYERS = {"domain", "repository", "repositories", "service", "services", "events", "api", "config"}
CANON = {"repository": "repositories", "service": "services"}

LAYOUT = {
    "java": dict(src="src/main/java", rules="src/test/java/com/example/taskboard/ArchitectureTest.java",
                 acceptance=("DeleteAcceptanceTest.java", "src/test/java/com/example/taskboard/acceptance"),
                 double="src/test/java/com/example/taskboard/support/InMemoryTaskRepository.java",
                 contract="src/test/java/com/example/taskboard/repository/TaskRepositoryContract.java", ext=".java"),
    "python": dict(src="src", rules="tests/architecture",
                   acceptance=("test_delete_acceptance.py", "tests/acceptance"),
                   double="tests/support/in_memory_task_repository.py",
                   contract="tests/integration/test_task_repository_contract.py", ext=".py"),
    "typescript": dict(src="src", rules="tests/architecture",
                       acceptance=("delete-acceptance.test.ts", "tests/acceptance"),
                       double="tests/support/in-memory-task-repository.ts",
                       contract="tests/integration/task-repository.contract.test.ts", ext=".ts"),
}


def sh(command: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace", shell=WINDOWS)


def layer_of(path: Path) -> str:
    found = [part.removesuffix(path.suffix) for part in path.parts if part.removesuffix(path.suffix) in LAYERS]
    return CANON.get(found[0], found[0]) if found else "composition root"


class Runner:
    def __init__(self, language: str, workspace: Path, python: str) -> None:
        self.language, self.cwd, self.python = language, workspace, python

    def run(self, selection: str | None) -> tuple[bool, list[str]]:
        """Run the whole suite (selection None) or one test file; return (green, failed case names)."""
        if self.language == "python":
            result = sh([self.python, "-m", "pytest", "-q", "-p", "no:cacheprovider", *([selection] if selection else [])], self.cwd)
            failed = re.findall(r"^(?:FAILED|ERROR) \S+?::(\S+)", result.stdout, flags=re.M)
            return result.returncode == 0, failed
        if self.language == "typescript":
            if selection is None and sh(["node", "../node_modules/typescript/bin/tsc"], self.cwd).returncode != 0:
                return False, ["tsc"]
            report = self.cwd / "audit-report.json"
            sh(["node", "../node_modules/vitest/vitest.mjs", "run", *([selection] if selection else []),
                "--reporter=json", f"--outputFile={report.name}"], self.cwd)
            if not report.exists():
                return False, ["vitest did not run"]
            data = json.loads(report.read_text(encoding="utf-8"))
            report.unlink()
            failed = [c["title"] for s in data["testResults"] for c in s["assertionResults"] if c["status"] == "failed"]
            failed += ["suite failed to load" for s in data["testResults"] if s["status"] == "failed" and not s["assertionResults"]]
            return not failed and data["numTotalTests"] > 0, failed
        reports = self.cwd / "target" / "surefire-reports"
        shutil.rmtree(reports, ignore_errors=True)
        result = sh(["mvn", "-q", "-B", "-o", "verify", *([f"-Dtest={selection}", "-Dsurefire.failIfNoSpecifiedTests=false"] if selection else [])], self.cwd)
        if "COMPILATION ERROR" in result.stdout:
            return False, ["compilation error"]
        failed = [case.get("name", "") for report in reports.glob("TEST-*.xml") for case in ET.parse(report).getroot().iter("testcase")
                  if case.find("failure") is not None or case.find("error") is not None]
        return result.returncode == 0, failed


def git(cwd: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace").stdout


def audit(language: str, workspace: Path, python: str) -> dict[str, object]:
    layout, runner = LAYOUT[language], Runner(language, workspace, python)
    git(workspace, "add", "-A")
    changed = [line.split("\t") for line in git(workspace, "diff", "--cached", "--numstat", "HEAD").splitlines()]
    changed_files = [parts[2] for parts in changed if len(parts) == 3 and not parts[2].startswith("target/")]
    lines_added = sum(int(parts[0]) for parts in changed if len(parts) == 3 and parts[0].isdigit())

    record: dict[str, object] = {"lines_added": lines_added}
    record["delivered_green"], record["delivered_failures"] = runner.run(None)

    rules = workspace / layout["rules"]
    record["rules_modified"] = any(name.startswith(layout["rules"]) for name in changed_files)
    added_by_audit: list[Path] = []
    if not rules.exists():
        added_by_audit.append(rules)
        source = ROOT / language / layout["rules"]
        shutil.copytree(source, rules) if source.is_dir() else shutil.copy(source, rules)

    name, directory = layout["acceptance"]
    (workspace / directory).mkdir(parents=True, exist_ok=True)
    added_by_audit.append(workspace / directory)
    shutil.copy(HERE / "acceptance" / name, workspace / directory / name)
    selector = {"java": "DeleteAcceptanceTest", "python": f"{directory}/{name}", "typescript": f"{directory}/{name}"}[language]
    _, failed = runner.run(selector)
    cases = 4
    record["acceptance_failures"] = failed
    record["acceptance_passed"] = max(0, cases - len(failed)) if "compilation error" not in failed and "suite failed to load" not in failed else 0

    rule_selector = {"java": "ArchitectureTest", "python": layout["rules"], "typescript": layout["rules"]}[language]
    _, record["rule_failures"] = runner.run(rule_selector)

    sources = [p for p in (workspace / layout["src"]).rglob(f"*{layout['ext']}") if p.name != "__init__.py"]
    texts = {p: p.read_text(encoding="utf-8", errors="replace") for p in sources}
    record["notify_layer"] = sorted({layer_of(p.relative_to(workspace / layout["src"])) for p, t in texts.items() if "Task deleted" in t})

    error_class, error_file = None, None
    for p, t in texts.items():
        if layer_of(p.relative_to(workspace / layout["src"])) == "api":
            continue
        for occurrence in re.finditer("task_in_progress", t):  # the nearest class declared above the code
            classes = re.findall(r"class\s+(\w+)", t[: occurrence.start()])
            if classes and error_class is None:
                error_class, error_file = classes[-1], p
    record["error_in_domain"] = bool(error_file and layer_of(error_file.relative_to(workspace / layout["src"])) == "domain")
    raise_pattern = re.compile(rf"(?:raise|throw new|new)\s+(?:\w+\.)*{error_class}\b") if error_class else None
    record["rule_layer"] = sorted({layer_of(p.relative_to(workspace / layout["src"])) for p, t in texts.items()
                                   if raise_pattern and raise_pattern.search(t)})

    word = re.compile(r"delet|remov", re.I)
    diff = lambda path: git(workspace, "diff", "--cached", "HEAD", "--", path)  # noqa: E731
    record["double_updated"] = bool(word.search("\n".join(l for l in diff(layout["double"]).splitlines() if l.startswith("+"))))
    record["contract_updated"] = bool(word.search("\n".join(l for l in diff(layout["contract"]).splitlines() if l.startswith("+"))))
    record["tests_touched"] = sorted({part for f in changed_files for part in Path(f).parts
                                      if part in {"unit", "integration", "api", "service", "repository", "support", "events"}
                                      and ("test" in f.lower())})
    record["manifest_modified"] = "AGENTS.md" in changed_files
    git(workspace, "reset", "-q")
    for path in added_by_audit:  # leave the workspace exactly as the agent left it
        shutil.rmtree(path) if path.is_dir() else path.unlink()
    return record


def main() -> None:
    experiment, python = Path(sys.argv[1]).resolve(), sys.argv[2]
    only = set(sys.argv[3:])
    out = HERE / "audit.json"
    results = json.loads(out.read_text(encoding="utf-8")) if out.exists() else {}
    for language in LAYOUT:
        for workspace in sorted((experiment / language).glob("w*")):
            if only and workspace.name not in only:
                continue
            results[workspace.name] = audit(language, workspace, python)
            print(workspace.name, json.dumps(results[workspace.name]), flush=True)
            out.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    mapping = json.loads((experiment.parent / f"{experiment.name}-mapping.json").read_text(encoding="utf-8"))
    joined = {run: {**mapping[run], **record} for run, record in results.items()}
    (HERE / "runs.json").write_text(json.dumps(joined, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
