# TaskFi - Decentralized Freelance Marketplace

🚀 **TaskFi** is a cutting-edge Web3 freelance marketplace built on Solana, connecting elite Web3 talent with hirers through secure smart contract escrow payments.

## ✨ Features

- **🔐 Wallet-based Authentication** - Secure login with Solana wallets (Phantom, Solflare)
- **💰 Smart Contract Escrow** - Automatic payment escrow with dispute resolution
- **👥 Role-based Access** - Freelancer, Hirer, and Admin dashboards
- **🎨 Premium Web3 UI/UX** - Modern glassmorphism design with dark/light mode
- **⚡ Real-time Features** - Live messaging, notifications, and updates
- **🛡️ Secure Payments** - USDC payments on Solana with instant settlement
- **📊 Analytics** - Comprehensive earning and spending analytics
- **🔍 Advanced Search** - Filter jobs and gigs by category, budget, and skills

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **TailwindCSS 4** with custom Web3 components
- **Radix UI** for accessible components
- **Solana Wallet Adapter** for wallet integration

### Backend
- **NextAuth.js** for authentication
- **Prisma** as ORM with PostgreSQL
- **Supabase** for database hosting
- **Pusher** for real-time features

### Blockchain
- **Solana** blockchain (mainnet-beta)
- **Anchor Framework** for smart contracts
- **SPL Token** for USDC payments
- **Custom Escrow Program** for secure payments

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (Supabase recommended)
- Solana wallet (Phantom recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd taskfi-dan
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   - Database URL (PostgreSQL)
   - Supabase credentials
   - NextAuth secret
   - Pusher credentials
   - Solana RPC endpoint

4. **Set up the database**
   ```bash
   bun run db:generate
   bun run db:push
   ```

5. **Seed the database** (optional)
   ```bash
   bunx tsx prisma/seed.ts
   ```

6. **Start the development server**
   ```bash
   bun run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── users/         # User management
│   │   ├── jobs/          # Job management
│   │   ├── categories/    # Category CRUD
│   │   └── payments/      # Payment processing
│   ├── onboarding/        # User onboarding flow
│   └── page.tsx           # Landing page
├── components/
│   ├── ui/                # Reusable UI components
│   └── providers/         # Context providers
├── lib/
│   ├── auth.ts            # Authentication logic
│   ├── escrow.ts          # Smart contract integration
│   ├── payment.ts         # Payment service
│   ├── prisma.ts          # Database client
│   └── utils.ts           # Utility functions
├── types/                 # TypeScript type definitions
programs/                  # Solana smart contracts
├── taskfi-escrow/         # Escrow program
│   └── src/lib.rs         # Main contract code
prisma/
├── schema.prisma          # Database schema
└── seed.ts                # Database seeding
public/
└── avatars/               # Web3 character avatars
```

## 🔧 Available Scripts

```bash
# Development
bun run dev              # Start development server
bun run build            # Build for production
bun run start            # Start production server
bun run lint             # Run ESLint

# Database
bun run db:generate      # Generate Prisma client
bun run db:push          # Push schema to database
bun run db:migrate       # Create database migration
bun run db:studio        # Open Prisma Studio

# Smart Contracts
anchor build             # Build Solana programs
anchor deploy            # Deploy to Solana
anchor test              # Run contract tests
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository to Vercel**
   - Import project from GitHub
   - Vercel will auto-detect Next.js configuration

2. **Set environment variables**
   - Add all variables from `.env.example`
   - Set `NODE_ENV=production`

3. **Deploy**
   - Vercel automatically builds and deploys
   - Database migrations run automatically

### Manual Deployment

1. **Build the project**
   ```bash
   bun run build
   ```

2. **Start production server**
   ```bash
   bun run start
   ```

### Smart Contract Deployment

1. **Build and deploy escrow program**
   ```bash
   cd programs
   anchor build
   anchor deploy --program-id EscrowTaskFi1111111111111111111111111111111
   ```

2. **Update program ID in frontend**
   - Update `ESCROW_PROGRAM_ID` in `src/lib/escrow.ts`

## 🔐 Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxx"
SUPABASE_SERVICE_ROLE_KEY="xxx"

# Authentication
NEXTAUTH_SECRET="xxx"
NEXTAUTH_URL="http://localhost:3000"

# Solana
NEXT_PUBLIC_SOLANA_NETWORK="mainnet-beta"
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"

# Real-time (Optional)
PUSHER_APP_ID="xxx"
PUSHER_KEY="xxx"
PUSHER_SECRET="xxx"
PUSHER_CLUSTER="xxx"
NEXT_PUBLIC_PUSHER_KEY="xxx"
NEXT_PUBLIC_PUSHER_CLUSTER="xxx"
```

## 📊 Database Schema

### Core Models

- **Users** - User profiles with wallet addresses
- **Jobs** - Posted job listings
- **Gigs** - Freelancer service offerings
- **Categories** - Skill and service categories
- **Payments** - Escrow payment records
- **Messages** - Real-time messaging
- **Reviews** - User feedback system
- **Notifications** - System notifications

### Relationships

- Users can be Freelancers, Hirers, or Admins
- Jobs belong to Hirers and can have multiple Applications
- Payments are escrowed through smart contracts
- Reviews are tied to completed jobs

## 🎨 UI/UX Features

### Design System

- **Solana Brand Colors** - Purple (#9945FF), Green (#14F195)
- **Glassmorphism Effects** - Modern Web3 aesthetic
- **Dark/Light Mode** - Automatic theme switching
- **Responsive Design** - Mobile-first approach
- **Micro-interactions** - Smooth hover effects and animations

### Components

- **Button Variants** - Default, gradient, web3, ghost
- **Card Components** - Glassmorphism cards with hover effects
- **Form Elements** - Accessible inputs with validation
- **Navigation** - Responsive navigation with wallet connection

## 🔒 Security Features

### Wallet Authentication

- Message signing for wallet verification
- Session management with NextAuth.js
- Role-based access control
- Secure API endpoints

### Smart Contract Security

- Multi-signature escrow accounts
- Dispute resolution mechanism
- Emergency admin controls
- Reentrancy protection

### Data Protection

- Input validation and sanitization
- SQL injection prevention
- Rate limiting on API endpoints
- Secure environment variable handling

## 🎯 User Flows

### Freelancer Flow
1. Connect Solana wallet
2. Complete onboarding (profile, categories, avatar)
3. Browse and apply to jobs
4. Receive escrow payments upon completion
5. Build reputation through reviews

### Hirer Flow
1. Connect Solana wallet
2. Complete basic profile setup
3. Post job listings with escrow funding
4. Review freelancer applications
5. Release payments upon satisfactory completion

### Payment Flow
1. Hirer funds escrow smart contract
2. Work begins with secured funds
3. Upon completion, hirer releases payment
4. Dispute resolution available if needed

## 🚧 Development Status

### ✅ Completed Features

- Wallet-based authentication system
- Smart contract escrow implementation
- Core backend APIs with role-based permissions
- Database schema and relationships
- Payment integration with smart contracts
- Basic authentication and onboarding UI
- Deployment configuration for Vercel

### 🔄 In Progress

- Freelancer and Hirer dashboards
- Job and gig management interfaces
- Real-time messaging system
- Advanced search and filtering
- Analytics and reporting
- Mobile responsiveness optimization

### 📋 Todo

- Admin panel for platform management
- Advanced dispute resolution UI
- Push notifications
- Email notification system
- Advanced analytics dashboard
- Mobile app development

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Solana Foundation for blockchain infrastructure
- Anchor Framework for smart contract development
- Next.js team for the excellent framework
- Radix UI for accessible components
- Vercel for hosting and deployment

---

**Built with ❤️ for the Web3 community**

## 📞 Support

For support, email support@taskfi.io or join our Discord community.

## 🔗 Links

- [Live Demo](https://taskfi.vercel.app)
- [Documentation](https://docs.taskfi.io)
- [Discord](https://discord.gg/taskfi)
- [Twitter](https://twitter.com/taskfi_io)
