# The Assertion Ladder (paper draft)

LaTeX sources for the JOT submission. `../paper-plan.md` governs what the paper argues and who owns each section.

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
| `jotlocal.sty` | stand-in layout (see below) |

## Stand-in JOT layout

`jotlocal.sty` approximates the JOT look so the draft builds anywhere. It is **not** the official template: jot.fm could not be reached when the draft was set up. Before submission, download the author kit from jot.fm, then swap `\usepackage{jotlocal}` for the official class. Also map `\jottitle`, `\jotauthors`, `\jotabstract` and `\jotkeywords` onto its front-matter commands. The writing macros (`\todo`, `\rung`, `\pattern`, `\repo`) and colours are defined in `jotlocal.sty`, so carry them across.

## Still owed

Search for `\todo` in the sources: a systematic related-work search. Numbers in the evaluation come from `../evaluation/*.json` and must be kept in step with them.
