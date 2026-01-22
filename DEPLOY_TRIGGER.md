# Force Render Deployment

This file is created to trigger a new deployment on Render.
The delete-account endpoint changes have been made but need to be deployed.

Changes made:
- Updated server.js line 46: /delete-profile → /delete-account
- Added delete-account route to ApiRoutes.js
- Added Authorization header support in Security.tsx

Deployment timestamp: 2026-01-22 09:33
