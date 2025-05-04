# HireSphere MUI v7 Migration Guide

## Overview of Issues and Solutions

There are two major issues in the current codebase:

1. **Material UI Grid Component Errors**: The project is using MUI v7 but the Grid components are using syntax from earlier versions
2. **API Service Import Errors**: Components are having trouble importing services from `services/api.ts`

## 1. Fixing Grid Component Errors

### Problem:

With MUI v7, the `Grid` component API has changed significantly. The errors are related to:
- Using the `item` prop which no longer exists in v7
- The `xs`, `sm`, `md`, `lg` props are no longer recognized directly

### Solution:

For each Grid component that's currently using the old syntax:

```tsx
<Grid item xs={12} md={6}>
  {children}
</Grid>
```

Replace with the new v7 syntax:

```tsx
<Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
  {children}
</Grid>
```

### Search and Replace Guide:

Search for patterns like:
- `<Grid item xs={12}`
- `<Grid xs={12}`

And replace with the new pattern using the proper gridColumn syntax.

## 2. Fixing API Service Import Errors

### Problem:

Components are importing services directly from `services/api.ts` but some imports are failing.

### Solution:

1. Update all imports to use the `exportFix.ts` utility:

```tsx
// Change this:
import { someService } from '../services/api';

// To this:
import { someService } from '../services/exportFix';

// OR for default imports:
// Change this:
import api from '../services/api';

// To this:
import api from '../services/exportFix';
```

## Step-by-Step Migration Process:

1. **Update Grid Components**:
   - Identify components using the old Grid syntax
   - Apply the new syntax with `component="div"` and proper `sx` props

2. **Fix API Imports**:
   - Update all imports to use `exportFix.ts` instead of `api.ts`

3. **Restart Development Server**:
   - After making these changes, restart your development server

## Common Patterns to Look For:

**Grid in Dialogs:**
```tsx
<Grid container spacing={3}>
  <Grid component="div" sx={{ gridColumn: 'span 12' }}>
    <TextField fullWidth />
  </Grid>
  <Grid component="div" sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
    <FormControl fullWidth />
  </Grid>
  <Grid component="div" sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
    <FormControl fullWidth />
  </Grid>
</Grid>
```

**Grid in Layouts:**
```tsx
<Grid container spacing={3}>
  {items.map((item) => (
    <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 6', lg: 'span 4' } }} key={item.id}>
      <Card>...</Card>
    </Grid>
  ))}
</Grid>
```

By following this guide, you should be able to resolve the current TypeScript errors in the codebase. 