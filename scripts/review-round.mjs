#!/usr/bin/env node
/* Cuts a round of Site Review: a frozen copy of the website, code and
   content, for one round of comments (README, "Site Review rounds").

     npm run review:round -- final-design-v2

   From an up-to-date `staging` with nothing uncommitted, it
   1. reads the staging dataset's published content: every document the site
      reads (pages, collections, clients and their pictures' asset records),
      never drafts, website comments, publish notes or Sanity's own secrets;
   2. makes the branch review/<round> from staging, with that content in
      review/snapshot.json, and pushes it. Vercel builds the branch as a
      review round (astro.config.mjs, "review"): static, its content read from
      the snapshot, so nothing edited in the Studio afterwards reaches it;
   3. switches back to staging, and says what is left: the round's own
      address in Vercel, and its folder in Site Review (studio/project.ts).

   A round is cut once and never changed: the script refuses a branch that
   exists. `--snapshot-only` writes review/snapshot.json here and does nothing
   else, to build a round locally (TOMROW_REVIEW=1 npm run build); it is
   git-ignored, so it is never committed on staging. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

// The site's Sanity project and the dataset the Studio edits (src/sanity/client.ts)
const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID || '5cwu7mnl';
const DATASET = 'staging';

// Everything the site reads; Sanity's own documents only where they are
// pictures' and files' records (sanity.imageAsset, sanity.fileAsset): never
// its system documents, the Visual editor's preview secrets or the Vercel
// bypass secret, which must never reach a repository
const QUERY = `*[
  !(_id in path("_.**"))
  && (!(_type match "sanity.*") || _type in ["sanity.imageAsset", "sanity.fileAsset"])
  && !(_type match "cms*")
  && _type != "publishLog"
] | order(_id asc)`;

const fail = (message) => {
  console.error(`\n  ${message}\n`);
  process.exit(1);
};
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const args = process.argv.slice(2);
const snapshotOnly = args.includes('--snapshot-only');
const round = args.find((arg) => !arg.startsWith('--'));
if (!round || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(round)) {
  fail('Name the round in lowercase words joined by hyphens, e.g.: npm run review:round -- final-design-v2');
}
const branch = `review/${round}`;

async function snapshot() {
  const client = createClient({ projectId: PROJECT_ID, dataset: DATASET, apiVersion: '2025-02-19', useCdn: false, perspective: 'published' });
  const documents = await client.fetch(QUERY);
  const leaked = documents.filter((doc) => /secret|token/i.test(doc._type) || doc._id.startsWith('drafts.'));
  if (leaked.length) fail(`Stopped: the snapshot would hold ${leaked.map((doc) => doc._id).join(', ')}. Nothing was written.`);
  return documents;
}

function write(documents, from) {
  mkdirSync('review', { recursive: true });
  const file = path.join('review', 'snapshot.json');
  const body = { round, from, takenAt: new Date().toISOString(), projectId: PROJECT_ID, dataset: DATASET, documents };
  writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`);
  return file;
}

if (snapshotOnly) {
  const documents = await snapshot();
  const file = write(documents, git('rev-parse', 'HEAD'));
  console.log(`\n  ${file}: ${documents.length} documents from ${DATASET}. Build it with TOMROW_REVIEW=1 npm run build.\n`);
  process.exit(0);
}

// A round is cut from staging exactly as it is on GitHub
git('fetch', '--quiet', 'origin');
if (git('rev-parse', '--abbrev-ref', 'HEAD') !== 'staging') fail('Switch to staging first: a round is cut from the latest version.');
if (git('status', '--porcelain')) fail('This folder has uncommitted changes: commit or put them aside first, so the round is staging as it is on GitHub.');
if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/staging')) fail("This folder isn't level with staging on GitHub: pull (git pull --ff-only) or push, then run this again.");
if (git('ls-remote', '--heads', 'origin', branch)) fail(`${branch} is already on GitHub: a round is cut once and never changed. Give this one a new name.`);

const from = git('rev-parse', '--short', 'HEAD');
const documents = await snapshot();
git('switch', '--quiet', '-c', branch);
try {
  const file = write(documents, from);
  git('add', '-f', file);
  git(
    'commit',
    '--quiet',
    '-m',
    `Review round ${round}: staging at ${from}, its content frozen\n\nThe staging dataset's published content (${documents.length} documents) in ${file}, so this round never changes: a review build reads it instead of Sanity (astro.config.mjs, "review").`,
  );
  git('push', '--quiet', '-u', 'origin', branch);
} finally {
  git('switch', '--quiet', 'staging');
}

console.log(`
  ${branch} is on GitHub: staging at ${from}, with ${documents.length} documents of content frozen.
  Vercel builds it in a minute or two. What is left (README, "Site Review rounds"):
  1. Vercel: give the branch its own address (Settings, Domains: add
     tomrowstudios-${round}.vercel.app, assigned to the Git branch ${branch}),
     so the round is never deleted.
  2. Site Review: add the round to review.versions in studio/project.ts
     (url https://tomrowstudios-${round}.vercel.app), commit, push staging,
     and deploy the Studio (npm run studio:deploy).
`);
