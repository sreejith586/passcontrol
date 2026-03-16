#!/usr/bin/env bash
# Configure git to use .githooks and make hook scripts executable.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
GITHOOKS_DIR="$REPO_ROOT/.githooks"

cd "$REPO_ROOT"

# Point git at .githooks for hooks
git config core.hooksPath .githooks

# Make hooks executable
chmod +x "$GITHOOKS_DIR/pre-commit" 2>/dev/null || true
chmod +x "$SCRIPT_DIR/check-ai-docs.sh"

echo "Git hooks configured. Hooks path: .githooks"
echo "Run 'git commit' to trigger the pre-commit AI doc reminder."
echo "Remember to run this script after cloning the repo on a new machine."
