# Frontend Push Script
# Run this script after creating a GitHub Personal Access Token

param(
    [Parameter(Mandatory=$false)]
    [string]$Token
)

$repoPath = "$env:TEMP\frontend-deploy-20251112-223556\frontend-repo"

if (-not (Test-Path $repoPath)) {
    Write-Host "Error: Repository not found at $repoPath" -ForegroundColor Red
    Write-Host "The deployment may have been cleaned up. Please run deploy-frontend.ps1 again." -ForegroundColor Yellow
    exit 1
}

Set-Location $repoPath

# If token not provided, prompt for it
if (-not $Token) {
    $secureToken = Read-Host "Enter your GitHub Personal Access Token" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    $Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

Write-Host "Setting up authentication..." -ForegroundColor Yellow

# Set remote URL with token
git remote set-url origin "https://$Token@github.com/knexpress/Finance-System-Frontend.git"

Write-Host "Pushing to master branch..." -ForegroundColor Yellow
git push -u origin master

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Successfully pushed frontend code to master branch!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/knexpress/Finance-System-Frontend.git" -ForegroundColor Green
    
    # Remove token from URL for security
    Write-Host "Cleaning up authentication..." -ForegroundColor Yellow
    git remote set-url origin "https://github.com/knexpress/Finance-System-Frontend.git"
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Verify the code on GitHub" -ForegroundColor White
    Write-Host "2. Update API endpoints in Frontend/src/lib/api-client.ts" -ForegroundColor White
    Write-Host "3. Set up environment variables for production" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Push failed. Please check:" -ForegroundColor Red
    Write-Host "1. Your Personal Access Token is valid" -ForegroundColor Yellow
    Write-Host "2. You have write access to the repository" -ForegroundColor Yellow
    Write-Host "3. The repository exists and is accessible" -ForegroundColor Yellow
    
    # Remove token from URL for security
    git remote set-url origin "https://github.com/knexpress/Finance-System-Frontend.git"
}

