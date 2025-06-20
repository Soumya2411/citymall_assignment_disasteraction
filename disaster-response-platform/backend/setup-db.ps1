# Database setup script for the refactored disaster response platform (Windows/PowerShell)

Write-Host "🔄 Setting up database for independent resources..." -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "db/schema.sql")) {
    Write-Host "❌ Error: Please run this script from the backend directory" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "   Expected files: db/schema.sql, db/functions.sql, db/sample-data.sql" -ForegroundColor Yellow
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found" -ForegroundColor Red
    Write-Host "   Please create a .env file with your Supabase credentials" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Database files found" -ForegroundColor Green

# You'll need to run these SQL scripts manually in your Supabase SQL Editor
Write-Host ""
Write-Host "📋 Manual Steps Required:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open your Supabase project SQL Editor:" -ForegroundColor White
Write-Host "   🌐 https://supabase.com/dashboard/project/YOUR_PROJECT/sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Run the migration script first:" -ForegroundColor White
Write-Host "   📁 Copy and execute: backend/db/migrate.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Then run the functions script:" -ForegroundColor White
Write-Host "   📁 Copy and execute: backend/db/functions.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Finally, run the sample data script:" -ForegroundColor White
Write-Host "   📁 Copy and execute: backend/db/sample-data.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 After running the SQL scripts, start the servers:" -ForegroundColor Green
Write-Host "   Backend:  npm run dev        (from backend/ directory)" -ForegroundColor White
Write-Host "   Frontend: npm run dev        (from frontend-vite/ directory)" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Test the refactored system:" -ForegroundColor Green
Write-Host "   - Visit http://localhost:5173/resources" -ForegroundColor White
Write-Host "   - Try both 'All Resources' and 'Near Disaster' tabs" -ForegroundColor White
Write-Host "   - Create new resources using the enhanced form" -ForegroundColor White
Write-Host "   - Test geospatial search with different locations and radii" -ForegroundColor White
Write-Host ""

Write-Host "💡 Pro tip: Copy the SQL file contents and paste them one by one in the Supabase SQL Editor" -ForegroundColor Blue
