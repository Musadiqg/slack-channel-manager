# OAuth 2.0 Client ID Setup Guide

## Step-by-Step Instructions

### Step 1: Navigate to Credentials

1. In Google Cloud Console, go to **APIs & Services** → **Credentials**
2. Click the **+ CREATE CREDENTIALS** button at the top
3. Select **OAuth client ID**

### Step 2: Configure OAuth Consent Screen (If First Time)

If this is your first OAuth client, you'll be prompted to configure the consent screen first:

1. Click **Configure Consent Screen**
2. Choose **External** (unless you have Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: `Channel Tag Manager` (or any name you prefer)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **Save and Continue**
6. **Scopes** (Step 2):
   - Click **Add or Remove Scopes**
   - Search for and select: `https://www.googleapis.com/auth/spreadsheets`
   - Click **Update** → **Save and Continue**
7. **Test users** (Step 3):
   - If in testing mode, add your email as a test user
   - Click **Save and Continue**
8. **Summary**: Review and click **Back to Dashboard**

### Step 3: Create OAuth Client ID

1. Go back to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**

### Step 4: Configure OAuth Client

#### Application Type
- Select: **Web application**

#### Name
- Enter: `Channel Tag Manager` (or any descriptive name)

#### Authorized JavaScript origins
Click **+ ADD URI** and add these URLs:

**For Local Testing:**
```
http://localhost
http://localhost:8000
http://127.0.0.1:8000
```

**For GitHub Pages (After Deployment):**
```
https://YOUR_USERNAME.github.io
```

**Example:**
```
https://johndoe.github.io
```

**Important Notes:**
- ✅ Must include `http://` or `https://`
- ✅ No trailing slash (`/`)
- ✅ For GitHub Pages, use your actual GitHub username
- ✅ You can add multiple origins (localhost + GitHub Pages)

#### Authorized redirect URIs
Click **+ ADD URI** and add:

**For Local Testing:**
```
http://localhost
http://localhost:8000
http://127.0.0.1:8000
```

**For GitHub Pages:**
```
https://YOUR_USERNAME.github.io
https://YOUR_USERNAME.github.io/
```

**Important Notes:**
- ✅ Can include trailing slash for redirect URIs
- ✅ Must match your actual deployment URL
- ✅ Add both with and without trailing slash for GitHub Pages

### Step 5: Create and Copy Client ID

1. Click **CREATE**
2. A popup will appear with your credentials
3. **IMPORTANT**: Copy the **Client ID** (looks like: `123456789-abc123def456.apps.googleusercontent.com`)
4. **DO NOT** copy the Client Secret (not needed for this app)
5. Click **OK**

### Step 6: Update Your Application

1. Open `config.js` in your project
2. Find this line:
   ```javascript
   CLIENT_ID: 'YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com',
   ```
3. Replace `YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID
4. Save the file

**Example:**
```javascript
CLIENT_ID: '123456789-abc123def456.apps.googleusercontent.com',
```

## Complete Configuration Example

### For Local Development Only:
```
Authorized JavaScript origins:
- http://localhost
- http://localhost:8000

Authorized redirect URIs:
- http://localhost
- http://localhost:8000
```

### For GitHub Pages Only:
```
Authorized JavaScript origins:
- https://johndoe.github.io

Authorized redirect URIs:
- https://johndoe.github.io
- https://johndoe.github.io/
```

### For Both (Recommended):
```
Authorized JavaScript origins:
- http://localhost
- http://localhost:8000
- https://johndoe.github.io

Authorized redirect URIs:
- http://localhost
- http://localhost:8000
- https://johndoe.github.io
- https://johndoe.github.io/
```

## Common Issues & Solutions

### Issue: "Error 400: redirect_uri_mismatch"
**Solution:**
- Make sure your redirect URI exactly matches your app URL
- For GitHub Pages, try both with and without trailing slash
- Wait a few minutes after updating (Google caches these settings)

### Issue: "This app isn't verified"
**Solution:**
- This is normal for personal projects
- Click "Advanced" → "Go to [App Name] (unsafe)"
- The app will work fine, just an extra click

### Issue: "Access blocked: This app's request is invalid"
**Solution:**
- Check that JavaScript origins are correct
- Ensure you're using `https://` for GitHub Pages (not `http://`)
- Verify the Client ID in `config.js` is correct

### Issue: Can't add localhost
**Solution:**
- Make sure you're adding `http://localhost` (not `https://`)
- You can also use `http://127.0.0.1:8000`
- Port numbers are optional for localhost

## Testing Your Setup

1. **Local Test:**
   ```bash
   python -m http.server 8000
   ```
   Open `http://localhost:8000`
   - Should see "Sign in with Google" button
   - Click it and authorize
   - Should load your channels

2. **GitHub Pages Test:**
   - Deploy to GitHub Pages
   - Open your GitHub Pages URL
   - Sign in should work
   - If not, verify origins/redirects match exactly

## Security Notes

- ✅ Client ID is safe to expose (it's public in your code)
- ✅ No Client Secret needed (we use OAuth 2.0 implicit flow)
- ✅ Each user authorizes with their own Google account
- ✅ Users only see/access sheets they have permission for

## Quick Checklist

- [ ] OAuth consent screen configured
- [ ] Scopes include: `https://www.googleapis.com/auth/spreadsheets`
- [ ] Application type: **Web application**
- [ ] Authorized JavaScript origins added (localhost + GitHub Pages)
- [ ] Authorized redirect URIs added (localhost + GitHub Pages)
- [ ] Client ID copied
- [ ] Client ID added to `config.js`
- [ ] Tested locally (if applicable)
- [ ] Updated origins after GitHub Pages deployment

## Next Steps

After OAuth is configured:
1. Test locally to verify it works
2. Deploy to GitHub Pages
3. Update OAuth credentials with your GitHub Pages URL
4. Test on GitHub Pages
5. Share the URL with your team!

