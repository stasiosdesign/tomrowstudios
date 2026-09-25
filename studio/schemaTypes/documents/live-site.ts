import {defineField, defineType} from 'sanity'
import {RocketIcon} from '@sanity/icons/Rocket'

// When the live site was last brought up to date with staging. The Go live
// tool (components/GoLiveTool.tsx) writes it; nothing else does, and nobody
// edits it. Writing it is what updates the live site: the Sanity webhook
// "Publish to live site" fires on this one document and calls the Vercel deploy
// hook that rebuilds production from everything published. A singleton, never
// listed in Content (structure.ts).
export const liveSite = defineType({
  name: 'liveSite',
  title: 'Live site',
  type: 'document',
  icon: RocketIcon,
  readOnly: true,
  fields: [
    defineField({name: 'publishedAt', title: 'Last published to the live site', type: 'datetime'}),
    defineField({name: 'publishedBy', title: 'By', type: 'string'}),
  ],
})
