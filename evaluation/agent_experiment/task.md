Add task deletion to this application.

- `DELETE /tasks/{id}` removes the task and answers `204` with no body.
- A task that is in progress cannot be deleted. The request is refused with `409`, and the error
  code is `task_in_progress`.
- An unknown id is answered in the same way as everywhere else in the API.
- Whenever a task is deleted the team must be told. For now it is enough to log
  `Task deleted: <title> (<id>)` at info level.

Add the tests you think the change needs, and make sure the test suite passes before you finish.
