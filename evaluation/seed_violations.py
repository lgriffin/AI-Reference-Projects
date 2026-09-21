"""Violation seeding: which of the repository's conventions are actually enforced?

For each reference implementation, plant one canonical structural mistake at a time, run the
repository's single verify command, record what (if anything) caught it, and restore the file.

    python evaluation/seed_violations.py            # all three implementations
    python evaluation/seed_violations.py python     # just one

Results are written to evaluation/results.json and printed as a table.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WINDOWS = sys.platform == "win32"

# What can catch a violation, strongest (earliest, cheapest feedback) first.
COMPILER, ARCHITECTURE, BEHAVIOUR, NOTHING = "compiler", "architecture test", "behavioural test", "not caught"

VIOLATIONS = {
    "V1": "API bypasses the service and uses a repository",
    "V2": "Service signals failure with an HTTP concept",
    "V3": "Service issues SQL",
    "V4": "Component constructs its own collaborator",
    "V5": "Service reads the environment",
    "V6": "New domain error has no HTTP status",
    "V7": "Route catches a domain error and answers ad hoc",
    "V8": "Side effect inlined in the service",
    "V9": "Test double drifts from the real repository",
    "V10": "Business rule placed in the route",
    "V11": "Setting hard-coded in the service",
    "V12": "Framework type enters the domain",
}


@dataclass(frozen=True)
class Edit:
    file: str
    find: str
    replace: str


def seeds_python() -> dict[str, list[Edit]]:
    routes, service = "src/taskboard/api/task_routes.py", "src/taskboard/services/task_service.py"
    return {
        "V1": [Edit(routes, "from taskboard.services.task_service import TaskService\n",
                    "from taskboard.repositories.task_repository import TaskRepository\n"
                    "from taskboard.services.task_service import TaskService\n\n\n"
                    "def count_tasks(tasks: TaskRepository) -> int:\n    return len(tasks.find_all())\n")],
        "V2": [Edit(service, "from taskboard.domain.errors import", "from fastapi import HTTPException\n\nfrom taskboard.domain.errors import"),
               Edit(service, "            raise TaskNotFound(task_id)", "            raise HTTPException(status_code=404)")],
        "V3": [Edit(service, '"""Services: every use case of the board. No HTTP, no SQL, no environment."""\n',
                    '"""Services: every use case of the board. No HTTP, no SQL, no environment."""\n\nimport sqlite3\n'),
               Edit(service, "    def _board_is_full(self) -> bool:",
                    "    def _purge(self) -> None:\n        sqlite3.connect(\"taskboard.db\").execute(\"DELETE FROM tasks\")\n\n"
                    "    def _board_is_full(self) -> bool:")],
        "V4": [Edit(service, "from taskboard.repositories.task_repository import TaskRepository\n",
                    "from taskboard.repositories.sqlite_task_repository import SqliteTaskRepository\n"
                    "from taskboard.repositories.task_repository import TaskRepository\n"),
               Edit(service, "        self._tasks = tasks\n", "        self._tasks = tasks or SqliteTaskRepository(\"taskboard.db\")\n")],
        "V5": [Edit(service, '"""Services: every use case of the board. No HTTP, no SQL, no environment."""\n',
                    '"""Services: every use case of the board. No HTTP, no SQL, no environment."""\n\nimport os\n'),
               Edit(service, "        self._wip_limit = wip_limit\n",
                    "        self._wip_limit = int(os.environ.get(\"WIP_LIMIT\", wip_limit))\n")],
        "V6": [Edit("src/taskboard/domain/errors.py", "class WipLimitExceeded(DomainError):",
                    "class TitleTaken(DomainError):\n    code = \"title_taken\"\n\n\nclass WipLimitExceeded(DomainError):")],
        "V7": [Edit(routes, "from fastapi import APIRouter, Depends, Request\n",
                    "from fastapi import APIRouter, Depends, Request\nfrom fastapi.responses import JSONResponse\n"),
               Edit(routes, "from taskboard.domain.task import Status, Task\n",
                    "from taskboard.domain.errors import TaskNotFound\nfrom taskboard.domain.task import Status, Task\n"),
               Edit(routes, '@router.get("/{task_id}")\ndef get_task(task_id: str, service: Service) -> Task:\n    return service.get_task(task_id)\n',
                    '@router.get("/{task_id}", response_model=None)\ndef get_task(task_id: str, service: Service) -> Task | JSONResponse:\n'
                    "    try:\n        return service.get_task(task_id)\n    except TaskNotFound:\n"
                    '        return JSONResponse({"error": "not found"}, status_code=404)\n')],
        "V8": [Edit(service, '"""Services: every use case of the board. No HTTP, no SQL, no environment."""\n',
                    '"""Services: every use case of the board. No HTTP, no SQL, no environment."""\n\nimport logging\n'),
               Edit(service, "        if status is Status.DONE:\n",
                    "        if status is Status.DONE:\n            logging.getLogger(__name__).info(\"Mailing the team: %s is done\", task.title)\n")],
        "V9": [Edit("tests/support/in_memory_task_repository.py", "        return list(self._tasks.values())",
                    "        return sorted(self._tasks.values(), key=lambda task: task.title)")],
        "V10": [Edit(routes, "from taskboard.domain.task import Status, Task\n",
                     "from taskboard.domain.errors import WipLimitExceeded\nfrom taskboard.domain.task import Status, Task\n"),
                Edit(routes, "    return service.move_task(task_id, body.status)\n",
                     "    started = [task for task in service.list_tasks() if task.status is Status.IN_PROGRESS]\n"
                     "    if body.status is Status.IN_PROGRESS and len(started) >= 3:\n        raise WipLimitExceeded(3)\n"
                     "    return service.move_task(task_id, body.status)\n")],
        "V11": [Edit(service, "        self._wip_limit = wip_limit\n", "        self._wip_limit = 3\n")],
        "V12": [Edit("src/taskboard/domain/task.py", "from dataclasses import dataclass, replace\n",
                     "from dataclasses import replace\n"),
                Edit("src/taskboard/domain/task.py", "from taskboard.domain.errors import InvalidTransition\n",
                     "from pydantic.dataclasses import dataclass\n\nfrom taskboard.domain.errors import InvalidTransition\n")],
    }


def seeds_typescript() -> dict[str, list[Edit]]:
    routes, service = "src/api/task-routes.ts", "src/services/task-service.ts"
    return {
        "V1": [Edit(routes, 'import type { TaskService } from "../services/task-service.ts";\n',
                    'import type { TaskRepository } from "../repositories/task-repository.ts";\n'
                    'import type { TaskService } from "../services/task-service.ts";\n\n'
                    "export async function countTasks(tasks: TaskRepository): Promise<number> {\n  return (await tasks.findAll()).length;\n}\n")],
        "V2": [Edit(service, "    if (task === null) throw new TaskNotFound(taskId);",
                    '    if (task === null) throw Object.assign(new Error("Not Found"), { statusCode: 404 });')],
        "V3": [Edit(service, 'import { TaskNotFound, WipLimitExceeded } from "../domain/errors.ts";\n',
                    'import { DatabaseSync } from "node:sqlite";\nimport { TaskNotFound, WipLimitExceeded } from "../domain/errors.ts";\n'),
               Edit(service, "  private async boardIsFull(): Promise<boolean> {",
                    '  protected purge(): void {\n    new DatabaseSync("taskboard.db").exec("DELETE FROM tasks");\n  }\n\n'
                    "  private async boardIsFull(): Promise<boolean> {")],
        "V4": [Edit(service, 'import type { TaskRepository } from "../repositories/task-repository.ts";\n',
                    'import { SqliteTaskRepository } from "../repositories/sqlite-task-repository.ts";\n'
                    'import type { TaskRepository } from "../repositories/task-repository.ts";\n'),
               Edit(service, "    this.tasks = tasks;\n", '    this.tasks = tasks ?? new SqliteTaskRepository("taskboard.db");\n')],
        "V5": [Edit(service, "    this.wipLimit = wipLimit;\n", "    this.wipLimit = Number(process.env.WIP_LIMIT ?? wipLimit);\n")],
        "V6": [Edit("src/domain/errors.ts", 'export type ErrorCode = "task_not_found" | "invalid_transition" | "wip_limit_exceeded";',
                    'export type ErrorCode = "task_not_found" | "invalid_transition" | "wip_limit_exceeded" | "title_taken";'),
               Edit("src/domain/errors.ts", "export class WipLimitExceeded extends DomainError {",
                    'export class TitleTaken extends DomainError {\n  readonly code = "title_taken";\n}\n\n'
                    "export class WipLimitExceeded extends DomainError {")],
        "V7": [Edit(routes, '  app.get("/tasks/:taskId", (request) => {\n    const { taskId } = TaskId.parse(request.params);\n    return service.getTask(taskId);\n  });',
                    '  app.get("/tasks/:taskId", async (request, reply) => {\n    const { taskId } = TaskId.parse(request.params);\n'
                    "    try {\n      return await service.getTask(taskId);\n    } catch {\n"
                    '      return reply.code(404).send({ error: "not found" });\n    }\n  });')],
        "V8": [Edit(service, '    if (status === "done") {\n',
                    '    if (status === "done") {\n      console.info(`Mailing the team: ${task.title} is done`);\n')],
        "V9": [Edit("tests/support/in-memory-task-repository.ts", "    return [...this.tasks.values()];",
                    "    return [...this.tasks.values()].sort((a, b) => a.title.localeCompare(b.title));")],
        "V10": [Edit(routes, 'import { STATUSES } from "../domain/task.ts";\n',
                     'import { WipLimitExceeded } from "../domain/errors.ts";\nimport { STATUSES } from "../domain/task.ts";\n'),
                Edit(routes, "    return service.moveTask(taskId, status);",
                     '    const started = (await service.listTasks()).filter((task) => task.status === "in_progress");\n'
                     '    if (status === "in_progress" && started.length >= 3) throw new WipLimitExceeded(3);\n'
                     "    return service.moveTask(taskId, status);"),
                Edit(routes, '  app.post("/tasks/:taskId/status", (request) => {', '  app.post("/tasks/:taskId/status", async (request) => {')],
        "V11": [Edit(service, "    this.wipLimit = wipLimit;\n", "    this.wipLimit = 3;\n")],
        "V12": [Edit("src/domain/task.ts", 'import { InvalidTransition } from "./errors.ts";\n',
                     'import { z } from "zod";\nimport { InvalidTransition } from "./errors.ts";\n\nexport const StatusSchema = z.enum(["todo", "in_progress", "done"]);\n')],
    }


def seeds_java() -> dict[str, list[Edit]]:
    base = "src/main/java/com/example/taskboard/"
    controller, service = base + "api/TaskController.java", base + "service/TaskService.java"
    return {
        "V1": [Edit(controller, "    @GetMapping\n    List<Task> listTasks() {",
                    "    @GetMapping(\"/count\")\n    int countTasks(com.example.taskboard.repository.TaskRepository tasks) {\n"
                    "        return tasks.findAll().size();\n    }\n\n    @GetMapping\n    List<Task> listTasks() {")],
        "V2": [Edit(service, "        return tasks.find(taskId).orElseThrow(() -> new TaskNotFound(taskId));",
                    "        return tasks.find(taskId).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(\n"
                    "                org.springframework.http.HttpStatus.NOT_FOUND));")],
        "V3": [Edit(service, "    private boolean boardIsFull() {",
                    "    void purge(javax.sql.DataSource dataSource) throws java.sql.SQLException {\n"
                    "        try (java.sql.Connection connection = dataSource.getConnection()) {\n"
                    "            connection.createStatement().execute(\"DELETE FROM tasks\");\n        }\n    }\n\n"
                    "    private boolean boardIsFull() {")],
        "V4": [Edit(controller, "    @GetMapping\n    List<Task> listTasks() {",
                    "    @GetMapping(\"/preview\")\n    List<Task> preview() {\n"
                    "        return new TaskService(null, event -> {}, null).listTasks();\n    }\n\n    @GetMapping\n    List<Task> listTasks() {")],
        "V5": [Edit(service, "        this.wipLimit = properties.wipLimit();",
                    "        this.wipLimit = System.getenv(\"WIP_LIMIT\") == null\n"
                    "                ? properties.wipLimit()\n                : Integer.parseInt(System.getenv(\"WIP_LIMIT\"));")],
        "V6": [Edit(base + "domain/DomainException.java", "    public static final class WipLimitExceeded extends DomainException {",
                    "    public static final class TitleTaken extends DomainException {\n        public TitleTaken(String title) {\n"
                    "            super(\"The title '%s' is taken.\".formatted(title));\n        }\n\n        @Override\n"
                    "        public String code() {\n            return \"title_taken\";\n        }\n    }\n\n"
                    "    public static final class WipLimitExceeded extends DomainException {")],
        "V7": [Edit(controller, "    @GetMapping(\"/{taskId}\")\n    Task getTask(@PathVariable String taskId) {\n        return service.getTask(taskId);\n    }",
                    "    @GetMapping(\"/{taskId}\")\n    org.springframework.http.ResponseEntity<?> getTask(@PathVariable String taskId) {\n"
                    "        try {\n            return org.springframework.http.ResponseEntity.ok(service.getTask(taskId));\n"
                    "        } catch (com.example.taskboard.domain.DomainException e) {\n"
                    "            return org.springframework.http.ResponseEntity.status(404).body(java.util.Map.of(\"error\", \"not found\"));\n"
                    "        }\n    }")],
        "V8": [Edit(service, "        if (status == Status.DONE) {\n",
                    "        if (status == Status.DONE) {\n"
                    "            org.slf4j.LoggerFactory.getLogger(TaskService.class).info(\"Mailing the team: {} is done\", task.title());\n")],
        "V9": [Edit("src/test/java/com/example/taskboard/support/InMemoryTaskRepository.java",
                    "        return List.copyOf(tasks.values());",
                    "        return tasks.values().stream().sorted(java.util.Comparator.comparing(Task::title)).toList();")],
        "V10": [Edit(controller, "        return service.moveTask(taskId, body.status());",
                     "        long started = service.listTasks().stream().filter(task -> task.status() == Status.IN_PROGRESS).count();\n"
                     "        if (body.status() == Status.IN_PROGRESS && started >= 3) {\n"
                     "            throw new com.example.taskboard.domain.DomainException.WipLimitExceeded(3);\n        }\n"
                     "        return service.moveTask(taskId, body.status());")],
        "V11": [Edit(service, "        this.wipLimit = properties.wipLimit();", "        this.wipLimit = 3;")],
        "V12": [Edit(base + "domain/Task.java", "public record Task(String id, String title, Status status) {",
                     "@com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)\n"
                     "public record Task(String id, String title, Status status) {")],
    }


def run(command: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace", shell=WINDOWS)


def verify_python(cwd: Path) -> tuple[str, list[str]]:
    python = cwd / ".venv" / ("Scripts/python.exe" if WINDOWS else "bin/python")
    result = run([str(python), "-m", "pytest", "-q", "-p", "no:cacheprovider"], cwd)
    failed = re.findall(r"^(?:FAILED|ERROR) (\S+)", result.stdout, flags=re.M)
    if result.returncode != 0 and not failed:
        failed = ["collection error"]
    if any("test_the_code_type_checks" in name for name in failed):
        return COMPILER, failed
    return classify(failed, "tests/architecture"), failed


def verify_typescript(cwd: Path) -> tuple[str, list[str]]:
    types = run(["npx", "tsc"], cwd)
    if types.returncode != 0:
        return COMPILER, re.findall(r"error TS\d+: .*", types.stdout)[:3]
    report = cwd / "vitest-report.json"
    run(["npx", "vitest", "run", "--reporter=json", f"--outputFile={report.name}"], cwd)
    data = json.loads(report.read_text(encoding="utf-8"))
    report.unlink()
    failed = [
        f"{Path(suite['name']).relative_to(cwd).as_posix()}::{case['fullName']}"
        for suite in data["testResults"] for case in suite["assertionResults"] if case["status"] == "failed"
    ]
    return classify(failed, "tests/architecture"), failed


def verify_java(cwd: Path) -> tuple[str, list[str]]:
    result = run(["mvn", "-q", "-B", "-o", "verify"], cwd)
    if "COMPILATION ERROR" in result.stdout:
        return COMPILER, re.findall(r"ERROR\] (/?\S+\.java:\[\d+,\d+\] .*)", result.stdout)[:3]
    failed = []
    for report in (cwd / "target" / "surefire-reports").glob("TEST-*.xml"):
        for case in ET.parse(report).getroot().iter("testcase"):
            if case.find("failure") is not None or case.find("error") is not None:
                failed.append(f"{case.get('classname', '').rsplit('.', 1)[-1]}::{case.get('name')}")
    return classify(failed, "ArchitectureTest"), failed


def classify(failed: list[str], architecture_marker: str) -> str:
    if not failed:
        return NOTHING
    return ARCHITECTURE if any(architecture_marker in name for name in failed) else BEHAVIOUR


IMPLEMENTATIONS = {
    "java": (seeds_java, verify_java),
    "python": (seeds_python, verify_python),
    "typescript": (seeds_typescript, verify_typescript),
}


def seed(cwd: Path, edits: list[Edit]) -> dict[Path, str]:
    originals: dict[Path, str] = {}
    for edit in edits:
        path = cwd / edit.file
        text = path.read_text(encoding="utf-8")
        originals.setdefault(path, text)
        assert text.count(edit.find) == 1, f"seed does not apply exactly once: {edit.file}: {edit.find[:50]!r}"
        path.write_text(text.replace(edit.find, edit.replace), encoding="utf-8", newline="\n")
    return originals


def main() -> None:
    chosen = sys.argv[1:] or list(IMPLEMENTATIONS)
    results_file = ROOT / "evaluation" / "results.json"
    results: dict[str, dict[str, dict[str, object]]] = (
        json.loads(results_file.read_text(encoding="utf-8")) if results_file.exists() else {}
    )
    for name in chosen:
        seeds, verify = IMPLEMENTATIONS[name]
        cwd = ROOT / name
        caught_by, failed = verify(cwd)
        assert caught_by == NOTHING, f"{name} must be green before seeding: {failed}"
        results[name] = {}
        for violation, edits in seeds().items():
            originals = seed(cwd, edits)
            try:
                caught_by, failed = verify(cwd)
            finally:
                for path, text in originals.items():
                    path.write_text(text, encoding="utf-8", newline="\n")
                for stray in cwd.glob("taskboard*.db"):
                    stray.unlink()
            results[name][violation] = {"caught_by": caught_by, "evidence": failed[:4]}
            print(f"{name:<11} {violation:<4} {caught_by:<18} {VIOLATIONS[violation]}", flush=True)
        caught_by, failed = verify(cwd)
        assert caught_by == NOTHING, f"{name} was not restored cleanly: {failed}"
    results_file.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
