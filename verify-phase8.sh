#!/bin/bash
# Phase 8 Verification Script
# Run this to verify all optimizations are in place

echo "🔍 Phase 8 Performance Optimization Verification"
echo "================================================"
echo ""

# Check lazy loading implementation
echo "1. Checking lazy loading in App.tsx..."
if grep -q "lazy(() => import" client/src/App.tsx; then
    echo "   ✅ Lazy loading implemented"
else
    echo "   ❌ Lazy loading not found"
fi

# Check Suspense boundaries
if grep -q "<Suspense fallback=" client/src/App.tsx; then
    echo "   ✅ Suspense boundaries added"
else
    echo "   ❌ Suspense boundaries not found"
fi
echo ""

# Check database migration
echo "2. Checking database migration..."
if [ -f "supabase/migrations/20250129000000_performance_indexes.sql" ]; then
    INDEX_COUNT=$(grep -c "CREATE INDEX" supabase/migrations/20250129000000_performance_indexes.sql)
    echo "   ✅ Migration file exists ($INDEX_COUNT indexes)"
else
    echo "   ❌ Migration file not found"
fi
echo ""

# Check performance monitoring
echo "3. Checking performance monitoring..."
if [ -f "server/utils/performanceMonitor.ts" ]; then
    echo "   ✅ Performance monitor utility created"
else
    echo "   ❌ Performance monitor not found"
fi
echo ""

# Check documentation
echo "4. Checking documentation..."
if [ -f "docs/performance-report.md" ]; then
    REPORT_SIZE=$(wc -l < docs/performance-report.md)
    echo "   ✅ Performance report created ($REPORT_SIZE lines)"
else
    echo "   ❌ Performance report not found"
fi
echo ""

# Check build artifacts
echo "5. Checking build output..."
if [ -d "dist/public/assets" ]; then
    MAIN_BUNDLE=$(ls -lh dist/public/assets/index-*.js 2>/dev/null | awk '{print $5}')
    CHUNK_COUNT=$(ls -1 dist/public/assets/*.js 2>/dev/null | wc -l)
    echo "   ✅ Build completed"
    echo "   📦 Main bundle: $MAIN_BUNDLE"
    echo "   📦 Total chunks: $CHUNK_COUNT"
else
    echo "   ⚠️  Build not found (run 'npm run build')"
fi
echo ""

# Summary
echo "================================================"
echo "✅ Phase 8 Verification Complete"
echo ""
echo "Next steps:"
echo "  1. Apply database migration to Supabase"
echo "  2. Enable performance monitoring middleware"
echo "  3. Proceed to Phase 9: E2E Testing"
echo ""
