# Quick Setup Guide

## Prerequisites
- Google account
- GitHub account
- Access to the Google Sheet: `10KqjkqHdJ_22McDuXDRvsVjdVESpHPCqEv9ZZntPh24`

## Step 1: Google Cloud Console (5 minutes)

1. Go to https://console.cloud.google.com/
2. Create/select a project
3. Enable **Google Sheets API**:
   - APIs & Services → Library → Search "Google Sheets API" → Enable
4. Create **OAuth 2.0 Client ID**:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Name: "Channel Tag Manager"
   - Authorized JavaScript origins:
     - `http://localhost` (for testing)
     - `https://YOUR_USERNAME.github.io` (after deployment)
   - Authorized redirect URIs:
     - `http://localhost` (for testing)
     - `https://YOUR_USERNAME.github.io` (after deployment)
   - Click **Create**
   - **Copy the Client ID** (looks like: `123456789-abc.apps.googleusercontent.com`)

## Step 2: Configure Application (1 minute)

1. Open `config.js`
2. Replace `YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID
3. Save the file

## Step 3: Test Locally (Optional)

1. Start a local web server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Or Node.js
   npx http-server
   ```
2. Open `http://localhost:8000`
3. Click "Sign in with Google"
4. Test the application

## Step 4: Deploy to GitHub Pages (5 minutes)

1. Create a GitHub repository (or use existing)
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Channel Tag Manager"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
3. Enable GitHub Pages:
   - Repository → Settings → Pages
   - Source: `main` branch, `/ (root)` folder
   - Click Save
4. Your app URL: `https://YOUR_USERNAME.github.io/YOUR_REPO/`
5. **Update OAuth credentials**:
   - Go back to Google Cloud Console
   - Edit your OAuth client
   - Add your GitHub Pages URL to authorized origins and redirect URIs
   - Save

## Step 5: Verify Sheet Structure

Your Google Sheet should have:
- **Sheet 1**: Named "Channels"
  - Column A: Name
  - Column B: Type  
  - Column C: Members
  - Column D: Tags (comma-separated)
- **Sheet 2**: Named "Tags"
  - Column A: Prefix (list of available tags)

## Troubleshooting

**"Failed to sign in"**
- Check OAuth Client ID in config.js
- Verify authorized origins include your URL
- Make sure you're using HTTPS (GitHub Pages provides this)

**"Failed to load channels"**
- Verify Sheet ID is correct: `10KqjkqHdJ_22McDuXDRvsVjdVESpHPCqEv9ZZntPh24`
- Check sheet structure matches expected format
- Ensure you have access to the sheet

**"User not signed in" error**
- Make sure you clicked "Sign in with Google"
- Check browser console for detailed errors
- Try clearing browser cache

## Next Steps

- Test all features (filter, search, edit tags, save)
- Share the GitHub Pages URL with your team
- The app will automatically update when you push changes to GitHub

