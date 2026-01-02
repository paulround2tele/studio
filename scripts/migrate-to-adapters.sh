#!/bin/bash
# TailAdmin Adapter Migration Codemod
# 
# This script replaces shadcn/ui component imports with TailAdmin adapters.
# Run only after adapters are present and compiled.
#
# Usage: ./scripts/migrate-to-adapters.sh [--dry-run] [file-pattern]
#
# Examples:
#   ./scripts/migrate-to-adapters.sh --dry-run              # Preview all changes
#   ./scripts/migrate-to-adapters.sh                         # Apply all changes
#   ./scripts/migrate-to-adapters.sh src/components/campaigns  # Specific folder

set -e

DRY_RUN=false
TARGET_PATH="src"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      TARGET_PATH="$1"
      shift
      ;;
  esac
done

echo "=== TailAdmin Adapter Migration Codemod ==="
echo "Target path: $TARGET_PATH"
echo "Dry run: $DRY_RUN"
echo ""

# Function to apply replacements
apply_replacement() {
  local pattern="$1"
  local replacement="$2"
  local description="$3"
  
  echo "Checking: $description"
  
  if $DRY_RUN; then
    grep -r --include="*.tsx" --include="*.ts" -l "$pattern" "$TARGET_PATH" 2>/dev/null || true
  else
    # Use find + sed for cross-platform compatibility
    find "$TARGET_PATH" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec grep -l "$pattern" {} \; 2>/dev/null | while read file; do
      echo "  Updating: $file"
      sed -i "s|$pattern|$replacement|g" "$file"
    done
  fi
}

echo "=== Phase 1: Input Adapter Migration ==="
echo ""

# Note: shadcn Input uses { Input } named export, adapter uses default export
# This requires manual intervention for complex cases

echo "Files using shadcn Input:"
grep -r --include="*.tsx" "from '@/components/ui/input'" "$TARGET_PATH" 2>/dev/null | head -20 || echo "  (none found)"
grep -r --include="*.tsx" 'from "@/components/ui/input"' "$TARGET_PATH" 2>/dev/null | head -20 || echo ""

echo ""
echo "=== Phase 2: Textarea Adapter Migration ==="
echo ""

echo "Files using shadcn Textarea:"
grep -r --include="*.tsx" "from '@/components/ui/textarea'" "$TARGET_PATH" 2>/dev/null | head -20 || echo "  (none found)"
grep -r --include="*.tsx" 'from "@/components/ui/textarea"' "$TARGET_PATH" 2>/dev/null | head -20 || echo ""

echo ""
echo "=== Phase 3: Select Adapter Migration ==="
echo ""

echo "Files using shadcn Select:"
grep -r --include="*.tsx" "from '@/components/ui/select'" "$TARGET_PATH" 2>/dev/null | head -20 || echo "  (none found)"
grep -r --include="*.tsx" 'from "@/components/ui/select"' "$TARGET_PATH" 2>/dev/null | head -20 || echo ""

echo ""
echo "=== Phase 4: Dialog/AlertDialog Adapter Migration ==="
echo ""

echo "Files using shadcn Dialog:"
grep -r --include="*.tsx" "from '@/components/ui/dialog'" "$TARGET_PATH" 2>/dev/null | head -20 || echo "  (none found)"
grep -r --include="*.tsx" 'from "@/components/ui/dialog"' "$TARGET_PATH" 2>/dev/null | head -20 || echo ""

echo ""
echo "=== Phase 5: Switch Adapter Migration ==="
echo ""

echo "Files using shadcn Switch:"
grep -r --include="*.tsx" "from '@/components/ui/switch'" "$TARGET_PATH" 2>/dev/null | head -20 || echo "  (none found)"
grep -r --include="*.tsx" 'from "@/components/ui/switch"' "$TARGET_PATH" 2>/dev/null | head -20 || echo ""

echo ""
echo "=== Phase 6: Tabs Adapter Migration ==="
echo ""

echo "Files using shadcn Tabs:"
grep -r --include="*.tsx" "from '@/components/ui/tabs'" "$TARGET_PATH" 2>/dev/null | head -20 || echo "  (none found)"
grep -r --include="*.tsx" 'from "@/components/ui/tabs"' "$TARGET_PATH" 2>/dev/null | head -20 || echo ""

echo ""
echo "=== Phase 7: Tooltip Adapter Migration ==="
echo ""

echo "Files using shadcn Tooltip:"
grep -r --include="*.tsx" "from '@/components/ui/tooltip'" "$TARGET_PATH" 2>/dev/null | head -20 || echo "  (none found)"
grep -r --include="*.tsx" 'from "@/components/ui/tooltip"' "$TARGET_PATH" 2>/dev/null | head -20 || echo ""

echo ""
echo "=== Phase 8: Slider/Range Adapter Migration ==="
echo ""

echo "Files using shadcn Slider:"
grep -r --include="*.tsx" "from '@/components/ui/slider'" "$TARGET_PATH" 2>/dev/null | head -20 || echo "  (none found)"
grep -r --include="*.tsx" 'from "@/components/ui/slider"' "$TARGET_PATH" 2>/dev/null | head -20 || echo ""

echo ""
echo "=== Summary ==="
echo ""
echo "IMPORTANT: shadcn components have complex APIs (Select with SelectContent,"
echo "SelectItem, etc.) that don't map 1:1 to TailAdmin adapters."
echo ""
echo "Migration must be done manually per-file with these patterns:"
echo ""
echo "1. InputAdapter: Replace { Input } → InputAdapter (default import)"
echo "   - Props are mostly compatible (value, onChange, disabled, etc.)"
echo "   - Add error={!!errors.fieldName} for form validation"
echo ""
echo "2. TextAreaAdapter: Replace { Textarea } → TextAreaAdapter"
echo "   - Same pattern as Input"
echo ""
echo "3. SelectAdapter: Major refactor required"
echo "   - shadcn: <Select><SelectTrigger><SelectValue/></SelectTrigger>"
echo "             <SelectContent><SelectItem/></SelectContent></Select>"
echo "   - Adapter: <SelectAdapter options={[]} value={} onChange={}/>"
echo ""
echo "4. DialogAdapter: Replace AlertDialog compound component"
echo "   - Adapter: <DialogAdapter isOpen={} onOpenChange={} title={} .../>"
echo ""
echo "5. SwitchAdapter: Controlled wrapper"
echo "   - Adapter: <SwitchAdapter checked={} onChange={} label={}/>"
echo ""
echo "6. TabsAdapter: Replace compound Tabs"
echo "   - Adapter: <TabsAdapter tabs={[{value,label,content}]} value={} onChange={}/>"
echo ""
echo "7. TooltipAdapter: CSS-only tooltip"
echo "   - Adapter: <TooltipAdapter content={}>children</TooltipAdapter>"
echo ""
echo "8. RangeAdapter: Slider replacement"
echo "   - Adapter: <RangeAdapter value={} onChange={} min={} max={}/>"
echo ""

if $DRY_RUN; then
  echo "DRY RUN complete. No files were modified."
else
  echo "Migration discovery complete. Manual edits required."
fi
