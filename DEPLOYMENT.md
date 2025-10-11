# Deployment Instructions

## Two Separate Vercel Projects Setup

### Project 1: Frontend (excel-management-frontend)
- **Root Directory**: `frontend`
- **Framework**: Next.js (auto-detected)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://your-api-project-name.vercel.app
NODE_ENV=production
```

### Project 2: API (excel-management-api)
- **Root Directory**: `api` or `.` (root)
- **Framework**: Other
- **Build Command**: (leave empty)
- **Output Directory**: (leave empty)
- **Install Command**: `cd backend && npm install`

**Environment Variables:**
```
NODE_ENV=production
JWT_SECRET=0a8b3ba155a5a8f7ab6ef125c7241dbb77a94e750f13f2b9
DATABASE_URL=postgresql://neondb_owner:npg_xjLTPW7FDQl8@ep-shiny-grass-abx87srp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
CORS_ORIGIN=https://your-frontend-project-name.vercel.app
CRED_ENC_KEY=fc9a6a96031d25092993287641aae55a23715e40a9358187525537c25895a678
PORT=5000
```

## Deployment Steps

1. Delete existing Vercel project
2. Create Frontend project first (connect to GitHub repo)
3. Create API project second (same GitHub repo, different root directory)
4. Update NEXT_PUBLIC_API_URL in frontend project to point to API project
5. Update CORS_ORIGIN in API project to point to frontend project