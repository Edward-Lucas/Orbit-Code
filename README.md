# Orbit Code

Enhanced [MiMo-Code](https://github.com/XiaomiMiMo/MiMo-Code) with advanced features from [gajae-code](https://github.com/Yeachan-Heo/gajae-code).

## Overview

Orbit Code는 Xiaomi의 터미널 네이티브 AI 코딩 어시스턴트인 MiMo-Code를 기반으로, gajae-code의 고급 기능을 통합한 프로젝트입니다.

### 주요 기능

| 모듈 | 설명 | 상태 |
|------|------|------|
| **Memory Backend** | FTS5 기반 메모리 시스템, 플러그형 백엔드 | ✅ 통합 완료 |
| **Coordinator** | MCP 기반 멀티 에이전트 오케스트레이션 | ✅ 통합 완료 |
| **Thinking** | 7단계 reasoning effort 시스템 (off ~ max) | ✅ 통합 완료 |
| **Tool Discovery** | BM25 기반 자연어 도구 검색 | ✅ 통합 완료 |
| **Plan Mode** | 승인 워크플로우가 있는 계획 모드 | ✅ 통합 완료 |
| **GJC Runtime** | `.orbit/` 디렉토리 구조, tmux 세션 관리 | ✅ 통합 완료 |
| **Autoresearch** | 실험적 자동 최적화 루프 | ✅ 통합 완료 |

---

## Quick Start

### 사전 요구사항

| 도구 | 버전 | 확인 명령어 |
|------|------|-----------|
| **Bun** | 1.3.11 이상 | `bun --version` |
| **Git** | 2.x 이상 | `git --version` |
| **Node.js** | 18.x 이상 (선택) | `node --version` |

> **Windows 사용자**: PowerShell 또는 Git Bash를 권장합니다.

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/Edward-Lucas/Orbit-Code.git
cd Orbit-Code

# 2. 의존성 설치
cd packages/mimo-core
bun install

# 3. 프로젝트 실행
bun run dev
```

실행 후 터미널에 다음과 같이 표시됩니다:

```
● Accessing workspace:
│ C:\...\packages\mimo-core\packages\opencode
│
◆ Yes, I trust this folder   ← Enter 키로 선택
○ No, exit
```

"**Yes, I trust this folder**"을 선택하면 MiMo Code CLI가 시작됩니다.

---

## 다른 디렉토리에서 실행하기

Orbit Code를 다른 프로젝트 디렉토리에서 실행하는 방법입니다.

### PowerShell (권장)

```powershell
# Orbit Code가 설치된 디렉토리에서
cd C:\Users\AtlasServer\Documents\MiFun\orbit_code

# 다른 프로젝트에서 실행
powershell -ExecutionPolicy Bypass -File bin\orbit.ps1
```

### CMD

```cmd
# Orbit Code가 설치된 디렉토리에서
cd C:\Users\AtlasServer\Documents\MiFun\orbit_code

# 다른 프로젝트에서 실행
bin\orbit.cmd
```

### 전역 명령어 등록

PowerShell 프로필에 alias를 추가하면 어디서든 `orbit` 명령어를 사용할 수 있습니다:

```powershell
# PowerShell 프로필 열기
notepad $PROFILE

# 다음 줄 추가:
function orbit { & "C:\Users\AtlasServer\Documents\MiFun\orbit_code\bin\orbit.ps1" @args }

# 프로필 다시 로드
. $PROFILE
```

이제 다른 프로젝트에서 실행:

```powershell
cd C:\Users\AtlasServer\Documents\MyProject
orbit
```

### 실행 시 동작

다른 디렉토리에서 실행하면 해당 디렉토리의 파일을 읽고 편집할 수 있습니다:

```
● Accessing workspace:
│ C:\Users\AtlasServer\Documents\MyProject   ← 현재 디렉토리
│
◆ Yes, I trust this folder
○ No, exit
```

---

## 프로젝트 구조

```
orbit_code/
├── packages/
│   ├── mimo-core/                    ← MiMo-Code 업스트림 (git subtree)
│   │   └── packages/
│   │       ├── opencode/             ← 핵심 CLI (@mimo-ai/cli)
│   │       │   └── src/
│   │       │       ├── tool/
│   │       │       │   ├── coordinator.ts        ← Coordinator 도구
│   │       │       │   ├── coordinator-spawn.ts   ← 에이전트 spawn 어댑터
│   │       │       │   ├── memory-backend.ts      ← 메모리 관리 도구
│   │       │       │   ├── autoresearch.ts        ← 실험 관리 도구
│   │       │       │   └── registry.ts            ← 도구 등록
│   │       │       ├── memory/
│   │       │       │   └── service.ts             ← 메모리 서비스
│   │       │       ├── provider/
│   │       │       │   └── thinking-adapter.ts    ← thinking 브릿지
│   │       │       └── session/
│   │       │           └── orbit-layout.ts        ← .orbit/ layout
│   │       ├── app/                  ← 웹 프론트엔드 (SolidJS)
│   │       └── desktop/              ← Electron 데스크톱 앱
│   │
│   └── gajae-features/               ← Orbit Code 고유 기능
│       ├── thinking/                 ← 7단계 reasoning effort
│       ├── memory-backend/           ← 플러그형 메모리 백엔드
│       ├── tool-discovery/           ← BM25 도구 검색 엔진
│       ├── coordinator/              ← Coordinator 타입 정의
│       ├── coordinator-mcp/          ← Coordinator 상태 관리
│       ├── gjc-runtime/              ← 세션 layout, tmux 유틸
│       ├── plan-mode/                ← 계획 모드 유틸
│       └── autoresearch/             ← 실험 관리 프레임워크
│
└── scripts/
    ├── sync-mimo.sh                  ← 업스트림 동기화
    └── patch-mimo.sh                 ← Actor 시스템 제거 패치
```

---

## 사용법

### 1. 메모리 관리 (`memory_backend`)

메모리 시스템의 상태를 확인하고 관리합니다.

```
# 상태 확인
memory_backend({ operation: { action: "status" } })

# 메모리 인덱스 갱신 (파일 변경 후 즉시 반영)
memory_backend({ operation: { action: "enqueue" } })

# 메모리 초기화
memory_backend({ operation: { action: "clear" } })
```

### 2. Coordinator (`coordinator`)

멀티 에이전트 오케스트레이션을 관리합니다.

```
# 세션 목록 조회
coordinator({ operation: { action: "list_sessions" } })

# 작업 위임 (메모리 컨텍스트 포함 + 에이전트 실행)
coordinator({ operation: {
  action: "delegate_execute",
  cwd: "/path/to/project",
  task: "로그인 버그 수정"
}})

# 팀 위임 (리더 + 워커 에이전트)
coordinator({ operation: {
  action: "delegate_team",
  cwd: "/path/to/project",
  task: "대규모 리팩토링",
  worker_count: 3
}})

# 이벤트 조회
coordinator({ operation: { action: "watch_events" } })
```

### 3. Autoresearch (`autoresearch`)

반복적 벤치마크/최적화 실험을 관리합니다.

```
# 실험 초기화
autoresearch({ operation: {
  action: "init",
  metric_name: "latency_ms",
  direction: "lower",
  goal: "API 응답 시간 최적화"
}})

# 결과 기록
autoresearch({ operation: {
  action: "record",
  commit: "abc123",
  metric: 150,
  status: "keep",
  description: "캐싱 적용"
}})

# 상태 확인
autoresearch({ operation: { action: "status" } })

# 최고 결과 확인
autoresearch({ operation: { action: "best" } })
```

### 4. 도구 검색

자연어로 도구를 검색합니다 (BM25 기반).

```typescript
// registry의 search 메서드 사용
const results = await registry.search("파일 편집", 5)
// → edit, write 등 관련 도구 반환
```

### 5. 사고 수준 제어 (Thinking)

모델의 reasoning effort를 제어합니다.

```typescript
import { resolveEffortForModel, getModelEfforts } from "@/provider/thinking-adapter"

// 모델이 지원하는 사고 수준 확인
const efforts = getModelEfforts(model)
// → ["minimal", "low", "medium", "high", "xhigh", "max"]

// 사고 수준 설정 (모델에 맞게 자동 조정)
const effort = resolveEffortForModel(model, "high")
```

---

## 설정

### mimocode.json

프로젝트 루트 또는 `~/.config/mimocode/mimocode.json`에 설정 파일을 생성합니다:

```json
{
  "memory": {
    "backend": "local",
    "enabled": true,
    "cc_index": false
  }
}
```

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `memory.backend` | 메모리 백엔드 (`"off"`, `"local"`, `"hindsight"`) | `"local"` |
| `memory.enabled` | 메모리 활성화 여부 | `true` |
| `memory.cc_index` | Claude Code 메모리 인덱싱 | `false` |

### 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `ORBIT_TMUX_COMMAND` | tmux 명령어 경로 | `tmux` |
| `ORBIT_TMUX_SESSION` | tmux 세션 이름 | 자동 생성 |
| `ORBIT_COORDINATOR_MCP_STATE_ROOT` | Coordinator 상태 루트 | `.orbit/` |

---

## 개발

### 타입 체크

```bash
cd packages/mimo-core/packages/opencode
bun run typecheck
```

> **참고**: `inbox/inbox.ts`와 `session/prompt.ts`의 일부 오류는 기존 MiMo-Code의 사전 존재하는 이슈입니다.

### 빌드

```bash
cd packages/mimo-core
bun run build
```

### 업스트림 동기화

```bash
# MiMo-Code 최신 변경사항 가져오기
bash scripts/sync-mimo.sh

# Actor 시스템 제거 패치 적용
bash scripts/patch-mimo.sh
```

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 언어 | TypeScript |
| 런타임 | Bun (1.3.11) |
| 빌드 | Turborepo |
| 프론트엔드 | SolidJS + Tailwind CSS |
| 데스크톱 | Electron |
| ORM | Drizzle ORM + SQLite |
| AI 통합 | Vercel AI SDK (15+ 프로바이더) |
| 프로토콜 | MCP (Model Context Protocol) |

---

## Architecture

### 통합 패턴

gajae-features 모듈은 두 가지 패턴으로 MiMo 코어에 통합됩니다:

1. **Adapter 패턴**: gajae 모듈의 인터페이스를 MiMo 서비스에 연결
   - 예: `memory-backend/adapter.ts` → `memory/service.ts`

2. **Direct Import 패턴**: gajae 모듈의 함수를 직접 import
   - 예: `tool-discovery/index.ts` → `tool/registry.ts`

### 데이터 흐름

```
사용자 입력
    ↓
Session Prompt
    ↓
┌───────────────┬───────────────┬───────────────┐
│  Memory       │  Coordinator  │  Tools        │
│  Backend      │  + Spawn      │  + Discovery  │
└───────────────┴───────────────┴───────────────┘
    ↓               ↓               ↓
FTS5 인덱스    서브 에이전트    BM25 검색
    ↓               ↓               ↓
  결과 수집 ←────────────────────────┘
    ↓
  응답 반환
```

---

## License

MIT

## Credits

- [MiMo-Code](https://github.com/XiaomiMiMo/MiMo-Code) — Base codebase
- [gajae-code](https://github.com/Yeachan-Heo/gajae-code) — Orchestration features
