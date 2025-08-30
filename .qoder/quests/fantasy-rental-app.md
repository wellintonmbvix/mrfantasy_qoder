# Fantasy Rental Application - SvelteKit & MySQL

## Overview

A comprehensive full-stack application built with SvelteKit for managing fantasy costume rentals and accessories sales. The system provides complete management of customers, products, product groups, and users with MySQL database persistence.

### Core Features
- Customer registration and management
- Fantasy costume rental system
- Accessories sales functionality
- Product catalog with group categorization
- User management and authentication
- Inventory tracking
- Order processing and management

### Technology Stack
- **Frontend**: SvelteKit with TypeScript
- **Backend**: SvelteKit API routes
- **Database**: MySQL
- **ORM**: Prisma
- **Authentication**: JWT tokens
- **Styling**: Tailwind CSS
- **State Management**: Svelte stores

## Architecture

### System Architecture

```mermaid
graph TB
    A[Client Browser] --> B[SvelteKit App]
    B --> C[Frontend Components]
    B --> D[API Routes]
    D --> E[Business Logic Layer]
    E --> F[Database Layer]
    F --> G[MySQL Database]
    
    subgraph "SvelteKit Application"
        C
        D
        E
        F
    end
    
    subgraph "External Services"
        H[Email Service]
        I[Payment Gateway]
    end
    
    D --> H
    D --> I
```

### Database Architecture

```mermaid
erDiagram
    Users ||--o{ Orders : creates
    Customers ||--o{ Orders : places
    Orders ||--o{ OrderItems : contains
    Products ||--o{ OrderItems : includes
    ProductGroups ||--o{ Products : categorizes
    Products ||--o{ InventoryLogs : tracks
    
    Users {
        int id PK
        string username
        string email
        string password_hash
        string role
        datetime created_at
        datetime updated_at
        boolean active
    }
    
    Customers {
        int id PK
        string name
        string email
        string phone
        string address
        string document_number
        datetime created_at
        datetime updated_at
        boolean active
    }
    
    ProductGroups {
        int id PK
        string name
        string description
        string category
        datetime created_at
        datetime updated_at
        boolean active
    }
    
    Products {
        int id PK
        string name
        string description
        string sku
        decimal rental_price
        decimal sale_price
        int stock_quantity
        string size
        string color
        string product_type
        int group_id FK
        string image_url
        datetime created_at
        datetime updated_at
        boolean active
        boolean available_for_rental
        boolean available_for_sale
    }
    
    Orders {
        int id PK
        int customer_id FK
        int user_id FK
        string order_number
        string order_type
        decimal total_amount
        string status
        datetime order_date
        datetime rental_start_date
        datetime rental_end_date
        datetime return_date
        string notes
        datetime created_at
        datetime updated_at
    }
    
    OrderItems {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal unit_price
        decimal total_price
        string item_type
        datetime created_at
    }
    
    InventoryLogs {
        int id PK
        int product_id FK
        int quantity_change
        string operation_type
        string reason
        int user_id FK
        datetime created_at
    }
```

## Frontend Architecture

### Component Hierarchy

```mermaid
graph TD
    A[App.svelte] --> B[Layout.svelte]
    B --> C[Header.svelte]
    B --> D[Navigation.svelte]
    B --> E[Main Content]
    B --> F[Footer.svelte]
    
    E --> G[Dashboard/+page.svelte]
    E --> H[Customers/+page.svelte]
    E --> I[Products/+page.svelte]
    E --> J[Orders/+page.svelte]
    E --> K[Users/+page.svelte]
    
    H --> L[CustomerForm.svelte]
    H --> M[CustomerList.svelte]
    H --> N[CustomerDetail.svelte]
    
    I --> O[ProductForm.svelte]
    I --> P[ProductList.svelte]
    I --> Q[ProductDetail.svelte]
    I --> R[ProductGroupManager.svelte]
    
    J --> S[OrderForm.svelte]
    J --> T[OrderList.svelte]
    J --> U[OrderDetail.svelte]
    J --> V[RentalCalendar.svelte]
```

### Key Components

#### CustomerForm.svelte
- Customer registration and editing
- Form validation
- Address management
- Document validation

#### ProductForm.svelte
- Product creation and editing
- Image upload functionality
- Group assignment
- Pricing configuration

#### OrderForm.svelte
- Order creation wizard
- Product selection
- Rental date picker
- Price calculation

#### RentalCalendar.svelte
- Visual rental scheduling
- Availability checking
- Conflict detection

### State Management

```mermaid
graph LR
    A[Auth Store] --> B[User Session]
    C[Customer Store] --> D[Customer Data]
    E[Product Store] --> F[Product Catalog]
    G[Order Store] --> H[Order Management]
    I[UI Store] --> J[Modal States]
    I --> K[Loading States]
    I --> L[Notifications]
```

### Routing Structure

```
/
├── /auth
│   ├── /login
│   └── /register
├── /dashboard
├── /customers
│   ├── /new
│   └── /[id]
│       └── /edit
├── /products
│   ├── /new
│   ├── /groups
│   └── /[id]
│       └── /edit
├── /orders
│   ├── /new
│   ├── /rental
│   ├── /sale
│   └── /[id]
│       ├── /edit
│       └── /return
└── /users
    ├── /new
    └── /[id]
        └── /edit
```

## Backend Architecture

### API Endpoints Reference

#### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/logout` | User logout | Yes |
| GET | `/api/auth/me` | Get current user | Yes |

#### Customer Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/customers` | List customers | Yes |
| POST | `/api/customers` | Create customer | Yes |
| GET | `/api/customers/[id]` | Get customer details | Yes |
| PUT | `/api/customers/[id]` | Update customer | Yes |
| DELETE | `/api/customers/[id]` | Delete customer | Yes |

#### Product Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/products` | List products | Yes |
| POST | `/api/products` | Create product | Yes |
| GET | `/api/products/[id]` | Get product details | Yes |
| PUT | `/api/products/[id]` | Update product | Yes |
| DELETE | `/api/products/[id]` | Delete product | Yes |
| GET | `/api/products/availability` | Check availability | Yes |

#### Product Groups
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/groups` | List product groups | Yes |
| POST | `/api/groups` | Create group | Yes |
| PUT | `/api/groups/[id]` | Update group | Yes |
| DELETE | `/api/groups/[id]` | Delete group | Yes |

#### Order Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/orders` | List orders | Yes |
| POST | `/api/orders` | Create order | Yes |
| GET | `/api/orders/[id]` | Get order details | Yes |
| PUT | `/api/orders/[id]` | Update order | Yes |
| POST | `/api/orders/[id]/return` | Process return | Yes |

#### User Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users` | List users | Yes (Admin) |
| POST | `/api/users` | Create user | Yes (Admin) |
| PUT | `/api/users/[id]` | Update user | Yes (Admin) |
| DELETE | `/api/users/[id]` | Delete user | Yes (Admin) |

### Data Models & Database Schema

#### User Model
```typescript
interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'manager' | 'employee';
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}
```

#### Customer Model
```typescript
interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  documentNumber: string;
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}
```

#### Product Model
```typescript
interface Product {
  id: number;
  name: string;
  description: string;
  sku: string;
  rentalPrice: number;
  salePrice: number;
  stockQuantity: number;
  size: string;
  color: string;
  productType: 'fantasy' | 'accessory';
  groupId: number;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
  availableForRental: boolean;
  availableForSale: boolean;
}
```

#### Order Model
```typescript
interface Order {
  id: number;
  customerId: number;
  userId: number;
  orderNumber: string;
  orderType: 'rental' | 'sale';
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'returned' | 'cancelled';
  orderDate: Date;
  rentalStartDate?: Date;
  rentalEndDate?: Date;
  returnDate?: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
}
```

### Business Logic Layer

#### Customer Service
- Customer registration and validation
- Customer search and filtering
- Customer profile management
- Customer order history

#### Product Service
- Product catalog management
- Inventory tracking
- Availability checking
- Group categorization
- Price management

#### Order Service
- Order creation and processing
- Rental scheduling
- Return processing
- Payment integration
- Order status management

#### Authentication Service
- User login/logout
- JWT token management
- Role-based access control
- Session management

### Middleware & Security

#### Authentication Middleware
```typescript
// Validates JWT tokens and user sessions
export async function authenticate(event) {
  const token = event.cookies.get('auth-token');
  if (!token) {
    throw redirect(302, '/auth/login');
  }
  // Validate token and set user context
}
```

#### Authorization Middleware
```typescript
// Role-based access control
export function authorize(roles: string[]) {
  return (event) => {
    if (!roles.includes(event.locals.user.role)) {
      throw error(403, 'Insufficient permissions');
    }
  };
}
```

#### Validation Middleware
```typescript
// Input validation and sanitization
export function validateSchema(schema) {
  return async (event) => {
    const data = await event.request.json();
    return schema.parse(data);
  };
}
```

## Data Flow Between Layers

### Order Creation Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant F as Frontend
    participant A as API Route
    participant S as Service Layer
    participant D as Database
    
    C->>F: Create Order
    F->>F: Validate Form Data
    F->>A: POST /api/orders
    A->>A: Authenticate User
    A->>S: OrderService.create()
    S->>S: Validate Business Rules
    S->>D: Check Product Availability
    D-->>S: Availability Status
    S->>D: Create Order Record
    D-->>S: Order Created
    S->>D: Update Inventory
    D-->>S: Inventory Updated
    S-->>A: Order Response
    A-->>F: API Response
    F->>F: Update UI State
    F-->>C: Success Notification
```

### Product Availability Check

```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as API Route
    participant S as Service Layer
    participant D as Database
    
    F->>A: GET /api/products/availability
    A->>S: ProductService.checkAvailability()
    S->>D: Query Current Rentals
    D-->>S: Active Rental Data
    S->>D: Query Product Stock
    D-->>S: Stock Information
    S->>S: Calculate Availability
    S-->>A: Availability Result
    A-->>F: Available Products
```

## Testing

### Unit Testing Strategy

#### Frontend Testing
- Component testing with Vitest and Testing Library
- Store testing for state management
- Form validation testing
- Mock API responses

#### Backend Testing
- API route testing
- Service layer unit tests
- Database integration tests
- Authentication middleware tests

#### Test Structure
```
tests/
├── unit/
│   ├── components/
│   ├── stores/
│   ├── services/
│   └── utils/
├── integration/
│   ├── api/
│   └── database/
└── e2e/
    ├── customer-flow.test.ts
    ├── order-flow.test.ts
    └── admin-flow.test.ts
```

#### Key Test Scenarios
1. Customer registration and management
2. Product catalog operations
3. Order creation and processing
4. Rental scheduling and returns
5. User authentication and authorization
6. Inventory tracking
7. Data validation and error handling