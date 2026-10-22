# Frontend Deployment Script
# Run this script after creating the new frontend repository
# Usage: .\deploy-frontend.ps1 -FrontendRepoUrl "https://github.com/username/frontend-repo.git"

param(
    [Parameter(Mandatory=$true)]
    [string]$FrontendRepoUrl
)

Write-Host "=== Frontend Deployment Script ===" -ForegroundColor Cyan
Write-Host ""

# Get the current directory
$projectRoot = "C:\Users\Ali Abdullah\Desktop\KNEXPRESS\Finance"
Set-Location $projectRoot

# Step 1: Create a temporary directory for frontend
Write-Host "Step 1: Creating temporary directory..." -ForegroundColor Yellow
$tempDir = "$env:TEMP\frontend-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Step 2: Clone the new frontend repository
Write-Host "Step 2: Cloning frontend repository..." -ForegroundColor Yellow
Set-Location $tempDir
git clone $FrontendRepoUrl frontend-repo
Set-Location frontend-repo

# Step 3: Copy Frontend folder contents
Write-Host "Step 3: Copying Frontend folder contents..." -ForegroundColor Yellow
Get-ChildItem -Path "$projectRoot\Frontend" -Recurse | 
    Where-Object { $_.FullName -notmatch 'node_modules|\.next|\.git' } |
    Copy-Item -Destination { $_.FullName.Replace($projectRoot, $PWD) } -Force -Recurse

# Step 4: Copy .gitignore if it exists in Frontend
if (Test-Path "$projectRoot\Frontend\.gitignore") {
    Copy-Item "$projectRoot\Frontend\.gitignore" -Destination ".gitignore" -Force
}

# Step 5: Initialize git and push
Write-Host "Step 4: Initializing git and pushing..." -ForegroundColor Yellow
git add .
git commit -m "Initial commit: Frontend codebase"
git branch -M main
git push -u origin main

Write-Host ""
Write-Host "=== Frontend Deployment Complete ===" -ForegroundColor Green
Write-Host "Frontend code has been pushed to: $FrontendRepoUrl" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Remove Frontend/ folder from the main repository if needed" -ForegroundColor Yellow

# Cleanup
Set-Location $projectRoot
Remove-Item -Path $tempDir -Recurse -Force

