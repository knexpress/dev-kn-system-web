# Quick Authentication Guide

## Method 1: Personal Access Token (Easiest - 5 minutes)

### Step 1: Create Token on GitHub
1. Open your browser and go to: **https://github.com/settings/tokens**
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: `Finance-Frontend-Deploy`
4. Select expiration: Choose how long you want it valid (90 days recommended)
5. **Check the `repo` checkbox** (this gives full access to repositories)
6. Scroll down and click **"Generate token"**
7. **IMPORTANT**: Copy the token immediately! It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - You won't be able to see it again!

### Step 2: Use the Token to Push

**Option A: Using the helper script (Recommended)**
```powershell
cd "C:\Users\Ali Abdullah\Desktop\KNEXPRESS\Finance"
.\push-frontend.ps1
```
When prompted, paste your token.

**Option B: Direct command**
```powershell
cd "$env:TEMP\frontend-deploy-20251112-223556\frontend-repo"
git push -u origin master
```
- Username: Your GitHub username
- Password: Paste your Personal Access Token (NOT your GitHub password)

**Option C: Embed token in URL (One-time, less secure)**
```powershell
cd "$env:TEMP\frontend-deploy-20251112-223556\frontend-repo"
git remote set-url origin https://YOUR_TOKEN_HERE@github.com/knexpress/Finance-System-Frontend.git
git push -u origin master
# After push, remove token for security:
git remote set-url origin https://github.com/knexpress/Finance-System-Frontend.git
```

---

## Method 2: GitHub CLI (If installed)

```powershell
# Login to GitHub
gh auth login

# Follow the prompts:
# - GitHub.com
# - HTTPS
# - Authenticate Git with your GitHub credentials? Yes
# - Login with a web browser

# Then push:
cd "$env:TEMP\frontend-deploy-20251112-223556\frontend-repo"
git push -u origin master
```

---

## Method 3: SSH Keys (For permanent setup)

### Step 1: Generate SSH Key
```powershell
ssh-keygen -t ed25519 -C "ali.abdullah.222003@gmail.com"
```
- Press Enter to accept default location
- Press Enter twice for no passphrase (or set one if you prefer)

### Step 2: Add to GitHub
```powershell
# Copy your public key
cat ~/.ssh/id_ed25519.pub
```

1. Go to: **https://github.com/settings/keys**
2. Click **"New SSH key"**
3. Title: `Finance Development`
4. Paste the key you copied
5. Click **"Add SSH key"**

### Step 3: Update Remote and Push
```powershell
cd "$env:TEMP\frontend-deploy-20251112-223556\frontend-repo"
git remote set-url origin git@github.com:knexpress/Finance-System-Frontend.git
git push -u origin master
```

---

## ⚡ Quickest Method (Recommended for Now)

1. **Get Token**: https://github.com/settings/tokens → Generate new token (classic) → Check `repo` → Generate
2. **Run this**:
   ```powershell
   cd "C:\Users\Ali Abdullah\Desktop\KNEXPRESS\Finance"
   .\push-frontend.ps1
   ```
3. **Paste your token** when prompted

That's it! 🎉

---

## Troubleshooting

**"Permission denied" error:**
- Make sure you selected the `repo` scope when creating the token
- Verify the token hasn't expired
- Check that you have write access to the `knexpress/Finance-System-Frontend` repository

**"Repository not found" error:**
- Verify the repository exists: https://github.com/knexpress/Finance-System-Frontend
- Make sure you're a collaborator or have write access

**"Host key verification failed" (SSH):**
- Run: `ssh-keyscan github.com >> ~/.ssh/known_hosts`
- Or use HTTPS method instead

