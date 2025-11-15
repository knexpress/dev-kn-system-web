# GitHub Authentication Instructions

## Current Status
✅ Frontend code has been prepared and committed locally  
❌ Push to GitHub requires authentication

## Option 1: Personal Access Token (Recommended)

### Step 1: Create a Personal Access Token
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "Finance-Frontend-Deploy")
4. Select scopes: **repo** (full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

### Step 2: Use the Token to Push
Run this command in PowerShell (replace YOUR_TOKEN with your actual token):

```powershell
cd "$env:TEMP\frontend-deploy-20251112-223556\frontend-repo"
git push -u origin master
```

When prompted for password, paste your **Personal Access Token** (not your GitHub password).

### Alternative: Embed Token in URL (One-time)
```powershell
cd "$env:TEMP\frontend-deploy-20251112-223556\frontend-repo"
git remote set-url origin https://YOUR_TOKEN@github.com/knexpress/Finance-System-Frontend.git
git push -u origin master
```

⚠️ **Security Note**: Remove the token from the URL after pushing for security.

## Option 2: GitHub CLI

If you have GitHub CLI installed:

```powershell
gh auth login
```

Then push:
```powershell
cd "$env:TEMP\frontend-deploy-20251112-223556\frontend-repo"
git push -u origin master
```

## Option 3: SSH Keys (For Future Use)

1. Generate SSH key:
   ```powershell
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. Add to SSH agent:
   ```powershell
   ssh-add ~/.ssh/id_ed25519
   ```

3. Copy public key:
   ```powershell
   cat ~/.ssh/id_ed25519.pub
   ```

4. Add to GitHub: Settings → SSH and GPG keys → New SSH key

5. Update remote:
   ```powershell
   git remote set-url origin git@github.com:knexpress/Finance-System-Frontend.git
   ```

## Quick Command (After Getting Token)

Once you have your Personal Access Token, run:

```powershell
cd "$env:TEMP\frontend-deploy-20251112-223556\frontend-repo"
$token = Read-Host "Enter your GitHub Personal Access Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($token)
$plainToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
git remote set-url origin "https://$plainToken@github.com/knexpress/Finance-System-Frontend.git"
git push -u origin master
git remote set-url origin "https://github.com/knexpress/Finance-System-Frontend.git"  # Remove token after push
```

## Current Location

The prepared frontend code is located at:
```
$env:TEMP\frontend-deploy-20251112-223556\frontend-repo
```

All files are committed and ready to push once authenticated.

