# The Assertion Ladder (paper)

LaTeX sources for the JOT submission. `../paper-plan.md` governs what the paper argues and who owns each section.

**Version 1 was submitted to the *Journal of Object Technology* ([jot.fm](https://www.jot.fm)) on 2 October 2026.** The sources and PDF in this directory are that submitted version, with [`cover-letter.pdf`](cover-letter.pdf) as the letter that accompanied it. The production case study is Tutors; its code lives in [tutors-sdk/tutors-mono-repo](https://github.com/tutors-sdk/tutors-mono-repo) (read at commit `865d02f`) and [tutors-sdk/tutors-release-harness](https://github.com/tutors-sdk/tutors-release-harness) (version 1.28.0).

**The versions here are releases.** The working draft is written and edited internally by the authors; the sources and PDF in this directory are the final versions of each release, published openly with the code and data the paper reports on. Please raise corrections as issues rather than expecting edits here to reach the working draft.

## Read it

[`assertion-ladder.pdf`](assertion-ladder.pdf) is the submitted build of version 1, committed so it can be opened on GitHub without a TeX install.

## Build

```sh
cd paper
latexmk -pdf main.tex        # or: pdflatex main && bibtex main && pdflatex main && pdflatex main
```

This needs a TeX Live install with `tikz`, `pgfplots`, `listings`, `booktabs`, `tabularx`, `titlesec` and `natbib`. On Ubuntu, `texlive-latex-extra`, `texlive-pictures` and `texlive-science` cover all of them.

## Layout

| Path | Contents |
|---|---|
| `main.tex` | title, authors, abstract, section order |
| `sections/` | one file per section, numbered in order, plus the appendix |
| `figures/` | TikZ and pgfplots illustrations, each included by one section |
| `references.bib` | bibliography; **every entry must be checked against its source before submission** |
| `jot.cls`, `logo/` | official JOT class (see below) |
| `assertionladder.sty` | the paper's colours and macros |

## JOT class

`jot.cls` is the official Journal of Object Technology class (v2.6), taken from the author kit. It is two-column, Times, author-year citations through apacite and natbib, and `lineno` stays on until the camera-ready version. `assertionladder.sty` holds only the paper's own colours, TikZ libraries and writing macros (`\todo`, `\rung`, `\pattern`, `\repo`). Tables follow the JOT rules: bold header, a double line under it, single lines elsewhere and no outer vertical rules. On Ubuntu the class also needs `texlive-science`, `texlive-publishers`, `texlive-bibtex-extra` and `texlive-plain-generic`.

## After submission

Numbers in the evaluation come from `../evaluation/*.json` and must be kept in step with them. Changes made in response to review go into version 2; the submitted sources stay as they are, so that the PDF here always matches what the journal has.
