/**
 * The release value stream, as data: the steps between a commit and a release that is ready to tag, how
 * long each took, how long the work waited before it, and what that adds up to. Pure: scripts/value-stream.ts
 * runs the steps and times them; this does the arithmetic and lays out the map (R-044).
 *
 * A value stream map shows two kinds of time. Process time is when someone or something works on the
 * release. Waiting time is when the release sits: in a queue for a runner, for a reviewer, for Monday.
 * Lead time is both together, and flow efficiency is the share of it that was work. Upstream's release
 * harness draws the same map for the whole release line (docs/lean.md, "Value stream"), and its SOP has
 * the steps (release/SOP.md).
 */

export type StepStatus = "passed" | "failed" | "skipped" | "not run";

export type Step = {
  id: string;
  /** The step of release/SOP.md this is. */
  sop: number;
  what: string;
  command: string;
  /** Process time, in seconds. Zero for a step that did not run. */
  seconds: number;
  /** Time the release waited before this step started, in seconds. Measured by a person, given with --wait. */
  waitSeconds: number;
  status: StepStatus;
  note?: string;
};

export type Summary = {
  processSeconds: number;
  waitSeconds: number;
  leadSeconds: number;
  /** Process time over lead time, 0 to 1. */
  flowEfficiency: number;
  /** The step with the longest process time: where the next improvement pays most. */
  bottleneck?: string;
  /** The step with the longest wait before it, when any step waited. */
  longestWait?: string;
  stopped?: string;
};

/** A step a machine can run. `optional` steps run only when asked for. */
export type PlannedStep = { id: string; sop: number; what: string; command: string; optional?: boolean };

export type Selection = { only?: string[]; skip: string[]; with: string[]; waits: Record<string, number> };

/** What running one command gave: its process time, whether it passed, and why it did not really run, if so. */
export type Ran = { seconds: number; ok: boolean; skipped?: string };

/**
 * Walk the plan in order. A step left out is "skipped"; a step that fails stops the line, so every later
 * step is "not run" (release/SOP.md, "Stop the line"). `run` starts the command; a test hands in its own.
 */
export function runSteps(plan: PlannedStep[], selection: Selection, run: (step: PlannedStep) => Ran): Step[] {
  const steps: Step[] = [];
  let stopped = false;
  for (const planned of plan) {
    const { id, sop, what, command, optional } = planned;
    const base = { id, sop, what, command, waitSeconds: selection.waits[id] ?? 0 };
    const wanted = selection.only ? selection.only.includes(id) : !selection.skip.includes(id) && (!optional || selection.with.includes(id));
    if (!wanted) {
      steps.push({ ...base, seconds: 0, status: "skipped", ...(optional && !selection.only ? { note: `add it with --with ${id}` } : {}) });
    } else if (stopped) {
      steps.push({ ...base, seconds: 0, status: "not run" });
    } else {
      const { seconds, ok, skipped } = run(planned);
      // A check that could not run is not a pass, and the map must not call it one.
      steps.push({ ...base, seconds, status: !ok ? "failed" : skipped ? "skipped" : "passed", ...(skipped ? { note: skipped } : {}) });
      if (!ok) stopped = true;
    }
  }
  return steps;
}

/** `--wait review=3600` as { review: 3600 }. A step may wait once; a bad pair is an error that says the form. */
export function parseWaits(pairs: string[], known: string[]): Record<string, number> {
  const waits: Record<string, number> = {};
  for (const pair of pairs) {
    const match = /^([a-z-]+)=(\d+(?:\.\d+)?)$/.exec(pair);
    if (!match) throw new Error(`--wait ${pair} is not <step>=<seconds>, e.g. --wait readiness=3600 for an hour's wait for a reviewer`);
    if (!known.includes(match[1]!)) throw new Error(`--wait names the step "${match[1]}", which the value stream does not have. Steps: ${known.join(", ")}`);
    waits[match[1]!] = Number(match[2]);
  }
  return waits;
}

export function summarise(steps: Step[]): Summary {
  const ran = steps.filter((s) => s.status === "passed" || s.status === "failed");
  const processSeconds = ran.reduce((sum, s) => sum + s.seconds, 0);
  // A wait counts only before a step that ran: nothing waited for a step nobody took.
  const waitSeconds = ran.reduce((sum, s) => sum + s.waitSeconds, 0);
  const leadSeconds = processSeconds + waitSeconds;
  const longest = (key: "seconds" | "waitSeconds", among: Step[]) => among.reduce<Step | undefined>((best, s) => (s[key] > (best?.[key] ?? 0) ? s : best), undefined)?.id;
  const stopped = steps.find((s) => s.status === "failed")?.id;
  const bottleneck = longest("seconds", ran);
  const longestWait = longest("waitSeconds", ran);
  return {
    processSeconds,
    waitSeconds,
    leadSeconds,
    flowEfficiency: leadSeconds === 0 ? 0 : processSeconds / leadSeconds,
    ...(bottleneck ? { bottleneck } : {}),
    ...(longestWait ? { longestWait } : {}),
    ...(stopped ? { stopped } : {}),
  };
}

/** 4.2 s, 1 min 05 s, 2 h 03 min: short enough for a table cell. */
export function duration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const whole = Math.round(seconds);
  if (whole < 3600) return `${Math.floor(whole / 60)} min ${String(whole % 60).padStart(2, "0")} s`;
  return `${Math.floor(whole / 3600)} h ${String(Math.floor((whole % 3600) / 60)).padStart(2, "0")} min`;
}

const percent = (share: number) => `${Math.round(share * 100)}%`;

/** The map as a Markdown table, with lead time, flow efficiency and where to look first. */
export function renderValueStream(steps: Step[], meta: { version: string; commit: string; date: string }): string {
  const summary = summarise(steps);
  const share = (s: Step) => (summary.processSeconds === 0 || s.status === "skipped" || s.status === "not run" ? "" : percent(s.seconds / summary.processSeconds));
  const lines = [
    `# Release value stream: tutors-ladder ${meta.version}`,
    "",
    `Commit \`${meta.commit.slice(0, 12)}\`, ${meta.date}. From a commit to a release that is ready to tag, step by step (release/SOP.md).`,
    "",
    "| # | Step | SOP | Command | Waited before | Process time | Share | Result |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...steps.map((s, i) => `| ${i + 1} | ${s.what} | ${s.sop} | \`${s.command}\` | ${s.waitSeconds > 0 && (s.status === "passed" || s.status === "failed") ? duration(s.waitSeconds) : "-"} | ${s.status === "skipped" || s.status === "not run" ? "-" : duration(s.seconds)} | ${share(s)} | ${s.status}${s.note ? `: ${s.note}` : ""} |`),
    "",
    `- **Process time:** ${duration(summary.processSeconds)} (work on the release)`,
    `- **Waiting time:** ${duration(summary.waitSeconds)}${summary.waitSeconds === 0 ? " (none given: a machine ran every step back to back; add what a real release waits with --wait <step>=<seconds>)" : ""}`,
    `- **Lead time:** ${duration(summary.leadSeconds)} (process time plus waiting)`,
    `- **Flow efficiency:** ${percent(summary.flowEfficiency)} (process time over lead time)`,
    ...(summary.bottleneck ? [`- **Longest step:** ${summary.bottleneck}. Improve here first, or ask whether the step is done twice.`] : []),
    ...(summary.longestWait ? [`- **Longest wait:** before ${summary.longestWait}. Waiting is waste nobody chose; ask why the release sat there.`] : []),
    ...(summary.stopped ? [`- **The line stopped at ${summary.stopped}.** Later steps did not run: a failed step is fixed before the release moves on (release/SOP.md, "Stop the line").`] : []),
    "",
  ];
  return lines.join("\n");
}
