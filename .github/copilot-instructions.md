# AmazonSeller MCP Server – Workspace Instructions

Fork of `mattcoatsworth/AmazonSeller-mcp-server` maintained at `brianmoney/AmazonSeller-mcp-server`.  
Active branch: `brian/stdio-mcp-fixes`. Upstream: `mattcoatsworth`.

Goal: A clean, stdio-safe MCP server for the Amazon Selling Partner API using **LWA-only auth** (no AWS SigV4).

---

## Build and Test

```bash
npm install           # install dependencies
node src/index.js     # run as stdio MCP server (use in MCP host config)
npm run dev           # run with --watch (dev only)
npm run inspect       # launch @modelcontextprotocol/inspector for interactive testing
```

`dotenv` loads `.env` from the project root at startup. Copy `.env.example` → `.env` and fill in credentials before running.

---

## Architecture

```
src/
  index.js          # Stdio entrypoint — dotenv + StdioServerTransport
  server.js         # McpServer construction + tool registration loop
  tools/            # One file per SP-API category, each exports a *Tools object
  utils/auth.js     # LWA token exchange + makeSpApiRequest HTTP helper
  resources/        # MCP resource definitions (api-docs)
```

**Tool registration** in `server.js` iterates each module's exported object:

```js
server.tool(name, toolConfig.description, toolConfig.schema, toolConfig.handler);
// Arg order is CRITICAL: name, description, schema, handler
// Swapping description and schema silently drops all tool descriptions in MCP hosts
```

---

## SP-API Auth — LWA Only

**Do NOT add AWS SigV4 or IAM credentials.** The SP-API accepts LWA access tokens directly.

Working header set (verified against live API):
```js
{
  'x-amz-access-token': accessToken,   // from LWA refresh_token exchange
  'x-amz-date': getAmzDate(),           // ISO 8601 compact, e.g. 20260407T123456Z
  'user-agent': 'amazon-sp-api-mcp-server/1.0.0 (Language=JavaScript)'
  // Content-Type: 'application/json'  -- only for POST/PUT/PATCH with a body
}
```

All HTTP calls go through `makeSpApiRequest(method, path, data?, queryParams?)` in `src/utils/auth.js`. Do not call `axios` directly in tool handlers.

**SP-API base URL** is partition-based (not region-based):

| SP_API_REGION  | Endpoint                              |
|----------------|---------------------------------------|
| us-east-1      | sellingpartnerapi-na.amazon.com       |
| eu-west-1      | sellingpartnerapi-eu.amazon.com       |
| us-west-2      | sellingpartnerapi-fe.amazon.com       |

Override with `SP_API_ENDPOINT_REGION` env var if needed.

**Required env vars:** `SP_API_CLIENT_ID`, `SP_API_CLIENT_SECRET`, `SP_API_REFRESH_TOKEN`, `SP_API_MARKETPLACE_ID`, `SP_API_REGION`

---

## Adding or Editing Tools

Each file in `src/tools/` exports a single `const *Tools` object. Each key is the MCP tool name; each value has `{ schema, handler, description }`:

```js
// src/tools/myCategory.js
import { z } from 'zod';
import { makeSpApiRequest } from '../utils/auth.js';

export const myCategoryTools = {
  doSomething: {
    description: "One-sentence plain-English description for the MCP host",
    schema: {
      param1: z.string().describe("What this param is"),
      param2: z.number().optional().describe("Optional number")
    },
    handler: async ({ param1, param2 }) => {
      try {
        const data = await makeSpApiRequest('GET', '/some/v1/path', null, { Param1: param1 });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error doing something: ${error.message}` }],
          isError: true
        };
      }
    }
  }
};
```

Then import and register in `server.js`:
```js
import { myCategoryTools } from './tools/myCategory.js';
// ...
registerToolsFromModule(myCategoryTools);
```

**Tool name uniqueness is mandatory.** Every tool name must be globally unique across all modules. The server will crash at startup with a duplicate registration error if two tools share a name.

---

## Stdio Safety

`src/index.js` is the stdio transport. **Never write to stdout from top-level module code** — it will corrupt the MCP wire protocol. This means:
- No `console.log(...)` at module top level or in `server.js`/`index.js` startup paths
- `console.error(...)` is safe (goes to stderr)
- `console.log(...)` inside tool `handler` functions is also safe — those run after transport is established

---

## Common Pitfalls

- **Wrong `server.tool()` arg order** — `description` must come before `schema`. The SDK silently accepts the wrong order but MCP hosts will show tools without descriptions.
- **Content-Type on GET** — Sending `Content-Type: application/json` on GET requests causes HTTP 400 from the SP-API. Only set it when `data !== null`.
- **Missing `user-agent`** — Omitting the user-agent header causes SP-API to reject requests even with a valid LWA token.
- **SigV4 temptation** — The old Amazon docs reference SigV4. It is NOT required for the current SP-API when using LWA refresh tokens (Grantless or Seller-authorized). Do not add it.

---

## Git Workflow

```bash
# Remote layout
git remote -v
# origin   https://github.com/brianmoney/AmazonSeller-mcp-server.git
# upstream https://github.com/mattcoatsworth/AmazonSeller-mcp-server.git

# Sync upstream changes
git fetch upstream
git merge upstream/main
```
