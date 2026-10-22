// Preset adapters: how each search API is called and how its answer is
// normalized to { results: [{ title, url, snippet, content? }], metadata? }.
// `anysearch` is live-tested; the rest follow each vendor's public API docs —
// fixes and more presets are welcome.

const POST = 'POST'
const GET = 'GET'

// AnySearch's metadata arrives snake_case; clients document it camelCase.
function normMetadata(m) {
  if (!m) return m
  const { total_results, search_time_ms, url_less_results, dropped_invalid_url_results, ...rest } = m
  return {
    totalResults: total_results,
    searchTimeMs: search_time_ms,
    ...(url_less_results !== undefined ? { urlLessResults: url_less_results } : {}),
    ...(dropped_invalid_url_results !== undefined ? { droppedInvalidUrlResults: dropped_invalid_url_results } : {}),
    ...rest,
  }
}

export const PRESETS = {
  anysearch: {
    name: 'AnySearch',
    defaultBaseURL: 'https://api.anysearch.com',
    auth: 'bearer',
    keyOptional: true, // anonymous quota exists
    search: {
      method: POST,
      path: '/v1/search',
      body: (a) => ({
        query: a.query,
        ...(a.maxResults !== undefined ? { max_results: a.maxResults } : {}),
        ...(a.tag !== undefined ? { tag: a.tag } : {}),
        ...(a.params !== undefined ? { params: a.params } : {}),
        ...(a.zone !== undefined ? { zone: a.zone } : {}),
        ...(a.language !== undefined ? { language: a.language } : {}),
      }),
      pick: (j) => ({
        metadata: normMetadata(j.data?.metadata),
        results: (j.data?.results ?? []).map((r) => ({
          title: r.title, url: r.url, snippet: r.snippet, ...(r.content ? { content: r.content } : {}),
        })),
      }),
    },
    extract: {
      method: POST,
      path: '/v1/extract',
      body: (a) => ({ url: a.url }),
      pick: (j) => ({ url: j.data?.url, title: j.data?.title, content: j.data?.content }),
    },
    // The wire format is snake_case; normalize to the camelCase catalog shape
    // that AnySearch's own clients document.
    capabilities: {
      domainsPath: '/v1/domains',
      subDomainsPath: '/v1/sub-domains',
      pickDomains: (j) => ({
        domains: (j.data?.domains ?? []).map((d) => ({
          domain: d.domain, description: d.description, subDomainCount: d.sub_domain_count,
        })),
      }),
      pickSubDomains: (j) => ({
        domains: (j.data?.domains ?? []).map((d) => ({
          domain: d.domain,
          description: d.description,
          subDomains: (d.sub_domains ?? []).map((sd) => ({
            subDomain: sd.sub_domain,
            description: sd.description,
            params: Object.fromEntries(Object.entries(sd.params ?? {}).map(([k, p]) => [
              k, { description: p.description, required: p.required, ...(p.sort_order !== undefined ? { sortOrder: p.sort_order } : {}) },
            ])),
          })),
        })),
      }),
    },
  },

  tavily: {
    name: 'Tavily',
    defaultBaseURL: 'https://api.tavily.com',
    auth: 'bearer',
    search: {
      method: POST,
      path: '/search',
      body: (a) => ({ query: a.query, max_results: a.maxResults ?? 10 }),
      pick: (j) => ({
        results: (j.results ?? []).map((r) => ({ title: r.title, url: r.url, snippet: r.content })),
      }),
    },
    extract: {
      method: POST,
      path: '/extract',
      body: (a) => ({ urls: [a.url] }),
      pick: (j) => {
        const r = (j.results ?? [])[0] ?? {}
        return { url: r.url, title: r.title, content: r.raw_content }
      },
    },
  },

  exa: {
    name: 'Exa',
    defaultBaseURL: 'https://api.exa.ai',
    auth: { header: 'x-api-key' },
    search: {
      method: POST,
      path: '/search',
      body: (a) => ({ query: a.query, numResults: a.maxResults ?? 10 }),
      pick: (j) => ({
        results: (j.results ?? []).map((r) => ({ title: r.title, url: r.url, snippet: r.text })),
      }),
    },
    extract: {
      method: POST,
      path: '/contents',
      body: (a) => ({ urls: [a.url], text: true }),
      pick: (j) => {
        const r = (j.results ?? [])[0] ?? {}
        return { url: r.url, title: r.title, content: r.text }
      },
    },
  },

  brave: {
    name: 'Brave Search',
    defaultBaseURL: 'https://api.search.brave.com',
    auth: { header: 'X-Subscription-Token' },
    search: {
      method: GET,
      path: '/res/v1/web/search',
      query: (a) => ({ q: a.query, count: a.maxResults ?? 10 }),
      pick: (j) => ({
        results: (j.web?.results ?? []).map((r) => ({ title: r.title, url: r.url, snippet: r.description })),
      }),
    },
  },

  searxng: {
    name: 'SearXNG',
    defaultBaseURL: null, // self-hosted: baseURL is required
    auth: 'bearer', // sent only when a key is configured
    keyOptional: true,
    search: {
      method: GET,
      path: '/search',
      query: (a) => ({ q: a.query, format: 'json' }),
      pick: (j) => ({
        results: (j.results ?? []).map((r) => ({ title: r.title, url: r.url, snippet: r.content })),
      }),
    },
  },

  firecrawl: {
    name: 'Firecrawl',
    defaultBaseURL: 'https://api.firecrawl.dev',
    auth: 'bearer',
    search: {
      method: POST,
      path: '/v1/search',
      body: (a) => ({ query: a.query, limit: a.maxResults ?? 10 }),
      pick: (j) => ({
        results: (j.data ?? []).map((r) => ({
          title: r.title, url: r.url, snippet: r.description, ...(r.markdown ? { content: r.markdown } : {}),
        })),
      }),
    },
    extract: {
      method: POST,
      path: '/v1/scrape',
      body: (a) => ({ url: a.url, formats: ['markdown'] }),
      pick: (j) => ({ url: j.data?.url ?? j.data?.metadata?.url, title: j.data?.metadata?.title, content: j.data?.markdown }),
    },
  },
}

export function getPreset(id) {
  const preset = PRESETS[id]
  if (!preset) {
    throw new Error(`unknown preset "${id}"; available: ${Object.keys(PRESETS).join(', ')}`)
  }
  return preset
}
