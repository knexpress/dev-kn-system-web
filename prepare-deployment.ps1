# Deployment Preparation Script
# This script prepares the codebase for splitting into separate frontend and backend repositories

Write-Host "=== Deployment Preparation Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check current status
Write-Host "Step 1: Checking git status..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "Step 2: Staging all changes..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "Step 3: Committing changes..." -ForegroundColor Yellow
$commitMessage = "Prepare for deployment: separate frontend and backend repositories"
git commit -m $commitMessage

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Green
Write-Host ""
Write-Host "FRONTEND DEPLOYMENT:" -ForegroundColor Cyan
Write-Host "1. Create a new repository for frontend on GitHub"
Write-Host "2. Run the following commands to push frontend to new repo:"
Write-Host ""
Write-Host "   # Navigate to project root"
Write-Host "   cd `"C:\Users\Ali Abdullah\Desktop\KNEXPRESS\Finance`""
Write-Host ""
Write-Host "   # Create a temporary branch with only frontend"
Write-Host "   git subtree push --prefix=Frontend origin frontend-temp"
Write-Host ""
Write-Host "   # OR use this method (recommended):"
Write-Host "   # Clone the new frontend repository in a separate location"
Write-Host "   # Then copy Frontend/ folder contents to the new repo"
Write-Host ""
Write-Host "BACKEND DEPLOYMENT:" -ForegroundColor Cyan
Write-Host "1. Option A: Keep backend in current repository"
Write-Host "   - Remove Frontend/ folder from current repo after pushing to new repo"
Write-Host ""
Write-Host "2. Option B: Create separate backend repository"
Write-Host "   - Follow similar steps as frontend"
Write-Host ""
Write-Host "=== Script Complete ===" -ForegroundColor Green

