"""Hidden acceptance test for the feature request in task.md (Python). Never shown to the agent."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from taskboard.app import create_app
from taskboard.config import Settings


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(Settings(database_path=str(tmp_path / "acceptance.db"), wip_limit=3)))


def create(client: TestClient, title: str) -> str:
    return str(client.post("/tasks", json={"title": title}).json()["id"])


def test_deleting_a_task_removes_it(client: TestClient) -> None:
    task_id = create(client, "Doomed")
    response = client.delete(f"/tasks/{task_id}")
    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/tasks/{task_id}").status_code == 404


def test_a_task_in_progress_is_not_deleted(client: TestClient) -> None:
    task_id = create(client, "Busy")
    client.post(f"/tasks/{task_id}/status", json={"status": "in_progress"})
    response = client.delete(f"/tasks/{task_id}")
    assert response.status_code == 409
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "task_in_progress"
    assert client.get(f"/tasks/{task_id}").status_code == 200


def test_deleting_an_unknown_task_is_the_usual_404(client: TestClient) -> None:
    response = client.delete("/tasks/no-such-id")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "task_not_found"


def test_the_team_is_told(
    client: TestClient, caplog: pytest.LogCaptureFixture, capsys: pytest.CaptureFixture[str]
) -> None:
    caplog.set_level("INFO")
    task_id = create(client, "Doomed")
    client.delete(f"/tasks/{task_id}")
    captured = capsys.readouterr()
    assert f"Task deleted: Doomed ({task_id})" in caplog.text + captured.out + captured.err
