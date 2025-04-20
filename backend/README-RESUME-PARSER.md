# Resume Parser with Google Gemini API Integration

This feature provides enhanced resume parsing capabilities using Google's Gemini AI for better extraction of information from resume documents.

## Features

- AI-powered extraction of resume data with Google Gemini
- Fallback to traditional text-based parsing when needed
- Support for PDF and Word documents
- Extraction of:
  - Personal information (name, email, phone, location)
  - Skills
  - Work experience
  - Education

## Setup

1. Ensure you have the required dependencies:
   ```
   npm install @google/genai pdf-parse mammoth
   ```

2. Configure your Gemini API key in the `.env` file:
   ```
   GEMINI_API_KEY="your-api-key-here"
   USE_GEMINI_API=true
   ```

3. Create the required upload directories:
   ```
   mkdir -p uploads/resumes
   ```

## Usage

### Backend API

The resume parser is available through the following endpoint:

```
POST /api/jobseeker/parse-resume
```

**Parameters:**
- `resume`: File upload (PDF, DOC, or DOCX)
- `useGemini`: (Optional) Boolean to enable/disable Gemini AI (defaults to the value set in .env)

**Example response:**
```json
{
  "user": {
    "id": "user-id",
    "firstName": "John",
    "lastName": "Doe",
    "skills": ["JavaScript", "React", "Node.js"],
    "education": [
      {
        "institution": "University of Technology",
        "degree": "Bachelor of Science",
        "graduationYear": 2020
      }
    ],
    "experience": [
      {
        "company": "Tech Company",
        "position": "Software Engineer",
        "startDate": "2020-01",
        "endDate": "2022-05",
        "current": false,
        "description": "Developed web applications using React and Node.js"
      }
    ]
  },
  "parsed": {
    "personalInfo": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "123-456-7890",
      "location": "San Francisco, CA",
      "title": "Software Engineer"
    },
    "skills": ["JavaScript", "React", "Node.js"],
    "experience": [
      {
        "company": "Tech Company",
        "position": "Software Engineer",
        "duration": "2020-01 - 2022-05",
        "description": "Developed web applications using React and Node.js"
      }
    ],
    "education": [
      {
        "institution": "University of Technology",
        "degree": "Bachelor of Science",
        "year": "2020"
      }
    ]
  },
  "message": "Resume parsed successfully"
}
```

### Frontend Integration

In your React components, use the `uploadResume` method from the API service:

```typescript
import { userService } from '../services/api';

// In your component
const handleResumeUpload = async (file: File) => {
  try {
    // Use Gemini AI for parsing (set to false to use traditional parsing)
    const useGemini = true;
    
    // Upload and parse the resume
    const result = await userService.uploadResume(file, useGemini);
    
    // Process the parsed data
    console.log('Parsed data:', result.parsed);
    console.log('Updated user:', result.user);
  } catch (error) {
    console.error('Error parsing resume:', error);
  }
};
```

## Testing

A test script is provided to validate the parser functionality:

1. Place a test resume file in the `uploads/test` directory
2. Run the test script:
   ```
   node tests/testGeminiParser.js
   ```

This will process the file with both Gemini AI and traditional methods, displaying the results for comparison.

## Troubleshooting

If you encounter issues with the parser:

1. Verify your Gemini API key is valid and correctly set in the `.env` file
2. Check if the file format is supported (PDF, DOC, DOCX)
3. Ensure the file size is under 5MB
4. Check the server logs for specific error messages
5. Try the fallback parser by setting `useGemini=false`

## Performance Considerations

- Gemini AI parsing is more accurate but may take longer (typically 1-3 seconds)
- Traditional parsing is faster but less accurate for complex resumes
- For production, consider implementing caching or background processing for large files 