# SmartHub - Team Productivity Platform

**Smarter productivity, together.** A comprehensive team productivity and communication platform designed for modern organizations and small teams.

![SmartHub Dashboard](https://via.placeholder.com/800x400/0F172A/5EEAD4?text=SmartHub+Dashboard)

## 🚀 Features

### Core Functionality
- **🔐 Authentication & Authorization** - Role-based access control with NextAuth.js
- **👥 User Management** - Admin-only onboarding with email invitations
- **📋 Task Management** - Kanban boards and list views with drag-and-drop
- **📝 Smart Notes** - Rich text editor with AI categorization and sentiment analysis
- **💬 Real-time Chat** - Team communication with AI assistant integration
- **📅 Meeting Scheduler** - Schedule meetings with AI-generated summaries
- **⏰ Attendance Tracking** - Location-based clock-in/out with analytics


### AI-Powered Features (Gemini Integration)
- **🤖 AI Assistant** - Chat-based help with @ai mentions
- **📊 Note Summarization** - Automatic content summarization
- **🎯 Task Generation** - Convert goals into actionable tasks
- **😊 Sentiment Analysis** - Automatic mood detection in notes
- **💡 Productivity Tips** - Daily motivational insights

### Technical Features
- **🌙 Dark/Light Mode** - Theme switching support
- **📱 Responsive Design** - Mobile-first approach
- **🔔 Push Notifications** - Browser notifications for meetings
- **📄 PDF Export** - Export notes and reports
- **🌍 Geolocation** - Location-based attendance tracking

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: MongoDB with Prisma ORM
- **Authentication**: NextAuth.js with JWT
- **AI Integration**: Google Gemini API
- **Icons**: Lucide React
- **Animations**: Framer Motion (planned)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/smarthub.git
   cd smarthub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Fill in your environment variables:
   ```env
   # Database
   DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/smarthub"

   # NextAuth.js
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"

   # Google Gemini AI
   GOOGLE_AI_API_KEY="your-gemini-api-key-here"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Getting Started

### First Time Setup

1. **Create a Workspace**
   - Visit the homepage and click "Create Workspace"
   - Fill in your workspace details and admin account information
   - You'll be automatically logged in as the admin

2. **Invite Team Members**
   - Go to Dashboard → Invite Users (admin only)
   - Enter team member email addresses
   - They'll receive invitation emails with temporary passwords

3. **Start Using Features**
   - Create your first task in the Tasks section
   - Write notes with automatic AI categorization
   - Schedule team meetings
   - Use the chat with @ai mentions for assistance

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Protected dashboard pages
│   ├── login/            # Authentication pages
│   └── api/              # API routes
├── components/           # Reusable components
│   ├── dashboard/       # Dashboard-specific components
│   ├── tasks/          # Task management components
│   ├── notes/          # Notes components
│   ├── chat/           # Chat components
│   └── meetings/       # Meeting components
├── lib/                # Utility functions and configurations
└── types/              # TypeScript type definitions
```

## 🔧 Configuration

### Database Schema
The application uses Prisma with MongoDB. Key models include:
- **User** - User accounts with role-based permissions
- **Workspace** - Organization/team workspaces
- **Task** - Task management with status and priority
- **Note** - Rich text notes with categorization
- **Meeting** - Scheduled meetings with participants
- **Attendance** - Time tracking with geolocation

### Authentication
- JWT-based authentication with NextAuth.js
- Role-based access control (ADMIN/USER)
- Temporary password system for new users
- Protected routes with middleware

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Manual Deployment
```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- AI powered by [Google Gemini](https://ai.google.dev/)

---

**SmartHub** - Making team productivity smarter, one feature at a time. 🚀
