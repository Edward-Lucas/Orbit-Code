# Orbit Code

Enhanced [MiMo-Code](https://github.com/XiaomiMiMo/MiMo-Code) with advanced features from [gajae-code](https://github.com/Yeachan-Heo/gajae-code).

## Overview

Orbit Code integrates the best features from gajae-code into MiMo-Code:

- **Extended Thinking** — Multi-level reasoning (off → max)
- **Memory Backend** — 2-phase memory consolidation pipeline
- **Tool Discovery** — BM25-based tool search
- **Coordinator** — Multi-agent orchestration via MCP protocol
- **Plan Mode** — Advanced planning with approval workflow
- **Autoresearch** — Experimental optimization loops

## Architecture

```
orbit_code/
├── packages/
│   ├── mimo-core/          ← MiMo-Code (upstream, auto-synced)
│   └── gajae-features/     ← gajae features (ported)
│       ├── thinking/
│       ├── memory-backend/
│       ├── tool-discovery/
│       ├── coordinator/
│       ├── coordinator-mcp/
│       ├── gjc-runtime/
│       ├── plan-mode/
│       └── autoresearch/
└── scripts/
    ├── sync-mimo.sh        ← Sync MiMo upstream
    └── patch-mimo.sh       ← Apply actor removal patch
```

## Quick Start

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Sync MiMo upstream
bun run sync:mimo

# Apply actor removal patch
bun run patch:mimo
```

## Upstream Sync

Orbit Code maintains MiMo-Code as a git subtree. To sync with upstream:

```bash
# Fetch and merge latest MiMo changes
bun run sync:mimo

# This will:
# 1. Fetch latest from MiMo-Code
# 2. Pull subtree changes
# 3. Re-apply actor removal patch
```

## Key Differences from MiMo-Code

| Feature | MiMo-Code | Orbit Code |
|---------|-----------|------------|
| Multi-agent | Actor system | Coordinator (MCP) |
| Memory | Basic FTS | 2-phase consolidation |
| Thinking | N/A | 7-level reasoning |
| Tool Search | N/A | BM25 search |

## License

MIT

## Credits

- [MiMo-Code](https://github.com/XiaomiMiMo/MiMo-Code) — Base codebase
- [gajae-code](https://github.com/Yeachan-Heo/gajae-code) — Advanced features
