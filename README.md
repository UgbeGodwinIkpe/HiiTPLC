# HiiT PLC – Abuja Training Centre Student Management & CBT System

## Database: MongoDB

The backend now uses MongoDB (MongoDB Atlas or a self-hosted MongoDB server) as its primary database. The React frontend continues to use the existing `/api/...` endpoints.

### 1. Create a MongoDB database

1. Create a free cluster at https://www.mongodb.com/atlas.
2. Create a database user and password.
3. In **Network Access**, allow the IP address of the server that will host this application. For local development, you may temporarily allow your current IP.
4. Copy the application's Node.js connection string.

### 2. Configure environment variables

Create a `.env` file in the project root (do not commit it):

```env
MONGODB_URI="mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB_NAME="hiit_abuja_cbt"
PORT=3000
```

Replace the placeholders with the real Atlas connection details. URL-encode special characters in the database password. Keep `.env` private and configure the same variables in your hosting provider's environment-variable settings.

Keep the existing Gemini/SMTP variables in `.env` if those features are used.

### 3. Install and run

```bash
npm install
npm run dev
```

For production:

```bash
npm run build
npm start
```

The server listens on `PORT` (defaults to 3000). The health endpoint is `/api/health`.

### 4. Existing JSON data migration

On first startup, the server checks each MongoDB collection. If a collection is empty and its matching legacy file exists under `data/` (for example `data/students.json`), the records are imported into MongoDB. If no legacy records are available, the application's initial seed data is used.

The legacy JSON files are left untouched as a fallback/archive. Once migration is confirmed, take a database export from **Database Management** and store it securely. Do not delete the old files until the migration has been verified.

### 5. MongoDB collections

- `users` – coordinators and instructors
- `students` – student profiles and login records
- `courses` – courses
- `batches` – training batches
- `questions` – question bank
- `exams` – examination configuration
- `attempts` – CBT attempts, answers and results
- `attendance` – attendance sessions
- `logs` – audit activity
- `emails` – email/outbox records
- `settings` – singleton application settings document

The backend loads records into a short-lived process cache for the existing synchronous API logic and persists changes to MongoDB before sending API responses. MongoDB remains the source of persistence; do not run multiple application instances against this cache-based compatibility layer until the write path is upgraded to direct atomic per-document operations.

### Security and operations

- Never expose `MONGODB_URI` in frontend code or commit `.env`.
- Use a dedicated least-privilege MongoDB database user.
- Restrict Atlas Network Access to the hosting provider's outbound IPs where possible; avoid `0.0.0.0/0` for production.
- Use HTTPS in production and back up the database regularly.
- The system's JSON export/import feature remains available for backup and restore.
