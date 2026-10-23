# Claude ShareChat ⚡

> **Selective Sharing, PII Redaction, and Public Snapshots for Claude Conversations.**  
> Live Production URL: **[https://claudesharechat.vercel.app](https://claudesharechat.vercel.app)**

---

## 🌟 Key Features

1. **Direct Claude API Tree Extraction**:
   - Ingests conversations with **authentic microsecond timestamps** directly from Claude's internal API (`/api/organizations/.../chat_conversations/...`), preserving full branch history.
   - Zero DOM scraping; identical data fidelity to Claude's official export.

2. **Client-Side Privacy by Design**:
   - Personal chats are processed locally in your browser using **IndexedDB (Dexie.js)**.
   - Conversations never touch a centralized server until you explicitly create a public share link.

3. **Granular Date & Message Selection**:
   - Filter long multi-week conversations by start/end date, specific dates, or individual message turns.

4. **Automated PII Redaction**:
   - Detect and mask sensitive data before sharing:
     - API Keys & Secret Tokens
     - Email Addresses
     - IPv4 & IPv6 Addresses
     - Phone Numbers
     - Custom Keyword Blacklists

5. **Cloud-Hosted Public Snapshots**:
   - Generates clean, fast shareable links powered by **Supabase PostgreSQL**.
   - Server-side rendered (SSR) reader view with Markdown formatting, syntax highlighting, and view counts.
   - One-click deletion/integrity: Authors can delete or revoke any shared link instantly.

6. **Token Economy & Prompt Analytics**:
   - Visual breakdown of token consumption, message lengths, and on-demand prompt quality suggestions.

---

## 🛠️ Tech Stack

* **Framework**: [Next.js 16](https://nextjs.org) (Turbopack, App Router)
* **Frontend**: React 19, TypeScript, Tailwind CSS
* **Database & Sharing**: [Supabase](https://supabase.com) (PostgreSQL, Row Level Security)
* **Local Storage**: [Dexie.js](https://dexie.org) (IndexedDB client cache)
* **Hosting**: [Vercel](https://vercel.com) Serverless Edge
* **Markdown & Code**: `react-markdown`, `rehype-highlight`, `remark-gfm`

---

## 🚀 Getting Started Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/mgjaincode14-source/Claude-ShareChat-Extension.git
   cd Claude-ShareChat-Extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SECRET_KEY=your_service_role_secret
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Production Deployment

The project is deployed on **Vercel**:  
👉 **[https://claudesharechat.vercel.app](https://claudesharechat.vercel.app)**
