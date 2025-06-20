#!/bin/bash
# Database setup script for the refactored disaster response platform

echo "🔄 Setting up database for independent resources..."

# Check if we're in the right directory
if [ ! -f "db/schema.sql" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected files: db/schema.sql, db/functions.sql, db/sample-data.sql"
    exit 1
fi

# Check if SUPABASE_URL and SUPABASE_ANON_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: Supabase environment variables not set"
    echo "   Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file"
    exit 1
fi

echo "✅ Environment variables found"

# You'll need to run these SQL scripts manually in your Supabase SQL Editor
echo ""
echo "📋 Manual Steps Required:"
echo ""
echo "1. Open your Supabase project SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql"
echo ""
echo "2. Run the migration script first:"
echo "   📁 Copy and execute: backend/db/migrate.sql"
echo ""
echo "3. Then run the functions script:"
echo "   📁 Copy and execute: backend/db/functions.sql"
echo ""
echo "4. Finally, run the sample data script:"
echo "   📁 Copy and execute: backend/db/sample-data.sql"
echo ""
echo "🚀 After running the SQL scripts, start the servers:"
echo "   Backend:  npm run dev        (from backend/ directory)"
echo "   Frontend: npm run dev        (from frontend-vite/ directory)"
echo ""
echo "🔍 Test the refactored system:"
echo "   - Visit http://localhost:5173/resources"
echo "   - Try both 'All Resources' and 'Near Disaster' tabs"
echo "   - Create new resources using the enhanced form"
echo "   - Test geospatial search with different locations and radii"
echo ""
