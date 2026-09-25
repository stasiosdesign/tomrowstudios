/* Makes the static pages' documents in Sanity, once, from the words and
   pictures the pages were built with (src/sanity/page-defaults.ts, at the
   repository root): for every page there, the published document (<type>)
   and its live copy (live.<type>), each with the same content. Every picture
   is uploaded from public/ first; Sanity keeps one copy of identical files,
   so running this again uploads nothing new.

   It never overwrites: a document that already exists, published or live, is
   left exactly as it is ("kept"). To redo one page, delete its documents in
   the Studio first.

   From studio/:
     npx sanity exec scripts/seed-pages.ts --with-user-token
     npx sanity exec scripts/seed-pages.ts --with-user-token -- --only shopPage */
import fs from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'
import {PAGE_DEFAULTS, type ImageDefault} from '../../src/sanity/page-defaults'

const client = getCliClient({apiVersion: '2025-02-19'})

// The script runs from studio/ (sanity exec needs its sanity.cli.ts), so the
// site's public/ is one level up
const publicDir = path.resolve(process.cwd(), '..', 'public')

const onlyAt = process.argv.indexOf('--only')
const only = onlyAt >= 0 ? process.argv[onlyAt + 1] : undefined
if (onlyAt >= 0 && !only) {
  console.error('--only needs a page type, such as --only shopPage')
  process.exit(1)
}
if (only && !(only in PAGE_DEFAULTS)) {
  console.error(`No defaults for "${only}". Pages: ${Object.keys(PAGE_DEFAULTS).join(', ')}`)
  process.exit(1)
}

const isImage = (value: unknown): value is ImageDefault =>
  typeof value === 'object' && value !== null && 'path' in value

async function uploadImage(image: ImageDefault) {
  const file = path.join(publicDir, image.path)
  const asset = await client.assets.upload('image', fs.createReadStream(file), {
    filename: path.basename(file),
  })
  return {
    _type: 'image',
    asset: {_type: 'reference', _ref: asset._id},
    ...(image.alt ? {alt: image.alt} : {}),
  }
}

async function seed(type: string, defaults: Record<string, Record<string, string | ImageDefault>>) {
  const ids = [type, `live.${type}`]
  const existing: string[] = await client.fetch('*[_id in $ids]._id', {ids})
  if (existing.length === ids.length) {
    for (const id of ids) console.log(`kept ${id}`)
    return
  }

  let images = 0
  const content: Record<string, Record<string, unknown>> = {}
  for (const [section, fields] of Object.entries(defaults)) {
    const values: Record<string, unknown> = {}
    for (const [name, value] of Object.entries(fields)) {
      if (isImage(value)) {
        values[name] = await uploadImage(value)
        images += 1
      } else {
        values[name] = value
      }
    }
    content[section] = values
  }

  // createIfNotExists, in one transaction: nothing already there is touched
  const transaction = client.transaction()
  for (const id of ids) transaction.createIfNotExists({_id: id, _type: type, ...content})
  await transaction.commit()

  for (const id of ids) {
    console.log(existing.includes(id) ? `kept ${id}` : `created ${id}, ${images} images`)
  }
}

async function main() {
  for (const [type, defaults] of Object.entries(PAGE_DEFAULTS)) {
    if (only && type !== only) continue
    await seed(type, defaults)
  }
}

main().catch((error: Error) => {
  console.error('ERR', error.message)
  process.exit(1)
})
