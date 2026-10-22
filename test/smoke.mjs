// Smoke test: live AnySearch calls (needs network; reads the DSH credential
// store when no key is configured) + offline shape checks for every preset.
// Run from the repository root:  node test/smoke.mjs
import { WebSearchTools } from '../index.mjs'
import { PRESETS, getPreset } from '../providers.mjs'

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failed++
}

const { tool } = await WebSearchTools({}, { preset: 'anysearch' })
check('exports four tools', Object.keys(tool).join(',') === 'search,fetch,capabilities,config')

const cfg = await tool.config.execute({})
check('config resolves anysearch default', cfg.preset === 'anysearch' && cfg.baseURL === 'https://api.anysearch.com', `keySource=${cfg.keySource}`)

try {
  const s = await tool.search.execute({ query: 'magpie gateway', maxResults: 2 })
  check('live search', s.results.length > 0 && Boolean(s.results[0].url), s.results[0]?.title)
  check('metadata normalized', typeof s.metadata?.totalResults === 'number')
  const f = await tool.fetch.execute({ url: 'https://example.com' })
  check('live fetch', f.title === 'Example Domain' && f.content.length > 0)
  const c = await tool.capabilities.execute({ domains: ['code'] })
  check('capabilities normalized', c.domains[0]?.subDomains?.[0]?.subDomain === 'code.doc')
} catch (e) {
  check('live anysearch calls', false, e.message)
}

const samples = {
  tavily: { results: [{ title: 't', url: 'https://a.b', content: 's' }] },
  exa: { results: [{ title: 't', url: 'https://a.b', text: 's' }] },
  brave: { web: { results: [{ title: 't', url: 'https://a.b', description: 's' }] } },
  searxng: { results: [{ title: 't', url: 'https://a.b', content: 's' }] },
  firecrawl: { data: [{ title: 't', url: 'https://a.b', description: 's', markdown: 'm' }] },
}
for (const [id, sample] of Object.entries(samples)) {
  const spec = PRESETS[id].search
  const out = spec.pick(sample)
  check(`preset ${id} shape`, out.results.length === 1 && out.results[0].title === 't' && Boolean(out.results[0].snippet))
}

try { getPreset('nope'); check('unknown preset fails', false) } catch { check('unknown preset fails', true) }

const t2 = await WebSearchTools({}, { preset: 'tavily' })
process.env.WEBSEARCH_API_KEY = ''
try {
  await t2.tool.search.execute({ query: 'x' })
  check('missing key hints before HTTP', false)
} catch (e) {
  check('missing key hints before HTTP', e.message.includes('magpie plugin options'))
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
