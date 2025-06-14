#!/bin/bash

# Fix all @/ imports to use relative paths for build compatibility

echo "Fixing @/ imports in client/src..."

# Fix imports in components/ui/* (depth 2 from src)
find client/src/components/ui -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/lib/|from "../../lib/|g'
find client/src/components/ui -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/hooks/|from "../../hooks/|g'
find client/src/components/ui -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/types/|from "../../types/|g'
find client/src/components/ui -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/components/|from "../|g'

# Fix imports in components/layout/* (depth 2 from src)
find client/src/components/layout -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/lib/|from "../../lib/|g'
find client/src/components/layout -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/hooks/|from "../../hooks/|g'
find client/src/components/layout -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/types/|from "../../types/|g'
find client/src/components/layout -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/components/|from "../|g'

# Fix imports in pages/* (depth 1 from src)
find client/src/pages -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/lib/|from "../lib/|g'
find client/src/pages -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/hooks/|from "../hooks/|g'
find client/src/pages -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/types/|from "../types/|g'
find client/src/pages -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/components/|from "../components/|g'

# Fix imports in lib/* (depth 1 from src)
find client/src/lib -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/lib/|from "./|g'
find client/src/lib -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/hooks/|from "../hooks/|g'
find client/src/lib -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/types/|from "../types/|g'
find client/src/lib -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/components/|from "../components/|g'

# Fix imports in hooks/* (depth 1 from src)
find client/src/hooks -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/lib/|from "../lib/|g'
find client/src/hooks -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/hooks/|from "./|g'
find client/src/hooks -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/types/|from "../types/|g'
find client/src/hooks -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from "@/components/|from "../components/|g'

echo "Import fixes completed"