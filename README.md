# tools-websearch

[中文](README.zh-CN.md)

Web search for **every agent** your [magpie](https://usemagpie.ai) connects — one plugin, many search providers. magpie serves the tools on its MCP server (`/mcp/magpie/tools`), so Claude Code, Codex, OpenCode and every other connected agent can search without any per-agent setup.

Zero dependencies. Plain JSON Schema arguments. Requires magpie v0.1.1260 or later.

## Tools

Each tool name carries the plugin prefix, which magpie derives from the install name (repository name for git installs, with a leading `tools-` stripped). Installed from `github:thdjjsn/magpie-tools-websearch` the tools are:

| Tool | What it does | Presets |
|---|---|---|
| `magpie-tools-websearch_search` | Web search; with AnySearch, vertical search via `tag` + `params` | all |
| `magpie-tools-websearch_fetch` | Fetch a URL, return its cleaned main content | anysearch, tavily, exa, firecrawl |
| `magpie-tools-websearch_capabilities` | Discover vertical-search domains and their parameters | anysearch |
| `magpie-tools-websearch_config` | Show the effective preset, base URL and key source (never the key) | all |

Prefer short names like `websearch_search`? Rename the repository to `tools-websearch` and magpie derives the shorter prefix.

## Install

```sh
magpie plugin add github:thdjjsn/magpie-tools-websearch
magpie plugin        # lists the plugin and its tools
```

## Configure

Set the preset and credentials after installation:

```sh
magpie plugin options <name> '{"preset":"anysearch","apiKey":"as_sk_…"}'
```

`<name>` is the plugin as `magpie plugin` lists it. All fields are optional when the defaults fit:

| Option | Default | Meaning |
|---|---|---|
| `preset` | `anysearch` | `anysearch` · `tavily` · `exa` · `brave` · `searxng` · `firecrawl` |
| `baseURL` | the preset's public endpoint | Override for self-hosted or proxied APIs (required for searxng) |
| `apiKey` | — | The provider's key. AnySearch also works anonymously without one |

Resolution per call, first match wins:

1. **Plugin options** — `magpie plugin options <name> '<json>'`
2. **Environment** — `WEBSEARCH_PRESET` / `WEBSEARCH_BASE_URL` / `WEBSEARCH_API_KEY`
3. **DSH credential store** — `refs.WEBSEARCH_API_KEY`, then `refs.ANYSEARCH_API_KEY`, in `~/.dsh/.credentials.yaml` (shares one key with DeepSeek Harness)
4. No key → AnySearch anonymous quota; other providers ask for a key with the exact command to run

Verify the result with the `*_config` tool from any connected agent.

## Presets

| Preset | Default base URL | Auth | Extract | Vertical catalog |
|---|---|---|---|---|
| `anysearch` | `https://api.anysearch.com` | Bearer (optional) | ✓ | ✓ |
| `tavily` | `https://api.tavily.com` | Bearer | ✓ | — |
| `exa` | `https://api.exa.ai` | `x-api-key` | ✓ | — |
| `brave` | `https://api.search.brave.com` | `X-Subscription-Token` | — | — |
| `searxng` | self-hosted, set `baseURL` | Bearer when a key is set | — | — |
| `firecrawl` | `https://api.firecrawl.dev` | Bearer | ✓ | — |

The `anysearch` preset is live-tested. The others follow each vendor's public API documentation; please open an issue or PR if a provider changes its wire format.

## Examples

```sh
# AnySearch with vertical search and URL extract
magpie plugin options <name> '{"preset":"anysearch","apiKey":"as_sk_…"}'

# Tavily
magpie plugin options <name> '{"preset":"tavily","apiKey":"tvly-…"}'

# A self-hosted SearXNG
magpie plugin options <name> '{"preset":"searxng","baseURL":"https://searx.example.com"}'
```

## Add a preset

Each preset in `providers.mjs` is a small adapter: how to build the request (`method`, `path`, `body`/`query`), how to authenticate (`bearer` or a named header), and how to normalize the answer (`pick`) into `{ title, url, snippet, content? }`. Copy one, adjust four functions, send a PR.

## License

[MIT](LICENSE)
