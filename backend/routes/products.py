"""
Product Routes
==============
Interview: Each route is thin - delegates to ProductService for business logic.
Error handling returns consistent JSON error format.
"""
import os
from flask import Blueprint, jsonify, request, current_app
from werkzeug.utils import secure_filename
from backend.services import ProductService
from backend.models import Category
from backend.database import db

products_bp = Blueprint("products", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@products_bp.route("/", methods=["GET"])
def get_products():
    search = request.args.get("search")
    category_id = request.args.get("category_id", type=int)
    low_stock = request.args.get("low_stock") == "true"
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    result = ProductService.get_all(search, category_id, low_stock, page, per_page)
    return jsonify(result)


@products_bp.route("/<int:product_id>", methods=["GET"])
def get_product(product_id):
    from backend.models import Product
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict())


@products_bp.route("/", methods=["POST"])
def create_product():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        if not data.get("name"):
            return jsonify({"error": "Product name is required"}), 400
        if not data.get("selling_price"):
            return jsonify({"error": "Selling price is required"}), 400
        product = ProductService.create(data)
        return jsonify(product.to_dict()), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@products_bp.route("/<int:product_id>", methods=["PUT"])
def update_product(product_id):
    try:
        data = request.get_json()
        product = ProductService.update(product_id, data)
        return jsonify(product.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@products_bp.route("/<int:product_id>", methods=["DELETE"])
def delete_product(product_id):
    try:
        ProductService.delete(product_id)
        return jsonify({"message": "Product deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@products_bp.route("/upload-image", methods=["POST"])
def upload_image():
    """Handle product image upload"""
    if "image" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        timestamp = str(int(__import__("time").time()))
        filename = f"{timestamp}_{filename}"
        upload_path = current_app.config["UPLOAD_FOLDER"]
        file.save(os.path.join(upload_path, filename))
        return jsonify({"image_url": f"/static/uploads/{filename}"})
    return jsonify({"error": "Invalid file type"}), 400


# ─── CATEGORY ROUTES ────────────────────────

@products_bp.route("/categories", methods=["GET"])
def get_categories():
    cats = Category.query.order_by(Category.name).all()
    return jsonify([c.to_dict() for c in cats])


@products_bp.route("/categories", methods=["POST"])
def create_category():
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"error": "Category name required"}), 400
    cat = Category(name=data["name"], description=data.get("description"))
    db.session.add(cat)
    db.session.commit()
    return jsonify(cat.to_dict()), 201
