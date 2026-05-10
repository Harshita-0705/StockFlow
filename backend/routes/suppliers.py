"""Supplier Routes"""
from flask import Blueprint, jsonify, request
from backend.models import Supplier
from backend.database import db

suppliers_bp = Blueprint("suppliers", __name__)

@suppliers_bp.route("/", methods=["GET"])
def get_suppliers():
    suppliers = Supplier.query.filter_by(is_active=True).order_by(Supplier.name).all()
    return jsonify([s.to_dict() for s in suppliers])

@suppliers_bp.route("/<int:supplier_id>", methods=["GET"])
def get_supplier(supplier_id):
    s = Supplier.query.get_or_404(supplier_id)
    data = s.to_dict()
    # Include purchase history
    data["purchases"] = [p.to_dict() for p in s.purchases.order_by(
        __import__("backend.models", fromlist=["Purchase"]).Purchase.purchase_date.desc()
    ).limit(10).all()]
    return jsonify(data)

@suppliers_bp.route("/", methods=["POST"])
def create_supplier():
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"error": "Supplier name is required"}), 400
    supplier = Supplier(
        name=data["name"],
        contact_person=data.get("contact_person"),
        email=data.get("email"),
        phone=data.get("phone"),
        address=data.get("address"),
        gstin=data.get("gstin"),
        payment_terms=data.get("payment_terms", "30 days"),
    )
    db.session.add(supplier)
    db.session.commit()
    return jsonify(supplier.to_dict()), 201

@suppliers_bp.route("/<int:supplier_id>", methods=["PUT"])
def update_supplier(supplier_id):
    s = Supplier.query.get_or_404(supplier_id)
    data = request.get_json()
    for field in ["name", "contact_person", "email", "phone", "address", "gstin", "payment_terms"]:
        if field in data:
            setattr(s, field, data[field])
    db.session.commit()
    return jsonify(s.to_dict())

@suppliers_bp.route("/<int:supplier_id>", methods=["DELETE"])
def delete_supplier(supplier_id):
    s = Supplier.query.get_or_404(supplier_id)
    s.is_active = False
    db.session.commit()
    return jsonify({"message": "Supplier deleted"})
