# Complete Learning & Interview Prep Guide

## Multi-Tenant Asset Manager

**Your comprehensive guide to understanding, explaining, and presenting your project.**

---

## 📋 TABLE OF CONTENTS

1. [Quick Reference](#quick-reference)
2. [Project Overview](#project-overview)
3. [Architecture & Tech Stack](#architecture--tech-stack)
4. [Key Concepts](#key-concepts)
5. [Important Functions](#important-functions)
6. [Security Implementation](#security-implementation)
7. [Database Design](#database-design)
8. [Frontend Patterns](#frontend-patterns)
9. [Common Interview Questions](#common-interview-questions)
10. [Resume & Profile Templates](#resume--profile-templates)

---

## 🎯 QUICK REFERENCE

### Project in 30 Seconds

"Multi-tenant asset management system. React frontend, Node.js/Express backend, PostgreSQL database. JWT authentication, bcrypt password hashing, complete data isolation between organizations. Deployed on Railway and Vercel."

### Key Concepts (One-liners)

| Concept           | Explanation                                      |
| ----------------- | ------------------------------------------------ |
| **Multi-tenancy** | One app, multiple orgs, complete data isolation  |
| **JWT**           | Stateless auth token containing userId + orgId   |
| **bcrypt**        | Password hashing (never store plain text!)       |
| **Middleware**    | Functions that run before route handlers         |
| **Prisma**        | Type-safe ORM for database queries               |
| **RESTful API**   | Standard HTTP methods (GET, POST, PATCH, DELETE) |

### API Endpoints

```
POST   /api/auth/login        # Login (public)
GET    /api/assets            # Get all assets (protected)
POST   /api/assets            # Create asset (protected)
PATCH  /api/assets/:id        # Update asset (protected)
DELETE /api/assets/:id        # Delete asset (protected)
```

### Security Checklist

- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens with expiration
- ✅ All queries filter by `organizationId`
- ✅ `updateMany()` / `deleteMany()` include orgId
- ✅ Input validation on all endpoints
- ✅ Generic error messages

---

## 🎯 PROJECT OVERVIEW

### What is this project?

A **production-ready asset management system** that allows multiple organizations to manage their hardware assets (laptops, servers, etc.) in complete isolation from each other.

### Key Features:

- ✅ User authentication (login/logout)
- ✅ Multi-tenant data isolation (Org A can't see Org B's assets)
- ✅ Full CRUD operations (Create, Read, Update, Delete assets)
- ✅ Real-time statistics dashboard
- ✅ Deployed on Railway (backend) and Vercel (frontend)

### Why is it impressive?

- **Multi-tenancy** - Complex security requirement
- **Production deployment** - Not just localhost
- **Full-stack** - Both frontend and backend
- **Security best practices** - Password hashing, JWT, input validation

---

## 🏗️ ARCHITECTURE & TECH STACK

### Backend (Node.js/Express)

```
backend/
├── src/
│   ├── server.js          # Express server setup, routes
│   ├── controllers/       # Business logic
│   │   ├── authController.js    # Login logic
│   │   └── assetController.js   # CRUD operations
│   ├── middleware/       # Authentication middleware
│   │   └── auth.js       # JWT verification
│   └── db/
│       └── prisma.js     # Database connection singleton
└── prisma/
    └── schema.prisma      # Database schema definition
```

### Frontend (React)

```
frontend/
├── src/
│   ├── App.jsx           # Root component, routing logic
│   ├── components/
│   │   ├── Login.jsx           # Login form
│   │   ├── Dashboard.jsx      # Main dashboard
│   │   ├── AddAssetModal.jsx  # Create asset form
│   │   └── EditAssetModal.jsx # Edit asset form
│   └── api/
│       └── axios.js      # API client configuration
```

### Database (PostgreSQL via Supabase)

- **Hosted on:** Supabase (cloud PostgreSQL)
- **ORM:** Prisma (type-safe database queries)
- **Models:** Organization, User, Asset, Category

### Deployment

- **Backend:** Railway (Node.js hosting)
- **Frontend:** Vercel (React hosting)
- **Database:** Supabase (PostgreSQL hosting)

---

## 🔑 KEY CONCEPTS

### 1. Multi-Tenancy

**What it is:** One application serves multiple organizations, but each organization's data is completely isolated.

**How it works:**

- Every user belongs to an `organization`
- Every asset belongs to an `organization`
- All database queries filter by `organizationId`
- Users can ONLY see/modify their organization's data

**Why it matters:** This is a **security requirement**. Without it, Organization A could see Organization B's assets.

**Example:**

```javascript
// ❌ BAD - No organization filter (security risk!)
const assets = await prisma.asset.findMany();

// ✅ GOOD - Filtered by organization (secure!)
const assets = await prisma.asset.findMany({
  where: { organizationId: req.user.orgId },
});
```

### 2. JWT (JSON Web Token) Authentication

**What it is:** A secure way to authenticate users without storing sessions in the database.

**How it works:**

1. User logs in with email/password
2. Server verifies credentials
3. Server creates a JWT token containing `{ userId, orgId }`
4. Client stores token in `localStorage`
5. Client sends token in `Authorization: Bearer <token>` header
6. Server verifies token on every request

**Why JWT?**

- **Stateless** - No database lookup needed (faster)
- **Scalable** - Works across multiple servers
- **Secure** - Signed with secret, can't be tampered with

**Token Structure:**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJvcmdJZCI6IjQ1NiJ9.signature
│───────────────────────││──────────────────────────││──────────│
     Header (algorithm)      Payload (data)          Signature
```

### 3. Password Hashing (bcrypt)

**What it is:** Converting passwords into unreadable hashes before storing in database.

**Why hash?**

- If database is hacked, attackers can't see real passwords
- Even if two users have same password, hashes are different (salting)

**How it works:**

```javascript
// During registration/seed:
const hashedPassword = await bcrypt.hash("password123", 10);
// Stores: "$2a$10$N9qo8uLOickgx2ZMRZoMye..."

// During login:
const isValid = await bcrypt.compare("password123", hashedPassword);
// Returns: true or false
```

**Key point:** We **NEVER** store plain text passwords. Always hash!

### 4. Middleware Pattern

**What it is:** Functions that run before route handlers to perform checks.

**Example:**

```javascript
// Route definition
app.get("/api/assets", authenticate, getAssets);
//                      ↑
//                  Middleware runs FIRST
//                  If it fails, request stops
//                  If it succeeds, continues to getAssets
```

**Authentication middleware flow:**

1. Extract token from `Authorization` header
2. Verify token with `jwt.verify()`
3. If valid: attach `{ userId, orgId }` to `req.user`
4. Call `next()` to continue to route handler
5. If invalid: return 401/403 error

### 5. RESTful API Design

**HTTP Methods:**

- `GET` - Read data (no side effects)
- `POST` - Create new resource
- `PATCH` - Update existing resource (partial update)
- `DELETE` - Delete resource

### 6. Prisma ORM

**What it is:** Object-Relational Mapping - makes database queries easier and type-safe.

**Benefits:**

- Type-safe queries (catch errors at compile time)
- Auto-completion in IDE
- Migrations (version control for database schema)
- Prevents SQL injection

**Example:**

```javascript
// Prisma (safe, type-safe)
const user = await prisma.user.findUnique({
  where: { email: "user@example.com" },
});

// Raw SQL (error-prone, no type safety)
const user = await db.query("SELECT * FROM users WHERE email = ?", [email]);
```

### 7. React Hooks

**useState:**

```javascript
const [assets, setAssets] = useState([]);
//       ↑              ↑
//    current      function to
//    value        update value
```

**useEffect:**

```javascript
useEffect(() => {
  // Runs after component renders
  fetchAssets();
}, []); // Empty array = run once on mount
```

### 8. Axios Interceptors

**What it is:** Functions that run before/after every HTTP request.

**Our use case:** Automatically add JWT token to every request.

```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Why use it?** Don't have to manually add token to every API call.

---

## 🔧 IMPORTANT FUNCTIONS

### Backend Functions

#### 1. `login()` - `authController.js`

**Purpose:** Authenticate user and return JWT token.

**Flow:**

1. Validate email format
2. Find user in database
3. Compare password with bcrypt
4. Create JWT token with `{ userId, orgId }`
5. Return token and user info

**Key code:**

```javascript
const isPasswordValid = await bcrypt.compare(password, user.password);
const token = jwt.sign(
  { userId: user.id, orgId: user.organizationId },
  process.env.JWT_SECRET,
  { expiresIn: "24h" }
);
```

#### 2. `authenticate()` - `middleware/auth.js`

**Purpose:** Verify JWT token on protected routes.

**Key code:**

```javascript
const token = authHeader.split(" ")[1]; // "Bearer <token>" -> "<token>"
jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
  if (err) return res.status(403).json({ error: "Invalid session" });
  req.user = user; // Attach to request
  next(); // Continue to route handler
});
```

#### 3. `getAssets()` - `assetController.js`

**Purpose:** Fetch all assets for user's organization.

**Security:** Filters by `organizationId` - critical for multi-tenancy!

**Key code:**

```javascript
const assets = await prisma.asset.findMany({
  where: { organizationId: req.user.orgId }, // SECURITY!
  include: { category: true },
});
```

#### 4. `createAsset()` - `assetController.js`

**Purpose:** Create new asset with validation.

**Key code:**

```javascript
// Check duplicate
const existingAsset = await prisma.asset.findUnique({
  where: { serialNumber },
});
if (existingAsset && existingAsset.organizationId === orgId) {
  return res.status(409).json({ error: "Serial number already exists" });
}

// Create asset
const newAsset = await prisma.asset.create({
  data: {
    name: name.trim(),
    serialNumber: serialNumber.trim(),
    status: status || "active",
    organizationId: orgId, // SECURITY!
    categoryId: category.id,
  },
});
```

#### 5. `updateAsset()` - `assetController.js`

**Purpose:** Update existing asset (PATCH - partial update).

**Security:** Uses `updateMany()` with BOTH `id` AND `organizationId`!

**Key code:**

```javascript
const updated = await prisma.asset.updateMany({
  where: {
    id: id,
    organizationId: orgId, // SECURITY - only update own org's assets
  },
  data: updateData,
});

if (updated.count === 0) {
  return res.status(404).json({ error: "Asset not found" });
}
```

#### 6. `deleteAsset()` - `assetController.js`

**Purpose:** Delete asset (same security pattern as update).

**Key code:**

```javascript
const deleted = await prisma.asset.deleteMany({
  where: {
    id: id,
    organizationId: orgId, // SECURITY!
  },
});
```

### Frontend Functions

#### 1. `fetchAssets()` - `Dashboard.jsx`

**Purpose:** Fetch assets from API and update state.

**Key code:**

```javascript
const { data } = await api.get("/assets");
setAssets(data); // Triggers re-render
setLoading(false);
```

#### 2. `handleDelete()` - `Dashboard.jsx`

**Purpose:** Delete asset and refresh list.

**Key code:**

```javascript
await api.delete(`/assets/${id}`);
fetchAssets(); // Refresh list
```

#### 3. `handleEdit()` - `Dashboard.jsx`

**Purpose:** Open edit modal with asset data pre-filled.

**Key code:**

```javascript
setSelectedAsset(asset); // Store asset to edit
setIsEditModalOpen(true); // Show modal
```

---

## 🔒 SECURITY IMPLEMENTATION

### 1. Password Security

- ✅ Passwords hashed with bcrypt (never plain text)
- ✅ Salt rounds: 10 (configurable, higher = more secure but slower)

### 2. Authentication

- ✅ JWT tokens with expiration (24 hours)
- ✅ Token stored in localStorage (client-side)
- ✅ Token verified on every protected request

### 3. Multi-Tenant Security

- ✅ All queries filter by `organizationId`
- ✅ `updateMany()` and `deleteMany()` include `organizationId` in WHERE clause
- ✅ Users cannot access other organizations' data

### 4. Input Validation

- ✅ Email format validation (regex)
- ✅ Required fields checked
- ✅ Empty string validation (trim())
- ✅ Enum validation (status must be 'active', 'maintenance', or 'retired')

### 5. Error Handling

- ✅ Generic error messages (don't reveal internal details)
- ✅ Proper HTTP status codes (400, 401, 403, 404, 409, 500)
- ✅ Try/catch blocks for async operations

### 6. CORS Configuration

- ✅ Configured for production (specific origins)
- ✅ Allows credentials (cookies, auth headers)

---

## 🗄️ DATABASE DESIGN

### Schema Overview

```
Organization (1) ──< (Many) User
Organization (1) ──< (Many) Asset
Organization (1) ──< (Many) Category
Category (1) ──< (Many) Asset
```

### Models

#### Organization

- `id` (UUID, primary key)
- `name` (unique)
- `slug` (unique, URL-friendly name)

#### User

- `id` (UUID, primary key)
- `email` (unique)
- `password` (hashed)
- `organizationId` (foreign key → Organization)
- `role` (default: "MEMBER")

#### Asset

- `id` (UUID, primary key)
- `name`
- `serialNumber` (unique)
- `status` ('active', 'maintenance', 'retired')
- `organizationId` (foreign key → Organization)
- `categoryId` (foreign key → Category)

#### Category

- `id` (UUID, primary key)
- `name`
- `organizationId` (foreign key → Organization)

### Key Design Decisions

1. **UUIDs instead of integers:**

   - Harder to guess (security)
   - Works across distributed systems

2. **Unique constraints:**

   - `email` unique (one account per email)
   - `serialNumber` unique (no duplicates)
   - `organization.name` unique (no duplicate org names)

3. **Relationships:**
   - One-to-many: Organization → Users, Assets, Categories
   - Many-to-one: Asset → Category

---

## 🎨 FRONTEND PATTERNS

### 1. Component Structure

```
App (root)
  ├── Login (if not logged in)
  └── Dashboard (if logged in)
       ├── Statistics Cards
       ├── Assets Table
       ├── AddAssetModal
       └── EditAssetModal
```

### 2. State Management

- **Local state:** `useState` for component-specific data
- **No global state:** Simple enough that props work fine
- **localStorage:** Stores token, orgId, orgName

### 3. API Communication

- **Axios instance:** Configured with baseURL and interceptors
- **Automatic token:** Interceptor adds token to every request
- **Error handling:** Try/catch blocks with user-friendly messages

### 4. Conditional Rendering

```javascript
// Show login if not authenticated
if (!isLoggedIn) {
  return <Login />;
}

// Show dashboard if authenticated
return <Dashboard />;
```

### 5. Modal Pattern

```javascript
// State controls visibility
const [isModalOpen, setIsModalOpen] = useState(false);

// Open modal
<button onClick={() => setIsModalOpen(true)}>Add Asset</button>;

// Render modal conditionally
{
  isModalOpen && <AddAssetModal onClose={() => setIsModalOpen(false)} />;
}
```

---

## ❓ COMMON INTERVIEW QUESTIONS

### Q1: "Tell me about this project."

**Answer:**
"I built a multi-tenant asset management system that allows multiple organizations to track their hardware assets in complete isolation. It's a full-stack application with React frontend, Node.js/Express backend, and PostgreSQL database. I implemented JWT authentication, password hashing with bcrypt, and ensured complete data isolation between organizations. The application is deployed on Railway for the backend and Vercel for the frontend."

**Key points to mention:**

- Multi-tenancy (complex requirement)
- Security (JWT, bcrypt, input validation)
- Full-stack (shows breadth)
- Deployment (production-ready)

### Q2: "How does multi-tenancy work in your application?"

**Answer:**
"Every user belongs to an organization, and every asset belongs to an organization. When a user logs in, their JWT token contains their `organizationId`. On every database query, I filter by `organizationId` to ensure users can only see their organization's data. For updates and deletes, I use `updateMany()` and `deleteMany()` with both the asset ID and `organizationId` in the WHERE clause. This prevents users from modifying assets belonging to other organizations."

**Key points:**

- Organization-based isolation
- JWT contains orgId
- All queries filter by organizationId
- Secure update/delete operations

### Q3: "How do you handle authentication?"

**Answer:**
"I use JWT (JSON Web Token) for stateless authentication. When a user logs in, I verify their email and password using bcrypt to compare the hashed password. If valid, I create a JWT token containing the user's ID and organization ID, signed with a secret key. The client stores this token in localStorage and sends it in the Authorization header on every request. My authentication middleware verifies the token before allowing access to protected routes."

**Key points:**

- JWT tokens (stateless)
- bcrypt for password verification
- Token stored in localStorage
- Middleware verifies on every request

### Q4: "Why did you use Prisma instead of raw SQL?"

**Answer:**
"Prisma provides type-safe database queries, which means I catch errors at development time rather than runtime. It also prevents SQL injection attacks automatically, generates TypeScript types from my schema, and makes migrations easier to manage. The syntax is more readable and maintainable than raw SQL, and it works seamlessly with my PostgreSQL database."

**Key points:**

- Type safety
- SQL injection prevention
- Better developer experience
- Migrations

### Q5: "How do you ensure security in your application?"

**Answer:**
"I implement several security measures: First, passwords are hashed with bcrypt before storing in the database. Second, I use JWT tokens with expiration for authentication. Third, all database queries filter by organizationId to prevent cross-tenant data access. Fourth, I validate all user input to prevent malicious data. Finally, I use proper HTTP status codes and generic error messages to avoid revealing internal details."

**Key points:**

- Password hashing
- JWT authentication
- Multi-tenant isolation
- Input validation
- Secure error handling

### Q6: "What challenges did you face?"

**Answer:**
"One challenge was ensuring complete data isolation in a multi-tenant system. I had to be careful to include `organizationId` in every query, especially for update and delete operations. I solved this by using `updateMany()` and `deleteMany()` with both the ID and `organizationId` in the WHERE clause. Another challenge was deployment - I had to configure environment variables correctly for Railway and Vercel, and set up CORS properly for cross-origin requests."

**Key points:**

- Multi-tenant security
- Deployment configuration
- Show problem-solving ability

### Q7: "How would you scale this application?"

**Answer:**
"For scaling, I would: First, add database indexing on frequently queried fields like `organizationId` and `email`. Second, implement pagination for the assets list to handle large datasets. Third, add caching with Redis for frequently accessed data. Fourth, consider using a connection pooler for the database. Fifth, implement rate limiting to prevent abuse. Finally, if needed, I could split the application into microservices, but for now, the monolithic structure works well."

**Key points:**

- Database optimization
- Pagination
- Caching
- Connection pooling
- Rate limiting

### Q8: "What would you improve?"

**Answer:**
"I would add: First, unit tests and integration tests to ensure code quality. Second, pagination for the assets list to handle large datasets. Third, search and filtering functionality. Fourth, user roles and permissions (admin vs. member). Fifth, audit logging to track who made what changes. Finally, I'd add a `createdAt` timestamp to assets for better sorting and tracking."

**Key points:**

- Testing
- Pagination
- Search/filter
- Role-based access
- Audit logging

---

## 📝 RESUME & PROFILE TEMPLATES

### Resume Template

**Professional Summary:**
Computer Engineering graduate with hands-on experience building and deploying full-stack web applications. Proficient in React, Node.js, Express, and PostgreSQL. Strong foundation in RESTful API development, database design, and cloud deployment. Seeking a Full-Stack Developer position to contribute to innovative projects.

**Technical Skills:**

- **Frontend:** React, JavaScript, Tailwind CSS, Vite, Axios
- **Backend:** Node.js, Express.js, RESTful APIs
- **Database:** PostgreSQL, Prisma ORM, Supabase
- **Authentication:** JWT, bcrypt
- **Deployment:** Railway, Vercel, Supabase
- **Tools:** Git, GitHub, Postman, Docker
- **Languages:** JavaScript, SQL

**Project: Multi-Tenant Asset Manager**

- Developed production-ready asset management system with multi-tenant architecture ensuring complete data isolation between organizations
- Implemented secure JWT authentication with bcrypt password hashing and input validation
- Built RESTful API with Express.js handling CRUD operations for assets with organization-level security
- Designed PostgreSQL database schema using Prisma ORM with proper relationships and constraints
- Created responsive React UI with Tailwind CSS and modern component architecture
- Deployed backend to Railway and frontend to Vercel with environment configuration
- Utilized Supabase for PostgreSQL database hosting and management

**Technologies:** React, Node.js, Express, Prisma, PostgreSQL, Supabase, Railway, Vercel, JWT, bcrypt

### LinkedIn Profile

**Headline:**
Full-Stack Developer | PERN Stack Specialist | Deploying Production-Ready Applications on Railway & Vercel

**About Section:**
I'm a Computer Engineering graduate specializing in full-stack web development with a focus on building scalable, secure applications using the PERN Stack (PostgreSQL, Express, React, Node.js).

🔧 Technical Expertise:
• Frontend: React, Tailwind CSS, Vite, Modern JavaScript
• Backend: Node.js, Express, RESTful APIs
• Database: PostgreSQL, Prisma ORM, Supabase
• Authentication: JWT, bcrypt, secure session management
• Deployment: Railway, Vercel, Supabase
• Tools: Git, Docker, Postman, pgAdmin

🚀 Recent Projects:
I recently built and deployed a production-ready Multi-Tenant Asset Management System featuring:
• Complete data isolation between organizations
• JWT-based authentication with secure password hashing
• Full CRUD operations with input validation
• Modern React UI with responsive design
• Deployed on Railway (backend) and Vercel (frontend)

I'm passionate about writing clean, maintainable code and implementing security best practices. Always learning and building applications that solve real-world problems.

Open to opportunities in full-stack development, backend engineering, and cloud deployment.

### GitHub Profile README

```markdown
# Hi, I'm vmargin 👋

### Computer Engineering Graduate | Full-Stack Developer

I specialize in building scalable web applications using the **PERN Stack** (PostgreSQL, Express, React, Node.js). Currently focused on rapid development, secure API architectures, and multi-tenant systems.

## 🛠 Tech Stack

**Frontend:** React, Tailwind CSS, Vite, Axios
**Backend:** Node.js, Express, Prisma ORM, JWT Authentication, bcryptjs
**Database:** PostgreSQL (Supabase), Redis
**Cloud/DevOps:** Railway, Vercel, Supabase, Git, GitHub Actions
**Tools:** Postman, pgAdmin, Docker

## 🚀 Featured Projects

### [Multi-Tenant Asset Manager](https://github.com/vmargin/assethub)

A production-ready asset management system with multi-tenant architecture. Features include:

- 🔐 JWT-based authentication with secure password hashing
- 🏢 Complete data isolation between organizations
- 📦 Full CRUD operations for assets
- 🎨 Modern React UI with Tailwind CSS
- 🚀 Deployed on Railway (backend) and Vercel (frontend)
- 🔒 Input validation and security best practices

**Tech:** React, Node.js, Express, Prisma, PostgreSQL, Supabase, Railway, Vercel

## 📫 Connect with me

- **GitHub:** [@vmargin](https://github.com/vmargin)
- **LinkedIn:** [@vmargin](https://www.linkedin.com/in/vmargin/)
```

---

## 🎯 WHAT TO EMPHASIZE

### 1. Multi-Tenancy

- **Complex requirement** - Shows you can handle security
- **Real-world application** - Many SaaS apps use this pattern
- **Security-focused** - Demonstrates understanding of data isolation

### 2. Security Best Practices

- Password hashing (bcrypt)
- JWT authentication
- Input validation
- Multi-tenant isolation
- Secure error handling

### 3. Full-Stack Capability

- Frontend: React, state management, API integration
- Backend: Express, RESTful APIs, database design
- Deployment: Railway, Vercel, Supabase

### 4. Production Deployment

- Not just localhost - actually deployed
- Environment configuration
- CORS setup
- Database hosting

### 5. Code Quality

- Organized file structure
- Separation of concerns (controllers, middleware)
- Error handling
- Input validation

---

## 🚀 FINAL TIPS

1. **Practice explaining the project** - Record yourself, time it (2-3 minutes)
2. **Know the flow** - Login → Token → Protected routes → Multi-tenant queries
3. **Emphasize security** - This is what makes your project impressive
4. **Be honest about learning** - "I built this to learn X, and I learned Y"
5. **Show enthusiasm** - You're proud of what you built!

**You've got this!** 🎉

---

## 📚 FILE STRUCTURE REFERENCE

### Backend

- `server.js` → Express setup, routes
- `authController.js` → Login logic
- `assetController.js` → CRUD operations
- `auth.js` → JWT middleware
- `schema.prisma` → Database schema

### Frontend

- `App.jsx` → Root component, routing
- `Dashboard.jsx` → Main component
- `Login.jsx` → Login form
- `axios.js` → API client config

---

**This guide contains everything you need to understand, explain, and present your project confidently!**
