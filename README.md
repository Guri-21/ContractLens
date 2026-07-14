# ContractLens

AI-powered legal contract review platform built with Next.js 14, Prisma, and Anthropic's Claude.

## Quick Start

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Environment Setup:**
   ```bash
   cp .env.example .env.local
   # Update .env.local with your real ANTHROPIC_API_KEY and DATABASE_URL
   ```
4. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```
5. **Run Development Server:**
   ```bash
   npm run dev
   ```

*Note: Set `MOCK_MODE=true` in `.env.local` to bypass actual Claude API calls during frontend development.*
