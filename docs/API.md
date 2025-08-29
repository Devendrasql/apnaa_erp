# PharmaCare ERP - API Documentation

## Base URL
```
http://localhost:3001/api
```

## Authentication

All API endpoints (except login) require authentication using JWT tokens.

### Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Authentication Endpoints

### POST /auth/login
Login to get access token

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "first_name": "System",
      "last_name": "Admin",
      "role": "super_admin",
      "branch_id": 1,
      "branch_name": "Main Branch"
    },
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

### POST /auth/refresh
Refresh access token

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

## Dashboard Endpoints

### GET /dashboard/stats
Get dashboard statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "today_sales": {
      "count": 15,
      "total": 12500.00
    },
    "month_sales": {
      "count": 450,
      "total": 125000.00
    },
    "low_stock_count": 8,
    "expiring_items_count": 12,
    "recent_sales": [...]
  }
}
```

## Product Endpoints

### GET /products
Get products list with pagination

**Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `search`: Search term
- `category`: Category ID
- `branch_id`: Branch ID for stock info

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Paracetamol 500mg",
      "generic_name": "Paracetamol",
      "sku": "PAR500",
      "mrp": 25.00,
      "selling_price": 23.00,
      "category_name": "Tablets",
      "stock_quantity": 150
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50
  }
}
```

### POST /products
Add new product

**Request:**
```json
{
  "name": "Aspirin 75mg",
  "generic_name": "Acetylsalicylic Acid",
  "sku": "ASP75",
  "purchase_price": 15.00,
  "mrp": 25.00,
  "selling_price": 23.00,
  "category_id": 1,
  "unit_type": "strip",
  "form": "tablet"
}
```

## Inventory Endpoints

### GET /inventory/stock
Get stock information

**Parameters:**
- `branch_id`: Branch ID
- `low_stock`: true/false
- `expiring_soon`: true/false

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_name": "Paracetamol 500mg",
      "batch_number": "PAR2024001",
      "quantity_available": 150,
      "expiry_date": "2025-06-30",
      "days_to_expire": 180
    }
  ]
}
```

### POST /inventory/add-stock
Add stock to inventory

**Request:**
```json
{
  "product_id": 1,
  "branch_id": 1,
  "quantity": 100,
  "batch_number": "PAR2024002",
  "expiry_date": "2025-08-31",
  "purchase_price": 15.00,
  "mrp": 25.00,
  "selling_price": 23.00,
  "supplier_id": 1
}
```

## Sales Endpoints

### POST /sales
Create new sale

**Request:**
```json
{
  "branch_id": 1,
  "customer_id": 5,
  "payment_method": "cash",
  "items": [
    {
      "product_id": 1,
      "stock_id": 1,
      "quantity": 2,
      "unit_price": 23.00,
      "mrp": 25.00,
      "batch_number": "PAR2024001",
      "expiry_date": "2025-06-30"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sale completed successfully",
  "data": {
    "invoice_number": "INV-1-20240801-0001",
    "final_amount": 46.00
  }
}
```

### GET /sales
Get sales history

**Parameters:**
- `page`: Page number
- `limit`: Items per page
- `branch_id`: Branch ID
- `from_date`: Start date (YYYY-MM-DD)
- `to_date`: End date (YYYY-MM-DD)

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

### Common HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

API requests are limited to 100 requests per 15-minute window per IP address.

## Pagination

List endpoints support pagination:

**Parameters:**
- `page`: Page number (starts from 1)
- `limit`: Items per page (max 100)

**Response includes:**
```json
{
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 500,
    "totalPages": 10
  }
}
```
