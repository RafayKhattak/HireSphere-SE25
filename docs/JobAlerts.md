# Job Alerts Feature

The job alerts feature allows job seekers to receive automated notifications when new jobs matching their criteria are posted on the platform.

## Features

- **Personalized Job Matching**: Define your job preferences including keywords, locations, job types, and salary ranges
- **Flexible Notification Schedule**: Choose between daily, weekly, or immediate notifications
- **AI-Powered Recommendations**: Personalized suggestions about how your skills match with new job postings
- **Email Notifications**: Receive emails with job matches, including direct links to apply

## Setting Up Job Alerts

1. **Create a Job Alert**:
   - Navigate to the "Job Alerts" page from your dashboard
   - Click the "Create Alert" button
   - Fill in your preferences:
     - Keywords (e.g., "React, Frontend, Developer")
     - Locations (e.g., "New York, Remote")
     - Job types (Full-time, Part-time, Contract, Internship)
     - Salary range
     - Notification frequency (Daily, Weekly, Immediate)
   - Click "Create" to save your alert

2. **Manage Your Alerts**:
   - View all your active alerts on the Job Alerts page
   - Edit or delete alerts as needed
   - Toggle alerts on/off without deleting them
   - Test alerts to see matching jobs immediately

3. **Viewing Matched Jobs**:
   - Recent job matches appear at the top of the Job Alerts page
   - Click on any job to view details or apply
   - Follow links in email notifications to go directly to job listings

## Technical Details

### Notification Frequencies

- **Daily**: Receive one email per day with new matching jobs from the past 24 hours
- **Weekly**: Receive one email per week with new matching jobs from the past 7 days
- **Immediate**: Receive an email as soon as a matching job is posted (checked hourly)

### Email Notifications

Job alert emails include:
- A summary of the matching criteria
- List of matching jobs with key details
- Direct links to view and apply to jobs
- AI-generated recommendations on why certain jobs might be good matches for your profile

### Privacy Considerations

- Your job alert preferences are private and not shared with employers
- You can unsubscribe from alerts at any time
- Job alerts automatically include your preferred locations and job types from your profile

## Troubleshooting

- **Not receiving alerts?** Check your spam folder and ensure your email address is correct in your profile
- **Too many/few matches?** Adjust your alert criteria to be more specific or broader
- **Want to pause alerts temporarily?** Toggle the alert off instead of deleting it

## Administrator Information

For system administrators:
- Job alerts are processed via a scheduled task (cron job)
- Processing can be manually triggered with the command `npm run process-job-alerts`
- Logs for alert processing are available in the server logs
- Configure email settings in the `.env` file 