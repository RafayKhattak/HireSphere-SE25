# Complete Guide to Fix All Remaining Issues

## Overview of Issues

1. **MUI v7 Grid Component Issues**: The most pervasive errors are related to the Grid component syntax
2. **API Service Import Errors**: Issues importing services from api.ts
3. **Variable & Type Errors**: Specific errors in JobAlerts.tsx and User type

## 1. Fix All Grid Component Errors

The main issue is that MUI v7 has different syntax for Grid items. To fix all Grid components throughout the application:

### Solution Pattern for Grid Items

Replace ALL occurrences of:
```tsx
<Grid item xs={12} md={6}>
  {/* content */}
</Grid>
```

With:
```tsx
<Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
  {/* content */}
</Grid>
```

### Search and Replace Guide

Here are common patterns to search for in your codebase:

1. `<Grid item xs={12}`
2. `<Grid item xs={12} md={6}`
3. `<Grid item xs={12} sm={6}`

For each match, apply the new syntax as shown above, adjusting the span values to match the original xs/sm/md/lg values.

## 2. Fix API Service Import Errors

We've provided a comprehensive solution in `services/exportFix.ts` that implements all necessary services.

### Solution for All Components

For EVERY component that imports from api.ts:

```tsx
// Change this:
import { someService } from '../services/api';
// Or this:
import api from '../services/api';

// To this:
import { someService } from '../services/exportFix';
// Or this:
import api from '../services/exportFix';
```

### Files Requiring Import Fix

Based on the errors, update these files:
- ApplicationTracking.tsx
- BookmarkedJobs.tsx (already fixed)
- CandidateSearch.tsx
- Chat.tsx
- Conversations.tsx
- EmployerInterviews.tsx
- EmployerPersonalProfile.tsx
- EmployerProfile.tsx
- ForgotPassword.tsx
- JobAlerts.tsx
- JobApplicationForm.tsx
- JobApplications.tsx
- JobDetails.tsx
- JobList.tsx
- JobPostAnalytics.tsx
- JobRecommendations.tsx
- JobSeekerInterviews.tsx
- JobSeekerProfile.tsx (already fixed)
- ResetPassword.tsx
- ScheduleInterviewDialog.tsx
- SkillAssessmentDetails.tsx
- SkillAssessments.tsx (already fixed)
- AuthContext.tsx

## 3. Fix Variable and Type Errors

### JobAlerts.tsx
1. **Add token retrieval**: Use the `getToken()` function we added
2. **Fix variable naming**: Use `location` instead of `locations` and `jobType` instead of `jobTypes`
3. **Type the map parameter**: For line 146: `map((l: string) => l.trim())`

### User Type
For the error "Property 'role' does not exist on type 'User'":

1. Find your User interface (likely in types.ts or AuthContext.tsx)
2. Add the role property:
```typescript
interface User {
  // existing properties
  role: 'admin' | 'employer' | 'jobseeker';
}
```

## Step-by-Step Process to Fix Everything

1. **Update services/exportFix.ts** (already completed)
2. **Fix component imports** to use exportFix.ts instead of api.ts
3. **Update all Grid components** using the pattern above
4. **Fix JobAlerts.tsx variable issues** (already completed for some)
5. **Add 'role' to User interface**
6. **Restart development server** to apply all changes

This systematic approach will resolve all the reported TypeScript errors in your application.

## Verification

After making these changes, run:
```
npm run build
```

This will verify that all TypeScript errors have been resolved. 