# HireSphere: AI-Powered Tech Job Portal 🚀

[![HireSphere Logo](placeholder.png)] <!-- Optional: Replace placeholder.png with an actual logo URL if you have one -->

**HireSphere** is a modern, feature-rich job portal specifically designed for the technology sector. It leverages Artificial Intelligence to enhance the job search and recruitment process for job seekers, employers, and administrators. Features include intelligent job recommendations, AI-driven skill assessments, automated resume parsing, candidate ranking, and more.

---

## Table of Contents

-   [About The Project](#about-the-project)
-   [Key Features](#key-features)
    -   [Job Seeker Features](#job-seeker-features)
    -   [Employer Features](#employer-features)
    -   [Admin Features](#admin-features)
-   [Technology Stack](#technology-stack)
    -   [Frontend](#frontend)
    -   [Backend](#backend)
    -   [Database](#database)
    -   [AI Services & Libraries](#ai-services--libraries)
    -   [Other Key Libraries](#other-key-libraries)
-   [Architecture Overview](#architecture-overview)
-   [Getting Started](#getting-started)
    -   [Prerequisites](#prerequisites)
    -   [Installation](#installation)
-   [Running the Application](#running-the-application)
    -   [Backend Server](#backend-server)
    -   [Frontend Development Server](#frontend-development-server)
-   [API Endpoints](#api-endpoints)
-   [Key Backend Services & Modules](#key-backend-services--modules)
-   [Configuration (.env)](#configuration-env)
-   [Testing](#testing)
-   [Contributing](#contributing)
-   [License](#license)
-   [Acknowledgements](#acknowledgements)

---

## About The Project

HireSphere aims to bridge the gap between tech talent and opportunities by providing an intelligent platform that simplifies and enhances the hiring process. Traditional job portals often lack sophisticated matching and evaluation tools. HireSphere addresses this by integrating AI for:

-   **Better Matching:** Recommending relevant jobs to seekers and suitable candidates to employers.
-   **Skill Verification:** Allowing job seekers to prove their skills through AI-generated assessments.
-   **Efficient Screening:** Enabling employers to quickly parse resumes and rank candidates based on job requirements.
-   **Data-Driven Insights:** Providing analytics for employers and salary insights.

The platform serves three main user roles: Job Seekers looking for tech roles, Employers seeking to hire tech talent, and Administrators overseeing the platform's integrity.

---

## Key Features

### Job Seeker Features

*   **Authentication:** Secure registration and login. Password reset functionality.
*   **Profile Management:** Create and update personal profile including skills, experience, education, and resume upload.
*   **AI Resume Parsing:** Upload resume (.pdf, .docx) for automatic parsing and profile population (powered by AI).
*   **Job Browsing & Searching:** Search for jobs with filters (location, experience, salary, skills, type).
*   **Job Application:** Apply to jobs directly through the platform.
*   **Application Tracking:** View the status of submitted applications.
*   **Job Bookmarking:** Save interesting jobs for later viewing.
*   **AI Job Recommendations:** Receive personalized job suggestions based on profile and activity.
*   **AI Skill Assessments:** Take AI-generated tests to validate skills (results potentially added to profile).
*   **Job Alerts:** Set up email notifications for new jobs matching specific criteria.
*   **Chat:** Communicate directly with employers regarding applications.
*   **View Company Profiles:** Browse employer profiles and reviews.
*   **Interview Scheduling:** View scheduled interviews.

### Employer Features

*   **Authentication:** Secure registration and login for employer accounts.
*   **Company Profile Management:** Create and manage company details, description, logo, etc.
*   **Personal Profile Management:** Update personal contact information and profile picture.
*   **Job Posting:** Create detailed job listings with requirements, salary, etc.
*   **Job Management:** Edit, view, and manage posted jobs (open/close status).
*   **Candidate Search & Filtering:** Search the job seeker database using various filters.
*   **AI Candidate Ranking:** Optional AI-powered ranking of candidates based on profile and job requirements.
*   **Application Tracking:** View and manage applications received for jobs.
*   **Resume Viewing:** Access resumes of applicants.
*   **Chat:** Communicate directly with job applicants.
*   **Interview Scheduling:** Schedule interviews with candidates via the platform.
*   **Job Post Analytics:** View statistics (views, applications) for posted jobs.
*   **Salary Insights:** Access AI-powered salary benchmark data (feature implementation details may vary).

### Admin Features

*   **Admin Registration:** Secure endpoint/process for creating admin accounts.
*   **Admin Dashboard:** Overview of platform activity (users, jobs, reports).
*   **Report Management:** View and manage reports submitted by users (e.g., inappropriate content, spam).
*   **Content Moderation:** Ability to take action based on reports (e.g., remove jobs, warn/disable users).
*   **(Potential) User Management:** View/manage users (details depend on implementation).
*   **(Potential) Job Management:** View/manage all jobs (details depend on implementation).

---

## Technology Stack

### Frontend

*   **Framework/Library:** React 19 (with TypeScript)
*   **UI Components:** Material UI (MUI), Chakra UI
*   **Routing:** React Router DOM v7
*   **State Management:** React Context API (potentially, or component state)
*   **HTTP Client:** Axios
*   **Form Handling:** Formik, Yup
*   **Real-time Communication:** Socket.IO Client
*   **Charting:** Chart.js, React Chartjs 2, MUI X Charts
*   **Styling:** Emotion, CSS
*   **Build Tool:** Create React App (React Scripts)

### Backend

*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database ORM/ODM:** Mongoose v7
*   **Authentication:** JSON Web Tokens (JWT), bcryptjs (for password hashing)
*   **API Validation:** express-validator
*   **File Uploads:** Multer
*   **Real-time Communication:** Socket.IO
*   **Email:** Nodemailer
*   **Scheduled Tasks:** node-cron
*   **Configuration:** dotenv

### Database

*   **Type:** NoSQL Document Database
*   **Implementation:** MongoDB

### AI Services & Libraries

*   **Language Models:** Google Gemini API (`@google/generative-ai`), Groq API (`groq`)
*   **Resume Parsing:** pdf-parse (for PDF), mammoth (for DOCX)

### Other Key Libraries

*   **Utility:** date-fns, uuid
*   **CORS:** cors middleware

---

## Architecture Overview

HireSphere utilizes a multi-tier architecture, closely resembling the **MERN stack** (MongoDB, Express, React, Node.js).

1.  **Presentation Layer (Frontend):** Built with React (TypeScript) and UI libraries (MUI, Chakra). Handles user interface rendering, user interactions, form validation (Formik/Yup), and communication with the backend API via Axios and Socket.IO. Hosted typically on port 3000 during development.
2.  **Application Logic Layer (Backend):** Developed with Node.js and Express. Exposes RESTful APIs for the frontend. Manages business logic, user authentication (JWT), data validation (express-validator), database interactions (Mongoose), real-time chat (Socket.IO), file uploads (Multer), email notifications (Nodemailer), scheduled tasks (node-cron), and integration with external AI services (Gemini/Groq). Hosted typically on port 5000 during development.
3.  **Data Layer (Database):** MongoDB stores all persistent data, including user profiles, job postings, applications, messages, assessments, reports, etc. Mongoose provides object data modeling for interacting with MongoDB from the backend.

This separation allows for independent development, deployment, and scaling of the frontend and backend components.

---

## Getting Started

Follow these instructions to set up and run the HireSphere project locally.

### Prerequisites

*   **Node.js:** Version 16.x or higher (includes npm). Download from [nodejs.org](https://nodejs.org/)
*   **MongoDB:** A running MongoDB instance (local installation or a cloud service like MongoDB Atlas). Get MongoDB [here](https://www.mongodb.com/try/download/community).
*   **Git:** For cloning the repository.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd HireSphere-SE25 # Or your project directory name
    ```

2.  **Install Backend Dependencies:**
    ```bash
    cd backend
    npm install
    ```

3.  **Set up Backend Environment Variables:**
    *   Navigate to the `backend` directory.
    *   Create a file named `.env`.
    *   Copy the contents of `.env.example` (if it exists) or add the necessary variables (see [Configuration (.env)](#configuration-env) section below).
    *   Fill in your specific values (Database URI, JWT Secret, API Keys, etc.).

4.  **Install Frontend Dependencies:**
    ```bash
    cd ../frontend # Go back to the root project directory if needed, then into frontend
    # Or directly: cd ../frontend if you are in backend/
    npm install
    ```

---

## Running the Application

Make sure your MongoDB instance is running before starting the backend.

### Backend Server

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Start the server (development mode with nodemon):
    ```bash
    npm run dev
    ```
    *   Alternatively, use `npm start` for production mode.
3.  The backend server should now be running, typically on `http://localhost:5000`.

### Frontend Development Server

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Start the React development server:
    ```bash
    npm start
    ```
3.  The application should open automatically in your browser, typically at `http://localhost:3000`.

---

## API Endpoints

The backend exposes a RESTful API consumed by the frontend. Key route modules include:

*   `backend/routes/auth.js`: User registration, login, password reset.
*   `backend/routes/employer.js`: Employer-specific actions (profile, job management, candidate search, analytics).
*   `backend/routes/jobseeker.js`: Job seeker specific actions (resume parsing).
*   `backend/routes/jobs.js`: Job searching, viewing details, posting (internally uses employer auth).
*   `backend/routes/applications.js`: Handling job applications.
*   `backend/routes/assessments.js`: Generating and managing skill assessments.
*   `backend/routes/bookmarks.js`: Managing bookmarked jobs.
*   `backend/routes/conversations.js`: Managing chat conversations.
*   `backend/routes/messages.js`: Handling individual chat messages.
*   `backend/routes/reports.js`: Handling user reports.
*   `backend/routes/admin.js`: Admin-specific actions.
*   `backend/routes/interviews.js`: Scheduling and managing interviews.
*   `backend/routes/companyReviews.js`: Managing company reviews.

Explore the files within `backend/routes/` for detailed endpoint definitions and required middleware (like `auth`).

---

## Key Backend Services & Modules

*   **AI Service (`backend/services/aiAssessmentService.js`, `aiService.js`):** Contains logic for interacting with Google Gemini and/or Groq APIs for tasks like generating skill assessment questions, evaluating answers, ranking candidates, etc.
*   **Email Service (likely using Nodemailer):** Handles sending emails for notifications like password resets, job alerts, etc. Configuration is set via environment variables.
*   **Job Alert Scheduler (`backend/scripts/runJobAlerts.js`, using `node-cron`):** Periodically checks for new jobs matching saved user alerts and triggers email notifications.
*   **Resume Parsing (`backend/routes/jobseeker.js` or a dedicated service):** Uses `pdf-parse` and `mammoth` to extract text content from uploaded resumes. May also involve AI for structuring the extracted data.
*   **Authentication Middleware (`backend/middleware/auth.js`):** Verifies JWT tokens to protect private routes.
*   **File Uploads (`backend/routes/employer.js`, `jobseeker.js` using Multer):** Handles uploads for profile pictures, logos, and resumes, storing them appropriately (e.g., in MongoDB as Buffer data or potentially on a file system/cloud storage).

---

## Configuration (.env)

Create a `.env` file in the `backend` directory with the following essential variables:

```dotenv
# Server Configuration
PORT=5000

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/hiresphere # Replace with your MongoDB connection string

# JWT Authentication
JWT_SECRET=your_strong_jwt_secret_key # Replace with a long, random, secure key

# AI API Keys (Choose one or both depending on implementation)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY # Get from Google AI Studio
GROQ_API_KEY=YOUR_GROQ_API_KEY     # Get from GroqCloud

# Email Configuration (using Nodemailer - example for Gmail)
# Use an App Password for Gmail if 2FA is enabled
NODEMAILER_EMAIL=your_email@gmail.com
NODEMAILER_PASSWORD=your_gmail_app_password
NODEMAILER_HOST=smtp.gmail.com # Or your email provider's SMTP host
NODEMAILER_PORT=465            # Or your email provider's SMTP port (465 for SSL, 587 for TLS)
NODEMAILER_SECURE=true         # true for 465, false for other ports

# Frontend URL (for CORS configuration)
FRONTEND_URL=http://localhost:3000

# Add any other necessary configuration variables
# e.g., Cloudinary keys if using for image storage
```

**Important:** Never commit your `.env` file to version control. Add `.env` to your `.gitignore` file.

---

## Testing

The project includes a `backend/tests` directory, suggesting backend tests might exist or are planned.

*   **To run backend tests (if configured):**
    ```bash
    cd backend
    npm test
    ```

*(Add details about frontend testing setup if it exists)*

---

## Contributing

Contributions are welcome! Please follow standard Forking Workflow:

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## License

Distributed under the MIT License. See `LICENSE` file for more information. *(Assuming MIT License - create a LICENSE file if needed)*

---

## Acknowledgements

*   Material UI (MUI)
*   Chakra UI
*   React Router
*   Axios
*   MongoDB Team
*   Node.js Community
*   Express Team
*   Google Gemini
*   Groq
*   *(Add any other libraries/inspirations)*

---
