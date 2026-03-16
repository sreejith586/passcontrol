#!/usr/bin/env bash
# Check if staged changes touch architecture-impacting paths without AI doc updates.
# Warning only; never blocks the commit.

set -e

ARCH_PATHS=("src/" "scripts/" "prisma/")
AI_DOC_PATHS=("docs/ai/" "scripts/ai/")

arch_changed=false
ai_doc_changed=false

staged=$(git diff --cached --name-only 2>/dev/null || true)

for path in "${ARCH_PATHS[@]}"; do
  if echo "$staged" | grep -q "^${path}"; then
    arch_changed=true
    break
  fi
done

for path in "${AI_DOC_PATHS[@]}"; do
  if echo "$staged" | grep -q "^${path}"; then
    ai_doc_changed=true
    break
  fi
done

if [ "$arch_changed" = true ] && [ "$ai_doc_changed" = false ]; then
  echo ""
  echo "⚠️  AI Doc Reminder"
  echo "    Staged changes touch src/, scripts/, or prisma/ but not docs/ai/ or scripts/ai/."
  echo "    Consider updating the AI Collaboration Kit per docs/ai/ai-doc-update-policy.md"
  echo "    Purely internal changes (refactors, bug fixes, tests, config) can ignore this."
  echo ""
fi

exit 0
