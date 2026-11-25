/**
 * Rung 6 in gen: containment of paths and of links, and the course's access settings.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildCourse, containedPath, MemoryFileSystem, parseSimpleYaml, PathEscapeError, reachesOutside, readEnrollment, readProperties } from "@ladder/gen";

describe("containedPath: the port's one gate for every path", () => {
  const INSIDE: [path: string, contained: string][] = [
    ["", ""],
    ["course.md", "course.md"],
    ["./topic-1/topic.md", "topic-1/topic.md"],
    ["topic-1\\topic.md", "topic-1/topic.md"],
    ["topic-1//./unit-1/", "topic-1/unit-1"],
  ];
  for (const [path, contained] of INSIDE) test(`keeps ${JSON.stringify(path)}`, () => assert.equal(containedPath(path), contained));

  const OUTSIDE: [path: string, why: RegExp][] = [
    ["..", /climbs out/],
    ["../secrets.md", /climbs out/],
    ["topic-1/../../etc/passwd", /climbs out/],
    ["topic-1\\..\\..\\secret", /climbs out/],
    ["/etc/passwd", /absolute/],
    ["\\\\server\\share\\x", /absolute/],
    ["C:/Windows/win.ini", /absolute/],
    ["c:secret", /absolute/],
    ["~/.ssh/id_ed25519", /home folder/],
    ["course.md\0.png", /NUL/],
  ];
  for (const [path, why] of OUTSIDE) {
    test(`refuses ${JSON.stringify(path)}`, () => {
      assert.throws(() => containedPath(path), (error: unknown) => error instanceof PathEscapeError && why.test(error.message) && error.path === path);
    });
  }
});

describe("V021: a learning object's pages link only inside its own folder", () => {
  test("finds links, images, reference definitions and raw tags that leave the folder; ignores code and the web", () => {
    const markdown = [
      "[ok](step.md) [ok](./img/a.png) [web](https://tutors.dev) [anchor](#top) [root](/abs)",
      "[up](../other/note.md) ![up](../../img/cat.png)",
      "[ref]: ../../answers/solutions.md",
      '<a href="../x.html">x</a> <img src="../y.png">',
      "`[code](../not-a-link.md)`",
      "```\n[fenced](../not-a-link.md)\n```",
    ].join("\n");
    assert.deepEqual(reachesOutside("topic-1/note-1", markdown), ["../other/note.md", "../../img/cat.png", "../../answers/solutions.md", "../x.html", "../y.png"]);
  });

  test("a link that climbs above the course is outside too", () => {
    assert.deepEqual(reachesOutside("topic-1/note-1", "[x](../../../../etc/passwd)"), ["../../../../etc/passwd"]);
  });

  test("gen warns for each page of a topic, talk, note or lab that reaches outside, but not for the course, units or sides", async () => {
    const warnings: string[] = [];
    await buildCourse(
      new MemoryFileSystem({
        "course.md": "# C\n\n[fine](topic-1/topic.md)\n",
        "topic-1/topic.md": "# T\n\n[out](../course.md)\n",
        "topic-1/unit-1/unit.md": "# U\n\n[fine](../../course.md)\n",
        "topic-1/unit-1/note-1/note.md": "# N\n\n![secret](../../../private/answers.png)\n",
        "topic-1/unit-1/talk-1/talk.md": "# K\n",
        "topic-1/unit-1/talk-1/deck.marp": "---\nmarp: true\n---\n# K\n\n[x](../note-1/note.md)\n",
      }),
      "c",
      { warn: (message) => warnings.push(message) },
    );
    assert.deepEqual(warnings, [
      'V021 topic-1/topic.md: This page uses "../course.md", which is outside its own folder, so the link breaks when this is copied into another course. Move the file into this folder and link to it there.',
      'V021 topic-1/unit-1/note-1/note.md: This page uses "../../../private/answers.png", which is outside its own folder, so the link breaks when this is copied into another course. Move the file into this folder and link to it there.',
      'V021 topic-1/unit-1/talk-1/deck.marp: This page uses "../note-1/note.md", which is outside its own folder, so the link breaks when this is copied into another course. Move the file into this folder and link to it there.',
    ]);
  });

  test("a course whose files are links out of the course stops with PathEscapeError", async () => {
    const fs = new MemoryFileSystem({ "topic-1/topic.md": "# T\n" }, { "course.md": "../../home/me/.ssh/config" });
    await assert.rejects(buildCourse(fs, "c"), PathEscapeError);
  });
});

describe("settings: properties.yaml and enrollment.yaml", () => {
  test("the simple YAML subset: values, quoted values, numbers, booleans, lists and comments", () => {
    assert.deepEqual(parseSimpleYaml("credits: Ada # who\nauth: 1\nquoted: 'a: b'\nportfolio: true\nignore:\n  - drafts\n  - 2\n"), {
      credits: "Ada",
      auth: 1,
      quoted: "a: b",
      portfolio: true,
      ignore: ["drafts", 2],
    });
  });

  test("properties keep values and leave lists out; enrollment keeps educators and whitelist and skips student records", () => {
    assert.deepEqual(readProperties("auth: 1\nignore:\n  - x\n"), { auth: 1 });
    assert.deepEqual(readEnrollment("educators:\n  - ada\nwhitelist:\n  - bob\n  - 42\nstudents:\n  - name: Bob\n    id: bob\n"), { educators: ["ada"], whitelist: ["bob", "42"] });
  });

  test("gen puts them on the course, as upstream writes properties into tutors.json", async () => {
    const course = await buildCourse(new MemoryFileSystem({ "course.md": "# C\n", "properties.yaml": "auth: 1\n", "enrollment.yaml": "educators:\n  - ada\n" }), "c");
    assert.deepEqual(course.properties, { auth: 1 });
    assert.deepEqual(course.enrollment, { educators: ["ada"] });
  });
});
