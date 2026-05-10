"""Dashboard API Routes"""
from flask import Blueprint, jsonify
from backend.services import DashboardService, ReorderPredictionService

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/stats")
def get_stats():
    return jsonify(DashboardService.get_stats())

@dashboard_bp.route("/monthly-chart")
def monthly_chart():
    return jsonify(DashboardService.get_monthly_sales_chart())

@dashboard_bp.route("/top-products")
def top_products():
    return jsonify(DashboardService.get_top_products())

@dashboard_bp.route("/low-stock")
def low_stock():
    return jsonify(DashboardService.get_low_stock_products())

@dashboard_bp.route("/recent-transactions")
def recent_transactions():
    return jsonify(DashboardService.get_recent_transactions())

@dashboard_bp.route("/reorder-predictions")
def reorder_predictions():
    return jsonify(ReorderPredictionService.get_predictions())
