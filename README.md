# Nexus - Future Social Platform

Nexus is an innovative social media platform featuring:

- **Decentralized Architecture** - Federated content network
- **AI-Powered Curation** - Semantic understanding of content
- **Immersive Media** - 3D/AR content support
- **Ethical Design** - Built-in digital wellbeing tools
- **Real-time Communication** - Live updates and presence tracking

## 🚀 Features

- ✨ Modern neumorphic UI design
- 🔄 Real-time feed updates
- 👥 User presence indicators
- 💬 Live chat rooms
- 🔔 Instant notifications
- 📱 Responsive design
- ♿ Accessibility-first approach
- 🔐 JWT authentication
- 🗄️ SQLite database
- 🧪 Comprehensive test suite

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Node.js, Next.js API Routes
- **Database**: SQLite with custom ORM
- **Real-time**: Socket.io with advanced state management
- **Testing**: Playwright with multiple browsers
- **Authentication**: JWT with bcrypt

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- SQLite3

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd next-social
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize database**
   ```bash
   npm run init-db
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   Navigate to `http://localhost:3000`

## 🧪 Testing

This project includes a comprehensive test suite using Playwright:

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run specific test file
npx playwright test tests/home.spec.js

# Run tests in headed mode
npm run test:headed
```

See [TESTING.md](TESTING.md) for detailed testing documentation.

## 📁 Project Structure

```
next-social/
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   ├── Layout.js        # Main layout wrapper
│   ├── Feed.js          # Post feed component
│   ├── ChatRoom.js      # Real-time chat
│   └── ...
├── pages/               # Next.js pages
│   ├── index.js         # Home page
│   ├── explore.js       # Explore page
│   ├── api/             # API routes
│   └── ...
├── hooks/               # Custom React hooks
│   └── useRealtime.js   # Realtime functionality
├── lib/                 # Backend utilities
│   ├── db.js            # Database connection
│   ├── auth.js          # Authentication
│   └── realtime.js      # Socket.io setup
├── tests/               # Playwright tests
├── public/              # Static assets
├── styles/              # Global styles
└── scripts/             # Database scripts
```

## 🔧 API Endpoints

- `GET /api/feed` - Retrieve posts feed
- `POST /api/posts/create` - Create new post
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

## 🎨 Design Features

- **Neumorphic Design** - Soft shadows and depth
- **Micro-interactions** - Smooth animations and transitions
- **Adaptive Colors** - System preference aware
- **Responsive Layout** - Mobile-first design
- **Accessibility** - WCAG 2.1 compliant

## 📱 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- 📱 Mobile browsers

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Manual
```bash
npm run build
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for new features
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with Next.js and modern web technologies
- Inspired by the future of social media
- Focused on ethical design and user wellbeing

---

**Happy coding! 🚀**
