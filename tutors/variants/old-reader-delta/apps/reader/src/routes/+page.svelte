<!--
  The home page: open a course by its id. Upstream's home lists the courses you visited (routes/(home)).
  `courseId` is a $state rune: typing changes it, and the link's href follows.
-->
<script lang="ts">
  let courseId = $state("ladder-sample-course");
</script>

<svelte:head><title>Tutors ladder reader</title></svelte:head>
<main>
  <h1>Tutors ladder reader</h1>
  <p>Reads a course's <code>tutors.json</code>, built by <code>pnpm course</code> into <code>static/courses/&lt;id&gt;/</code>.</p>
  <label>Course id <input bind:value={courseId} /></label>
  <a href={`/course/${courseId}`}>Open the course</a>
</main>

<style>
  main { max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
  label { display: block; margin-bottom: 0.5rem; }
</style>
