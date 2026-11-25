import { test } from "vitest";
import assert from "node:assert/strict";
import { escapeHtml, html } from "@ladder/lite";

test("escapeHtml escapes the five characters that matter in content and attributes", () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`), "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
});

test("html escapes what it interpolates, unless it is already SafeHtml", () => {
  const title = "<script>alert(1)</script>";
  assert.equal(html`<h1>${title}</h1>`.value, "<h1>&lt;script&gt;alert(1)&lt;/script&gt;</h1>");
  assert.equal(html`<p>${html`<b>${"&"}</b>`}</p>`.value, "<p><b>&amp;</b></p>");
  assert.equal(html`<ul>${["<a>", html`<li>b</li>`]}</ul>`.value, "<ul>&lt;a&gt;<li>b</li></ul>");
  assert.equal(html`<a href="${'" onclick="x'}">`.value, '<a href="&quot; onclick=&quot;x">');
  assert.equal(html`${null}${undefined}${false}${0}`.value, "0");
});
