# tools-websearch

[English](README.md)

为 [magpie](https://usemagpie.ai) 接入的**每一个 agent** 提供联网搜索——一个插件，多家搜索服务。Magpie 把工具挂在自己的 MCP 服务器（`/mcp/magpie/tools`）上，Claude Code、Codex、OpenCode 等所有接入的 agent 无需各自配置即可使用（其实就是为了用anysearch才包的这盘饺子）。

零依赖，参数为纯 JSON Schema。要求 Magpie 版本不低于 v0.1.1260。

## 工具

工具名带插件前缀，前缀由 Magpie 按安装名推导（git 安装取仓库名，并剥离开头的 `tools-`）。从 `github:thdjjsn/magpie-tools-websearch` 安装时工具名为：

| 工具 | 作用 | 适用 preset |
|---|---|---|
| `magpie-tools-websearch_search` | 网页搜索；AnySearch 下可用 `tag` + `params` 走垂直领域搜索 | 全部 |
| `magpie-tools-websearch_fetch` | 抓取一个 URL，返回清洗后的正文 | anysearch、tavily、exa、firecrawl |
| `magpie-tools-websearch_capabilities` | 发现垂直搜索领域及其参数定义 | anysearch |
| `magpie-tools-websearch_config` | 查看当前生效的 preset、baseURL 与密钥来源（永不显示密钥本身） | 全部 |

想要 `websearch_search` 这样的短名：把仓库改名为 `tools-websearch`，Magpie 会推导出短前缀。

## 安装

```sh
magpie plugin add github:thdjjsn/magpie-tools-websearch
magpie plugin        # 应列出本插件及其工具
```

## 配置

安装后设置服务商与凭据：

```sh
magpie plugin options <插件名> '{"preset":"anysearch","apiKey":"as_sk_…"}'
```

`<插件名>` 以 `magpie plugin` 的输出为准。默认值合适时所有字段都可省略：

| 配置项 | 默认值 | 含义 |
|---|---|---|
| `preset` | `anysearch` | `anysearch` · `tavily` · `exa` · `brave` · `searxng` · `firecrawl` |
| `baseURL` | 各 preset 的公开端点 | 自建或代理地址（searxng 必填） |
| `apiKey` | 无 | 服务商密钥；AnySearch 缺省时使用匿名额度 |

每次调用按以下顺序解析，先命中者优先：

1. **插件 options**——`magpie plugin options <插件名> '<json>'`
2. **环境变量**——`WEBSEARCH_PRESET` / `WEBSEARCH_BASE_URL` / `WEBSEARCH_API_KEY`
3. **DSH 凭据库**——`~/.dsh/.credentials.yaml` 里的 `refs.WEBSEARCH_API_KEY`，其次是 `refs.ANYSEARCH_API_KEY`（与 DeepSeek Harness 共用一把 key）
4. 都没有：AnySearch 用匿名额度；其他服务商会返回缺少密钥的提示与应执行的命令

配置完成后，可在任意接入的 agent 里调用 `*_config` 工具自检。

## 各 preset 一览

| preset | 默认 baseURL | 认证方式 | 正文抓取 | 垂直领域目录 |
|---|---|---|---|---|
| `anysearch` | `https://api.anysearch.com` | Bearer（可选） | ✓ | ✓ |
| `tavily` | `https://api.tavily.com` | Bearer | ✓ | — |
| `exa` | `https://api.exa.ai` | `x-api-key` | ✓ | — |
| `brave` | `https://api.search.brave.com` | `X-Subscription-Token` | — | — |
| `searxng` | 自建，需设 `baseURL` | 有 key 时带 Bearer | — | — |
| `firecrawl` | `https://api.firecrawl.dev` | Bearer | ✓ | — |

`anysearch` 经过真实环境实测；其余按各厂商公开 API 文档实现，如遇接口变动欢迎提 issue 或 PR。

## 示例

```sh
# AnySearch：含垂直搜索与正文抓取
magpie plugin options <插件名> '{"preset":"anysearch","apiKey":"as_sk_…"}'

# Tavily
magpie plugin options <插件名> '{"preset":"tavily","apiKey":"tvly-…"}'

# 自建 SearXNG
magpie plugin options <插件名> '{"preset":"searxng","baseURL":"https://searx.example.com"}'
```

## 新增 preset

`providers.mjs` 里每个 preset 是一个小适配器：如何构造请求（`method`、`path`、`body`/`query`）、如何认证（`bearer` 或指定请求头）、如何把响应归一化（`pick`）为 `{ title, url, snippet, content? }`。复制一个改四个函数即可，欢迎 PR。

## 许可证

[MIT](LICENSE)
