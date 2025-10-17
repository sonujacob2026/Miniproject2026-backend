# Income Categories Management System

This system provides comprehensive management of income categories and subcategories for the ExpenseAI application.

## Features

### Database Tables
- **income_categories**: Stores main income categories (Salary, Investments, Sales, etc.)
- **income_subcategories**: Stores specific subcategories with recurring/one-time options

### Admin Interface
- **Categories Management**: Create, edit, delete income categories
- **Subcategories Management**: Create, edit, delete income subcategories
- **Validation**: Comprehensive input validation with user-friendly error messages
- **Responsive Design**: Works on desktop and mobile devices

### API Endpoints
- Complete REST API for CRUD operations on both categories and subcategories
- Proper error handling and validation
- JWT authentication support

## Components Created

1. **IncomeCategoriesAdmin.jsx** - Main admin wrapper component
2. **IncomeCategoriesManager.jsx** - Core management interface
3. **incomeCategoriesService.js** - API service layer
4. **incomeCategories.js** - Backend API routes
5. **create_income_categories_table.sql** - Database schema

## Database Schema

### income_categories
```sql
CREATE TABLE income_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### income_subcategories
```sql
CREATE TABLE income_subcategories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES income_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name)
);
```

## Default Data

The system comes with pre-populated categories and subcategories:

### Categories
- Salary
- Investments
- Sales
- Agricultural
- Business
- Freelance
- Rental Income
- Other

### Sample Subcategories
- **Salary**: Basic Salary (recurring), Bonus (one-time), Overtime (one-time)
- **Investments**: Dividends (recurring), Interest (recurring), Capital Gains (one-time)
- **Sales**: Product Sales (one-time), Service Sales (one-time)
- **Agricultural**: Crop Sales (one-time), Livestock Sales (one-time)
- **Business**: Revenue (one-time), Commission (one-time)
- **Freelance**: Project Payment (one-time), Consulting (one-time)
- **Rental Income**: Property Rent (recurring), Equipment Rent (one-time)
- **Other**: Gift (one-time), Refund (one-time)

## Validation Rules

### Category Names
- Required field
- 2-100 characters
- Letters, numbers, spaces, and common punctuation only
- Must be unique

### Subcategory Names
- Required field
- 2-100 characters
- Letters, numbers, spaces, and common punctuation only
- Must be unique within the same category
- Must belong to an existing category

## Security Features

- Row Level Security (RLS) enabled
- Proper authentication checks
- Input sanitization
- SQL injection prevention
- XSS protection

## Usage Instructions

1. **Access Admin Dashboard**: Navigate to the admin section
2. **Select Income Categories Tab**: Click on the "Income Categories" tab
3. **Manage Categories**: 
   - Add new categories using the "Add Category" button
   - Edit existing categories by clicking "Edit"
   - Delete categories (this will also delete all subcategories)
4. **Manage Subcategories**:
   - Select a category from the dropdown
   - Add subcategories using the "Add Subcategory" button
   - Mark subcategories as recurring or one-time
   - Edit or delete subcategories as needed

## Error Handling

The system provides comprehensive error handling:
- Network errors with retry suggestions
- Validation errors with specific field guidance
- Database constraint violations
- User-friendly error messages
- Success confirmations

## Integration

The income categories system is fully integrated into the existing admin dashboard and follows the same design patterns as the expense categories management system.






