#!/bin/bash

echo "🔧 Next-Social Quick Fix Script"
echo "==============================="

echo "📊 Step 1: Checking Node.js environment..."
node --version
npm --version

echo ""
echo "🗄️ Step 2: Fixing database schema..."
node scripts/fix-db.js

echo ""
echo "🎨 Step 3: Rebuilding Tailwind CSS..."
npx tailwindcss -i ./styles/globals.css -o ./styles/output.css --watch=false

echo ""
echo "🧹 Step 4: Clearing Next.js cache..."
rm -rf .next

echo ""
echo "📦 Step 5: Reinstalling dependencies..."
npm install

echo ""
echo "✅ All fixes applied! Now:"
echo "1. Stop your current npm run dev (Ctrl+C)"
echo "2. Run: npm run dev"
echo "3. Visit: http://localhost:3000"
echo ""
echo "🎉 Your app should now have proper styling and working database!"