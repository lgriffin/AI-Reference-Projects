/**
 * Service level objectives for a static site: budgets a release must stay within, read from
 * release/slo.yaml. Pure: scripts/lib/measure.ts takes the measurement; this judges it.
 *
 * Upstream's release/slo.yaml holds availability and latency targets per app over a 28-day window, and
 * the release harness judges a candidate against the stricter of it and its own floors (slo/floors.yaml
 * there). A static site has no requests to fail, so this rung's objectives are budgets on the build: how
 * long it takes and how big it is. The discipline is the same: a number written down, checked on every
 * release, raised only on purpose.
 */

/** What one build of the fixture site measured. */
export type Measurement = {
  /** Wall time of the slowest of the timed builds, in milliseconds. */
  buildMs: number;
  /** Every file the build wrote, with its size in bytes. */
  files: { path: string; bytes: number }[];
};

export type Objective = { id: string; measure: string; budget: number; why?: string };

export type Result = { id: string; measure: string; unit: "ms" | "bytes"; value: number; budget: number; ok: boolean; message: string };

type MeasureDef = {
  unit: "ms" | "bytes";
  what: string;
  read: (m: Measurement) => number;
  /** What to look at, and what to do, when the budget is exceeded. */
  advice: (m: Measurement) => string;
};

const largest = (m: Measurement, n = 3) =>
  [...m.files].sort((a, b) => b.bytes - a.bytes).slice(0, n).map((f) => `${f.path} (${format(f.bytes, "bytes")})`).join(", ");

/** The measures this check knows. A new objective needs a new entry here, and a test. */
export const MEASURES: Record<string, MeasureDef> = {
  "build-ms": {
    unit: "ms",
    what: "the time to build the fixture site",
    read: (m) => m.buildMs,
    advice: () => "Profile the build (node --cpu-prof apps/cli/src/main.ts ...) and find what grew; a build that slows each release is a defect arriving slowly.",
  },
  "site-bytes": {
    unit: "bytes",
    what: "the size of the whole site",
    read: (m) => m.files.reduce((sum, f) => sum + f.bytes, 0),
    advice: (m) => `The largest files are ${largest(m)}. Shrink what is not value to a learner (repeated markup, unused styles).`,
  },
};

export function format(value: number, unit: "ms" | "bytes"): string {
  if (unit === "ms") return `${Math.round(value)} ms`;
  return value >= 1024 ? `${(value / 1024).toFixed(1)} kB` : `${value} B`;
}

/** Problems with the file itself: a measure nobody knows, a budget that is not a positive number. */
export function checkObjectives(doc: unknown): { objectives: Objective[]; problems: string[] } {
  const list = (doc as { objectives?: unknown } | null)?.objectives;
  if (!Array.isArray(list)) return { objectives: [], problems: ['release/slo.yaml must have an "objectives:" list.'] };
  const problems: string[] = [];
  const objectives: Objective[] = [];
  for (const [index, raw] of list.entries()) {
    const o = raw as Partial<Objective>;
    const name = typeof o?.id === "string" ? `SLO "${o.id}"` : `objectives[${index}]`;
    const own: string[] = [];
    if (typeof o?.id !== "string") own.push(`${name} needs an id.`);
    if (typeof o?.measure !== "string" || !(o.measure in MEASURES)) {
      own.push(`${name} measures "${String(o?.measure)}", which this check does not know. Known measures: [${Object.keys(MEASURES).join(", ")}]. A new measure is code: add it to MEASURES in scripts/lib/slo.ts, with a test.`);
    }
    if (typeof o?.budget !== "number" || !(o.budget > 0)) own.push(`${name} needs a budget: a positive number, in the measure's unit.`);
    if (own.length === 0) objectives.push(o as Objective);
    problems.push(...own);
  }
  return { objectives, problems };
}

/** Each objective against the measurement. A breach's message says by how much, where to look and what not to do. */
export function evaluate(objectives: Objective[], m: Measurement): Result[] {
  return objectives.map(({ id, measure, budget }) => {
    const def = MEASURES[measure]!;
    const value = def.read(m);
    const ok = value <= budget;
    const over = value - budget;
    const message = ok
      ? `${id}: ${def.what} is ${format(value, def.unit)}, within its budget of ${format(budget, def.unit)} (${Math.round((1 - value / budget) * 100)}% headroom).`
      : `SLO "${id}" exceeded: ${def.what} is ${format(value, def.unit)}, over its budget of ${format(budget, def.unit)} by ${format(over, def.unit)} (${Math.round((over / budget) * 100)}%). ` +
        `${def.advice(m)} If the growth is value a learner gets, raise the budget in release/slo.yaml in its own pull request that says why. ` +
        "Never raise a budget to make a release pass: a budget is a ratchet, as upstream's slo/floors.yaml in the release harness is.";
    return { id, measure, unit: def.unit, value, budget, ok, message };
  });
}
