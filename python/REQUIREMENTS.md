# REQUIREMENTS.md

Every rule of the board, stated once as an EARS sentence with an id. Each id is cited by at least
one scenario in `tests/`, and every scenario in `tests/unit` and `tests/api` cites one;
`tests/architecture/test_requirements.py` checks both. The pattern of a rule names the layer
that implements it.

| Id       | Pattern            | Requirement                                                                                                                                   | Implemented in                           |
| -------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| R-FLOW-1 | Ubiquitous         | The board shall create every new task in `todo`.                                                                                              | domain                                   |
| R-FLOW-2 | Unwanted behaviour | If a requested move is not allowed from the task's current status, then the board shall refuse it with `invalid_transition`.                  | domain (a rule about one task)           |
| R-MOVE-1 | Event-driven       | When a task is moved along an allowed transition, the board shall save it and return it with its new status.                                  | services                                 |
| R-WIP-1  | State-driven       | While `WIP_LIMIT` tasks are in progress, when another task is moved to `in_progress`, the board shall refuse with `wip_limit_exceeded` and leave the task where it was. | services (the rule needs other tasks)    |
| R-DONE-1 | Event-driven       | When a task moves to `done`, the board shall announce its completion.                                                                         | a domain event, and a handler in events  |
| R-DONE-2 | Unwanted behaviour | If announcing a completion fails, then the board shall still complete the task.                                                               | events                                   |
| R-FIND-1 | Unwanted behaviour | If a requested task does not exist, then the board shall refuse with `task_not_found`.                                                        | services                                 |
| R-LIST-1 | Ubiquitous         | The board shall list tasks in the order they were created.                                                                                    | repositories                             |
| R-VAL-1  | Unwanted behaviour | If a new task's title is empty or longer than 200 characters, then the board shall refuse it with `validation_failed`.                        | api (the wire format)                    |
| R-ERR-1  | Ubiquitous         | The board shall answer every refused request with an RFC 9457 problem document carrying a stable `code`.                                      | api (one error handler)                  |

## From pattern to layer

| The sentence says                              | Put the code in                                  |
| ---------------------------------------------- | ------------------------------------------------ |
| If ..., then ... about one task                | the domain entity, raising a domain error        |
| While ..., or anything that needs other tasks  | a service method                                 |
| When ..., the board shall tell or announce     | a domain event, published by the service; the effect in a handler |
| Where a setting ...                            | a field on the one settings object               |
| The board shall ... (everywhere)               | one place, with an architecture rule guarding it |
