#!/bin/bash
set -e

echo "=== Applying Orbit Code MiMo Patch ==="
echo ""

MIMO_CORE="packages/mimo-core"
SRC="$MIMO_CORE/packages/opencode/src"

# ─── Step 1: Remove Actor directories and files ──────────────────────────

echo "Step 1: Removing Actor system..."

ACTOR_PATHS=(
    "$SRC/actor"
    "$SRC/tool/actor.ts"
    "$SRC/tool/actor.txt"
    "$SRC/tool/actor.shell.txt"
)

for path in "${ACTOR_PATHS[@]}"; do
    if [ -e "$path" ]; then
        rm -rf "$path"
        echo "  Removed: $path"
    fi
done

echo "  Actor removal complete."
echo ""

# ─── Step 2: Verify coordinator tool exists ──────────────────────────────

echo "Step 2: Verifying coordinator tool..."

if [ -f "$SRC/tool/coordinator.ts" ]; then
    echo "  coordinator.ts exists — OK"
else
    echo "  WARNING: coordinator.ts not found. It should be committed in orbit_code."
fi

# ─── Step 3: Verify inbox events.ts exists ───────────────────────────────

echo ""
echo "Step 3: Verifying inbox events..."

if [ -f "$SRC/inbox/events.ts" ]; then
    echo "  inbox/events.ts exists — OK"
else
    echo "  WARNING: inbox/events.ts not found. It should be committed in orbit_code."
fi

echo ""
echo "=== Patch Complete ==="
echo ""
echo "NOTE: After syncing MiMo upstream, the following files may need"
echo "manual review if MiMo changed them:"
echo "  - tool/registry.ts (actor imports + coordinator registration)"
echo "  - session/checkpoint.ts (actor imports)"
echo "  - session/prompt.ts (actor imports)"
echo "  - session/llm.ts (actor imports)"
echo "  - session/prune.ts (actor imports)"
echo "  - session/session.ts (actor imports)"
echo "  - effect/app-runtime.ts (actor layers)"
echo "  - inbox/inbox.ts (ActorRegistry import)"
echo "  - workflow/runtime.ts (spawnRef import)"
echo "  - server/routes/instance/session.ts (ActorRegistry import)"
