#!/bin/bash

echo "🔧 Fixing all remaining import path issues..."

# Fix imports in ModernSidebar.tsx
sed -i 's|from "../ui/button"|from "../../ui/button"|g' client/src/components/layout/new/ModernSidebar.tsx
sed -i 's|from "../ui/sheet"|from "../../ui/sheet"|g' client/src/components/layout/new/ModernSidebar.tsx
sed -i 's|from "../ui/scroll-area"|from "../../ui/scroll-area"|g' client/src/components/layout/new/ModernSidebar.tsx
sed -i 's|from "../ui/badge"|from "../../ui/badge"|g' client/src/components/layout/new/ModernSidebar.tsx
sed -i 's|from "../ui/separator"|from "../../ui/separator"|g' client/src/components/layout/new/ModernSidebar.tsx

# Fix all remaining @/ imports in any files
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/|from "../|g'
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|import "@/|import "../|g'

# Fix specific remaining path issues
find client/src -name "*.tsx" -o -name "*.ts" -exec sed -i 's|from "\.\./components/ui/|from "../../ui/|g' {} \;
find client/src -name "*.tsx" -o -name "*.ts" -exec sed -i 's|from "\.\./lib/|from "../../lib/|g' {} \;
find client/src -name "*.tsx" -o -name "*.ts" -exec sed -i 's|from "\.\./hooks/|from "../../hooks/|g' {} \;

echo "✅ Import paths fixed"