# CryptoWarrior

A Next.js application built with TypeScript, Tailwind CSS, and the App Router.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Backend API URL
# For local development: http://localhost:8000
# For production: https://api.yourdomain.com
NEXT_PUBLIC_API_URL=http://localhost:8000

# OneChain Configuration
NEXT_PUBLIC_PACKAGE_ID=0xe80cbff7a5b3535c486399f3ec52b94952515626e3a784525269eeee8f3e35c8
NEXT_PUBLIC_DEPLOYER_ADDRESS=0xf243e79908bd2a90e54a4121a5f65f225b894316f19a73c68620ebe190c855e9
```

**Note:** All environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## Project Structure

- `src/app/` - App Router pages and layouts
- `src/components/` - React components (create as needed)
- `public/` - Static assets

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **ESLint** - Code linting
