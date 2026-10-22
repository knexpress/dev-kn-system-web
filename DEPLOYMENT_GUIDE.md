# Deployment Guide: Separating Frontend and Backend

This guide will help you deploy the frontend and backend to separate repositories.

## Current Repository Structure

- **Current Repo**: `https://github.com/knexpress/Finance-System.git`
- **Frontend**: Located in `Frontend/` folder
- **Backend**: Located in `Backend/` folder

## Prerequisites

1. Create a new GitHub repository for the frontend
2. (Optional) Create a new GitHub repository for the backend

## Step-by-Step Deployment

### Option 1: Using PowerShell Scripts (Recommended)

#### Step 1: Prepare Current Changes

```powershell
# Navigate to project directory
cd "C:\Users\Ali Abdullah\Desktop\KNEXPRESS\Finance"

# Run the preparation script
.\prepare-deployment.ps1
```

This will:
- Stage all current changes
- Commit them to the current repository

#### Step 2: Deploy Frontend

After creating the frontend repository on GitHub:

```powershell
# Run the frontend deployment script
.\deploy-frontend.ps1 -FrontendRepoUrl "https://github.com/your-username/frontend-repo.git"
```

#### Step 3: Deploy Backend (Optional)

If you want a separate backend repository:

```powershell
# Run the backend deployment script
.\deploy-backend.ps1 -BackendRepoUrl "https://github.com/your-username/backend-repo.git"
```

### Option 2: Manual Deployment

#### Frontend Deployment

1. **Create a new repository on GitHub** for the frontend

2. **Clone the new repository**:
   ```powershell
   cd $env:TEMP
   git clone https://github.com/your-username/frontend-repo.git
   cd frontend-repo
   ```

3. **Copy Frontend contents**:
   ```powershell
   # Copy all files from Frontend folder (excluding node_modules, .next, etc.)
   Copy-Item -Path "C:\Users\Ali Abdullah\Desktop\KNEXPRESS\Finance\Frontend\*" -Destination . -Recurse -Exclude node_modules,.next,.git
   ```

4. **Create/Update .gitignore** for frontend:
   ```powershell
   # Copy .gitignore if it exists, or create a new one
   Copy-Item -Path "C:\Users\Ali Abdullah\Desktop\KNEXPRESS\Finance\.gitignore" -Destination .gitignore
   ```

5. **Commit and push**:
   ```powershell
   git add .
   git commit -m "Initial commit: Frontend codebase"
   git branch -M main
   git push -u origin main
   ```

#### Backend Deployment

1. **Create a new repository on GitHub** for the backend

2. **Clone the new repository**:
   ```powershell
   cd $env:TEMP
   git clone https://github.com/your-username/backend-repo.git
   cd backend-repo
   ```

3. **Copy Backend contents**:
   ```powershell
   # Copy all files from Backend folder (excluding node_modules, uploads, etc.)
   Copy-Item -Path "C:\Users\Ali Abdullah\Desktop\KNEXPRESS\Finance\Backend\*" -Destination . -Recurse -Exclude node_modules,uploads,.git
   ```

4. **Create/Update .gitignore** for backend:
   ```powershell
   # Copy .gitignore if it exists, or create a new one
   Copy-Item -Path "C:\Users\Ali Abdullah\Desktop\KNEXPRESS\Finance\.gitignore" -Destination .gitignore
   ```

5. **Commit and push**:
   ```powershell
   git add .
   git commit -m "Initial commit: Backend codebase"
   git branch -M main
   git push -u origin main
   ```

### Step 4: Clean Up Main Repository (Optional)

After successfully deploying to separate repositories, you may want to:

1. **Remove Frontend/Backend folders** from the main repository:
   ```powershell
   cd "C:\Users\Ali Abdullah\Desktop\KNEXPRESS\Finance"
   
   # Remove Frontend folder
   git rm -r Frontend
   
   # Remove Backend folder (if deploying separately)
   git rm -r Backend
   
   # Commit the changes
   git commit -m "Remove Frontend/Backend folders - now in separate repositories"
   git push
   ```

2. **Or keep the main repository as a monorepo** for development purposes

## Important Notes

### Environment Variables

Make sure to:
- **Frontend**: Update API endpoints in `Frontend/src/lib/api-client.ts` to point to your backend URL
- **Backend**: Update CORS settings in `Backend/server.js` to allow requests from your frontend URL
- **Backend**: Keep `Backend/config.env` secure and never commit it (already in .gitignore)

### Files to Exclude

The scripts automatically exclude:
- `node_modules/` - Dependencies (should be installed via `npm install`)
- `.next/` - Next.js build output
- `.git/` - Git metadata
- `uploads/` - User-uploaded files (backend)
- Environment files (`.env`, `config.env`)

### After Deployment

1. **Frontend**:
   - Update API base URL in environment variables
   - Set up build and deployment pipeline
   - Configure environment variables for production

2. **Backend**:
   - Update CORS configuration
   - Set up environment variables on hosting platform
   - Configure database connection
   - Set up API endpoints

## Quick Reference Commands

```powershell
# Prepare for deployment
.\prepare-deployment.ps1

# Deploy frontend (after creating repo)
.\deploy-frontend.ps1 -FrontendRepoUrl "YOUR_FRONTEND_REPO_URL"

# Deploy backend (optional)
.\deploy-backend.ps1 -BackendRepoUrl "YOUR_BACKEND_REPO_URL"
```

## Troubleshooting

- **Permission errors**: Run PowerShell as Administrator
- **Git errors**: Ensure you have proper GitHub credentials configured
- **Copy errors**: Check that source paths are correct
- **Push errors**: Verify repository URLs and permissions

