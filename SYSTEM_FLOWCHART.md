# System Flowchart - Multi-Tenant Asset Manager

## Complete System Flow from Login to All Operations

---

## 🔐 AUTHENTICATION FLOW

```mermaid
flowchart TD
    A[User Opens App] --> B{Token in localStorage?}
    B -->|No| C[Show Login Page]
    B -->|Yes| D[Show Dashboard]
    
    C --> E[User Enters Email & Password]
    E --> F[Frontend: POST /api/auth/login]
    F --> G[Backend: authController.login]
    
    G --> H{Email Format Valid?}
    H -->|No| I[Return 400: Invalid email format]
    H -->|Yes| J[Find User in Database]
    
    J --> K{User Exists?}
    K -->|No| L[Return 401: Invalid credentials]
    K -->|Yes| M[bcrypt.compare password]
    
    M --> N{Password Valid?}
    N -->|No| L
    N -->|Yes| O[Create JWT Token]
    
    O --> P[Token Contains: userId, orgId]
    P --> Q[Return: token + user info]
    Q --> R[Frontend: Store token in localStorage]
    R --> S[Update isLoggedIn state]
    S --> D
    
    D --> T[Axios Interceptor Adds Token]
    T --> U[Authorization: Bearer token]
```

---

## 🛡️ PROTECTED ROUTE ACCESS FLOW

```mermaid
flowchart TD
    A[Frontend: API Request] --> B[Axios Interceptor]
    B --> C[Get Token from localStorage]
    C --> D{Token Exists?}
    D -->|No| E[Request Sent Without Token]
    D -->|Yes| F[Add Authorization Header]
    F --> G[Authorization: Bearer token]
    
    E --> H[Backend Receives Request]
    G --> H
    
    H --> I[Express Route Handler]
    I --> J[authenticate Middleware Runs]
    
    J --> K[Extract Token from Header]
    K --> L{Token Present?}
    L -->|No| M[Return 401: Access denied]
    L -->|Yes| N[jwt.verify token]
    
    N --> O{Token Valid?}
    O -->|No| P[Return 403: Invalid session]
    O -->|Yes| Q[Decode Token Payload]
    
    Q --> R[Attach to req.user: userId, orgId]
    R --> S[Call next]
    S --> T[Route Handler Executes]
    
    T --> U[Controller Function]
    U --> V[Access req.user.orgId]
    V --> W[Database Query with orgId Filter]
```

---

## 📦 GET ASSETS FLOW

```mermaid
flowchart TD
    A[Dashboard Component Mounts] --> B[useEffect Hook Triggers]
    B --> C[Call fetchAssets Function]
    C --> D[Frontend: GET /api/assets]
    D --> E[Axios Adds Authorization Header]
    E --> F[Backend: authenticate Middleware]
    
    F --> G{Token Valid?}
    G -->|No| H[Return 401/403]
    G -->|Yes| I[Attach req.user.orgId]
    
    I --> J[Route: GET /api/assets]
    J --> K[Controller: getAssets]
    K --> L[Prisma Query]
    
    L --> M[findMany with WHERE clause]
    M --> N[organizationId = req.user.orgId]
    N --> O[Include category data]
    
    O --> P[Database Returns Assets]
    P --> Q{Query Success?}
    Q -->|No| R[Return 500: Failed to fetch]
    Q -->|Yes| S[Return JSON: assets array]
    
    S --> T[Frontend Receives Response]
    T --> U[setAssets data]
    U --> V[setLoading false]
    V --> W[React Re-renders]
    W --> X[Display Assets in Table]
```

---

## ➕ CREATE ASSET FLOW

```mermaid
flowchart TD
    A[User Clicks Add Asset] --> B[Open AddAssetModal]
    B --> C[User Fills Form]
    C --> D[Name, Serial Number, Status]
    D --> E[User Clicks Submit]
    
    E --> F[Frontend: POST /api/assets]
    F --> G[Request Body: name, serialNumber, status]
    G --> H[Axios Adds Authorization Header]
    H --> I[Backend: authenticate Middleware]
    
    I --> J{Token Valid?}
    J -->|No| K[Return 401/403]
    J -->|Yes| L[Attach req.user.orgId]
    
    L --> M[Route: POST /api/assets]
    M --> N[Controller: createAsset]
    
    N --> O{Name & Serial Provided?}
    O -->|No| P[Return 400: Required fields missing]
    O -->|Yes| Q{Fields Not Empty?}
    
    Q -->|No| P
    Q -->|Yes| R{Status Valid Enum?}
    R -->|No| S[Return 400: Invalid status]
    R -->|Yes| T[Check for Duplicate Serial]
    
    T --> U[Prisma: findUnique by serialNumber]
    U --> V{Serial Exists?}
    V -->|Yes| W{In Same Organization?}
    V -->|No| X[Get or Create Category]
    
    W -->|Yes| Y[Return 409: Serial already exists]
    W -->|No| X
    
    X --> Z[Find First Category for Org]
    Z --> AA{Category Exists?}
    AA -->|No| AB[Create Default Category]
    AA -->|Yes| AC[Use Existing Category]
    
    AB --> AD[Create Asset in Database]
    AC --> AD
    
    AD --> AE[Prisma: asset.create]
    AE --> AF[Data: name, serialNumber, status, organizationId, categoryId]
    AF --> AG{Create Success?}
    
    AG -->|No| AH{Prisma Error?}
    AH -->|P2002 Unique Violation| Y
    AH -->|Other| AI[Return 500: Failed to create]
    
    AG -->|Yes| AJ[Return 201: Created Asset]
    AJ --> AK[Frontend Receives Response]
    AK --> AL[Close Modal]
    AL --> AM[Call fetchAssets]
    AM --> AN[Refresh Asset List]
```

---

## ✏️ UPDATE ASSET FLOW

```mermaid
flowchart TD
    A[User Clicks Edit Button] --> B[Set selectedAsset State]
    B --> C[Open EditAssetModal]
    C --> D[Pre-fill Form with Asset Data]
    D --> E[User Modifies Fields]
    E --> F[User Clicks Save]
    
    F --> G[Frontend: PATCH /api/assets/:id]
    G --> H[Request Body: name, serialNumber, status]
    H --> I[URL Parameter: asset ID]
    I --> J[Axios Adds Authorization Header]
    J --> K[Backend: authenticate Middleware]
    
    K --> L{Token Valid?}
    L -->|No| M[Return 401/403]
    L -->|Yes| N[Attach req.user.orgId]
    
    N --> O[Route: PATCH /api/assets/:id]
    O --> P[Controller: updateAsset]
    
    P --> Q{ID Provided?}
    Q -->|No| R[Return 400: ID required]
    Q -->|Yes| S{At Least One Field?}
    
    S -->|No| T[Return 400: No fields to update]
    S -->|Yes| U{Fields Not Empty if Provided?}
    
    U -->|No| T
    U -->|Yes| V{Status Valid if Provided?}
    V -->|No| W[Return 400: Invalid status]
    V -->|Yes| X{Serial Number Changed?}
    
    X -->|Yes| Y[Check for Duplicate Serial]
    X -->|No| Z[Build Update Data Object]
    
    Y --> AA[Prisma: findUnique by serialNumber]
    AA --> AB{Serial Exists?}
    AB -->|Yes| AC{In Same Org & Different Asset?}
    AB -->|No| Z
    
    AC -->|Yes| AD[Return 409: Serial already exists]
    AC -->|No| Z
    
    Z --> AE[updateData: name?, serialNumber?, status?]
    AE --> AF[Prisma: updateMany]
    
    AF --> AG[WHERE: id = req.params.id AND organizationId = req.user.orgId]
    AG --> AH[Data: updateData]
    
    AH --> AI{Update Success?}
    AI -->|No| AJ[Return 500: Failed to update]
    AI -->|Yes| AK[Check updated.count]
    
    AK --> AL{Count > 0?}
    AL -->|No| AM[Return 404: Asset not found]
    AL -->|Yes| AN[Fetch Updated Asset]
    
    AN --> AO[Prisma: findUnique by id]
    AO --> AP[Include category data]
    AP --> AQ[Return 200: Updated Asset]
    
    AQ --> AR[Frontend Receives Response]
    AR --> AS[Close Modal]
    AS --> AT[Call fetchAssets]
    AT --> AU[Refresh Asset List]
```

---

## 🗑️ DELETE ASSET FLOW

```mermaid
flowchart TD
    A[User Clicks Delete Button] --> B[Confirm Dialog]
    B --> C{User Confirms?}
    C -->|No| D[Cancel - Do Nothing]
    C -->|Yes| E[Frontend: DELETE /api/assets/:id]
    
    E --> F[URL Parameter: asset ID]
    F --> G[Axios Adds Authorization Header]
    G --> H[Backend: authenticate Middleware]
    
    H --> I{Token Valid?}
    I -->|No| J[Return 401/403]
    I -->|Yes| K[Attach req.user.orgId]
    
    K --> L[Route: DELETE /api/assets/:id]
    L --> M[Controller: deleteAsset]
    
    M --> N{ID Provided?}
    N -->|No| O[Return 400: ID required]
    N -->|Yes| P[Prisma: deleteMany]
    
    P --> Q[WHERE: id = req.params.id AND organizationId = req.user.orgId]
    Q --> R[Database Deletes Matching Records]
    
    R --> S[Check deleted.count]
    S --> T{Count > 0?}
    T -->|No| U[Return 404: Asset not found]
    T -->|Yes| V[Return 200: Success Message]
    
    V --> W[Frontend Receives Response]
    W --> X[Call fetchAssets]
    X --> Y[Refresh Asset List]
    Y --> Z[Asset Removed from UI]
```

---

## 🔄 COMPLETE USER JOURNEY FLOW

```mermaid
flowchart TD
    A[User Visits App] --> B{Has Token?}
    B -->|No| C[Show Login Page]
    B -->|Yes| D[Show Dashboard]
    
    C --> E[User Enters Credentials]
    E --> F[POST /api/auth/login]
    F --> G[Server Validates]
    G --> H{Valid?}
    H -->|No| I[Show Error]
    I --> E
    H -->|Yes| J[Return JWT Token]
    J --> K[Store Token in localStorage]
    K --> D
    
    D --> L[GET /api/assets]
    L --> M[Middleware Verifies Token]
    M --> N[Query Database with orgId]
    N --> O[Return Assets]
    O --> P[Display in Table]
    
    P --> Q{User Action?}
    Q -->|Add Asset| R[POST /api/assets]
    Q -->|Edit Asset| S[PATCH /api/assets/:id]
    Q -->|Delete Asset| T[DELETE /api/assets/:id]
    Q -->|Logout| U[Clear localStorage]
    
    R --> V[Validate Input]
    V --> W[Check Duplicates]
    W --> X[Create Asset]
    X --> Y[Refresh List]
    
    S --> Z[Validate Input]
    Z --> AA[Check Duplicates if Serial Changed]
    AA --> AB[Update Asset]
    AB --> Y
    
    T --> AC[Verify Ownership]
    AC --> AD[Delete Asset]
    AD --> Y
    
    U --> C
    Y --> P
```

---

## 🔒 MULTI-TENANT SECURITY FLOW

```mermaid
flowchart TD
    A[User Request] --> B[Extract Token]
    B --> C[Decode JWT]
    C --> D[Get orgId from Token]
    D --> E[Attach to req.user.orgId]
    
    E --> F{Operation Type?}
    F -->|READ| G[Query: WHERE organizationId = req.user.orgId]
    F -->|CREATE| H[Create: organizationId = req.user.orgId]
    F -->|UPDATE| I[updateMany: WHERE id = X AND organizationId = req.user.orgId]
    F -->|DELETE| J[deleteMany: WHERE id = X AND organizationId = req.user.orgId]
    
    G --> K[Database Returns Only User's Org Data]
    H --> L[Asset Created with User's Org ID]
    I --> M{Count > 0?}
    J --> M
    
    M -->|Yes| N[Operation Success]
    M -->|No| O[Return 404: Not Found]
    
    N --> P[User Only Sees Own Org Data]
    O --> Q[No Information Leaked]
    
    P --> R[Complete Data Isolation]
    Q --> R
```

---

## 📱 FRONTEND STATE MANAGEMENT FLOW

```mermaid
flowchart TD
    A[App Component] --> B{isLoggedIn State?}
    B -->|false| C[Render Login Component]
    B -->|true| D[Render Dashboard Component]
    
    C --> E[Login Component]
    E --> F[User Submits Form]
    F --> G[API Call: POST /api/auth/login]
    G --> H{Success?}
    H -->|No| I[Show Error Message]
    H -->|Yes| J[Store Token in localStorage]
    J --> K[Call onLoginSuccess Callback]
    K --> L[setIsLoggedIn true]
    L --> D
    
    D --> M[Dashboard Component]
    M --> N[useState: assets, loading, isModalOpen]
    N --> O[useEffect: fetchAssets on Mount]
    O --> P[API Call: GET /api/assets]
    P --> Q[setAssets data]
    Q --> R[setLoading false]
    R --> S[Render Assets Table]
    
    S --> T{User Action?}
    T -->|Add| U[setIsModalOpen true]
    T -->|Edit| V[setSelectedAsset asset]
    V --> W[setIsEditModalOpen true]
    T -->|Delete| X[API Call: DELETE /api/assets/:id]
    
    U --> Y[Render AddAssetModal]
    W --> Z[Render EditAssetModal]
    X --> AA{Success?}
    AA -->|Yes| AB[Call fetchAssets]
    AA -->|No| AC[Show Error]
    
    Y --> AD[User Submits Form]
    Z --> AD
    AD --> AE[API Call: POST or PATCH]
    AE --> AF{Success?}
    AF -->|Yes| AG[Close Modal]
    AG --> AB
    AF -->|No| AC
    
    AB --> O
```

---

## 🗄️ DATABASE QUERY FLOW

```mermaid
flowchart TD
    A[Controller Function] --> B[Get req.user.orgId]
    B --> C[Build Prisma Query]
    
    C --> D{Operation Type?}
    D -->|READ| E[findMany: WHERE organizationId = orgId]
    D -->|CREATE| F[create: data.organizationId = orgId]
    D -->|UPDATE| G[updateMany: WHERE id = X AND organizationId = orgId]
    D -->|DELETE| H[deleteMany: WHERE id = X AND organizationId = orgId]
    
    E --> I[Include Relations if Needed]
    F --> J[Validate Unique Constraints]
    G --> K[Check updated.count]
    H --> L[Check deleted.count]
    
    I --> M[Execute Query]
    J --> M
    K --> N{Count > 0?}
    L --> N
    
    M --> O[Database Processes Query]
    N -->|Yes| P[Return Success]
    N -->|No| Q[Return 404]
    
    O --> R{Query Success?}
    R -->|Yes| S[Return Data]
    R -->|No| T[Handle Error]
    
    S --> U[Controller Returns Response]
    T --> V[Return Error Response]
    P --> U
    Q --> V
```

---

## 🔐 TOKEN LIFECYCLE FLOW

```mermaid
flowchart TD
    A[User Login] --> B[Server Creates JWT]
    B --> C[Token Payload: userId, orgId]
    C --> D[Sign with JWT_SECRET]
    D --> E[Set Expiration: 24h]
    E --> F[Return Token to Client]
    
    F --> G[Client Stores in localStorage]
    G --> H[Token Persists Across Page Refreshes]
    
    H --> I[User Makes API Request]
    I --> J[Axios Interceptor]
    J --> K[Get Token from localStorage]
    K --> L[Add to Authorization Header]
    L --> M[Bearer token]
    
    M --> N[Server Receives Request]
    N --> O[Extract Token from Header]
    O --> P[jwt.verify with JWT_SECRET]
    
    P --> Q{Token Valid?}
    Q -->|No| R{Reason?}
    Q -->|Yes| S[Decode Payload]
    
    R -->|Expired| T[Return 403: Token expired]
    R -->|Invalid| U[Return 403: Invalid token]
    R -->|Missing| V[Return 401: No token]
    
    S --> W[Extract userId, orgId]
    W --> X[Attach to req.user]
    X --> Y[Continue to Route Handler]
    
    T --> Z[Client: Clear localStorage]
    U --> Z
    Z --> AA[Redirect to Login]
```

---

## 📊 COMPLETE SYSTEM ARCHITECTURE FLOW

```mermaid
flowchart TB
    subgraph Frontend["Frontend (React + Vite)"]
        A[User Browser]
        B[React Components]
        C[Axios Client]
        D[localStorage]
    end
    
    subgraph Backend["Backend (Node.js + Express)"]
        E[Express Server]
        F[Authentication Middleware]
        G[Route Handlers]
        H[Controllers]
    end
    
    subgraph Database["Database (PostgreSQL + Prisma)"]
        I[Prisma Client]
        J[PostgreSQL Database]
        K[Supabase Hosting]
    end
    
    A --> B
    B --> C
    C --> D
    C -->|HTTP Request| E
    E --> F
    F -->|Token Valid| G
    F -->|Token Invalid| C
    G --> H
    H --> I
    I --> J
    J --> K
    K --> J
    J --> I
    I --> H
    H --> G
    G --> E
    E -->|HTTP Response| C
    C --> B
    B --> A
```

---

## 🎯 KEY SECURITY CHECKPOINTS

```mermaid
flowchart TD
    A[Request Arrives] --> B{Has Authorization Header?}
    B -->|No| C[❌ Return 401]
    B -->|Yes| D[Extract Token]
    
    D --> E{Token Format Valid?}
    E -->|No| F[❌ Return 403]
    E -->|Yes| G[Verify Token Signature]
    
    G --> H{Signature Valid?}
    H -->|No| F
    H -->|Yes| I{Token Expired?}
    
    I -->|Yes| F
    I -->|No| J[Extract orgId from Token]
    
    J --> K[Attach to req.user.orgId]
    K --> L[Route Handler Executes]
    
    L --> M{Operation Type?}
    M -->|READ| N[✅ Filter by orgId]
    M -->|CREATE| O[✅ Set orgId in data]
    M -->|UPDATE| P[✅ WHERE id AND orgId]
    M -->|DELETE| Q[✅ WHERE id AND orgId]
    
    N --> R[✅ Security Check Passed]
    O --> R
    P --> S{Count > 0?}
    Q --> S
    
    S -->|Yes| R
    S -->|No| T[❌ Return 404]
    
    R --> U[✅ Operation Allowed]
    C --> V[❌ Operation Denied]
    F --> V
    T --> V
```

---

## 📝 SUMMARY

### Authentication Flow
1. User enters credentials → Server validates → JWT created → Stored in localStorage
2. Every request → Token extracted → Verified → orgId attached to request

### CRUD Operations Flow
1. **Read:** Filter by organizationId → Return only user's org data
2. **Create:** Validate input → Check duplicates → Set organizationId → Create
3. **Update:** Validate input → Check duplicates → Update with orgId filter → Verify count
4. **Delete:** Delete with orgId filter → Verify count → Return success/error

### Security Flow
1. Token verification on every protected route
2. organizationId included in every database query
3. updateMany/deleteMany ensure ownership before modification
4. Generic error messages prevent information leakage

---

**Use this flowchart to understand the complete system flow and explain it confidently in interviews!**
