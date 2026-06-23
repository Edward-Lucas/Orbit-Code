#!/bin/bash
# Orbit Code - Upstream Sync Script
# MiMo-Code에서 AI 엔진 관련 변경사항을 동기화합니다.

set -e

# 설정
UPSTREAM_URL="https://github.com/XiaomiMiMo/MiMo-Code.git"
UPSTREAM_BRANCH="main"
LOCAL_PATH="packages/ai-engine/mimo-core"
TEMP_DIR="/tmp/mimo-sync"

echo "🔄 Orbit Code Upstream Sync"
echo "=========================="

# 기존 임시 디렉토리 정리
rm -rf "$TEMP_DIR"

# MiMo-Code 클론 (shallow)
echo "📥 MiMo-Code 클론 중..."
git clone --depth 1 --branch "$UPSTREAM_BRANCH" "$UPSTREAM_URL" "$TEMP_DIR"

# 동기화할 디렉토리 목록
SYNC_DIRS=(
  "packages/opencode/src/agent"
  "packages/opencode/src/tool"
  "packages/opencode/src/session"
  "packages/opencode/src/memory"
)

# 동기화 실행
echo "📂 파일 동기화 중..."
for dir in "${SYNC_DIRS[@]}"; do
  if [ -d "$TEMP_DIR/$dir" ]; then
    echo "  - $dir"
    mkdir -p "$LOCAL_PATH/$(dirname $dir)"
    cp -r "$TEMP_DIR/$dir" "$LOCAL_PATH/$dir"
  fi
done

# 정리
echo "🧹 임시 파일 정리 중..."
rm -rf "$TEMP_DIR"

echo "✅ 동기화 완료!"
echo ""
echo "변경사항 확인: git status"
echo "변경사항 반영: git add . && git commit -m 'chore: sync with MiMo-Code'"
