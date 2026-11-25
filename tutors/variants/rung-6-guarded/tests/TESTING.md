# The `tests/` directory

A map from each folder to what it proves, how it can fail and its command. It mirrors upstream's
`tests/TESTING.md` at a smaller scale: the same tier names where upstream has the tier, one runner
(Vitest) and one gate. `pnpm test` runs every suite below except `e2e/`, which needs a build and a
browser, and the assignment's grading tests, which skip until `LADDER_ASSIGNMENT=1`. `tests/architecture/test-tiers.test.ts` fails if a folder is missing here.

## The map

| Folder | Tier | What it proves | Command |
| --- | --- | --- | --- |
| `unit/` | Unit | Pure functions of gen, lite, rbac, the command, the reader's `lib/course` and the supply-chain script, one module at a time, with hand-picked examples. `unit/reader` runs the reader's logic on upstream's `tutors.json`. `unit/lite/xss-corpus.test.ts` is the XSS corpus: named hostile inputs, each with the reason it is dangerous. | `pnpm test:unit` |
| `bdd/` | Specification | The requirements in `REQUIREMENTS.md`, as Gherkin `Rule:`s with Given/When/Then scenarios in `features/`, bound by `steps/` with `@amiceli/vitest-cucumber`. `features/reader` proves the reader's rules on its plain logic, with a stand-in host (`support/reader.ts`). Features tagged `@security` (R-022 to R-036) are adversarial: the Given is a hostile course, path, address or dependency. | `pnpm test:bdd` |
| `contract/` | Contract | The `FileSystemPort` contract run against both adapters (Honest Double), now with containment and links; the `SessionPort` contract run against `AnonymousSession` and `FakeSession`; and the export names of the packages. | `pnpm test:contract` |
| `conformance/` | Conformance | The generator against upstream's `tutors.json` for the shared fixture (the oracle), and one whole page against its golden file in `conformance/golden/`. | `pnpm test:conformance` |
| `fuzz/` | Property | Properties that hold for every input fast-check can find: escaping, Markdown, `folderKind`, whole random courses, the port's honesty, and `safeUrl` against generated hostile addresses with the browser's URL parser as oracle. Each file proves its property can fail. | `pnpm test:fuzz` (1000 runs) |
| `architecture/` | Architecture | Rung 3's layering rules with the reader as a layer (and the Browser rule), the reader's own layers (Framework, Plain logic, Loader and Raw HTML rules), the Trusted HTML rule, rung 6's Identity, Purity, Containment, Sanitising and Route rules, and the rules for `scripts/checks` and this map. | `pnpm exec vitest run tests/architecture` |
| `e2e/` | Browser | The built reader on a plain file server with a `200.html` fallback, read in Chromium by the `playwright` library: a learner clicks from the home page to a lab step, and two URLs answer 404. `guarded.e2e.ts` opens the hostile course and the private course: no script runs, nothing breaks the Content Security Policy, and an anonymous reader gets the private notice. Not in `pnpm test`. | `pnpm test:e2e` (builds first) |
| `suite-health/` | Suite health | The tests themselves: the Requirement Closure Check and EARS audit, and no focused, skipped or uncollected test. Each check runs on negative fixtures first. | `pnpm test:ears:audit`, `pnpm exec vitest run tests/suite-health` |
| `mutation/` | Mutation | The mutation floor check on fixtures, and that every mutated file has a floor. Stryker itself runs outside the gate. | `pnpm test:mutation`, then `pnpm check:mutation-floors` |
| `assignment/` | Grading | Assignment 6, rung 6's coding assignment (week 10, "Raw HTML and locked content"). Skipped unless `LADDER_ASSIGNMENT=1`. | `pnpm test:assignment` |
| `fixtures/` | none | Courses written to attack or to be private: `hostile-course` (script in links, images, raw HTML and a web link; links out of its folders) and `private-course` (`auth: 1`). The command, the scenarios and the browser tier build them. Not a suite. | `pnpm start tests/fixtures/hostile-course out` |
| `support/` | none | Shared paths, adapters, fast-check parameters and arbitraries, and the XSS oracle (`xss-oracle.ts`: the browser's URL parser decides what an address really opens). Not a suite. | none |

`tests/rung-fence.test.ts` sits at the top: it is about the whole variant, not one tier.

## How each tier can fail

A test that cannot fail proves nothing, so every tier carries its own proof that it can:

| Tier | Its proof that it can fail |
| --- | --- |
| `bdd/` | vitest-cucumber fails when a scenario or step exists in the feature and not in the steps, or the other way round; the EARS audit fails a Rule with no scenario. |
| `contract/` | rung 4 extended the contract and it caught a real drift in `MemoryFileSystem` (see its header). |
| `e2e/` | each step waits for a heading or a URL that only the right page has, and the run fails on any uncaught error in the page. |
| `conformance/` | a changed field, or one changed byte in the golden page, fails with the first difference. |
| `fuzz/` | each file has a test titled "... can fail" that runs its property against a broken implementation and expects a counterexample. |
| `suite-health/`, `mutation/` | negative fixtures first: each finding is raised on purpose before the real repository is checked. |
| everything | `pnpm test:mutation` changes the code and counts how many changes the suite notices. |

## Replaying a property failure

A fast-check failure prints `{ seed, path }`. Rerun exactly that case:

    FUZZ_SEED=<seed> FUZZ_PATH=<path> pnpm test:fuzz

## Mutation testing

    pnpm test:mutation          # Stryker over gen, lite, rbac and the reader's lib/course; writes reports/mutation/
    pnpm check:mutation-floors  # each file against tests/mutation/mutation-floors.json

Open `reports/mutation/index.html` to see each surviving mutant in its source. Stryker's vitest runner
reruns, for each mutant, only the tests that executed the mutated code. A vitest-cucumber step is a test of
its own, so a Then step that reads what a When step built would never be rerun. The mutation run therefore
leaves the BDD steps out and runs the self-contained tiers (`vitest.config.mutation.ts` says why); the
scenarios still prove the requirements in `pnpm test`.
