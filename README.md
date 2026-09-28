# Neura V5

> A full-stack, multi-user AI assistant platform with specialized AI agents, persistent conversations, document intelligence, RAG, memory, research, study tools, developer tools, analytics, and production-oriented architecture.

## Overview

Neura V5 is designed as a modular AI assistant platform rather than a single-purpose chatbot.

The platform combines:

- Multi-user authentication
- Specialized AI agents
- Persistent conversations
- Streaming AI responses
- Document upload and analysis
- Retrieval-Augmented Generation (RAG)
- Personal AI memory
- Web research
- Study and productivity tools
- Developer tools
- Dashboard and analytics
- Configurable AI providers
- PostgreSQL-based persistent storage
- Production-oriented security and reliability architecture

The system is built around a React frontend, a Node.js/Express backend, PostgreSQL with Prisma, and an AI gateway that abstracts AI providers.

---

## Features

### Authentication

- Email/password registration
- Login and logout
- Protected routes
- Current-user handling
- Password security
- Google OAuth architecture
- Session/token handling

### AI Agents

Neura V5 is designed around specialized AI agents:

| Agent | Purpose |
|---|---|
| Neura General | General-purpose AI assistance |
| Neura Code | Programming, debugging, and development |
| Neura Study | Learning, notes, quizzes, and exam preparation |
| Neura Research | Research, analysis, and source-based work |
| Neura Creative | Writing, brainstorming, and content generation |

Agents are configuration-driven so that agent behavior can be extended without coupling it directly to the chat implementation.

### AI Chat

- Persistent conversations
- Message history
- Agent-specific system prompts
- AI gateway architecture
- Streaming responses using SSE
- Retry/regeneration support
- Stop-generation support
- Message actions
- Conversation context

### Conversation Management

- Create new conversations
- Conversation history
- Rename conversations
- Delete conversations
- Search conversations
- Pin conversations
- Archive conversations
- Auto-generated conversation titles
- Edit user messages
- Regenerate AI responses
- Copy responses
- Message feedback
- Delete individual messages

### Voice

The platform includes a voice interaction architecture supporting:

- Microphone permissions
- Listening state
- Recording state
- Speech recognition
- Transcription
- Stop recording
- Error handling

Future versions can extend this architecture with AI text-to-speech.

### Documents

Supported document types include:

- PDF
- DOCX
- TXT
- Images

Document functionality includes:

- Upload
- Document listing
- Search
- Preview
- Processing status
- Delete
- Chat with documents

### RAG / Personal Knowledge Base

The RAG pipeline is designed as:

```text
Document Upload
      ↓
Text Extraction
      ↓
Chunking
      ↓
Embeddings
      ↓
PostgreSQL + pgvector
      ↓
Semantic Search
      ↓
Relevant Context
      ↓
AI Model
      ↓
Answer
```

RAG capabilities include:

- Personal knowledge base
- Document embeddings
- Semantic search
- Chat with documents
- Multiple-document conversations
- Citations and source references
- Document collections
- Re-indexing

### AI Memory

Neura V5 supports personalized AI behavior through:

- Saved memories
- Memory extraction
- Memory management
- Custom instructions
- User preferences
- Default AI agent
- Memory deletion

### Multi-Model AI Gateway

The AI gateway provides a provider abstraction layer.

```text
                AI Gateway
                    |
          +---------+---------+
          |         |         |
        Gemini     GPT     Other
```

Gemini is the initial provider, while the architecture allows additional providers and models to be integrated later.

### Web Research

The research architecture supports:

```text
User Question
      ↓
Web Search
      ↓
Source Collection
      ↓
Information Extraction
      ↓
AI Analysis
      ↓
Answer + Citations
```

Capabilities include:

- Web search
- Source citations
- Research mode
- Source opening
- Search summaries

### Study Mode

Neura Study is designed to provide:

- Notes generation
- Concept explanations
- MCQs
- Flashcards
- Quizzes
- Study plans
- Exam mode
- Question solving
- Revision mode

### Developer Mode

Developer-oriented functionality includes:

- Code explanation
- Debugging
- Refactoring
- Optimization
- Test generation
- GitHub integration architecture
- Repository analysis
- Secure code execution architecture

### Productivity

Productivity functionality includes:

- AI notes
- Tasks
- Saved prompts
- Summaries
- Personal workspace
- AI-generated task lists

### Dashboard & Analytics

The dashboard architecture provides:

- Conversation statistics
- Message statistics
- Agent usage
- Document activity
- Recent activity
- Usage information

Analytics can include:

- Daily usage
- Weekly usage
- Most-used agent
- Most-used model
- Document activity
- Conversation statistics

---

# Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| UI Generation | Bolt.new |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| ORM | Prisma |
| AI | Gemini initially |
| Authentication | Email/Password + Google OAuth |
| Streaming | Server-Sent Events (SSE) |
| RAG | PostgreSQL + pgvector |
| API | REST + SSE |
| Version Control | Git + GitHub |

---

# Architecture

```text
                         USERS
                           |
                           v
                    React + Vite
                           |
                       REST + SSE
                           |
                           v
                  Node.js + Express
                           |
       +-------------------+-------------------+
       |                   |                   |
       v                   v                   v
 Authentication       Chat Service        AI Gateway
       |                   |                   |
       |                   v             +-----+-----+
       |             Agent Service       |     |     |
       |                                 v     v     v
       |                              Gemini  GPT  Other
       |
       +-------------------+
                           |
                           v
                         Prisma
                           |
                           v
                      PostgreSQL
                           |
                 +---------+---------+
                 |                   |
                 v                   v
          Relational Data         pgvector
                                      |
                                      v
                                     RAG
```

---

# Project Structure

```text
NeuraV5/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   ├── scripts/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   │
│   ├── test/
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── config/
│   │   ├── data/
│   │   ├── i18n/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   ├── test/
│   │   └── types/
│   │
│   ├── package.json
│   └── README.md
│
└── README.md
```

---

# Database

Neura V5 uses PostgreSQL with Prisma.

Core entities include:

```text
User
 ├── Conversations
 │     └── Messages
 ├── Documents
 ├── Memories
 └── Settings

Agent
 └── Conversations
```

The database layer also supports the RAG architecture through PostgreSQL/pgvector.

Database functionality includes:

- Prisma schema
- Migrations
- Database indexes
- Seed data
- Relationship validation
- Persistent application data

---

# API Architecture

The backend exposes REST APIs for application functionality and SSE for streaming AI responses.

```text
Frontend
   |
   | REST / SSE
   v
Express API
   |
   +── Authentication
   +── Chat
   +── Agents
   +── Conversations
   +── Messages
   +── Documents
   +── Memory
   +── Research
   +── Analytics
   +── Productivity
   +── Study
   +── Developer
   +── User
   +── Settings
```

---

# Security & Reliability

The architecture includes production-oriented security measures such as:

- Input validation
- Authentication
- Authorization
- Rate limiting
- API-key protection
- File validation
- User-data isolation
- Secure cookies/tokens
- CORS configuration
- SQL injection protection through the database abstraction
- Upload security
- Centralized error handling
- Logging
- API timeouts
- AI failure handling
- Database error handling
- Retry logic

Secrets and environment-specific configuration should remain outside source control.

Use the provided `.env.example` files as templates.

---

# Testing

The project contains frontend and backend testing infrastructure.

### Frontend

- Component tests
- Authentication tests
- Chat tests
- Agent selector tests

### Backend

- API tests
- Authentication tests
- Database tests
- AI service tests

### Integration

The complete application flow should be validated:

```text
React
  ↓
API
  ↓
Database
  ↓
AI Services
```

Testing should cover complete user flows rather than isolated components only.

---

# Local Development

## Prerequisites

Install:

- Node.js
- npm
- PostgreSQL
- Git

A PostgreSQL database is required for the backend.

## Clone the Repository

```bash
git clone https://github.com/Omkantjha2006/NeuraV5.git
cd NeuraV5
```

## Backend Setup

```bash
cd backend
npm install
```

Create your environment file:

```text
.env
```

Use:

```text
.env.example
```

as the configuration template.

Configure the required database and API credentials.

Generate Prisma client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate deploy
```

For development environments where migrations are actively developed:

```bash
npx prisma migrate dev
```

If seed data is required:

```bash
npx prisma db seed
```

Start the backend using the project's configured npm script.

For production, use `npm run prisma:migrate:deploy` during deployment. Do not use `prisma db push` or `prisma migrate reset` against production. The RAG `document_chunks` table is managed by raw SQL migrations because it uses pgvector.

## Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create:

```text
.env
```

using:

```text
.env.example
```

as the template.

Then start the frontend using the configured npm script.

---

# Environment Variables

Do **not** commit real environment variables or API keys.

The repository uses:

```text
backend/.env.example
frontend/.env.example
```

instead of committing actual `.env` files.

Typical configuration may include:

```text
DATABASE_URL
GEMINI_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SESSION_COOKIE_NAME
SESSION_COOKIE_SAMESITE
FRONTEND_URL
PORT
```

The exact variables required by the current implementation are defined in the project's `.env.example` files.

---

# Development Roadmap

Neura V5 follows a structured development roadmap:

```text
Phase 0   Architecture
    ↓
Phase 1   Frontend / UI
    ↓
Phase 2   Frontend Architecture
    ↓
Phase 3   Backend Foundation
    ↓
Phase 4   PostgreSQL + Prisma
    ↓
Phase 5   Authentication
    ↓
Phase 6   AI Agent System
    ↓
Phase 7   Core AI Chat
    ↓
Phase 8   Conversation Management
    ↓
Phase 9   Voice
    ↓
Phase 10  File Upload & Documents
    ↓
Phase 11  RAG / Knowledge Base
    ↓
Phase 12  AI Memory
    ↓
Phase 13  Multi-Model Gateway
    ↓
Phase 14  Web Research
    ↓
Phase 15  Study Mode
    ↓
Phase 16  Developer Mode
    ↓
Phase 17  Productivity
    ↓
Phase 18  Dashboard & Analytics
    ↓
Phase 19  Security & Reliability
    ↓
Phase 20  Testing
    ↓
Phase 21  Deployment
```

Each phase follows:

```text
Plan
  ↓
Implement
  ↓
Test
  ↓
Review
  ↓
Mark Phase Complete
  ↓
Move to Next Phase
```

---

# Production Deployment

### Cross-origin authentication

If the frontend and backend are hosted on different sites (for example, a Vercel frontend and a Render backend), set `FRONTEND_URL` to the exact frontend origin and set `SESSION_COOKIE_SAMESITE=none`. Production cookies are automatically marked `Secure`. For same-site/local development, keep `SESSION_COOKIE_SAMESITE=lax`.


The target production architecture is:

```text
                    USERS
                      |
                      v
                React Frontend
                      |
                      v
                Node/Express API
                 /     |      \
                /      |       \
               v       v        v
        PostgreSQL   Storage   AI Providers
             |
             v
          pgvector
```

Deployment requirements include:

- Production environment variables
- Production PostgreSQL
- Frontend deployment
- Backend deployment
- Domain configuration
- HTTPS
- Monitoring
- Error tracking
- Database backups

---

# Project Milestones

| Milestone | Result |
|---|---|
| M0 | Architecture finalized |
| M1 | Frontend/UI |
| M2 | Backend + database |
| M3 | Authentication |
| M4 | AI agents |
| M5 | AI Chat MVP |
| M6 | Voice + conversation management |
| M7 | Documents |
| M8 | RAG |
| M9 | Memory |
| M10 | Research + advanced agents |
| M11 | Security + testing |
| M12 | Production deployment |

---

# Project Goals

Neura V5 is being developed with the following long-term goals:

- Provide a unified AI workspace
- Support multiple specialized AI agents
- Preserve conversation and user context
- Give users a personal AI knowledge base
- Provide document-aware AI interactions
- Support research workflows
- Support study and productivity workflows
- Provide developer-focused AI tools
- Maintain a modular AI-provider architecture
- Maintain secure multi-user data isolation
- Provide a scalable production architecture

---

# Repository

GitHub:  
https://github.com/Omkantjha2006/NeuraV5

---

# License

License information will be added when the project's licensing model is finalized.
