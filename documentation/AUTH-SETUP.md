# Cognito Social Provider Setup

All social providers require the Cognito OAuth callback URL:
`https://<your-cognito-domain>/oauth2/idpresponse`

## Google

1. **Google Cloud Console:**
   - Create a project at [Google Cloud Console](https://console.cloud.google.com/)
   - Go to **APIs & Services** > **OAuth consent screen** > choose **External**
   - Fill in app name, support email, developer email
   - Add scopes: `email`, `profile`, `openid`
   - Add your email as a test user
   - Go to **Credentials** > **Create Credentials** > **OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:8008`
   - Authorized redirect URIs: `https://<your-cognito-domain>/oauth2/idpresponse`
   - Save the **Client ID** and **Client Secret**

2. **Cognito Console:**
   - User Pool > **Sign-in experience** > **Add identity provider** > **Google**
   - Paste Client ID and Client Secret
   - Authorized scopes: `email openid profile`
   - Map attributes: Google `email` → Cognito `email`
   - Go to **App integration** > your app client > **Edit hosted UI**
   - Check **Google** under identity providers
   - Ensure callback URL is `http://localhost:8008/auth/callback`

## GitHub

GitHub uses OIDC (not a built-in Cognito social type).

1. **GitHub:**
   - Go to [Developer Settings](https://github.com/settings/developers) > **OAuth Apps** > **New OAuth App**
   - Application name: Pour Decisions
   - Homepage URL: `http://localhost:8008`
   - Authorization callback URL: `https://<your-cognito-domain>/oauth2/idpresponse`
   - Save **Client ID** and generate a **Client Secret**

2. **Cognito Console:**
   - User Pool > **Sign-in experience** > **Add identity provider** > **OpenID Connect (OIDC)**
   - Provider name: `GitHub`
   - Client ID and Client Secret from GitHub
   - Authorized scopes: `user:email`
   - Set endpoints manually:
     - Authorization: `https://github.com/login/oauth/authorize`
     - Token: `https://github.com/login/oauth/access_token`
     - UserInfo: `https://api.github.com/user`
   - Map attributes: `email` → `email`
   - Go to **App integration** > your app client > **Edit hosted UI** > check **GitHub**