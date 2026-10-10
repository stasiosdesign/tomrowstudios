/* Runs before `npm run deploy` (predeploy): the hosted Studio is only ever
   deployed from the `staging` branch as it is on GitHub, on the latest CMS
   release. The Studio update workflow deploys the same thing, so the two ways
   of deploying can never undo each other.

   It refuses when this folder is on another branch, behind or ahead of
   GitHub, has uncommitted Studio changes, or has an older CMS installed than
   the latest release: a deploy uploads this folder as it is, so any of those
   would put an old or unfinished Studio online (on 10 Oct 2026 a deploy from
   an out-of-date folder rolled the hosted Studio back from 1.5.0 to 1.3.0).
   The fix is in each message. Never get round it with `npx sanity deploy`. */
/* global console, process */
import {execSync} from 'node:child_process'
import {readFileSync} from 'node:fs'

const PACKAGE = '@stasiosdesign/sanity-cms'
const run = (command) => execSync(command, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim()
const problems = []

run('git fetch --quiet origin staging')
const branch = run('git branch --show-current')
if (branch !== 'staging') {
  problems.push(`This folder is on the "${branch}" branch. The hosted Studio is deployed from staging: git switch staging`)
} else {
  const [behind, ahead] = run('git rev-list --left-right --count origin/staging...HEAD').split(/\s+/).map(Number)
  if (behind > 0) problems.push(`This folder is ${behind} commit(s) behind GitHub's staging: git pull --ff-only, then npm ci in studio/`)
  if (ahead > 0) problems.push(`${ahead} commit(s) here aren't on GitHub yet: push staging first`)
}

const uncommitted = execSync('git status --porcelain -- .', {encoding: 'utf8'}).trimEnd()
if (uncommitted) problems.push(`The Studio has uncommitted changes. Commit and push them to staging first:\n${uncommitted}`)

const pinned = JSON.parse(readFileSync('package.json', 'utf8')).dependencies[PACKAGE]
let installed = 'nothing'
try {
  installed = JSON.parse(readFileSync(`node_modules/${PACKAGE}/package.json`, 'utf8')).version
} catch {}
if (installed !== pinned) problems.push(`package.json pins ${PACKAGE} ${pinned} but ${installed} is installed: npm ci`)

let latest
try {
  latest = run(`npm view ${PACKAGE} version`)
} catch {
  problems.push(`Couldn't read the latest ${PACKAGE} release from GitHub Packages (offline, or no read:packages token in ~/.npmrc)`)
}
if (latest && pinned !== latest) {
  problems.push(`${PACKAGE} ${latest} is released but staging pins ${pinned}: wait for the Studio update workflow, or run it from the Actions tab, then git pull`)
}

if (problems.length > 0) {
  console.error(`\nNot deploying the hosted Studio:\n\n- ${problems.join('\n- ')}\n`)
  process.exit(1)
}
console.log(`Deploying the hosted Studio from staging (${run('git rev-parse --short HEAD')}), ${PACKAGE} ${installed}`)
