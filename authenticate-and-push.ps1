# Interactive Authentication and Push Script
# This script will guide you through authenticating and pushing to GitHub

Write-Host "=== GitHub Authentication & Push ===" -ForegroundColor Cyan
Write-Host ""

$repoPath = "$env:TEMP\frontend-deploy-20251112-223556\frontend-repo"

# Check if repository exists
if (-not (Test-Path $repoPath)) {
    Write-Host "❌ Error: Repository not found!" -ForegroundColor Red
    Write-Host "Location: $repoPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "The deployment folder may have been cleaned up." -ForegroundColor Yellow
    Write-Host "Please contact support or re-run the deployment script." -ForegroundColor Yellow
    exit 1
}

Set-Location $repoPath

Write-Host "Step 1: Create a GitHub Personal Access Token" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open this link in your browser:" -ForegroundColor White
Write-Host "   https://github.com/settings/tokens" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Click 'Generate new token' → 'Generate new token (classic)'" -ForegroundColor White
Write-Host "3. Name it: Finance-Frontend-Deploy" -ForegroundColor White
Write-Host "4. Select expiration (90 days recommended)" -ForegroundColor White
Write-Host "5. Check the 'repo' checkbox (full control)" -ForegroundColor White
Write-Host "6. Click 'Generate token'" -ForegroundColor White
Write-Host "7. COPY THE TOKEN (starts with ghp_)" -ForegroundColor White
Write-Host ""
Write-Host "Press Enter when you have copied your token..." -ForegroundColor Green
$null = Read-Host

Write-Host ""
Write-Host "Step 2: Enter your Personal Access Token" -ForegroundColor Yellow
Write-Host "(The token will be hidden as you type)" -ForegroundColor Gray
$secureToken = Read-Host "Paste your token here" -AsSecureString

# Convert secure string to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
$token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host ""
    Write-Host "❌ No token provided. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Setting up authentication..." -ForegroundColor Yellow

# Set remote URL with token
git remote set-url origin "https://$token@github.com/knexpress/Finance-System-Frontend.git"

Write-Host ""
Write-Host "Step 4: Pushing to master branch..." -ForegroundColor Yellow
Write-Host ""

$pushResult = git push -u origin master 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SUCCESS! Frontend code pushed to master branch!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Repository URL:" -ForegroundColor Cyan
    Write-Host "https://github.com/knexpress/Finance-System-Frontend" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Verify the code on GitHub" -ForegroundColor White
    Write-Host "2. Update API endpoints in Frontend/src/lib/api-client.ts" -ForegroundColor White
    Write-Host "3. Set up environment variables for production" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Push failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error details:" -ForegroundColor Yellow
    Write-Host $pushResult -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "• Token expired or invalid - Generate a new token" -ForegroundColor White
    Write-Host "• Missing 'repo' scope - Make sure to check 'repo' when creating token" -ForegroundColor White
    Write-Host "• No write access - Verify you have access to knexpress/Finance-System-Frontend" -ForegroundColor White
    Write-Host "• Repository doesn't exist - Check the repository URL" -ForegroundColor White
}

# Clean up: Remove token from URL for security
Write-Host ""
Write-Host "Cleaning up authentication (removing token from URL)..." -ForegroundColor Gray
git remote set-url origin "https://github.com/knexpress/Finance-System-Frontend.git"

Write-Host ""
Write-Host "Done!" -ForegroundColor Green

