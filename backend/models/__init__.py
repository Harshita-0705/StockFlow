"""
Database Models - SQLAlchemy ORM
==================================
Interview Notes:
- All models inherit from db.Model (declarative base)
- Relationships use SQLAlchemy's relationship() with back_populates for bidirectional access
- cascade="all, delete-orphan" ensures child records are deleted with parent
- __repr__ helps with debugging in Flask shell
"""

from datetime import datetime
from backend.database import db


class Category(db.Model):
    """Product categories for organizing inventory"""
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # One category → many products
    products = db.relationship("Product", back_populates="category", lazy="dynamic")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "description": self.description}

    def __repr__(self):
        return f"<Category {self.name}>"


class Product(db.Model):
    """
    Core inventory entity.
    Interview: SKU (Stock Keeping Unit) is a unique identifier for each product variant.
    quantity_in_stock is the live stock level, updated on every purchase/sale.
    """
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    sku = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)
    unit = db.Column(db.String(20), default="pcs")  # kg, litre, pcs, box
    purchase_price = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    selling_price = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    quantity_in_stock = db.Column(db.Numeric(10, 2), default=0)
    reorder_level = db.Column(db.Numeric(10, 2), default=10)  # Alert threshold
    expiry_date = db.Column(db.Date, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    category = db.relationship("Category", back_populates="products")
    purchase_items = db.relationship("PurchaseItem", back_populates="product", lazy="dynamic")
    sale_items = db.relationship("SaleItem", back_populates="product", lazy="dynamic")

    @property
    def is_low_stock(self):
        """Business logic: flag products below reorder threshold"""
        return float(self.quantity_in_stock) <= float(self.reorder_level)

    @property
    def profit_margin(self):
        """Calculate profit margin percentage"""
        if float(self.purchase_price) == 0:
            return 0
        margin = ((float(self.selling_price) - float(self.purchase_price)) / float(self.purchase_price)) * 100
        return round(margin, 2)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "sku": self.sku,
            "description": self.description,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else "Uncategorized",
            "unit": self.unit,
            "purchase_price": float(self.purchase_price),
            "selling_price": float(self.selling_price),
            "quantity_in_stock": float(self.quantity_in_stock),
            "reorder_level": float(self.reorder_level),
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "image_url": self.image_url,
            "is_active": self.is_active,
            "is_low_stock": self.is_low_stock,
            "profit_margin": self.profit_margin,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Product {self.sku}: {self.name}>"


class Supplier(db.Model):
    """
    Supplier entity - represents vendors/wholesalers.
    Interview: Linking purchases to suppliers enables supplier performance tracking.
    """
    __tablename__ = "suppliers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    contact_person = db.Column(db.String(100))
    email = db.Column(db.String(150))
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    gstin = db.Column(db.String(20))  # GST number for Indian businesses
    payment_terms = db.Column(db.String(100), default="30 days")
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # One supplier → many purchases
    purchases = db.relationship("Purchase", back_populates="supplier", lazy="dynamic")

    @property
    def total_purchase_value(self):
        """Total amount spent with this supplier"""
        return sum(float(p.total_amount) for p in self.purchases)

    @property
    def total_orders(self):
        return self.purchases.count()

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "contact_person": self.contact_person,
            "email": self.email,
            "phone": self.phone,
            "address": self.address,
            "gstin": self.gstin,
            "payment_terms": self.payment_terms,
            "is_active": self.is_active,
            "total_purchase_value": self.total_purchase_value,
            "total_orders": self.total_orders,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Supplier {self.name}>"


class Purchase(db.Model):
    """
    Purchase Order - records buying stock from suppliers.
    Interview: When a purchase is created, PurchaseItem triggers stock increase via service layer.
    Status workflow: pending → received → cancelled
    """
    __tablename__ = "purchases"

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=True)
    purchase_date = db.Column(db.DateTime, default=datetime.utcnow)
    total_amount = db.Column(db.Numeric(12, 2), default=0)
    status = db.Column(db.String(20), default="received")  # pending/received/cancelled
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    supplier = db.relationship("Supplier", back_populates="purchases")
    items = db.relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier.name if self.supplier else "Walk-in",
            "purchase_date": self.purchase_date.isoformat(),
            "total_amount": float(self.total_amount),
            "status": self.status,
            "notes": self.notes,
            "items": [item.to_dict() for item in self.items],
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Purchase {self.invoice_number}>"


class PurchaseItem(db.Model):
    """Line items within a purchase order"""
    __tablename__ = "purchase_items"

    id = db.Column(db.Integer, primary_key=True)
    purchase_id = db.Column(db.Integer, db.ForeignKey("purchases.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    total_price = db.Column(db.Numeric(12, 2), nullable=False)

    # Relationships
    purchase = db.relationship("Purchase", back_populates="items")
    product = db.relationship("Product", back_populates="purchase_items")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else "",
            "product_sku": self.product.sku if self.product else "",
            "quantity": float(self.quantity),
            "unit_price": float(self.unit_price),
            "total_price": float(self.total_price),
        }


class Sale(db.Model):
    """
    Sales Invoice - records selling products to customers.
    Interview: Stock decreases automatically via service layer when sale is created.
    profit_amount is calculated at sale time: (selling_price - purchase_price) * qty
    """
    __tablename__ = "sales"

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    customer_name = db.Column(db.String(200), default="Walk-in Customer")
    customer_phone = db.Column(db.String(20))
    customer_email = db.Column(db.String(150))
    sale_date = db.Column(db.DateTime, default=datetime.utcnow)
    subtotal = db.Column(db.Numeric(12, 2), default=0)
    discount = db.Column(db.Numeric(10, 2), default=0)
    tax_amount = db.Column(db.Numeric(10, 2), default=0)
    total_amount = db.Column(db.Numeric(12, 2), default=0)
    profit_amount = db.Column(db.Numeric(12, 2), default=0)
    payment_method = db.Column(db.String(30), default="cash")  # cash/card/upi
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "customer_name": self.customer_name,
            "customer_phone": self.customer_phone,
            "customer_email": self.customer_email,
            "sale_date": self.sale_date.isoformat(),
            "subtotal": float(self.subtotal),
            "discount": float(self.discount),
            "tax_amount": float(self.tax_amount),
            "total_amount": float(self.total_amount),
            "profit_amount": float(self.profit_amount),
            "payment_method": self.payment_method,
            "notes": self.notes,
            "items": [item.to_dict() for item in self.items],
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Sale {self.invoice_number}>"


class SaleItem(db.Model):
    """Line items within a sales invoice"""
    __tablename__ = "sale_items"

    id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, db.ForeignKey("sales.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)  # selling price at time of sale
    purchase_price = db.Column(db.Numeric(10, 2), nullable=False)  # cost at time of sale
    total_price = db.Column(db.Numeric(12, 2), nullable=False)
    profit = db.Column(db.Numeric(12, 2), default=0)

    sale = db.relationship("Sale", back_populates="items")
    product = db.relationship("Product", back_populates="sale_items")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else "",
            "product_sku": self.product.sku if self.product else "",
            "quantity": float(self.quantity),
            "unit_price": float(self.unit_price),
            "purchase_price": float(self.purchase_price),
            "total_price": float(self.total_price),
            "profit": float(self.profit),
        }
