# HireSphere - Tech Job Portal with AI Functionalities

A modern job portal platform that connects tech professionals with employers using AI-powered matching.

## Features (Sprint 1)

- User Authentication and Account Management
  - Job Seeker Registration
  - Employer Registration
  - Secure Login
  - Password Reset
- Job Posting Management
  - Create Job Listings
  - Edit/Delete Job Posts
- Bookmark Jobs (Optional)

## Tech Stack

- Frontend: React.js with TypeScript
- Backend: Node.js with Express
- Database: MongoDB
- Authentication: JWT

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YourUsername/HireSphere-SE25.git
cd HireSphere-SE25
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables:
Create `.env` files in both backend and frontend directories with necessary configuration.

4. Start the development servers:
```bash
# Start backend server
cd backend
npm run dev

# Start frontend server
cd frontend
npm start
```

## Project Structure

```
HireSphere-SE25/
├── backend/           # Node.js/Express backend
├── frontend/         # React frontend
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## File Upload System

The application uses MongoDB to store images directly in the database:

### How Image Uploads Work

1. **MongoDB Storage**:
   - All uploaded files (logos, profile images) are stored directly in MongoDB as Binary Large Objects (BLOBs)
   - Images are stored in the User document in two fields:
     - `companyLogoData`: Stores the company logo image
     - `profileImageData`: Stores the personal profile image

2. **Data Structure**:
   - Each image is stored as a document with fields:
     ```
     {
       data: Buffer,       // Binary data of the image
       contentType: String // MIME type (e.g., "image/png")
     }
     ```

3. **URL Structure**:
   - Images are accessed via API endpoints:
     - Company logos: `/api/employer/logo/:id`
     - Profile images: `/api/employer/profile-image/:id`
   - Where `:id` is the user's MongoDB ID

4. **Access Control**:
   - Only authenticated users can upload files
   - Only employers can upload logos and profile images
   - File uploads are validated for type and size
   - Images are publicly accessible for viewing

This approach provides several benefits:
- All data is stored in a single place (MongoDB)
- Simplified database backups (includes all images)
- No need to manage file system storage
- Better data integrity (image data is included in database transactions)

## Frontend Image Usage

The application uses the stored image URLs in various places:
- Company logos appear on the employer profile and job listings
- Personal profile images appear in the navigation bar and user profile page
- Images are loaded dynamically based on the URLs stored in the user object