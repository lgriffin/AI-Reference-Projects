/**
 * A lab with one step open: which step, and the steps either side of it. Mirrors upstream LiveLab in
 * packages/svelte/course/src/course/services/live-lab.ts (setActivePage, nextStep, prevStep), as plain data.
 */
import type { Lab, LabStep } from "@ladder/model";

export type LiveLab = {
  lab: Lab;
  step: LabStep;
  index: number;
  previous?: LabStep;
  next?: LabStep;
};

/**
 * Opens a lab at a step. `stepId` is the last segment of the URL; with none (the lab's own route) the first
 * step opens, as upstream's setFirstPageActive. An unknown step gives undefined, for the page to answer 404.
 */
export function liveLab(lab: Lab, stepId?: string): LiveLab | undefined {
  const index = stepId === undefined ? 0 : lab.los.findIndex((step) => step.id === decodeURIComponent(stepId));
  const step = lab.los[index];
  if (!step) return undefined;
  return { lab, step, index, previous: lab.los[index - 1], next: lab.los[index + 1] };
}
