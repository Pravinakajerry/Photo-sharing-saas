#!/bin/bash

# Ensure we're in the project root
cd "$(dirname "$0")"

echo "🚀 Starting development environment..."

# Start local Supabase instance if initialized
if [ -f "supabase/config.toml" ] || [ -d "supabase" ]; then
  echo "🐘 Checking Supabase status..."
  # Only attempt to start if supabase CLI is available and it seems like a supabase project
  if command -v supabase &> /dev/null || npx --no-install supabase --version &> /dev/null; then
    npx supabase status &> /dev/null || npx supabase start
  fi
fi

echo "📦 Starting Next.js app on http://localhost:3000..."
./node_modules/.bin/next dev
