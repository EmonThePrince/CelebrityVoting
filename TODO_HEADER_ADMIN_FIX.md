# Header Navigation and Admin Authentication Fix Plan

## Tasks to Complete:

### Phase 1: Fix Header Navigation
- [x] Update client/src/components/Header.tsx - Fix navigation endpoints
  - Change #home to /
  - Change #trending to proper endpoint or remove
  - Verify /leaderboard and /admin endpoints

### Phase 2: Replace Mock Admin Authentication
- [ ] Update server/auth.ts - Replace mock auth with real admin user
  - Create proper authentication middleware
  - Add admin user "Emon" (emon@gmail.com / emon3234)
  - Remove mock admin functionality

### Phase 3: Update Routes Authentication
- [ ] Update server/routes.ts - Use real authentication middleware
  - Replace isMockAdmin with proper admin validation
  - Ensure admin endpoints are properly protected

### Phase 4: Create Admin User
- [ ] Ensure admin user exists in database
  - Create initialization script or update auth to create admin user

### Phase 5: Testing
- [ ] Test header navigation functionality
- [ ] Test admin authentication with new credentials
- [ ] Verify admin endpoints are properly protected

## Current Progress:
- Plan created and ready for implementation
