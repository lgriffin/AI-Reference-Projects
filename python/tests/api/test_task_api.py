"""API: the whole stack over HTTP, wired by the real composition root."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from httpx2 import Response

from taskboard.app import create_app
from taskboard.config import Settings


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    settings = Settings(database_path=str(tmp_path / "test.db"), wip_limit=1)
    return TestClient(create_app(settings))


def create(client: TestClient, title: str) -> str:
    response = client.post("/tasks", json={"title": title})
    assert response.status_code == 201
    return str(response.json()["id"])


def move(client: TestClient, task_id: str, status: str) -> Response:
    return client.post(f"/tasks/{task_id}/status", json={"status": status})


def test_a_task_moves_across_the_board(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    """R-MOVE-1, R-DONE-1: given a new task, when it is started and completed, then it is listed as done and announced."""
    caplog.set_level("INFO")
    task_id = create(client, "Write the paper")
    move(client, task_id, "in_progress")
    move(client, task_id, "done")

    expected = {"id": task_id, "title": "Write the paper", "status": "done"}
    assert client.get(f"/tasks/{task_id}").json() == expected
    assert client.get("/tasks").json() == [expected]
    assert "Task completed: Write the paper" in caplog.text


def test_every_failure_is_a_problem_document(client: TestClient) -> None:
    """R-ERR-1, R-VAL-1: given each kind of refused request, when it is sent, then a problem document carries its code."""
    started, waiting = create(client, "Started"), create(client, "Waiting")
    move(client, started, "in_progress")

    failures = {
        "task_not_found": (404, client.get("/tasks/no-such-id")),
        "invalid_transition": (409, move(client, waiting, "done")),
        "wip_limit_exceeded": (409, move(client, waiting, "in_progress")),
        "validation_failed": (400, client.post("/tasks", json={"title": ""})),
    }

    for code, (status, response) in failures.items():
        assert response.status_code == status
        assert response.headers["content-type"] == "application/problem+json"
        assert response.json()["code"] == code
