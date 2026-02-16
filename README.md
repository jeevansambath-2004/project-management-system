# Project Management Tool

A full-stack project management application built with React and Node.js.

## Project Structure

```
project-management-tool/
├── frontend/               # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── routes/         # Route configuration
│   │   ├── services/       # API calls (Axios)
│   │   ├── context/        # React Context providers
│   │   ├── hooks/          # Custom React hooks
│   │   ├── assets/         # Images, fonts, etc.
│   │   ├── styles/         # Global styles
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── backend/                # Node.js/Express backend
│   ├── config/             # Database configuration
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Auth middleware
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── uploads/            # File uploads
│   ├── server.js
│   └── package.json
└── README.md
```

## MongoDB Collections

- **users** - User accounts and profiles
- **projects** - Project information
- **tasks** - Task management
- **messages** - Team communication
- **conversations** - Message threads
- **files** - File attachments

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/members` - Add member
- `DELETE /api/projects/:id/members/:userId` - Remove member

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PATCH /api/tasks/:id/status` - Update status
- `PATCH /api/tasks/:id/assign` - Assign task

### Messages
- `GET /api/messages/conversations` - Get conversations
- `POST /api/messages/new` - Start conversation
- `GET /api/messages/:id` - Get messages
- `POST /api/messages/:id` - Send message

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files` - Get all files
- `GET /api/files/:id/download` - Download file

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)

### Backend Setup

1. Navigate to backend:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment (edit `.env`):
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/project_management
   JWT_SECRET=your_secret_key
   JWT_EXPIRE=7d
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to frontend:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. Start the app:
   ```bash
   npm start
   ```

## Tech Stack

- **Frontend**: React, React Router, Axios, CSS
- **Backend**: Node.js, Express, MongoDB, Mongoose
- **Auth**: JWT (JSON Web Tokens), bcrypt
- **File Upload**: Multer
