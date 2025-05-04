# US-019: Rate Candidates - Manual Testing Guide

## Quick Start Testing
We've added direct access to the rating functionality to make it easier to test:

1. Login as an employer (e.g., with `madebyarchware@gmail.com`)
2. Navigate to "Dashboard" > "Jobs" and select a job with applications
3. You will see a list of applications with a green star icon (Rate Candidate)
4. Click the star icon to open the rating form directly
5. Complete the rating form and submit
6. After rating, a blue assessment icon will appear - click it to view ratings

This method bypasses the need to complete an interview first, allowing for direct testing of the rating functionality.

## Feature Description
This user story enables employers to review and rate candidates after interviews, allowing them to keep track of candidate performance and make informed hiring decisions.

## Prerequisites
1. An employer account with access to the HireSphere platform
2. At least one job posting with applications
3. At least one scheduled interview (completed or upcoming)

## Test Scenarios

### A. Basic Rating Functionality

#### Test Case A1: Rate a candidate after an interview
1. **Setup**: 
   - Log in as an employer
   - Navigate to "Dashboard" > "Interviews" section
   - Select a completed interview

2. **Test Steps**:
   - Click on "Rate Candidate" or a similar button
   - Fill out the rating form:
     - Overall Rating: Select 4 out of 5 stars
     - Technical Skills: Select 3 out of 5 stars
     - Communication: Select 4 out of 5 stars
     - Cultural Fit: Select 5 out of 5 stars
     - Problem Solving: Select 3 out of 5 stars
     - Strengths: Add at least two strengths (e.g., "Strong JavaScript knowledge", "Good communication skills")
     - Weaknesses: Add at least one weakness (e.g., "Limited experience with databases")
     - Feedback: Enter detailed feedback about the candidate's performance
   - Submit the form

3. **Expected Results**:
   - Success message appears confirming the rating was saved
   - The application status changes to "Reviewed"
   - Console shows logs with `[CandidateRating]` prefix indicating successful rating
   - The rating appears in the candidate's profile or interview details

#### Test Case A2: View existing ratings
1. **Setup**:
   - Log in as an employer
   - Navigate to "Dashboard" > "Applications" or "Interviews" section
   - Select an application/candidate that has been previously rated

2. **Test Steps**:
   - View the candidate's profile or application details
   - Navigate to the ratings/reviews section

3. **Expected Results**:
   - All previously submitted ratings are visible
   - Each rating shows overall score, category scores, strengths, weaknesses, and feedback
   - Console shows logs with `[CandidateRating]` prefix for fetching ratings

### B. Validation Testing

#### Test Case B1: Submit an incomplete rating form
1. **Setup**:
   - Log in as an employer
   - Navigate to rate a candidate after an interview

2. **Test Steps**:
   - Leave the required fields empty (e.g., overall rating, feedback)
   - Submit the form

3. **Expected Results**:
   - Form submission is prevented
   - Validation error messages appear for the missing required fields
   - Console shows logs with validation errors

#### Test Case B2: Test rating value boundaries
1. **Setup**:
   - Log in as an employer
   - Navigate to rate a candidate after an interview

2. **Test Steps**:
   - Try to submit a rating outside the valid range (1-5)
   - Use browser dev tools to modify the form values if the UI prevents invalid inputs

3. **Expected Results**:
   - Form submission is prevented or server returns validation error
   - Console shows validation error logs

### C. Authorization Testing

#### Test Case C1: Access control for job seekers
1. **Setup**:
   - Log in as a job seeker
   - Navigate to an application or interview

2. **Test Steps**:
   - Try to access the rating functionality (if visible)
   - Attempt to directly access any rating endpoints via browser URL

3. **Expected Results**:
   - Rating functionality is not visible to job seekers
   - Any direct attempts to access rating endpoints result in authorization errors
   - Server logs show authorization failure messages

#### Test Case C2: Rating permissions for different employers
1. **Setup**:
   - If possible, log in as Employer A
   - Note the application ID of a candidate who applied to Employer A's job
   - Log out and log in as Employer B

2. **Test Steps**:
   - Try to access the rating page for Employer A's candidate
   - Attempt to submit a rating for that candidate

3. **Expected Results**:
   - Employer B cannot access or rate candidates who applied to Employer A's jobs
   - Server logs show authorization failure messages

### D. Integration Testing

#### Test Case D1: Application status update after rating
1. **Setup**:
   - Log in as an employer
   - Find a candidate with "Interview" status

2. **Test Steps**:
   - Rate the candidate following Test Case A1
   - Check the application status in the applications list

3. **Expected Results**:
   - Application status changes from "Interview" to "Reviewed"
   - Application history shows the status change event
   - Console logs show the status update

#### Test Case D2: Multiple ratings for the same candidate
1. **Setup**:
   - Log in as an employer
   - Find a candidate who has already been rated

2. **Test Steps**:
   - Submit another rating for the same candidate
   - View the candidate's ratings

3. **Expected Results**:
   - New rating is added alongside the existing one(s)
   - All ratings are displayed with their submission dates
   - Console logs show multiple ratings being saved and retrieved

## Logging Verification
During all test scenarios, verify that appropriate logs with the `[CandidateRating]` prefix appear in the console, including:
- Rating requests with application IDs
- Rating values for each category
- Success/failure messages
- Authorization checks
- Validation errors (when applicable)

## Notes for Testers
- Document any bugs or unexpected behaviors observed during testing
- Take screenshots of any error messages or unusual UI behaviors
- Note any performance issues or delays when submitting or retrieving ratings
- Check mobile responsiveness of the rating interface 