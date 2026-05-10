"""
Smart Inventory ERP Lite - Main Application Entry Point
========================================================
Interview Notes:
- Uses Flask Application Factory pattern for testability and modularity
- Blueprints separate concerns: products, suppliers, purchases, sales, reports
- SQLAlchemy ORM handles all DB operations with proper relationships
- CORS enabled for React/JS frontend communication
"""

import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from backend.database import db, migrate

load_dotenv()


def create_app(config=None):
    """
    Application Factory Pattern:
    Creates and configures the Flask app.
    This pattern allows multiple app instances (e.g., testing vs production).
    """
    app = Flask(__name__, template_folder="frontend/templates", static_folder="frontend/static")

    # --- Configuration ---
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "erp-secret-2024-grocery")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL",
        "sqlite:///grocery_erp.db"  # Using SQLite for easy setup
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["UPLOAD_FOLDER"] = os.path.join(os.path.dirname(__file__), "frontend/static/uploads")
    app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5MB image upload limit

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    if config:
        app.config.update(config)

    # --- Extensions Init ---
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # --- Register Blueprints (Modular Routes) ---
    # Interview: Blueprints allow splitting routes into separate files/modules
    from backend.routes.dashboard import dashboard_bp
    from backend.routes.products import products_bp
    from backend.routes.suppliers import suppliers_bp
    from backend.routes.purchases import purchases_bp
    from backend.routes.sales import sales_bp
    from backend.routes.reports import reports_bp

    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(suppliers_bp, url_prefix="/api/suppliers")
    app.register_blueprint(purchases_bp, url_prefix="/api/purchases")
    app.register_blueprint(sales_bp, url_prefix="/api/sales")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")

    # Serve the React SPA for all non-API routes
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        return send_from_directory("frontend/templates", "index.html")

    return app


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
        # Uncomment the lines below if you want to seed demo data
        # from backend.utils.seeder import seed_demo_data
        # seed_demo_data()
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
else:
    # Used by gunicorn in production: "gunicorn app:app"
    app = create_app()
    with app.app_context():
        db.create_all()
