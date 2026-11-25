/**
 * The course's settings files: properties.yaml (`auth: 1` makes the course private) and enrollment.yaml
 * (who may see it). Upstream reads both with a full YAML library in packages/jsr/gen/src/services/course-builder.ts;
 * this rung reads the small subset Tutors courses use, so it adds no dependency:
 *
 *     key: value          a string, a number or true/false
 *     key:                a list of plain values
 *       - value
 *
 * Anything else (nested maps such as enrollment's `students`) is skipped.
 */
import type { Enrollment, Properties } from "@ladder/model";

type Scalar = string | number | boolean;

function scalar(raw: string): Scalar {
  const text = raw.replace(/\s+#.*$/, "").trim();
  const quoted = text.match(/^(["'])(.*)\1$/);
  if (quoted) return quoted[2]!;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (text === "true" || text === "false") return text === "true";
  return text;
}

/** The top-level keys of a simple YAML file, each a value or a list of values. */
export function parseSimpleYaml(text: string): Record<string, Scalar | Scalar[]> {
  const out: Record<string, Scalar | Scalar[]> = {};
  let list: Scalar[] | undefined;
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const top = line.match(/^([A-Za-z_][\w-]*):(?:\s+(.*))?$/);
    if (top) {
      const value = top[2]?.trim() ?? "";
      list = value === "" ? [] : undefined;
      out[top[1]!] = value === "" ? list! : scalar(value);
      continue;
    }
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item && list && !/^[\w-]+:\s/.test(item[1]!)) list.push(scalar(item[1]!));
  }
  return out;
}

/** properties.yaml as upstream writes it into tutors.json; lists are left out in this rung. */
export function readProperties(text: string): Properties {
  const properties: Properties = {};
  for (const [key, value] of Object.entries(parseSimpleYaml(text))) if (!Array.isArray(value)) properties[key] = value;
  return properties;
}

/** The two lists of enrollment.yaml that decide who may see a private course. */
export function readEnrollment(text: string): Enrollment {
  const yaml = parseSimpleYaml(text);
  const names = (value: Scalar | Scalar[] | undefined) => (Array.isArray(value) ? value.map(String) : undefined);
  const enrollment: Enrollment = {};
  const educators = names(yaml.educators);
  const whitelist = names(yaml.whitelist);
  if (educators) enrollment.educators = educators;
  if (whitelist) enrollment.whitelist = whitelist;
  return enrollment;
}
