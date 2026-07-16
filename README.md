# Orbit Code

Enhanced [MiMo-Code](https://github.com/XiaomiMiMo/MiMo-Code) with advanced features from [gajae-code](https://github.com/Yeachan-Heo/gajae-code).

## Overview

Orbit Code integrates gajae-code's orchestration capabilities into MiMo-Code through the **gajae SDK protocol**. Instead of porting gajae's internal modules directly, Orbit Code implements the SDK WebSocket interface to leverage gajae's mature feature set.

### Why SDK-based integration?

gajae-code redesigned its architecture around the SDK as the canonical external bus (v0.11.0+). This means:

- **No module porting required** — connect via SDK protocol, not internal APIs
- **Stable contract** — SDK schema versioning protects against breaking changes
- **Automatic compatibility** — gajae handles translation between systems
- **Lower maintenance** — gajae updates don't require re-porting

### Features from gajae-code

| Feature | Description | gajae Skill/Agent |
|---------|-------------|-------------------|
| Deep Interview | Clarify vague requirements before coding | `deep-interview` |
| Planning | Build and critique implementation plans | `ralplan` |
| Execution Tracking | Track goals, revisions, and evidence | `ultragoal` |
| Parallel Workers | tmux-backed parallel execution | `team` |
| Role Agents | Specialized agents for different tasks | `executor`, `architect`, `planner`, `critic` |

## Architecture

### Current (v2) — SDK-based integration

```
Orbit Code
├── packages/
│   ├── mimo-core/              ← MiMo-Code (upstream, auto-synced)
│   └── orbit-sdk-bridge/       ← SDK bridge (NEW)
│       ├── src/
│       │   ├── sdk-client.ts   ← gajae SDK WebSocket client
│       │   ├── mimo-tools.ts   ← Register MiMo as gajae tool provider
│       │   └── workflows/      ← Pre-defined workflow configs
│       └── package.json
├── .orbit/
│   └── config.yml              ← Shared configuration
├── docs/
│   ├── integration.md          ← Integration guide
│   └── workflows.md            ← Workflow documentation
└── scripts/
    ├── setup.sh                ← Install both tools
    └── sync-mimo.sh            ← Sync MiMo upstream
```

### Previous (v1) — Direct module porting (deprecated)

```
packages/gajae-features/        ← DEPRECATED: direct porting approach
├── thinking/                   ← 177 lines, not integrated
├── memory-backend/             ← 257 lines, not integrated
├── tool-discovery/             ← 310 lines, not integrated
├── coordinator/                ← 183 lines, type definitions
├── coordinator-mcp/            ← 598 lines, partially integrated
├── gjc-runtime/                ← 225 lines, not integrated
├── plan-mode/                  ← 165 lines, not integrated
└── autoresearch/               ← 522 lines, not integrated
```

**Status**: 87% of gajae-features code is unused. The v1 approach is abandoned in favor of SDK-based integration.

## Implementation Plan

### Phase 1: Foundation (Week 1)

| Task | Description | Effort |
|------|-------------|--------|
| 1.1 | Install gajae-code alongside MiMo | 0.5 day |
| 1.2 | Study gajae SDK protocol (`docs/sdk.md`) | 1 day |
| 1.3 | Create `orbit-sdk-bridge` package skeleton | 0.5 day |
| 1.4 | Implement basic SDK WebSocket client | 2 days |
| 1.5 | Test connection to gajae SDK | 0.5 day |

**Deliverable**: SDK client that connects to gajae and can start/listen to sessions.

### Phase 2: MiMo Integration (Week 2)

| Task | Description | Effort |
|------|-------------|--------|
| 2.1 | Register MiMo tools as gajae-compatible | 2 days |
| 2.2 | Implement session synchronization | 1 day |
| 2.3 | Handle gajae events in MiMo context | 1 day |
| 2.4 | Error handling and reconnection logic | 1 day |

**Deliverable**: MiMo can receive and execute tasks delegated by gajae.

### Phase 3: Workflow Integration (Week 3)

| Task | Description | Effort |
|------|-------------|--------|
| 3.1 | Define workflow configurations | 1 day |
| 3.2 | Implement `deep-interview` → `ralplan` → `ultragoal` flow | 2 days |
| 3.3 | Add `team` parallel execution support | 1.5 days |
| 3.4 | User-facing CLI commands (`orbit plan`, `orbit execute`) | 0.5 day |

**Deliverable**: End-to-end workflow from planning to execution.

### Phase 4: Polish & Documentation (Week 4)

| Task | Description | Effort |
|------|-------------|--------|
| 4.1 | Write integration documentation | 1 day |
| 4.2 | Create usage examples | 1 day |
| 4.3 | Test with real-world scenarios | 2 days |
| 4.4 | Clean up deprecated v1 code | 0.5 day |

**Deliverable**: Production-ready Orbit Code with documentation.

## Quick Start

```bash
# Prerequisites
# - MiMo-Code installed
# - gajae-code installed

# Clone Orbit Code
git clone https://github.com/Edward-Lucas/Orbit-Code.git
cd Orbit-Code

# Install dependencies
bun install

# Configure
cp .orbit/config.example.yml .orbit/config.yml
# Edit config.yml with your settings

# Run
bun run orbit --help
```

## Configuration

```yaml
# .orbit/config.yml
gajae:
  sdk_port: 3000           # gajae SDK WebSocket port
  auto_connect: true       # Auto-connect on startup

mimo:
  workdir: .               # Working directory for MiMo

workflows:
  default: code-review     # Default workflow
  custom:
    - name: refactor
      steps:
        - skill: deep-interview
        - skill: ralplan
        - skill: ultragoal
```

## Usage Examples

### Code Review

```bash
orbit review src/module.ts
# → deep-interview: clarify review scope
# → ralplan: plan review approach
# → ultragoal: execute review with evidence
```

### Feature Implementation

```bash
orbit implement "Add user authentication"
# → deep-interview: clarify requirements
# → ralplan: design implementation plan
# → team: parallel execution with multiple workers
# → ultragoal: verify completion
```

### Refactoring

```bash
orbit refactor src/legacy-module.ts
# → deep-interview: identify refactoring goals
# → ralplan: plan safe refactoring steps
# → ultragoal: execute with rollback capability
```

## Key Differences from v1

| Aspect | v1 (Module Porting) | v2 (SDK Integration) |
|--------|--------------------|--------------------|
| Integration method | Port internal modules | SDK protocol |
| Code to write | 2,419 lines | ~300 lines |
| gajae dependency | Internal APIs | SDK schema |
| Update process | Re-port on each update | Check SDK version |
| Maintenance cost | High | Low |

## Upstream Sync

Orbit Code maintains MiMo-Code as a git subtree:

```bash
# Sync with MiMo upstream
bun run sync:mimo

# This will:
# 1. Fetch latest from MiMo-Code
# 2. Pull subtree changes
# 3. Preserve SDK bridge integration
```

## License

MIT

## Credits

- [MiMo-Code](https://github.com/XiaomiMiMo/MiMo-Code) — Base codebase
- [gajae-code](https://github.com/Yeachan-Heo/gajae-code) — Orchestration features via SDK
