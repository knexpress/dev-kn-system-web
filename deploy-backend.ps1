# Backend Deployment Script
# Run this script if you want to create a separate backend repository
# Usage: .\deploy-backend.ps1 -BackendRepoUrl "https://github.com/username/backend-repo.git"

param(
    [Parameter(Mandatory=$true)]
    [string]$BackendRepoUrl
)

Write-Host "=== Backend Deployment Script ===" -ForegroundColor Cyan
Write-Host ""

# Get the current directory
$projectRoot = "C:\Users\Ali Abdullah\Desktop\KNEXPRESS\Finance"
Set-Location $projectRoot

# Step 1: Create a temporary directory for backend
Write-Host "Step 1: Creating temporary directory..." -ForegroundColor Yellow
$tempDir = "$env:TEMP\backend-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Step 2: Clone the new backend repository
Write-Host "Step 2: Cloning backend repository..." -ForegroundColor Yellow
Set-Location $tempDir
git clone $BackendRepoUrl backend-repo
Set-Location backend-repo

# Step 3: Copy Backend folder contents
Write-Host "Step 3: Copying Backend folder contents..." -ForegroundColor Yellow
Get-ChildItem -Path "$projectRoot\Backend" -Recurse | 
    Where-Object { $_.FullName -notmatch 'node_modules|\.git|uploads' } |
    Copy-Item -Destination { $_.FullName.Replace($projectRoot, $PWD) } -Force -Recurse

# Step 4: Copy .gitignore if it exists in Backend
if (Test-Path "$projectRoot\Backend\.gitignore") {
    Copy-Item "$projectRoot\Backend\.gitignore" -Destination ".gitignore" -Force
} elseif (Test-Path "$projectRoot\.gitignore") {
    # Copy root .gitignore and modify for backend
    Copy-Item "$projectRoot\.gitignore" -Destination ".gitignore" -Force
}

# Step 5: Initialize git and push
Write-Host "Step 4: Initializing git and pushing..." -ForegroundColor Yellow
git add .
git commit -m "Initial commit: Backend codebase"
git branch -M main
git push -u origin main

Write-Host ""
Write-Host "=== Backend Deployment Complete ===" -ForegroundColor Green
Write-Host "Backend code has been pushed to: $BackendRepoUrl" -ForegroundColor Green

# Cleanup
Set-Location $projectRoot
Remove-Item -Path $tempDir -Recurse -Force

