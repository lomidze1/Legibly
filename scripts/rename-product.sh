#!/usr/bin/env bash
#
# rename-product.sh — Bulk rename product placeholder across docs/
#
# Usage:
#   ./scripts/rename-product.sh "NewName"
#   ./scripts/rename-product.sh "NewName" "newname"     # explicit slug
#
# What it does:
#   Replaces {{PRODUCT_NAME}} and {{PRODUCT_NAME_SLUG}} tokens in:
#     - docs/*.md (excluding architecture.md — manual)
#     - CLAUDE.md
#     - README.md
#     - .claude/agents/*.md
#     - .claude/skills/**/*.md
#
# What it does NOT touch:
#   - docs/architecture.md (legacy, literal "Designer" references — manual edit needed)
#   - .git/
#   - node_modules/ (if any)
#
# After running:
#   1. Manually edit docs/architecture.md if needed
#   2. Update docs/branding.md PRODUCT_NAME field
#   3. Update GitHub repo description: gh repo edit --description "..."
#   4. Consider renaming the repo itself

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <NewName> [newname-slug]"
  echo ""
  echo "Example: $0 'Bauhaus' bauhaus"
  exit 1
fi

NEW_NAME="$1"
NEW_SLUG="${2:-$(echo "$NEW_NAME" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]')}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "→ Replacing {{PRODUCT_NAME}} with: $NEW_NAME"
echo "→ Replacing {{PRODUCT_NAME_SLUG}} with: $NEW_SLUG"
echo "→ Repo root: $REPO_ROOT"
echo ""

# Targets (whitelist — avoid accidentally rewriting binaries or git internals)
FILES=$(find "$REPO_ROOT" \
  -type f \
  \( -name "*.md" -o -name "*.json" -o -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/docs/architecture.md" \
  -not -path "*/scripts/rename-product.sh" \
)

if [[ -z "$FILES" ]]; then
  echo "⚠️  No files to process."
  exit 0
fi

# Counters
SHORT_COUNT=0
SLUG_COUNT=0

# macOS sed needs -i ''; Linux sed needs -i
SED_IN_PLACE="-i ''"
if [[ "$(uname)" != "Darwin" ]]; then
  SED_IN_PLACE="-i"
fi

while IFS= read -r file; do
  if grep -q "{{PRODUCT_NAME}}" "$file" 2>/dev/null; then
    eval sed $SED_IN_PLACE 's/{{PRODUCT_NAME}}/'"$NEW_NAME"'/g' "$file"
    SHORT_COUNT=$((SHORT_COUNT + 1))
  fi
  if grep -q "{{PRODUCT_NAME_SLUG}}" "$file" 2>/dev/null; then
    eval sed $SED_IN_PLACE 's/{{PRODUCT_NAME_SLUG}}/'"$NEW_SLUG"'/g' "$file"
    SLUG_COUNT=$((SLUG_COUNT + 1))
  fi
done <<< "$FILES"

echo "✓ Replaced {{PRODUCT_NAME}} in $SHORT_COUNT files"
echo "✓ Replaced {{PRODUCT_NAME_SLUG}} in $SLUG_COUNT files"
echo ""
echo "Remaining manual steps:"
echo "  1. Edit docs/branding.md → update PRODUCT_NAME field to '$NEW_NAME'"
echo "  2. Review docs/architecture.md — literal 'Designer' may need replacement"
echo "  3. Update GitHub: gh repo edit --description '...'"
echo "  4. Consider renaming repo: gh api repos/owner/repo -X PATCH -f name='$NEW_SLUG'"
echo ""
echo "→ Run 'git diff' to review changes before committing."
