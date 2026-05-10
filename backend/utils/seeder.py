"""
Demo Data Seeder
================
Populates the database with realistic grocery store demo data.
Interview: Seed data is crucial for demos and development.
Uses try/except to be idempotent (safe to run multiple times).
"""

from datetime import datetime, timedelta, date
import random
from decimal import Decimal


def seed_demo_data():
    """Seed all demo data if database is empty"""
    from backend.database import db
    from backend.models import Category, Product, Supplier, Purchase, PurchaseItem, Sale, SaleItem

    if Category.query.count() > 0:
        print("Database already seeded, skipping...")
        return

    print("🌱 Seeding demo data...")

    # ── Categories ──────────────────────────────
    categories_data = [
        ("Grains & Cereals", "Rice, wheat, oats, corn"),
        ("Pulses & Legumes", "Lentils, chickpeas, beans"),
        ("Dairy", "Milk, paneer, butter, curd"),
        ("Oils & Fats", "Cooking oils, ghee, butter"),
        ("Spices", "Salt, pepper, cumin, turmeric"),
        ("Beverages", "Tea, coffee, juice, water"),
        ("Snacks", "Biscuits, chips, namkeen"),
        ("Personal Care", "Soap, shampoo, toothpaste"),
    ]
    categories = {}
    for name, desc in categories_data:
        cat = Category(name=name, description=desc)
        db.session.add(cat)
        db.session.flush()
        categories[name] = cat
    print(f"  ✓ {len(categories)} categories created")

    # ── Products ────────────────────────────────
    products_data = [
        ("Basmati Rice 5kg", "GRN-001", categories["Grains & Cereals"], "kg", 220, 280, 150, 20),
        ("Sona Masoori Rice 5kg", "GRN-002", categories["Grains & Cereals"], "kg", 180, 230, 200, 25),
        ("Wheat Atta 10kg", "GRN-003", categories["Grains & Cereals"], "kg", 320, 380, 120, 15),
        ("Poha 1kg", "GRN-004", categories["Grains & Cereals"], "kg", 45, 65, 80, 10),
        ("Toor Dal 1kg", "PLS-001", categories["Pulses & Legumes"], "kg", 120, 155, 100, 15),
        ("Chana Dal 1kg", "PLS-002", categories["Pulses & Legumes"], "kg", 95, 125, 90, 12),
        ("Rajma 1kg", "PLS-003", categories["Pulses & Legumes"], "kg", 130, 170, 60, 10),
        ("Moong Dal 1kg", "PLS-004", categories["Pulses & Legumes"], "kg", 110, 145, 75, 10),
        ("Amul Milk 1L", "DRY-001", categories["Dairy"], "litre", 55, 68, 200, 50),
        ("Amul Butter 100g", "DRY-002", categories["Dairy"], "pcs", 48, 58, 120, 20),
        ("Fresh Paneer 200g", "DRY-003", categories["Dairy"], "pcs", 72, 95, 60, 15),
        ("Curd 400g", "DRY-004", categories["Dairy"], "pcs", 38, 48, 80, 20),
        ("Sunflower Oil 1L", "OIL-001", categories["Oils & Fats"], "litre", 115, 145, 100, 15),
        ("Mustard Oil 1L", "OIL-002", categories["Oils & Fats"], "litre", 145, 180, 70, 10),
        ("Amul Ghee 500ml", "OIL-003", categories["Oils & Fats"], "pcs", 285, 340, 50, 8),
        ("Salt 1kg", "SPC-001", categories["Spices"], "kg", 18, 28, 200, 30),
        ("Turmeric 100g", "SPC-002", categories["Spices"], "pcs", 22, 35, 150, 20),
        ("Red Chilli Powder 200g", "SPC-003", categories["Spices"], "pcs", 48, 68, 100, 15),
        ("Cumin Seeds 100g", "SPC-004", categories["Spices"], "pcs", 35, 52, 80, 12),
        ("Tata Tea Gold 500g", "BEV-001", categories["Beverages"], "pcs", 245, 295, 80, 10),
        ("Bru Coffee 100g", "BEV-002", categories["Beverages"], "pcs", 105, 135, 60, 8),
        ("Minute Maid 1L", "BEV-003", categories["Beverages"], "pcs", 85, 110, 50, 8),
        ("Britannia Biscuits 400g", "SNK-001", categories["Snacks"], "pcs", 38, 52, 120, 20),
        ("Kurkure 90g", "SNK-002", categories["Snacks"], "pcs", 18, 28, 100, 15),
        ("Lays Classic 52g", "SNK-003", categories["Snacks"], "pcs", 18, 28, 80, 12),
        ("Dettol Soap 75g", "PCR-001", categories["Personal Care"], "pcs", 32, 45, 100, 15),
        ("Colgate 200g", "PCR-002", categories["Personal Care"], "pcs", 68, 88, 80, 12),
        ("Head & Shoulders 180ml", "PCR-003", categories["Personal Care"], "pcs", 165, 215, 45, 8),
    ]

    products = {}
    for name, sku, cat, unit, buy, sell, qty, reorder in products_data:
        p = Product(
            name=name, sku=sku, category=cat, unit=unit,
            purchase_price=Decimal(str(buy)),
            selling_price=Decimal(str(sell)),
            quantity_in_stock=Decimal(str(qty)),
            reorder_level=Decimal(str(reorder)),
            expiry_date=date.today() + timedelta(days=random.randint(60, 365)),
        )
        db.session.add(p)
        db.session.flush()
        products[sku] = p
    print(f"  ✓ {len(products)} products created")

    # ── Suppliers ────────────────────────────────
    suppliers_data = [
        ("Metro Cash & Carry", "Ramesh Gupta", "orders@metro.in", "+91-9876543210", "Metro Mall, Hyderabad"),
        ("Reliance Smart Point", "Priya Sharma", "supply@reliance.in", "+91-9876543211", "Banjara Hills, Hyderabad"),
        ("D-Mart Wholesale", "Suresh Kumar", "wholesale@dmart.in", "+91-9876543212", "Kondapur, Hyderabad"),
        ("Local Vegetable Mandi", "Abdul Rahman", "mandi@gmail.com", "+91-9876543213", "Bowenpally, Hyderabad"),
    ]
    suppliers = []
    for name, contact, email, phone, address in suppliers_data:
        s = Supplier(name=name, contact_person=contact, email=email, phone=phone, address=address)
        db.session.add(s)
        db.session.flush()
        suppliers.append(s)
    print(f"  ✓ {len(suppliers)} suppliers created")

    # ── Purchases ────────────────────────────────
    product_list = list(products.values())
    for i in range(15):
        date_offset = random.randint(1, 90)
        purchase_date = datetime.utcnow() - timedelta(days=date_offset)
        supplier = random.choice(suppliers)
        invoice = f"PO-{purchase_date.strftime('%Y%m%d')}-{i+1:04d}"

        purchase = Purchase(
            invoice_number=invoice,
            supplier=supplier,
            purchase_date=purchase_date,
            status="received",
        )
        db.session.add(purchase)
        db.session.flush()

        total = Decimal("0")
        items_sample = random.sample(product_list, random.randint(3, 7))
        for product in items_sample:
            qty = Decimal(str(random.randint(20, 100)))
            price = product.purchase_price
            line_total = qty * price
            pi = PurchaseItem(
                purchase=purchase, product=product,
                quantity=qty, unit_price=price, total_price=line_total
            )
            db.session.add(pi)
            total += line_total
        purchase.total_amount = total
    print("  ✓ 15 purchases created")

    # ── Sales ────────────────────────────────────
    customer_names = [
        "Walk-in Customer", "Ramesh Kumar", "Priya Singh", "Abdul Khan",
        "Sunita Verma", "Rajesh Patil", "Ananya Rao", "Vikram Nair",
        "Deepa Krishnan", "Sanjay Mehta"
    ]
    for i in range(60):
        date_offset = random.randint(0, 60)
        sale_date = datetime.utcnow() - timedelta(days=date_offset)
        invoice = f"INV-{sale_date.strftime('%Y%m%d')}-{i+1:04d}"
        customer = random.choice(customer_names)

        sale = Sale(
            invoice_number=invoice,
            customer_name=customer,
            sale_date=sale_date,
            payment_method=random.choice(["cash", "upi", "card"]),
        )
        db.session.add(sale)
        db.session.flush()

        subtotal = Decimal("0")
        profit_total = Decimal("0")
        items_sample = random.sample(product_list, random.randint(2, 6))
        for product in items_sample:
            qty = Decimal(str(random.randint(1, 10)))
            sell_price = product.selling_price
            cost_price = product.purchase_price
            line_total = qty * sell_price
            line_profit = qty * (sell_price - cost_price)
            si = SaleItem(
                sale=sale, product=product,
                quantity=qty, unit_price=sell_price,
                purchase_price=cost_price,
                total_price=line_total, profit=line_profit
            )
            db.session.add(si)
            subtotal += line_total
            profit_total += line_profit

        sale.subtotal = subtotal
        sale.total_amount = subtotal
        sale.profit_amount = profit_total
    print("  ✓ 60 sales transactions created")

    db.session.commit()
    print("✅ Demo data seeded successfully!")
