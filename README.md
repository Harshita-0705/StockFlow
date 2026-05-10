# 📦 StockFlow - Smart Inventory Management System

A modern, full-stack inventory management system built with Flask and React. Perfect for retail businesses to track products, manage stock, record sales, and get AI-powered reorder predictions.

![Python](https://img.shields.io/badge/Python-3.11-blue)
![Flask](https://img.shields.io/badge/Flask-3.0-green)
![React](https://img.shields.io/badge/React-18-61dafb)
![SQLite](https://img.shields.io/badge/Database-SQLite-003b57)

## ✨ Features

### 📊 Dashboard
- Real-time KPIs (Revenue, Products, Low Stock Alerts)
- 12-month revenue trend chart
- Top selling products
- Recent transactions
- Smart reorder predictions

### 📦 Products Management
- Complete CRUD operations
- SKU tracking
- Category management
- Purchase & selling price tracking
- Profit margin calculation
- Stock level monitoring
- Reorder level alerts
- Expiry date tracking
- Product images

### 🏢 Suppliers Management
- Supplier database
- Contact information
- Purchase history
- Total purchase value tracking

### 🛒 Purchase Orders
- Multi-item purchase orders
- Automatic stock increase
- Supplier linking
- Invoice tracking

### 💰 Sales Invoices
- Multi-item sales
- Customer details
- Automatic stock decrease
- Automatic profit calculation
- Discount & tax support
- Payment method tracking
- Printable invoices

### 📈 Reports & Analytics
- Revenue trend analysis
- Best sellers report
- Dead stock identification
- Low stock alerts
- Supplier summary

### 🤖 AI-Powered Predictions
- Smart reorder predictions based on sales patterns
- Calculates average daily sales
- Predicts days until stockout
- Urgency levels (Critical/Warning/OK)

## 🛠️ Tech Stack

### Backend
- **Flask 3.0** - Python web framework
- **SQLAlchemy 2.0** - ORM for database operations
- **Flask-Migrate** - Database migrations
- **Flask-CORS** - Cross-origin resource sharing
- **SQLite** - Lightweight database

### Frontend
- **React 18** - UI library (via CDN)
- **Chart.js 4** - Data visualization
- **Babel Standalone** - JSX transpilation
- **Custom CSS** - No framework dependencies

## 🚀 Quick Start

### Prerequisites
- Python 3.10 or higher
- pip (Python package manager)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Harshita-0705/StockFlow.git
cd StockFlow
```

2. **Create virtual environment**
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Run the application**
```bash
python app.py
```

5. **Open in browser**
```
http://localhost:5000
```

The application will:
- Auto-create database tables
- Start on port 5000
- Enable debug mode for development

## 📁 Project Structure

```
StockFlow/
├── app.py                      # Application entry point
├── requirements.txt            # Python dependencies
├── backend/
│   ├── database.py            # Database configuration
│   ├── models/
│   │   └── __init__.py        # SQLAlchemy models
│   ├── routes/
│   │   ├── dashboard.py       # Dashboard endpoints
│   │   ├── products.py        # Product CRUD
│   │   ├── suppliers.py       # Supplier CRUD
│   │   ├── purchases.py       # Purchase orders
│   │   ├── sales.py           # Sales invoices
│   │   └── reports.py         # Analytics endpoints
│   ├── services/
│   │   └── __init__.py        # Business logic layer
│   └── utils/
│       └── seeder.py          # Demo data seeder
└── frontend/
    ├── templates/
    │   └── index.html         # React SPA entry
    └── static/
        ├── js/
        │   └── app.js         # Complete React app
        └── uploads/           # Product images
```

## 🔌 API Endpoints

### Dashboard
- `GET /api/dashboard/stats` - KPI statistics
- `GET /api/dashboard/monthly-chart` - Revenue chart data
- `GET /api/dashboard/top-products` - Best sellers
- `GET /api/dashboard/low-stock` - Low stock alerts
- `GET /api/dashboard/recent-transactions` - Recent sales
- `GET /api/dashboard/reorder-predictions` - AI predictions

### Products
- `GET /api/products/` - List products (with filters)
- `POST /api/products/` - Create product
- `PUT /api/products/<id>` - Update product
- `DELETE /api/products/<id>` - Delete product
- `GET /api/products/categories` - List categories
- `POST /api/products/categories` - Create category

### Suppliers
- `GET /api/suppliers/` - List suppliers
- `POST /api/suppliers/` - Create supplier
- `PUT /api/suppliers/<id>` - Update supplier
- `DELETE /api/suppliers/<id>` - Delete supplier

### Purchases
- `GET /api/purchases/` - List purchases
- `POST /api/purchases/` - Create purchase (auto-updates stock)
- `GET /api/purchases/<id>` - Get purchase details

### Sales
- `GET /api/sales/` - List sales
- `POST /api/sales/` - Create sale (auto-updates stock & profit)
- `GET /api/sales/<id>` - Get sale details

### Reports
- `GET /api/reports/revenue-trend` - Monthly revenue
- `GET /api/reports/best-sellers` - Top products
- `GET /api/reports/dead-stock` - Unsold products
- `GET /api/reports/low-stock` - Low stock report
- `GET /api/reports/reorder-predictions` - AI predictions

## 🎯 Key Features Explained

### Automatic Stock Management
When you create a **Purchase Order**, stock automatically increases:
```python
product.quantity_in_stock += purchase_item.quantity
```

When you create a **Sale**, stock automatically decreases:
```python
product.quantity_in_stock -= sale_item.quantity
```

### Automatic Profit Calculation
Profit is calculated for each sale item:
```python
profit = (selling_price - purchase_price) × quantity
```

### Smart Reorder Predictions
Algorithm:
1. Calculate average daily sales (last 30 days)
2. Estimate days until stockout: `current_stock / avg_daily_sales`
3. Flag products with ≤7 days remaining

```python
avg_daily_sales = total_qty_sold_last_30_days / 30
days_until_stockout = current_stock / avg_daily_sales

if days_until_stockout <= 7:
    # Show warning
```

## 🎨 Architecture

### Design Pattern: MVC + Service Layer

```
Frontend (React)
    ↓ HTTP/JSON
Routes (Flask Blueprints)
    ↓
Services (Business Logic)
    ↓
Models (SQLAlchemy ORM)
    ↓
Database (SQLite)
```

### Key Concepts

**Application Factory Pattern**
- `create_app()` function for flexible configuration
- Enables multiple app instances (testing, production)

**Blueprints**
- Modular route organization
- Each module has its own blueprint

**Service Layer**
- Business logic separated from routes
- Routes are "thin" - just handle HTTP
- Services are "fat" - contain all logic

**Soft Deletes**
- Products/suppliers marked as `is_active = False`
- Preserves historical data integrity

**Atomic Transactions**
- All database operations are atomic
- Either all succeed or all rollback

## 🔒 Security Notes

**For Production:**
- [ ] Change `SECRET_KEY` to a strong random value
- [ ] Set `DEBUG=False`
- [ ] Use PostgreSQL instead of SQLite
- [ ] Add user authentication (JWT/OAuth)
- [ ] Enable HTTPS
- [ ] Add rate limiting
- [ ] Implement CSRF protection
- [ ] Add input validation & sanitization
- [ ] Set up database backups

## 📝 Environment Variables

Create a `.env` file (optional):
```env
DATABASE_URL=sqlite:///grocery_erp.db
SECRET_KEY=your-secret-key-here
FLASK_ENV=development
FLASK_DEBUG=true
```

## 🧪 Testing

```bash
# Run tests (if implemented)
pytest

# Check code coverage
pytest --cov=backend
```

## 📦 Deployment

### Using Gunicorn (Production)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

### Using Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "app:app"]
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👤 Author

**Harshita**
- GitHub: [@Harshita-0705](https://github.com/Harshita-0705)

## 🙏 Acknowledgments

- Flask documentation
- React documentation
- Chart.js for beautiful charts
- SQLAlchemy for powerful ORM

## 📞 Support

If you have any questions or need help, please open an issue on GitHub.

---

**Made with ❤️ by Harshita**
