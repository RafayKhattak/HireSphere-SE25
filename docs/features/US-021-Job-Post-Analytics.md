# US-021: Job Post Analytics

## Feature Overview
The Job Post Analytics feature provides employers with comprehensive insights into the performance and engagement of their job listings. This feature helps employers track views, applications, and candidate demographics, enabling data-driven recruitment decisions.

## Key Functionality
- Real-time tracking of job posting views and unique viewers
- Application tracking with conversion rates
- Daily engagement timeline for trend analysis
- Traffic source attribution (direct, search, email, etc.)
- Demographic insights on applicant locations and skills
- Visual charts and graphs for easy data interpretation

## Implementation Details

### Frontend Components
- **JobPostAnalytics**: Main dashboard component displaying all analytics data
- **Line and bar charts**: Visual representation of daily views and applications
- **Doughnut charts**: Distribution of view sources and demographics

### Backend Services
- Automatic tracking of job views with source attribution
- IP-based unique visitor tracking with privacy considerations
- Daily statistics aggregation for trend analysis
- Demographic data collection from applications

### Data Model
The `JobAnalytics` schema captures the following metrics:
- Views and unique views counts
- Click-through and application counts
- View sources breakdown
- Demographic information (locations, skills)
- Daily statistics for trend analysis

## Technical Architecture
1. View tracking is implemented on the job details route
2. Application tracking integrated with the job application submission flow
3. The analytics dashboard fetches aggregated data through a secure endpoint
4. Charting libraries visualize the metrics in an intuitive interface

## Security Considerations
- Only employers can access analytics for their own job postings
- IP addresses are partially masked in logs for privacy
- Demographic data is anonymized and presented in aggregate form

## Testing Guidelines
For comprehensive testing procedures, refer to the [manual testing documentation](../manual-testing/US-021-Job-Post-Analytics.md). 