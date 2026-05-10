"""Reports Routes"""
from flask import Blueprint, jsonify, request
from backend.services import ReportsService, ReorderPredictionService

reports_bp = Blueprint("reports", __name__)

@reports_bp.route("/revenue-trend")
def revenue_trend():
    return jsonify(ReportsService.revenue_trend())

@reports_bp.route("/best-sellers")
def best_sellers():
    limit = request.args.get("limit", 10, type=int)
    return jsonify(ReportsService.best_sellers(limit))

@reports_bp.route("/dead-stock")
def dead_stock():
    days = request.args.get("days", 30, type=int)
    return jsonify(ReportsService.dead_stock(days))

@reports_bp.route("/low-stock")
def low_stock():
    return jsonify(ReportsService.low_stock_report())

@reports_bp.route("/supplier-summary")
def supplier_summary():
    return jsonify(ReportsService.supplier_summary())

@reports_bp.route("/reorder-predictions")
def reorder_predictions():
    threshold = request.args.get("days", 7, type=int)
    return jsonify(ReorderPredictionService.get_predictions(threshold))
