"""Pattern 8 -- Test Scaffold (API / end-to-end tests).

API tests use httpx.AsyncClient with an ASGI transport pointed at the
real FastAPI app, backed by an in-memory SQLite database.  They verify
the full stack: routing, schema validation, service logic, repository
persistence, and error-handler mapping.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


class TestTaskRoutes:
    async def test_create_task(self, api_client: AsyncClient) -> None:
        resp = await api_client.post(
            "/api/tasks",
            json={"title": "API test", "description": "End-to-end"},
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["title"] == "API test"
        assert body["status"] == "pending"

    async def test_list_tasks(self, api_client: AsyncClient) -> None:
        await api_client.post("/api/tasks", json={"title": "One"})
        await api_client.post("/api/tasks", json={"title": "Two"})

        resp = await api_client.get("/api/tasks")
        assert resp.status_code == 200
        assert len(resp.json()) >= 2

    async def test_get_task(self, api_client: AsyncClient) -> None:
        create = await api_client.post("/api/tasks", json={"title": "Fetch me"})
        task_id = create.json()["id"]

        resp = await api_client.get(f"/api/tasks/{task_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == task_id

    async def test_get_task_not_found(self, api_client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        resp = await api_client.get(f"/api/tasks/{fake_id}")
        assert resp.status_code == 404
        assert resp.json()["error_type"] == "TaskNotFoundError"

    async def test_update_task(self, api_client: AsyncClient) -> None:
        create = await api_client.post("/api/tasks", json={"title": "Old"})
        task_id = create.json()["id"]

        resp = await api_client.patch(
            f"/api/tasks/{task_id}", json={"title": "New"}
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "New"

    async def test_change_status(self, api_client: AsyncClient) -> None:
        create = await api_client.post("/api/tasks", json={"title": "Status"})
        task_id = create.json()["id"]

        resp = await api_client.post(
            f"/api/tasks/{task_id}/status",
            json={"status": "in_progress"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "in_progress"

    async def test_invalid_status_transition(self, api_client: AsyncClient) -> None:
        create = await api_client.post("/api/tasks", json={"title": "Done"})
        task_id = create.json()["id"]

        # Move to in_progress then completed
        await api_client.post(
            f"/api/tasks/{task_id}/status", json={"status": "in_progress"}
        )
        await api_client.post(
            f"/api/tasks/{task_id}/status", json={"status": "completed"}
        )

        # Completed -> pending is not allowed
        resp = await api_client.post(
            f"/api/tasks/{task_id}/status", json={"status": "pending"}
        )
        assert resp.status_code == 422
        assert resp.json()["error_type"] == "InvalidStateTransitionError"

    async def test_assign_task(self, api_client: AsyncClient) -> None:
        # Create user first
        user_resp = await api_client.post(
            "/api/users",
            json={"name": "charlie", "email": "charlie@example.com"},
        )
        user_id = user_resp.json()["id"]

        create = await api_client.post("/api/tasks", json={"title": "Assign me"})
        task_id = create.json()["id"]

        resp = await api_client.post(
            f"/api/tasks/{task_id}/assign",
            json={"user_id": user_id},
        )
        assert resp.status_code == 200
        assert resp.json()["assignee_id"] == user_id

    async def test_delete_task(self, api_client: AsyncClient) -> None:
        create = await api_client.post("/api/tasks", json={"title": "Delete me"})
        task_id = create.json()["id"]

        resp = await api_client.delete(f"/api/tasks/{task_id}")
        assert resp.status_code == 204

        get_resp = await api_client.get(f"/api/tasks/{task_id}")
        assert get_resp.status_code == 404


class TestUserRoutes:
    async def test_create_user(self, api_client: AsyncClient) -> None:
        resp = await api_client.post(
            "/api/users",
            json={"name": "dave", "email": "dave@example.com"},
        )
        assert resp.status_code == 201
        assert resp.json()["name"] == "dave"

    async def test_duplicate_name(self, api_client: AsyncClient) -> None:
        await api_client.post(
            "/api/users",
            json={"name": "unique", "email": "a@example.com"},
        )
        resp = await api_client.post(
            "/api/users",
            json={"name": "unique", "email": "b@example.com"},
        )
        assert resp.status_code == 409
        assert resp.json()["error_type"] == "DuplicateEntityError"
