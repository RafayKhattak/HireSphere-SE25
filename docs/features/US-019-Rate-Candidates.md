# US-019: Rate Candidates

## Feature Overview
This feature allows employers to review and rate candidates after conducting interviews. Employers can provide numerical ratings across multiple skill categories, identify strengths and weaknesses, and add detailed feedback.

## Key Functionality
- Rate candidates on a 5-star scale for different competencies:
  - Overall impression
  - Technical skills
  - Communication abilities
  - Cultural fit
  - Problem-solving capabilities
- Add specific strengths and weaknesses as tags
- Provide detailed written feedback
- View all previous ratings for a candidate
- See aggregated rating statistics across multiple interviews

## Implementation Details

### Frontend Components
- **InterviewRatingDialog**: Dialog component that provides the rating form interface
- **InterviewRatingsView**: Component for displaying existing ratings with statistics and summaries

### Backend Routes
- `/api/applications/:id/rate-interview`: POST endpoint to submit a new rating
- `/api/applications/:id/interview-ratings`: GET endpoint to retrieve all ratings for an application

### Data Model
The ratings are stored in the JobApplication model as an array of interview ratings:

```javascript
const interviewRatingSchema = new Schema({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  technicalSkills: {
    type: Number,
    min: 1,
    max: 5
  },
  communication: {
    type: Number,
    min: 1,
    max: 5
  },
  culturalFit: {
    type: Number,
    min: 1,
    max: 5
  },
  problemSolving: {
    type: Number,
    min: 1,
    max: 5
  },
  strengths: [String],
  weaknesses: [String],
  feedback: {
    type: String,
    required: true
  },
  interviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
```

### Logging
All candidate rating operations include detailed logging with the `[CandidateRating]` prefix, providing visibility into:
- Rating submissions and retrievals
- Form validation failures
- Authorization checks
- Rating calculations and aggregations

## Usage Flow
1. Employer conducts an interview with a candidate
2. After the interview, employer navigates to the application or interview details
3. Employer selects "Rate Candidate" to open the rating form
4. Employer completes the rating form with scores, strengths, weaknesses, and feedback
5. Upon submission, the candidate's application status is updated to "Reviewed"
6. The rating is stored and can be viewed by the employer at any time

## Permissions
- Only employers can rate candidates
- Employers can only rate candidates who have applied to their jobs
- Job seekers cannot access the rating functionality 