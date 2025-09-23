#!/bin/bash

# Next-Social Development Environment Setup Script
# This script sets up the development environment for Next-Social

echo "🚀 Setting up Next-Social Development Environment..."
echo "=================================================="

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  This script is designed for macOS. Manual setup may be required for other systems."
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check and install Homebrew (macOS package manager)
if ! command_exists brew; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
else
    echo "✅ Homebrew already installed"
fi

# Check and install Node.js
if ! command_exists node; then
    echo "📦 Installing Node.js..."
    brew install node
else
    echo "✅ Node.js already installed ($(node --version))"
fi

# Check and install npm (usually comes with Node.js)
if ! command_exists npm; then
    echo "❌ npm not found. Please install Node.js manually."
    exit 1
else
    echo "✅ npm already installed ($(npm --version))"
fi

# Navigate to project directory
cd "$(dirname "$0")"

# Install project dependencies
echo "📦 Installing project dependencies..."
npm install

# Create environment file from template
if [ ! -f ".env.local" ]; then
    echo "🔧 Creating environment configuration..."
    cp .env.example .env.local
    
    # Generate secure JWT secrets
    JWT_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    
    # Update .env.local with generated secrets
    sed -i '' "s/your_super_secure_random_jwt_secret_here_at_least_32_characters_long/$JWT_SECRET/" .env.local
    sed -i '' "s/your_super_secure_refresh_secret_here_different_from_jwt_secret/$JWT_REFRESH_SECRET/" .env.local
    
    echo "✅ Environment file created with secure JWT secrets"
    echo "⚠️  Please review and update .env.local with your specific configuration"
else
    echo "✅ Environment file already exists"
fi

# Initialize database
echo "🗄️  Initializing database..."
npm run init-db

# Verify database schema
echo "🔍 Verifying database schema..."
if command_exists sqlite3; then
    echo "📊 Database tables:"
    sqlite3 nexus_social.db ".tables"
    echo ""
    echo "👤 Users table schema:"
    sqlite3 nexus_social.db ".schema users"
else
    echo "⚠️  sqlite3 command not found. Database verification skipped."
fi

# Create logs directory
if [ ! -d "logs" ]; then
    mkdir logs
    echo "✅ Created logs directory"
fi

# Check if all required environment variables are set
echo "🔍 Checking environment configuration..."
source .env.local 2>/dev/null || true

missing_vars=()
[ -z "$JWT_SECRET" ] && missing_vars+=("JWT_SECRET")
[ -z "$JWT_REFRESH_SECRET" ] && missing_vars+=("JWT_REFRESH_SECRET")

if [ ${#missing_vars[@]} -eq 0 ]; then
    echo "✅ All required environment variables are set"
else
    echo "❌ Missing environment variables: ${missing_vars[*]}"
    echo "   Please update .env.local with the missing values"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📋 Next Steps:"
echo "1. Review and update .env.local with your configuration"
echo "2. Start the development server: npm run dev"
echo "3. Visit http://localhost:3000 to view the application"
echo ""
echo "🔧 Available Commands:"
echo "- npm run dev          # Start development server"
echo "- npm run build        # Build for production"
echo "- npm run start        # Start production server"
echo "- npm run test         # Run tests"
echo "- npm run init-db      # Initialize/reset database"
echo ""
echo "📖 Documentation:"
echo "- API Documentation: http://localhost:3000/api/docs"
echo "- Database file: ./nexus_social.db"
echo "- Logs directory: ./logs/"
echo ""

# Test if we can start the development server
echo "🧪 Testing development server startup..."
timeout 10s npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 5

if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Development server starts successfully"
    kill $SERVER_PID 2>/dev/null
else
    echo "⚠️  Development server startup test failed"
    echo "   You may need to check the configuration manually"
fi

echo ""
echo "✨ Happy coding! ✨"