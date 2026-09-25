import {getCliClient} from 'sanity/cli'
const client = getCliClient({apiVersion: '2025-02-19'})
const mask = (v: unknown) => JSON.stringify(v, (k, val) => (typeof val === 'string' && /^https?:\/\//.test(val) ? '<url masked>' : /token|secret|password/i.test(k) ? '<masked>' : val), 2)
async function main() {
  const project = await client.request({uri: '/projects/5cwu7mnl'})
  console.log('PROJECT', mask({plan: project.plan, features: project.features, maxDatasets: project.maxDatasets, metadata: project.metadata, activityFeedEnabled: project.activityFeedEnabled, organizationId: project.organizationId, studioHost: project.studioHost}))
  const hooks = await client.request({uri: '/hooks/projects/5cwu7mnl'})
  console.log('HOOKS', mask(hooks.map((h: any) => ({name: h.name, dataset: h.dataset, rule: h.rule, isDisabled: h.isDisabled, apiVersion: h.apiVersion, includeDrafts: h.includeDrafts, httpMethod: h.httpMethod, type: h.type}))))
  const datasets = await client.request({uri: '/projects/5cwu7mnl/datasets'})
  console.log('DATASETS', mask(datasets))
  const counts = await client.fetch('{"published": count(*[!(_id in path("drafts.**"))]), "drafts": count(*[_id in path("drafts.**")]), "byType": *[!(_id in path("drafts.**"))]{_type} | {"t": _type}}')
  const byType: Record<string, number> = {}
  for (const {t} of counts.byType) byType[t] = (byType[t] ?? 0) + 1
  console.log('COUNTS', JSON.stringify({published: counts.published, drafts: counts.drafts, byType}))
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
