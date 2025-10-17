# Income Categories Setup Guide

## Database Setup

1. Run the SQL script to create the income categories tables:
   ```sql
   -- Execute the contents of backend/create_income_categories_table.sql in your Supabase SQL editor
   ```

## Backend Configuration

1. Create a `.env` file in the backend directory with the following variables:
   ```
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRES_IN=7d
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   RAZORPAY_KEY_ID=your_razorpay_key_id_here
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
   RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret_here
   PORT=5000
   NODE_ENV=development
   ```

2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Start the backend server:
   ```bash
   npm start
   ```

## Frontend Configuration

The frontend components are already created and integrated into the admin dashboard.

## API Endpoints

The following API endpoints are available:

### Income Categories
- `GET /api/income-categories` - Get all income categories
- `POST /api/income-categories` - Create a new income category
- `PUT /api/income-categories/:id` - Update an income category
- `DELETE /api/income-categories/:id` - Delete an income category

### Income Subcategories
- `GET /api/income-categories/:id/subcategories` - Get subcategories for a specific category
- `POST /api/income-subcategories` - Create a new income subcategory
- `PUT /api/income-subcategories/:id` - Update an income subcategory
- `DELETE /api/income-subcategories/:id` - Delete an income subcategory

## Database Schema

### income_categories table
- `id` (UUID, Primary Key)
- `name` (VARCHAR(100), Unique)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### income_subcategories table
- `id` (UUID, Primary Key)
- `category_id` (UUID, Foreign Key to income_categories)
- `name` (VARCHAR(100))
- `is_recurring` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Features

1. **Admin Interface**: Complete admin interface for managing income categories and subcategories
2. **Validation**: Comprehensive validation for all input fields
3. **Error Handling**: Proper error handling with user-friendly messages
4. **Responsive Design**: Mobile-friendly interface
5. **Real-time Updates**: Immediate updates when categories are added, edited, or deleted

## Usage

1. Access the admin dashboard
2. Navigate to the "Income Categories" tab
3. Manage categories and subcategories as needed
4. Categories can be created, edited, and deleted
5. Subcategories can be created for each category with recurring/one-time options

