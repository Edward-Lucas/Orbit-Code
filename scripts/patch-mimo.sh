#!/bin/bash
set -e

echo "=== Applying MiMo Actor Removal Patch ==="

MIMO_CORE="packages/mimo-core"

# Actor directories and files to remove
ACTOR_PATHS=(
    "$MIMO_CORE/packages/opencode/src/actor"
    "$MIMO_CORE/packages/opencode/src/tool/actor.ts"
    "$MIMO_CORE/packages/opencode/src/tool/actor.txt"
    "$MIMO_CORE/packages/opencode/src/tool/actor.shell.txt"
)

# Remove actor directories/files
for path in "${ACTOR_PATHS[@]}"; do
    if [ -e "$path" ]; then
        rm -rf "$path"
        echo "  Removed: $path"
    fi
done

echo ""
echo "Actor removal complete."
echo ""
echo "NOTE: Additional patches may be needed for:"
echo "  - packages/opencode/src/tool/registry.ts (remove actor imports)"
echo "  - packages/opencode/src/session/checkpoint.ts (remove actor refs)"
echo "  - packages/opencode/src/effect/app-runtime.ts (remove actor layer)"
echo ""
echo "These require manual review as they change with each MiMo update."
