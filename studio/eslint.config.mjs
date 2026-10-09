import studio from '@sanity/eslint-config-studio'

/* The CMS is a package (@stasiosdesign/sanity-cms, from the sanity-cms
   repository): this Studio uses its public entry points only, never a file
   inside it, so its updates can't break on internals. Shared changes are
   made in that repository, never by copying its code here (CLAUDE.md). */

export default [
  ...studio,
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@stasiosdesign/sanity-cms/*', '!@stasiosdesign/sanity-cms/protocol', '!@stasiosdesign/sanity-cms/cli'],
              message: 'Use the CMS package\'s public entry points: @stasiosdesign/sanity-cms, /protocol or /cli.',
            },
          ],
        },
      ],
    },
  },
]
