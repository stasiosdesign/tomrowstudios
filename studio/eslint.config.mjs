import path from 'node:path'
import process from 'node:process'
import studio from '@sanity/eslint-config-studio'

/* The boundary between the CMS foundation (cms/, the future shared package)
   and this website's Studio (everything else here), checked on every
   `npm run check`:

   - nothing in cms/ imports from outside it: the foundation is told about
     the site through its config (cms/config.ts), never by reaching for the
     site's files, so it can leave this repository as it is;
   - nothing outside cms/ imports a file inside it, only cms/ itself (its
     index.ts, the package's public interface), so the site's code doesn't
     change when cms/ becomes a package;
   - cms/ reads no environment variables: the site reads its own and passes
     the values in (project.ts). */

const CMS = path.resolve(import.meta.dirname, 'cms')
const norm = (file) => (process.platform === 'win32' ? file.toLowerCase() : file)
const inCms = (file) => norm(file) === norm(CMS) || norm(file).startsWith(norm(CMS) + path.sep)
const isEntry = (file) => [CMS, path.join(CMS, 'index'), path.join(CMS, 'index.ts')].some((entry) => norm(entry) === norm(file))

const boundary = {
  meta: {
    type: 'problem',
    messages: {
      escape: 'The CMS foundation (cms/) may not import "{{source}}" from outside it: take what it needs from the project config (cms/config.ts).',
      deep: 'Import the CMS foundation from cms/ itself (its index.ts), not "{{source}}".',
    },
  },
  create(context) {
    const file = context.filename
    const fromCms = inCms(file)
    const check = (source) => {
      if (source?.type !== 'Literal' || typeof source.value !== 'string' || !source.value.startsWith('.')) return
      const target = path.resolve(path.dirname(file), source.value)
      if (fromCms && !inCms(target)) context.report({node: source, messageId: 'escape', data: {source: source.value}})
      else if (!fromCms && inCms(target) && !isEntry(target)) context.report({node: source, messageId: 'deep', data: {source: source.value}})
    }
    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
    }
  },
}

export default [
  ...studio,
  {
    plugins: {cms: {rules: {boundary}}},
    rules: {'cms/boundary': 'error'},
  },
  {
    files: ['cms/**'],
    rules: {
      'no-restricted-properties': ['error', {object: 'process', property: 'env', message: 'The CMS foundation reads no environment: the project passes its values in (project.ts).'}],
    },
  },
]
