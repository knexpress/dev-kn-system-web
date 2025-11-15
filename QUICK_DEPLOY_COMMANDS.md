# Quick Deployment Commands

## ✅ Already Completed
- All current changes have been committed to the main repository
- Deployment scripts have been created

## 📋 Next Steps (When you have the frontend repository link)

### Option 1: Automated (Recommended)
```powershell
# Navigate to project directory
cd "C:\Users\Ali Abdullah\Desktop\KNEXPRESS\Finance"

# Deploy frontend (replace with your actual repository URL)
.\deploy-frontend.ps1 -FrontendRepoUrl "https://github.com/your-username/your-frontend-repo.git"
```

### Option 2: Manual Commands

```powershell
# 1. Navigate to project directory
cd "C:\Users\Ali Abdullah\Desktop\KNEXPRESS\Finance"

# 2. Create temporary directory
$tempDir = "$env:TEMP\frontend-deploy"
New-Item -ItemType Directory -Path $tempDir -Force
cd $tempDir

# 3. Clone your new frontend repository
git clone https://github.com/your-username/your-frontend-repo.git frontend-repo
cd frontend-repo

# 4. Copy Frontend folder contents (excluding node_modules, .next, etc.)
$source = "C:\Users\Ali Abdullah\Desktop\KNEXPRESS\Finance\Frontend"
Get-ChildItem -Path $source -Recurse | 
    Where-Object { $_.FullName -notmatch 'node_modules|\.next|\.git' } |
    ForEach-Object {
        $destPath = $_.FullName.Replace($source, $PWD)
        $destDir = Split-Path $destPath -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item $_.FullName -Destination $destPath -Force
    }

# 5. Copy .gitignore if needed
if (Test-Path "$source\.gitignore") {
    Copy-Item "$source\.gitignore" -Destination ".gitignore" -Force
}

# 6. Add, commit, and push
git add .
git commit -m "Initial commit: Frontend codebase"
git branch -M main
git push -u origin main

# 7. Cleanup
cd "C:\Users\Ali Abdullah\Desktop\KNEXPRESS\Finance"
Remove-Item -Path $tempDir -Recurse -Force
```

## 🔧 After Frontend Deployment

1. **Update API Configuration**: 
   - Edit `Frontend/src/lib/api-client.ts` to point to your backend URL
   - Update environment variables for production

2. **Backend CORS Configuration**:
   - Update `Backend/server.js` to allow requests from your frontend URL

## 📝 Files Created

- `prepare-deployment.ps1` - Preparation script (already run)
- `deploy-frontend.ps1` - Automated frontend deployment
- `deploy-backend.ps1` - Automated backend deployment (if needed)
- `DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `QUICK_DEPLOY_COMMANDS.md` - This file

## ⚠️ Important Notes

- Never commit `.env` or `config.env` files
- Update API endpoints after deployment
- Test the connection between frontend and backend after deployment

