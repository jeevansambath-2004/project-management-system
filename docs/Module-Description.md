# Project Management Tool - Module Description

## System Overview

The Project Management Tool is a full-stack web application that enables teams to collaborate on projects, manage tasks, communicate via messages, and share files.

---

## Module 1: Authentication Module

### Purpose
Handles user registration, login, and profile management.

### Features
| Feature | Description |
|---------|-------------|
| User Registration | New users can create an account with name, email, and password |
| User Login | Existing users authenticate using email and password |
| JWT Authentication | Secure token-based authentication for API access |
| Profile Management | Users can view and update their profile information |
| Password Encryption | Passwords are hashed using bcrypt for security |

### Files
- `backend/controllers/authController.js`
- `backend/models/User.js`
- `backend/routes/auth.js`
- `backend/middleware/auth.js`
- `frontend/src/pages/Login.js`
- `frontend/src/pages/Register.js`
- `frontend/src/services/authService.js`

---

## Module 2: Project Management Module

### Purpose
Allows users to create, manage, and collaborate on projects.

### Features
| Feature | Description |
|---------|-------------|
| Create Project | Users can create new projects with name, description, and color |
| View Projects | Users can view all projects they own or are members of |
| Update Project | Project owners can modify project details |
| Delete Project | Project owners can delete their projects |
| Team Management | Add or remove team members from projects |
| Project Status | Track project status (planning, active, completed, on-hold) |

### Files
- `backend/controllers/projectController.js`
- `backend/models/Project.js`
- `backend/routes/projects.js`
- `frontend/src/pages/Projects.js`
- `frontend/src/pages/ProjectDetails.js`
- `frontend/src/services/projectService.js`

---

## Module 3: Task Management Module

### Purpose
Enables users to create, assign, and track tasks within projects.

### Features
| Feature | Description |
|---------|-------------|
| Create Task | Create tasks with title, description, priority, and due date |
| View Tasks | View all tasks with filtering options |
| Update Task | Modify task details and properties |
| Delete Task | Remove tasks from the system |
| Assign Task | Assign tasks to team members |
| Status Tracking | Update task status (todo, in-progress, done) |
| Priority Levels | Set task priority (low, medium, high) |
| Due Dates | Set and track task deadlines |

### Files
- `backend/controllers/taskController.js`
- `backend/models/Task.js`
- `backend/routes/tasks.js`
- `frontend/src/pages/Tasks.js`
- `frontend/src/services/taskService.js`

---

## Module 4: Messaging Module

### Purpose
Provides real-time communication between team members.

### Features
| Feature | Description |
|---------|-------------|
| Start Conversation | Initiate new conversations with team members |
| View Conversations | See all active conversation threads |
| Send Messages | Send text messages in conversations |
| View Messages | Read message history in conversations |
| Mark as Read | Mark messages as read |
| Delete Messages | Remove own messages from conversations |

### Files
- `backend/controllers/messageController.js`
- `backend/models/Message.js`
- `backend/routes/messages.js`
- `frontend/src/pages/Messages.js`
- `frontend/src/services/messageService.js`

---

## Module 5: File Management Module

### Purpose
Allows users to upload, download, and manage files within projects.

### Features
| Feature | Description |
|---------|-------------|
| Upload Files | Upload files to the system with project association |
| View Files | View all uploaded files |
| Download Files | Download files from the system |
| Delete Files | Remove files from the system |
| File Metadata | Track file name, size, type, and upload date |

### Files
- `backend/controllers/fileController.js`
- `backend/models/File.js`
- `backend/routes/files.js`
- `frontend/src/services/fileService.js`

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React.js, React Router, Axios, CSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB, Mongoose |
| **Authentication** | JWT (JSON Web Tokens), bcrypt |
| **File Upload** | Multer |

---

## Database Collections

| Collection | Description |
|------------|-------------|
| `users` | User accounts and profile information |
| `projects` | Project details and team membership |
| `tasks` | Task information and assignments |
| `messages` | Chat messages between users |
| `conversations` | Message thread metadata |
| `files` | Uploaded file metadata |

---

## Module Dependencies

```
Authentication Module
        │
        ▼
┌───────────────────────────────────────┐
│                                       │
▼                                       ▼
Project Management Module ◄──► Task Management Module
        │                               │
        │                               │
        ▼                               ▼
File Management Module          Messaging Module
```

All modules depend on the **Authentication Module** for user verification and access control.
