// Every page renders in the browser. There is no server: the build is a folder of files, and each page's
// load runs client-side and fetches tutors.json itself. Upstream's root layout is the same: it became a
// universal +layout.ts (apps/reader/src/routes/+layout.ts), where docs/COURSE-PAGE-WALKTHROUGH.md still
// says +layout.server.ts.
export const ssr = false;
export const prerender = false;
