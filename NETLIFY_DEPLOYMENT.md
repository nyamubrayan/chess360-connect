# Netlify Deployment Guide for Chessafari

This guide will help you deploy your Chessafari chess platform to Netlify.

## Prerequisites

- A GitHub account
- A Netlify account (free tier works)
- A Supabase account (for backend)
- Node.js installed locally (for testing)

## Step 1: Export Project to GitHub

1. **In Lovable:**
   - Click the GitHub icon in the top right
   - Click "Export to GitHub"
   - Authorize GitHub access if needed
   - Create a new repository or connect to existing one
   - Wait for the export to complete

2. **Clone the repository locally:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   cd YOUR_REPO_NAME
   ```

## Step 2: Set Up Supabase Backend

Since Lovable Cloud uses Supabase, you'll need to create your own Supabase project:

1. **Create Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose organization and fill project details
   - Wait for project to be created

2. **Run Database Migrations:**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Link to your project
   supabase link --project-ref YOUR_PROJECT_REF
   
   # Push all migrations
   supabase db push
   ```

3. **Deploy Edge Functions:**
   ```bash
   # Deploy all edge functions
   supabase functions deploy analyze-game
   supabase functions deploy analyze-move
   supabase functions deploy chess-game-action
   supabase functions deploy create-chess-game
   supabase functions deploy explain-opening-move
   supabase functions deploy fetch-chess-news
   supabase functions deploy find-match
   supabase functions deploy generate-game-highlight
   supabase functions deploy make-chess-move
   supabase functions deploy manage-tournament
   supabase functions deploy recommend-lessons
   supabase functions deploy validate-chess-move
   supabase functions deploy validate-move
   ```

4. **Set Edge Function Secrets:**
   ```bash
   # If you use Lovable AI, you'll need to set up your own AI solution
   # Example: Set OpenAI API key if you migrate to OpenAI
   supabase secrets set OPENAI_API_KEY=your_openai_key_here
   
   # Set any other required secrets
   supabase secrets set LOVABLE_API_KEY=your_key_here
   ```

5. **Configure Authentication:**
   - In Supabase Dashboard → Authentication → Providers
   - Enable Email authentication
   - Set up email templates
   - Add your Netlify domain to allowed redirect URLs

6. **Set up Storage Buckets:**
   - Go to Storage in Supabase Dashboard
   - Ensure `avatars` and `lessons` buckets exist
   - Set appropriate policies for public access

## Step 3: Configure Environment Variables

1. **Get Supabase Credentials:**
   - Go to your Supabase project settings
   - Copy the Project URL and anon key

2. **Update Local `.env` (for testing):**
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_SUPABASE_PROJECT_ID=your-project-ref
   ```

## Step 4: Deploy to Netlify

### Option A: Deploy via Netlify Dashboard

1. **Connect Repository:**
   - Log in to [Netlify](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Authorize and select your repository

2. **Configure Build Settings:**
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 18 or higher

3. **Add Environment Variables:**
   - Go to Site settings → Environment variables
   - Add the following:
     ```
     VITE_SUPABASE_URL=https://your-project-ref.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     VITE_SUPABASE_PROJECT_ID=your-project-ref
     ```

4. **Deploy:**
   - Click "Deploy site"
   - Wait for build to complete
   - Your site will be live at `https://your-site-name.netlify.app`

### Option B: Deploy via Netlify CLI

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

3. **Initialize Site:**
   ```bash
   netlify init
   ```

4. **Set Environment Variables:**
   ```bash
   netlify env:set VITE_SUPABASE_URL "https://your-project-ref.supabase.co"
   netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key-here"
   netlify env:set VITE_SUPABASE_PROJECT_ID "your-project-ref"
   ```

5. **Deploy:**
   ```bash
   # Test build locally first
   npm run build
   
   # Deploy to production
   netlify deploy --prod
   ```

## Step 5: Configure Custom Domain (Optional)

1. **Add Custom Domain:**
   - In Netlify Dashboard → Domain settings
   - Click "Add custom domain"
   - Follow DNS configuration instructions

2. **Enable HTTPS:**
   - Netlify automatically provisions SSL certificates
   - Wait a few minutes for certificate activation

3. **Update Supabase Redirect URLs:**
   - In Supabase Dashboard → Authentication → URL Configuration
   - Add your custom domain to allowed redirect URLs

## Step 6: Configure Netlify Settings

### Create `netlify.toml` in project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

Commit and push this file to trigger a new deployment.

## Step 7: Post-Deployment Configuration

1. **Test Authentication:**
   - Try signing up with a new account
   - Verify email confirmation works
   - Test login and logout

2. **Test Core Features:**
   - Create a game
   - Make moves
   - Test AI analysis
   - Try puzzle solving
   - Check tournaments

3. **Monitor Edge Functions:**
   - In Supabase Dashboard → Edge Functions
   - Check logs for any errors
   - Verify all functions are responding

## Troubleshooting

### Build Fails

**Issue:** Build fails with dependency errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Environment Variables Not Working

**Issue:** App can't connect to Supabase
- Verify all environment variables are set in Netlify Dashboard
- Make sure variable names start with `VITE_`
- Redeploy after changing environment variables

### CORS Errors

**Issue:** Edge functions return CORS errors
- Verify edge functions include CORS headers
- Add your Netlify domain to Supabase allowed origins
- Check Supabase edge function logs

### Authentication Issues

**Issue:** Users can't sign in
- Check Supabase authentication settings
- Verify email provider is configured
- Add Netlify domain to allowed redirect URLs
- Ensure auto-confirm email is enabled (for testing)

### 404 Errors on Refresh

**Issue:** Page refresh returns 404
- Verify `netlify.toml` redirects are configured
- Redeploy with the redirects configuration

## Important Notes

### Lovable AI vs Self-Hosted AI

This project uses Lovable AI for:
- Game analysis
- Move evaluation
- Opening explanations
- Lesson recommendations

**Migration Options:**

1. **Use OpenAI API:**
   - Update edge functions to use OpenAI API
   - Set `OPENAI_API_KEY` secret in Supabase
   - Modify prompts and response handling

2. **Use Google Gemini:**
   - Integrate Google AI SDK
   - Update edge functions accordingly

3. **Use Other AI Providers:**
   - Anthropic Claude
   - Cohere
   - Local LLMs

### Cost Considerations

**Netlify:**
- Free tier: 100GB bandwidth, 300 build minutes/month
- Sufficient for small to medium traffic

**Supabase:**
- Free tier: 500MB database, 2GB bandwidth, 50GB storage
- Upgrade as needed

**AI API Costs:**
- OpenAI: Pay per token
- Google Gemini: Free tier available
- Consider implementing rate limiting

## Continuous Deployment

Once set up, any push to your GitHub repository will trigger automatic deployment on Netlify:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Netlify automatically builds and deploys
```

## Support

- **Netlify Docs:** [docs.netlify.com](https://docs.netlify.com)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **GitHub Issues:** Report bugs in your repository

## Next Steps

After successful deployment:

1. Set up monitoring and analytics
2. Configure domain and SSL
3. Implement CI/CD workflows
4. Set up staging environment
5. Configure backup strategies
6. Implement error tracking (Sentry, LogRocket)

Happy deploying! ♟️
