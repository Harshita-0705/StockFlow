"""Purchases Routes"""
from flask import Blueprint, jsonify, request
from backend.services import PurchaseService
from backend.database import db

purchases_bp = Blueprint("purchases", __name__)

@purchases_bp.route("/", methods=["GET"])
def get_purchases():
    page = request.args.get("page", 1, type=int)
    result = PurchaseService.get_all(page=page)
    return jsonify(result)

@purchases_bp.route("/", methods=["POST"])
def create_purchase():
    try:
        data = request.get_json()
        if not data.get("items"):
            return jsonify({"error": "Purchase items are required"}), 400
        purchase = PurchaseService.create_purchase(data)
        return jsonify(purchase.to_dict()), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@purchases_bp.route("/<int:purchase_id>", methods=["GET"])
def get_purchase(purchase_id):
    from backend.models import Purchase
    p = Purchase.query.get_or_404(purchase_id)
    return jsonify(p.to_dict())
