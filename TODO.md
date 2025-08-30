# Action-Based Filtering Implementation Plan

## Tasks to Complete:

### Phase 1: Backend Updates
- [x] Update server/routes.ts - Modify /api/posts endpoint to accept action parameter
- [x] Update server/storage.ts - Enhance getPosts method for action-based sorting
- [ ] Update shared types if needed

### Phase 2: Frontend Updates
- [x] Update client/src/pages/home.tsx - Add action filter dropdown
- [x] Create client/src/pages/leaderboard.tsx - New dedicated leaderboard page
- [x] Update client/src/components/Header.tsx - Link to new leaderboard page
- [x] Update routing configuration

### Phase 3: Testing
- [ ] Test action filtering on home page
- [ ] Test dedicated leaderboard page functionality
- [ ] Verify all existing functionality still works

## Current Progress:
- Backend implementation completed with proper SQL-based sorting
- Frontend implementation completed with dynamic action dropdowns
- Both home page and dedicated leaderboard page now support action-based filtering
- Ready for testing
