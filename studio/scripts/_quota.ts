import {getCliClient} from 'sanity/cli'
const client = getCliClient({apiVersion: '2025-02-19'})
async function main() {
  const p = await client.request({uri: '/projects/5cwu7mnl'})
  const keys = Object.keys(p)
  console.log('keys', keys.join(','))
  for (const k of ['plan','maxDatasets','datasetQuota','limits','quotas']) if (p[k] !== undefined) console.log(k, JSON.stringify(p[k]).slice(0, 800))
  try { const u = await client.request({uri: '/projects/5cwu7mnl/usage'}); console.log('usage keys', Object.keys(u).join(',')) } catch (e:any) { console.log('usage: ' + e.statusCode) }
  try { const f = await client.request({uri: '/projects/5cwu7mnl/features'}); console.log('features', JSON.stringify(f).slice(0,600)) } catch (e:any) { console.log('features: ' + e.statusCode) }
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
