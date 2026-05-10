"""
Service Layer - Business Logic
================================
Interview Notes:
- Service layer separates business logic from HTTP route handlers (thin controllers)
- Routes handle HTTP: parsing request, returning response
- Services handle business logic: calculations, DB operations, validations
- This makes code testable without HTTP context
"""

from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy import func, extract
from backend.database import db
from backend.models import Product, Supplier, Purchase, PurchaseItem, Sale, SaleItem, Category


# ─────────────────────────────────────────────
# PRODUCT SERVICE
# ─────────────────────────────────────────────

class ProductService:

    @staticmethod
    def get_all(search=None, category_id=None, low_stock_only=False, page=1, per_page=20):
        """Paginated product listing with filters"""
        query = Product.query.filter_by(is_active=True)

        if search:
            query = query.filter(
                db.or_(
                    Product.name.ilike(f"%{search}%"),
                    Product.sku.ilike(f"%{search}%")
                )
            )
        if category_id:
            query = query.filter_by(category_id=category_id)
        if low_stock_only:
            query = query.filter(Product.quantity_in_stock <= Product.reorder_level)

        total = query.count()
        products = query.order_by(Product.name).offset((page - 1) * per_page).limit(per_page).all()
        return {
            "products": [p.to_dict() for p in products],
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }

    @staticmethod
    def create(data):
        """Create product with auto-generated SKU if not provided"""
        if not data.get("sku"):
            # Auto-generate SKU from name + timestamp
            prefix = data["name"][:3].upper()
            timestamp = str(int(datetime.utcnow().timestamp()))[-5:]
            data["sku"] = f"{prefix}-{timestamp}"

        # Check SKU uniqueness
        if Product.query.filter_by(sku=data["sku"]).first():
            raise ValueError(f"SKU '{data['sku']}' already exists")

        product = Product(
            name=data["name"],
            sku=data["sku"],
            description=data.get("description"),
            category_id=data.get("category_id"),
            unit=data.get("unit", "pcs"),
            purchase_price=Decimal(str(data.get("purchase_price", 0))),
            selling_price=Decimal(str(data.get("selling_price", 0))),
            quantity_in_stock=Decimal(str(data.get("quantity_in_stock", 0))),
            reorder_level=Decimal(str(data.get("reorder_level", 10))),
            expiry_date=datetime.strptime(data["expiry_date"], "%Y-%m-%d").date() if data.get("expiry_date") else None,
            image_url=data.get("image_url"),
        )
        db.session.add(product)
        db.session.commit()
        return product

    @staticmethod
    def update(product_id, data):
        product = Product.query.get_or_404(product_id)

        for field in ["name", "description", "unit", "image_url"]:
            if field in data:
                setattr(product, field, data[field])
        for field in ["purchase_price", "selling_price", "reorder_level"]:
            if field in data:
                setattr(product, field, Decimal(str(data[field])))
        if "category_id" in data:
            product.category_id = data["category_id"]
        if "expiry_date" in data and data["expiry_date"]:
            product.expiry_date = datetime.strptime(data["expiry_date"], "%Y-%m-%d").date()

        product.updated_at = datetime.utcnow()
        db.session.commit()
        return product

    @staticmethod
    def delete(product_id):
        product = Product.query.get_or_404(product_id)
        product.is_active = False  # Soft delete to preserve history
        db.session.commit()


# ─────────────────────────────────────────────
# PURCHASE SERVICE
# ─────────────────────────────────────────────

class PurchaseService:

    @staticmethod
    def create_purchase(data):
        """
        Purchase Workflow:
        1. Create Purchase header
        2. For each item: create PurchaseItem, increase product stock
        3. Calculate total
        Interview: Stock update happens atomically in the same DB transaction
        """
        invoice_number = f"PO-{datetime.utcnow().strftime('%Y%m%d')}-{Purchase.query.count() + 1:04d}"

        purchase = Purchase(
            invoice_number=invoice_number,
            supplier_id=data.get("supplier_id"),
            purchase_date=datetime.utcnow(),
            status="received",
            notes=data.get("notes", ""),
        )
        db.session.add(purchase)
        db.session.flush()  # Get purchase.id before committing

        total = Decimal("0")
        for item_data in data.get("items", []):
            product = Product.query.get(item_data["product_id"])
            if not product:
                raise ValueError(f"Product ID {item_data['product_id']} not found")

            qty = Decimal(str(item_data["quantity"]))
            price = Decimal(str(item_data["unit_price"]))
            line_total = qty * price

            # ✅ AUTO STOCK INCREASE
            product.quantity_in_stock += qty
            product.purchase_price = price  # Update latest cost price
            product.updated_at = datetime.utcnow()

            purchase_item = PurchaseItem(
                purchase_id=purchase.id,
                product_id=product.id,
                quantity=qty,
                unit_price=price,
                total_price=line_total,
            )
            db.session.add(purchase_item)
            total += line_total

        purchase.total_amount = total
        db.session.commit()
        return purchase

    @staticmethod
    def get_all(page=1, per_page=20):
        total = Purchase.query.count()
        purchases = Purchase.query.order_by(Purchase.purchase_date.desc()).offset((page - 1) * per_page).limit(per_page).all()
        return {
            "purchases": [p.to_dict() for p in purchases],
            "total": total,
            "page": page,
            "pages": (total + per_page - 1) // per_page
        }


# ─────────────────────────────────────────────
# SALES SERVICE
# ─────────────────────────────────────────────

class SaleService:

    @staticmethod
    def create_sale(data):
        """
        Sales Workflow:
        1. Validate sufficient stock for each item
        2. Create Sale header
        3. For each item: create SaleItem, decrease product stock, calculate profit
        4. Calculate totals: subtotal, discount, tax, total, profit
        Interview: All-or-nothing transaction - if any product is out of stock, entire sale fails
        """
        # Pre-validate stock availability
        for item_data in data.get("items", []):
            product = Product.query.get(item_data["product_id"])
            if not product:
                raise ValueError(f"Product ID {item_data['product_id']} not found")
            if float(product.quantity_in_stock) < float(item_data["quantity"]):
                raise ValueError(f"Insufficient stock for '{product.name}'. Available: {product.quantity_in_stock}")

        invoice_number = f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{Sale.query.count() + 1:04d}"
        discount = Decimal(str(data.get("discount", 0)))
        tax_rate = Decimal(str(data.get("tax_rate", 0))) / 100

        sale = Sale(
            invoice_number=invoice_number,
            customer_name=data.get("customer_name", "Walk-in Customer"),
            customer_phone=data.get("customer_phone"),
            customer_email=data.get("customer_email"),
            payment_method=data.get("payment_method", "cash"),
            discount=discount,
            notes=data.get("notes", ""),
        )
        db.session.add(sale)
        db.session.flush()

        subtotal = Decimal("0")
        total_profit = Decimal("0")

        for item_data in data.get("items", []):
            product = Product.query.get(item_data["product_id"])
            qty = Decimal(str(item_data["quantity"]))
            unit_price = Decimal(str(item_data.get("unit_price", product.selling_price)))
            cost_price = product.purchase_price
            line_total = qty * unit_price
            line_profit = qty * (unit_price - cost_price)

            # ✅ AUTO STOCK DECREASE
            product.quantity_in_stock -= qty
            product.updated_at = datetime.utcnow()

            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=product.id,
                quantity=qty,
                unit_price=unit_price,
                purchase_price=cost_price,
                total_price=line_total,
                profit=line_profit,
            )
            db.session.add(sale_item)
            subtotal += line_total
            total_profit += line_profit

        tax_amount = (subtotal - discount) * tax_rate
        total_amount = subtotal - discount + tax_amount

        sale.subtotal = subtotal
        sale.tax_amount = tax_amount
        sale.total_amount = total_amount
        sale.profit_amount = total_profit

        db.session.commit()
        return sale

    @staticmethod
    def get_all(page=1, per_page=20):
        total = Sale.query.count()
        sales = Sale.query.order_by(Sale.sale_date.desc()).offset((page - 1) * per_page).limit(per_page).all()
        return {
            "sales": [s.to_dict() for s in sales],
            "total": total,
            "page": page,
            "pages": (total + per_page - 1) // per_page
        }


# ─────────────────────────────────────────────
# DASHBOARD SERVICE
# ─────────────────────────────────────────────

class DashboardService:

    @staticmethod
    def get_stats():
        """Aggregate KPIs for the dashboard cards"""
        today = datetime.utcnow().date()
        month_start = today.replace(day=1)

        total_products = Product.query.filter_by(is_active=True).count()
        low_stock_count = Product.query.filter(
            Product.is_active == True,
            Product.quantity_in_stock <= Product.reorder_level
        ).count()

        # Monthly revenue
        monthly_revenue = db.session.query(func.sum(Sale.total_amount)).filter(
            func.date(Sale.sale_date) >= month_start
        ).scalar() or 0

        # Total revenue all time
        total_revenue = db.session.query(func.sum(Sale.total_amount)).scalar() or 0
        total_profit = db.session.query(func.sum(Sale.profit_amount)).scalar() or 0

        total_sales = Sale.query.count()
        total_purchases = Purchase.query.count()
        total_purchase_value = db.session.query(func.sum(Purchase.total_amount)).scalar() or 0

        return {
            "total_products": total_products,
            "low_stock_count": low_stock_count,
            "monthly_revenue": float(monthly_revenue),
            "total_revenue": float(total_revenue),
            "total_profit": float(total_profit),
            "total_sales": total_sales,
            "total_purchases": total_purchases,
            "total_purchase_value": float(total_purchase_value),
        }

    @staticmethod
    def get_monthly_sales_chart():
        """Last 12 months revenue for line chart"""
        results = db.session.query(
            extract("year", Sale.sale_date).label("year"),
            extract("month", Sale.sale_date).label("month"),
            func.sum(Sale.total_amount).label("revenue"),
            func.sum(Sale.profit_amount).label("profit"),
            func.count(Sale.id).label("count"),
        ).group_by("year", "month").order_by("year", "month").limit(12).all()

        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        return [{
            "label": f"{month_names[int(r.month)-1]} {int(r.year)}",
            "revenue": float(r.revenue or 0),
            "profit": float(r.profit or 0),
            "count": int(r.count),
        } for r in results]

    @staticmethod
    def get_top_products(limit=5):
        """Best-selling products by quantity sold"""
        results = db.session.query(
            Product.name,
            Product.sku,
            func.sum(SaleItem.quantity).label("total_qty"),
            func.sum(SaleItem.total_price).label("total_revenue"),
        ).join(SaleItem, Product.id == SaleItem.product_id
        ).group_by(Product.id, Product.name, Product.sku
        ).order_by(func.sum(SaleItem.quantity).desc()).limit(limit).all()

        return [{
            "name": r.name,
            "sku": r.sku,
            "total_qty": float(r.total_qty or 0),
            "total_revenue": float(r.total_revenue or 0),
        } for r in results]

    @staticmethod
    def get_low_stock_products():
        products = Product.query.filter(
            Product.is_active == True,
            Product.quantity_in_stock <= Product.reorder_level
        ).order_by(Product.quantity_in_stock).limit(10).all()
        return [p.to_dict() for p in products]

    @staticmethod
    def get_recent_transactions(limit=10):
        """Recent sales for activity feed"""
        sales = Sale.query.order_by(Sale.sale_date.desc()).limit(limit).all()
        return [{
            "id": s.id,
            "invoice": s.invoice_number,
            "customer": s.customer_name,
            "amount": float(s.total_amount),
            "date": s.sale_date.isoformat(),
            "type": "sale"
        } for s in sales]


# ─────────────────────────────────────────────
# REORDER PREDICTION ENGINE
# ─────────────────────────────────────────────

class ReorderPredictionService:
    """
    Smart Reorder Prediction
    ========================
    Algorithm:
    1. Calculate average daily sales for each product (last 30 days)
    2. Estimate days until stockout: current_stock / avg_daily_sales
    3. Flag products expected to run out within threshold days (default: 7)

    Interview: This is a simple time-series heuristic. In production, you'd use
    ML models (ARIMA, Prophet) with seasonality adjustment.
    """

    @staticmethod
    def get_predictions(threshold_days=7):
        today = datetime.utcnow().date()
        thirty_days_ago = today - timedelta(days=30)

        # Aggregate sales per product for last 30 days
        results = db.session.query(
            Product.id,
            Product.name,
            Product.sku,
            Product.quantity_in_stock,
            Product.reorder_level,
            Product.unit,
            func.sum(SaleItem.quantity).label("qty_sold_30d"),
        ).outerjoin(
            SaleItem, Product.id == SaleItem.product_id
        ).outerjoin(
            Sale, db.and_(SaleItem.sale_id == Sale.id, func.date(Sale.sale_date) >= thirty_days_ago)
        ).filter(Product.is_active == True
        ).group_by(Product.id, Product.name, Product.sku,
                   Product.quantity_in_stock, Product.reorder_level, Product.unit).all()

        predictions = []
        for r in results:
            qty_sold = float(r.qty_sold_30d or 0)
            current_stock = float(r.quantity_in_stock)
            avg_daily = qty_sold / 30 if qty_sold > 0 else 0

            if avg_daily > 0:
                days_until_stockout = current_stock / avg_daily
            else:
                days_until_stockout = 999  # No sales history = no prediction

            urgency = "critical" if days_until_stockout <= 3 else \
                      "warning" if days_until_stockout <= threshold_days else "ok"

            if days_until_stockout <= threshold_days:
                predictions.append({
                    "product_id": r.id,
                    "product_name": r.name,
                    "sku": r.sku,
                    "current_stock": current_stock,
                    "unit": r.unit,
                    "reorder_level": float(r.reorder_level),
                    "avg_daily_sales": round(avg_daily, 2),
                    "days_until_stockout": round(days_until_stockout, 1),
                    "qty_sold_30d": round(qty_sold, 2),
                    "urgency": urgency,
                    "message": f"'{r.name}' stock may run out in {round(days_until_stockout, 1)} days "
                               f"(selling ~{round(avg_daily, 1)} {r.unit}/day)"
                })

        # Sort by most urgent first
        predictions.sort(key=lambda x: x["days_until_stockout"])
        return predictions


# ─────────────────────────────────────────────
# REPORTS SERVICE
# ─────────────────────────────────────────────

class ReportsService:

    @staticmethod
    def revenue_trend(months=6):
        """Monthly revenue and profit trend"""
        return DashboardService.get_monthly_sales_chart()

    @staticmethod
    def best_sellers(limit=10):
        results = db.session.query(
            Product.id,
            Product.name,
            Product.sku,
            func.sum(SaleItem.quantity).label("total_qty"),
            func.sum(SaleItem.total_price).label("total_revenue"),
            func.sum(SaleItem.profit).label("total_profit"),
        ).join(SaleItem, Product.id == SaleItem.product_id
        ).group_by(Product.id, Product.name, Product.sku
        ).order_by(func.sum(SaleItem.total_price).desc()).limit(limit).all()

        return [{
            "id": r.id, "name": r.name, "sku": r.sku,
            "total_qty": float(r.total_qty or 0),
            "total_revenue": float(r.total_revenue or 0),
            "total_profit": float(r.total_profit or 0),
        } for r in results]

    @staticmethod
    def dead_stock(days_no_sale=30):
        """Products with no sales in the past N days"""
        cutoff = datetime.utcnow() - timedelta(days=days_no_sale)
        sold_ids = db.session.query(SaleItem.product_id).join(Sale).filter(
            Sale.sale_date >= cutoff
        ).distinct()

        products = Product.query.filter(
            Product.is_active == True,
            Product.quantity_in_stock > 0,
            ~Product.id.in_(sold_ids.scalar_subquery())
        ).all()
        return [p.to_dict() for p in products]

    @staticmethod
    def low_stock_report():
        return DashboardService.get_low_stock_products()

    @staticmethod
    def supplier_summary():
        suppliers = Supplier.query.filter_by(is_active=True).all()
        return [s.to_dict() for s in suppliers]
