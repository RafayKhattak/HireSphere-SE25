# US-021: Job Post Analytics - Manual Testing Guide

## Feature Description
This user story enables employers to view detailed analytics about their job postings, allowing them to track engagement metrics such as views, unique visitors, applications, and demographic information over time.

## Prerequisites
1. An employer account with access to the HireSphere platform
2. At least one published job posting 
3. Some activity on the job posting (views, applications)

## Test Scenarios

### A. Basic Analytics Access and Dashboard Visibility

#### Test Case A1: Accessing Analytics Dashboard
1. **Setup**: 
   - Log in as an employer
   - Navigate to the "Manage Jobs" section

2. **Test Steps**:
   - Locate a job posting in your list
   - Find and click on the "Analytics" button or icon associated with the job
   - Verify the analytics dashboard loads

3. **Expected Results**:
   - The analytics dashboard should load successfully
   - You should see a summary of key metrics at the top (views, applications, etc.)
   - Console should show `[JobAnalytics]` prefixed logs indicating successful data retrieval

#### Test Case A2: Analytics Authorization
1. **Setup**: 
   - Log out of the employer account
   - Log in as a job seeker

2. **Test Steps**:
   - Try to access the analytics URL directly (e.g., `/jobs/{jobId}/analytics`)

3. **Expected Results**:
   - Access should be denied
   - An error message about authorization should be displayed
   - Console logs should show `[JobAnalytics] Unauthorized access attempt`

### B. Analytics Data Validation

#### Test Case B1: Verify View Tracking
1. **Setup**: 
   - Log in as an employer
   - Note the current view count for a specific job

2. **Test Steps**:
   - Log out and log in as a job seeker (or use an incognito window)
   - View the job posting page
   - Log back in as the employer and check the analytics for the job

3. **Expected Results**:
   - The view count should have increased by 1
   - The daily stats chart should reflect the new view
   - Console logs should show `[JobAnalytics] Tracking view for job`

#### Test Case B2: Verify Application Tracking
1. **Setup**: 
   - Log in as an employer
   - Note the current application count for a specific job

2. **Test Steps**:
   - Log out and log in as a job seeker (or use a different account)
   - Apply for the job
   - Log back in as the employer and check the analytics for the job

3. **Expected Results**:
   - The application count should have increased by 1
   - The applications graph should reflect the new application
   - Console logs should show application tracking activity

#### Test Case B3: Different Traffic Sources
1. **Setup**: 
   - Log in as an employer

2. **Test Steps**:
   - Open the job posting with different source parameters:
     - Direct: `/jobs/{jobId}`
     - Search: `/jobs/{jobId}?source=search`
     - Email: `/jobs/{jobId}?source=email`
   - Check the view sources breakdown in the analytics dashboard

3. **Expected Results**:
   - The view sources chart should show different sources
   - The counts should reflect the visits from different sources
   - Console logs should show `[JobAnalytics] View source: X recorded for job ID`

### C. Chart and Visualization Testing

#### Test Case C1: Daily Stats Timeline
1. **Setup**: 
   - Log in as an employer
   - Navigate to the analytics for a job with activity over multiple days

2. **Test Steps**:
   - Examine the daily stats chart/timeline
   - Verify the time range and data points

3. **Expected Results**:
   - The chart should display data points for each day with activity
   - Hovering over points should show the exact counts for that day
   - The chart should render correctly without visual issues

#### Test Case C2: Demographic Data
1. **Setup**: 
   - Log in as an employer
   - Navigate to the analytics for a job with multiple applications

2. **Test Steps**:
   - Locate the demographics section
   - Review location and skills distribution charts

3. **Expected Results**:
   - Should display applicant locations if available
   - Should display skill distribution among applicants if available
   - Charts should render correctly and be easy to interpret

### D. Export and Sharing

#### Test Case D1: Data Export (if implemented)
1. **Setup**: 
   - Log in as an employer
   - Navigate to the analytics for a job

2. **Test Steps**:
   - Look for export options (CSV, PDF, etc.)
   - Try to export the analytics data

3. **Expected Results**:
   - Export should complete successfully
   - Exported file should contain accurate analytics data

## Troubleshooting and Edge Cases

### No Analytics Data
If a job is newly created and has no views or applications:
- The dashboard should display a message indicating no data is available yet
- Default empty charts or placeholders should be shown
- No errors should be thrown in the console

### High Volume Testing
For jobs with large numbers of views/applications:
- Charts should scale appropriately
- Performance should remain acceptable
- Data should be aggregated intelligently for readability

## Additional Validation
- Check browser console for any errors during the analytics loading and interaction
- Verify all `[JobAnalytics]` prefixed logs show expected behavior
- Test across different screen sizes to ensure responsive design 