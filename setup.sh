#!/bin/bash

# Weathify Setup Script
# This script sets up the database and creates an admin user

set -e

echo "Weathify Setup Script"
echo "======================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo " Error: .env file not found"
    echo "Please copy .env.example to .env and configure it first"
    echo "Run: cp .env.example .env"
    exit 1
fi

# Load environment variables
source .env

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo " Error: PostgreSQL is not installed"
    echo "Please install PostgreSQL first"
    exit 1
fi

echo " PostgreSQL found"
echo ""

# Check if database exists
if psql -U ${DB_USER} -lqt | cut -d \| -f 1 | grep -qw ${DB_NAME}; then
    echo "⚠️  Database '${DB_NAME}' already exists"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping database..."
        dropdb -U ${DB_USER} ${DB_NAME} || true
    else
        echo "Keeping existing database"
    fi
fi

# Create database if it doesn't exist
if ! psql -U ${DB_USER} -lqt | cut -d \| -f 1 | grep -qw ${DB_NAME}; then
    echo " Creating database '${DB_NAME}'..."
    createdb -U ${DB_USER} ${DB_NAME}
    echo " Database created"
else
    echo " Using existing database"
fi

echo ""

# Run schema
echo " Running database schema..."
psql -U ${DB_USER} -d ${DB_NAME} -f database/schema.sql

echo ""
echo " Database setup complete!"
echo ""

# Prompt for admin password change
echo " Admin Account Setup"
echo "====================="
echo ""
echo "Default admin credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "  IMPORTANT: You should change the default password!"
echo ""
read -p "Would you like to change the admin password now? (Y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    read -s -p "Enter new admin password: " NEW_PASSWORD
    echo
    read -s -p "Confirm new password: " CONFIRM_PASSWORD
    echo
    
    if [ "$NEW_PASSWORD" != "$CONFIRM_PASSWORD" ]; then
        echo " Passwords don't match!"
        exit 1
    fi
    
    # Generate bcrypt hash using Node.js
    echo "Generating password hash..."
    HASH=$(node -e "console.log(require('bcrypt').hashSync('${NEW_PASSWORD}', 10))")
    
    # Update password in database
    psql -U ${DB_USER} -d ${DB_NAME} -c "UPDATE admins SET password_hash = '${HASH}' WHERE username = 'admin';"
    
    echo " Admin password updated!"
else
    echo " Remember to change the default password in production!"
fi

echo ""
echo " Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Configure your .env file with API credentials"
echo "2. Run 'npm install' to install dependencies"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Visit http://localhost:3000"
echo ""
echo "Admin dashboard: http://localhost:3000/admin.html"
echo ""