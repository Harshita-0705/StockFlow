"""Sales Routes"""
from flask import Blueprint, jsonify, request
from backend.services import SaleService
from backend.database import db

sales_bp = Blueprint("sales", __name__)

@sales_bp.route("/", methods=["GET"])
def get_sales():
    page = request.args.get("page", 1, type=int)
    result = SaleService.get_all(page=page)
    return jsonify(result)

@sales_bp.route("/", methods=["POST"])
def create_sale():
    try:
        data = request.get_json()
        if not data.get("items"):
            return jsonify({"error": "Sale items are required"}), 400
        sale = SaleService.create_sale(data)
        return jsonify(sale.to_dict()), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@sales_bp.route("/<int:sale_id>", methods=["GET"])
def get_sale(sale_id):
    from backend.models import Sale
    s = Sale.query.get_or_404(sale_id)
    return jsonify(s.to_dict())
