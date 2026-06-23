#!/bin/bash
set -e

echo "=== MiMo-Code Upstream Sync ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "turbo.json" ] && [ ! -d "packages/mimo-core" ]; then
    echo -e "${RED}Error: Run this script from the orbit_code root directory${NC}"
    exit 1
fi

# Step 1: Fetch latest from MiMo upstream
echo -e "${YELLOW}Step 1: Fetching latest MiMo-Code upstream...${NC}"
git fetch mimo-upstream main --depth=1
echo -e "${GREEN}✓ Fetched latest upstream${NC}"
echo ""

# Step 2: Get current and new commit hashes
CURRENT=$(git log --format="%H" -1 -- packages/mimo-core)
NEW=$(git rev-parse mimo-upstream/main)
echo "Current mimo-core commit: ${CURRENT:0:12}"
echo "New upstream commit:      ${NEW:0:12}"
echo ""

if [ "$CURRENT" = "$NEW" ]; then
    echo -e "${GREEN}Already up to date!${NC}"
    exit 0
fi

# Step 3: Pull subtree
echo -e "${YELLOW}Step 2: Pulling MiMo-Code subtree...${NC}"
git subtree pull --prefix=packages/mimo-core mimo-upstream main --squash -m "sync: update mimo-core from upstream"
echo -e "${GREEN}✓ Subtree updated${NC}"
echo ""

# Step 4: Re-apply actor removal patch
echo -e "${YELLOW}Step 3: Re-applying actor removal patch...${NC}"
if [ -f "scripts/patch-mimo.sh" ]; then
    bash scripts/patch-mimo.sh
    echo -e "${GREEN}✓ Actor removal patch applied${NC}"
else
    echo -e "${YELLOW}Warning: scripts/patch-mimo.sh not found, skipping actor removal${NC}"
fi
echo ""

# Step 5: Check for conflicts
echo -e "${YELLOW}Step 4: Checking for build issues...${NC}"
if [ -f "package.json" ]; then
    echo "Run 'bun install' and 'bun run typecheck' to verify the sync"
fi
echo ""

echo -e "${GREEN}=== Sync Complete ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff HEAD~1"
echo "  2. Install deps:   bun install"
echo "  3. Type check:     bun run typecheck"
echo "  4. Commit:         git add . && git commit -m 'chore: sync mimo-core upstream'"
