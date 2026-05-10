// ============================================================
// StockFlow - Complete React Frontend
// ============================================================
// Interview Notes:
// - Single-file React SPA using Babel (no build step needed for demo)
// - Context API for global state (toasts, current page)
// - Custom hooks for data fetching (useApi)
// - Chart.js integrated via useEffect refs
// - All API calls go to Flask backend at /api/*
// ============================================================

const { useState, useEffect, useRef, useCallback, createContext, useContext } = React;

// ─── API Helper ──────────────────────────────────────────────

const API_BASE = '/api';

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  const res = await fetch(url, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Toast Context ────────────────────────────────────────────

const ToastContext = createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-icon">{icons[t.type]}</span>
            <span className="toast-msg">{t.message}</span>
            <span className="toast-close" onClick={() => removeToast(t.id)}>✕</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const useToast = () => useContext(ToastContext);

// ─── Custom hooks ─────────────────────────────────────────────

function useApi(endpoint, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch(endpoint);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { fetch(); }, deps);
  return { data, loading, error, refetch: fetch };
}

// ─── Utility Components ───────────────────────────────────────

const Loading = () => (
  <div className="loading-state">
    <div className="spinner spinner-dark"></div>
    Loading...
  </div>
);

const EmptyState = ({ icon = '📭', title, desc, action }) => (
  <div className="empty-state">
    <div className="empty-icon">{icon}</div>
    <div className="empty-title">{title}</div>
    <div className="empty-desc">{desc}</div>
    {action && <div style={{ marginTop: 16 }}>{action}</div>}
  </div>
);

function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StockBadge({ product }) {
  if (!product) return null;
  const ratio = product.quantity_in_stock / Math.max(product.reorder_level * 2, 1);
  const color = product.is_low_stock ? 'var(--danger)' : ratio < 0.5 ? 'var(--warning)' : 'var(--success)';
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>{product.quantity_in_stock} {product.unit}</div>
      <div className="stock-bar" style={{ marginTop: 4, width: 80 }}>
        <div className="stock-bar-fill" style={{ width: `${Math.min(ratio * 100, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Chart Component ──────────────────────────────────────────

function LineChart({ data, label = 'Revenue' }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.label),
        datasets: [
          {
            label: 'Revenue',
            data: data.map(d => d.revenue),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37,99,235,0.08)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#2563eb',
          },
          {
            label: 'Profit',
            data: data.map(d => d.profit),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.05)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#10b981',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'DM Sans', size: 12 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ₹${ctx.raw.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 } } },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { family: 'DM Sans', size: 11 },
              callback: v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)
            }
          }
        }
      }
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  return <div className="chart-container"><canvas ref={canvasRef} /></div>;
}

function BarChart({ data }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.name.length > 15 ? d.name.slice(0, 15) + '…' : d.name),
        datasets: [{
          label: 'Qty Sold',
          data: data.map(d => d.total_qty),
          backgroundColor: ['#2563eb','#10b981','#f59e0b','#8b5cf6','#ef4444'],
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 } } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'DM Sans', size: 11 } } }
        }
      }
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  return <div className="chart-container"><canvas ref={canvasRef} /></div>;
}

// ─── Modal Component ──────────────────────────────────────────

function Modal({ isOpen, onClose, title, children, footer, size = '' }) {
  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────

function Dashboard() {
  const { data: stats, loading: statsLoading } = useApi('/dashboard/stats');
  const { data: chartData, loading: chartLoading } = useApi('/dashboard/monthly-chart');
  const { data: topProducts } = useApi('/dashboard/top-products');
  const { data: lowStock } = useApi('/dashboard/low-stock');
  const { data: transactions } = useApi('/dashboard/recent-transactions');
  const { data: predictions } = useApi('/dashboard/reorder-predictions');

  const kpis = stats ? [
    { icon: '📦', label: 'Total Products', value: stats.total_products, color: '#2563eb', bg: '#dbeafe', change: '+3 this week' },
    { icon: '💰', label: 'Total Revenue', value: formatCurrency(stats.total_revenue), color: '#10b981', bg: '#d1fae5', change: `${formatCurrency(stats.monthly_revenue)} this month` },
    { icon: '📈', label: 'Total Profit', value: formatCurrency(stats.total_profit), color: '#8b5cf6', bg: '#ede9fe', change: `${stats.total_sales} sales orders` },
    { icon: '⚠️', label: 'Low Stock Alerts', value: stats.low_stock_count, color: '#ef4444', bg: '#fee2e2', change: 'Needs reorder', isAlert: stats.low_stock_count > 0 },
  ] : [];

  return (
    <div>
      {/* KPI Cards */}
      <div className="kpi-grid">
        {statsLoading ? [1,2,3,4].map(i => (
          <div key={i} className="kpi-card" style={{ opacity: .5 }}><div style={{ height: 80 }}></div></div>
        )) : kpis.map((kpi, i) => (
          <div key={i} className="kpi-card" style={{ color: kpi.color }}>
            <div className="kpi-icon" style={{ background: kpi.bg }}>{kpi.icon}</div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
            <div className={`kpi-change ${kpi.isAlert ? 'down' : 'up'}`}>
              {kpi.isAlert ? '▼' : '▲'} {kpi.change}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card col-span-2">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue & Profit Trend</div>
              <div className="card-subtitle">Monthly overview — last 12 months</div>
            </div>
          </div>
          {chartLoading ? <Loading /> : <LineChart data={chartData || []} />}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Top Products Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏆 Top Selling Products</div>
          </div>
          {topProducts ? <BarChart data={topProducts} /> : <Loading />}
        </div>

        {/* Reorder Predictions */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🔮 Smart Reorder Predictions</div>
            <span className="badge badge-info">AI</span>
          </div>
          {!predictions ? <Loading /> : predictions.length === 0 ? (
            <EmptyState icon="✅" title="All stocked up!" desc="No products predicted to run out soon" />
          ) : predictions.slice(0, 4).map(p => (
            <div key={p.product_id} className={`prediction-card ${p.urgency}`}>
              <div className="prediction-icon">{p.urgency === 'critical' ? '🔴' : '🟡'}</div>
              <div className="prediction-info">
                <div className="prediction-name">{p.product_name}</div>
                <div className="prediction-msg">
                  ~{p.avg_daily_sales} {p.unit}/day · Stock: {p.current_stock} {p.unit}
                </div>
              </div>
              <div>
                <div className={`prediction-days ${p.urgency === 'critical' ? 'text-danger' : 'text-warning'}`}>
                  {p.days_until_stockout}d
                </div>
                <div className="prediction-days-label">left</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        {/* Low Stock */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚠️ Low Stock Alerts</div>
            {lowStock && <span className="badge badge-danger">{lowStock.length}</span>}
          </div>
          {!lowStock ? <Loading /> : lowStock.length === 0 ? (
            <EmptyState icon="✅" title="All good!" desc="No products below reorder level" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Stock</th><th>Reorder At</th></tr></thead>
                <tbody>
                  {lowStock.slice(0, 8).map(p => (
                    <tr key={p.id}>
                      <td><div className="td-name">{p.name}</div><div className="td-mono">{p.sku}</div></td>
                      <td><StockBadge product={p} /></td>
                      <td><span className="badge badge-warning">{p.reorder_level} {p.unit}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🧾 Recent Sales</div>
          </div>
          {!transactions ? <Loading /> : transactions.length === 0 ? (
            <EmptyState icon="📭" title="No transactions" desc="No sales recorded yet" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Date</th></tr></thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id}>
                      <td><span className="td-mono">{t.invoice}</span></td>
                      <td>{t.customer}</td>
                      <td><strong>{formatCurrency(t.amount)}</strong></td>
                      <td className="text-muted text-sm">{formatDate(t.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCTS ─────────────────────────────────────────────────

function Products() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const { data: categories, refetch: refetchCategories } = useApi('/products/categories');

  const queryStr = `?search=${search}&category_id=${categoryId}&low_stock=${lowStock}&page=${page}`;
  const { data, loading, refetch } = useApi(`/products/${queryStr}`, [search, categoryId, lowStock, page]);

  const [form, setForm] = useState({
    name: '', sku: '', category_id: '', unit: 'pcs',
    purchase_price: '', selling_price: '', quantity_in_stock: 0,
    reorder_level: 10, expiry_date: '', description: ''
  });

  const openAdd = () => { setEditProduct(null); setForm({ name: '', sku: '', category_id: '', unit: 'pcs', purchase_price: '', selling_price: '', quantity_in_stock: 0, reorder_level: 10, expiry_date: '', description: '' }); setShowModal(true); };
  const openEdit = (p) => { setEditProduct(p); setForm({ name: p.name, sku: p.sku, category_id: p.category_id || '', unit: p.unit, purchase_price: p.purchase_price, selling_price: p.selling_price, quantity_in_stock: p.quantity_in_stock, reorder_level: p.reorder_level, expiry_date: p.expiry_date || '', description: p.description || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name) return toast('Product name is required', 'error');
    if (!form.selling_price) return toast('Selling price is required', 'error');
    setSaving(true);
    try {
      if (editProduct) {
        await apiFetch(`/products/${editProduct.id}`, { method: 'PUT', body: form });
        toast('Product updated', 'success');
      } else {
        await apiFetch('/products/', { method: 'POST', body: form });
        toast('Product added', 'success');
      }
      setShowModal(false);
      refetch();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      await apiFetch(`/products/${p.id}`, { method: 'DELETE' });
      toast('Product deleted', 'success');
      refetch();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return toast('Category name is required', 'error');
    setSavingCategory(true);
    try {
      await apiFetch('/products/categories', { method: 'POST', body: { name: newCategoryName, description: newCategoryDesc } });
      toast('Category added successfully', 'success');
      setNewCategoryName('');
      setNewCategoryDesc('');
      setShowCategoryModal(false);
      refetchCategories();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  const F = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div>
      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <div className="search-wrap flex-1" style={{ minWidth: 200 }}>
            <span className="search-icon">🔍</span>
            <input className="form-control search-input" placeholder="Search by name or SKU…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-control" style={{ width: 180 }} value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <input type="checkbox" checked={lowStock} onChange={e => { setLowStock(e.target.checked); setPage(1); }} />
            Low Stock Only
          </label>
          <button className="btn btn-secondary" onClick={() => setShowCategoryModal(true)}>📁 Manage Categories</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Products {data && `(${data.total})`}</div>
        </div>
        {loading ? <Loading /> : !data?.products?.length ? (
          <EmptyState icon="📦" title="No products found" desc="Add your first product to get started" action={<button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>} />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th><th>SKU</th><th>Category</th>
                    <th>Buy Price</th><th>Sell Price</th><th>Margin</th>
                    <th>Stock</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar" style={{ background: '#dbeafe', color: '#2563eb' }}>{p.name[0]}</div>
                          <div>
                            <div className="td-name">{p.name}</div>
                            {p.expiry_date && <div className="text-sm text-muted">Exp: {formatDate(p.expiry_date)}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span className="td-mono">{p.sku}</span></td>
                      <td><span className="badge badge-neutral">{p.category_name}</span></td>
                      <td>{formatCurrency(p.purchase_price)}</td>
                      <td><strong>{formatCurrency(p.selling_price)}</strong></td>
                      <td><span className={`badge ${p.profit_margin > 20 ? 'badge-success' : 'badge-warning'}`}>{p.profit_margin}%</span></td>
                      <td><StockBadge product={p} /></td>
                      <td>{p.is_low_stock ? <span className="badge badge-danger">Low Stock</span> : <span className="badge badge-success">OK</span>}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-sm btn-outline" onClick={() => openEdit(p)}>✏️ Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.pages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={() => setPage(p => p-1)} disabled={page === 1}>‹</button>
                {Array.from({ length: data.pages }, (_, i) => i+1).map(p => (
                  <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="page-btn" onClick={() => setPage(p => p+1)} disabled={page === data.pages}>›</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editProduct ? 'Edit Product' : 'Add New Product'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner"></div> Saving…</> : '💾 Save Product'}
          </button>
        </>}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input className="form-control" placeholder="e.g. Basmati Rice 5kg" value={form.name} onChange={e => F('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">SKU (auto-generated if empty)</label>
            <input className="form-control" placeholder="e.g. GRN-001" value={form.sku} onChange={e => F('sku', e.target.value)} disabled={!!editProduct} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-control" value={form.category_id} onChange={e => F('category_id', e.target.value)}>
              <option value="">Select Category</option>
              {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Unit</label>
            <select className="form-control" value={form.unit} onChange={e => F('unit', e.target.value)}>
              {['pcs','kg','litre','box','pack','dozen','gram','ml'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Purchase Price (₹) *</label>
            <input type="number" className="form-control" placeholder="0.00" value={form.purchase_price} onChange={e => F('purchase_price', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Selling Price (₹) *</label>
            <input type="number" className="form-control" placeholder="0.00" value={form.selling_price} onChange={e => F('selling_price', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Opening Stock</label>
            <input type="number" className="form-control" placeholder="0" value={form.quantity_in_stock} onChange={e => F('quantity_in_stock', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Reorder Level (Low Stock Alert)</label>
            <input type="number" className="form-control" placeholder="10" value={form.reorder_level} onChange={e => F('reorder_level', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Expiry Date</label>
            <input type="date" className="form-control" value={form.expiry_date} onChange={e => F('expiry_date', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-control" rows={2} placeholder="Optional product description" value={form.description} onChange={e => F('description', e.target.value)} />
        </div>
      </Modal>

      {/* Category Management Modal */}
      <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Manage Categories"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>Close</button>
          <button className="btn btn-primary" onClick={handleAddCategory} disabled={savingCategory}>
            {savingCategory ? <><div className="spinner"></div> Adding…</> : '+ Add Category'}
          </button>
        </>}>
        <div className="form-group">
          <label className="form-label">Category Name *</label>
          <input className="form-control" placeholder="e.g. Grains & Cereals" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-control" rows={2} placeholder="Optional description" value={newCategoryDesc} onChange={e => setNewCategoryDesc(e.target.value)} />
        </div>
        <hr className="divider" />
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Existing Categories</h4>
          {!categories || categories.length === 0 ? (
            <p className="text-muted text-sm">No categories yet. Add your first category above.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {categories.map(c => (
                <div key={c.id} className="badge badge-info" style={{ padding: '6px 12px', fontSize: 13 }}>
                  {c.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ─── SUPPLIERS ────────────────────────────────────────────────

function Suppliers() {
  const toast = useToast();
  const { data: suppliers, loading, refetch } = useApi('/suppliers/');
  const [showModal, setShowModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', contact_person: '', email: '', phone: '', address: '', gstin: '', payment_terms: '30 days' });

  const openAdd = () => { setEditSupplier(null); setForm({ name: '', contact_person: '', email: '', phone: '', address: '', gstin: '', payment_terms: '30 days' }); setShowModal(true); };
  const openEdit = s => { setEditSupplier(s); setForm({ name: s.name, contact_person: s.contact_person || '', email: s.email || '', phone: s.phone || '', address: s.address || '', gstin: s.gstin || '', payment_terms: s.payment_terms || '30 days' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name) return toast('Supplier name is required', 'error');
    setSaving(true);
    try {
      if (editSupplier) {
        await apiFetch(`/suppliers/${editSupplier.id}`, { method: 'PUT', body: form });
        toast('Supplier updated', 'success');
      } else {
        await apiFetch('/suppliers/', { method: 'POST', body: form });
        toast('Supplier added', 'success');
      }
      setShowModal(false);
      refetch();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async s => {
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    await apiFetch(`/suppliers/${s.id}`, { method: 'DELETE' });
    toast('Supplier deleted', 'success');
    refetch();
  };

  const F = (f, v) => setForm(p => ({ ...p, [f]: v }));

  return (
    <div>
      <div className="card mb-6" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Supplier</button>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Suppliers {suppliers && `(${suppliers.length})`}</div></div>
        {loading ? <Loading /> : !suppliers?.length ? (
          <EmptyState icon="🏭" title="No suppliers yet" desc="Add your first supplier" action={<button className="btn btn-primary" onClick={openAdd}>+ Add Supplier</button>} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Total Orders</th><th>Total Value</th><th>Payment Terms</th><th>Actions</th></tr></thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="avatar" style={{ background: '#ede9fe', color: '#8b5cf6' }}>{s.name[0]}</div>
                        <div>
                          <div className="td-name">{s.name}</div>
                          <div className="text-sm text-muted">{s.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{s.contact_person || '—'}</td>
                    <td>{s.phone || '—'}</td>
                    <td><span className="badge badge-info">{s.total_orders} orders</span></td>
                    <td><strong>{formatCurrency(s.total_purchase_value)}</strong></td>
                    <td><span className="badge badge-neutral">{s.payment_terms}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(s)}>✏️ Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editSupplier ? 'Edit Supplier' : 'Add Supplier'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner"></div> Saving…</> : '💾 Save'}
          </button>
        </>}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Supplier Name *</label>
            <input className="form-control" placeholder="Company name" value={form.name} onChange={e => F('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Person</label>
            <input className="form-control" placeholder="Name" value={form.contact_person} onChange={e => F('contact_person', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" placeholder="email@supplier.com" value={form.email} onChange={e => F('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-control" placeholder="+91-9876543210" value={form.phone} onChange={e => F('phone', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">GSTIN</label>
            <input className="form-control" placeholder="GST Number" value={form.gstin} onChange={e => F('gstin', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Terms</label>
            <select className="form-control" value={form.payment_terms} onChange={e => F('payment_terms', e.target.value)}>
              {['Immediate','7 days','15 days','30 days','45 days','60 days'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Address</label>
          <textarea className="form-control" rows={2} placeholder="Full address" value={form.address} onChange={e => F('address', e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}

// ─── PURCHASES ────────────────────────────────────────────────

function PurchaseItemRow({ item, index, products, onChange, onRemove }) {
  const product = products?.find(p => p.id === parseInt(item.product_id));
  return (
    <div className="item-row item-row-4">
      <div className="form-group" style={{ marginBottom: 0 }}>
        {index === 0 && <label className="form-label">Product</label>}
        <select className="form-control" value={item.product_id} onChange={e => {
          const p = products?.find(x => x.id === parseInt(e.target.value));
          onChange(index, { ...item, product_id: e.target.value, unit_price: p ? p.purchase_price : '' });
        }}>
          <option value="">Select product…</option>
          {(products || []).map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        {index === 0 && <label className="form-label">Qty</label>}
        <input type="number" className="form-control" placeholder="0" min="1" value={item.quantity} onChange={e => onChange(index, { ...item, quantity: e.target.value })} />
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        {index === 0 && <label className="form-label">Unit Price (₹)</label>}
        <input type="number" className="form-control" placeholder="0.00" value={item.unit_price} onChange={e => onChange(index, { ...item, unit_price: e.target.value })} />
      </div>
      <button className="remove-btn" style={{ marginTop: index === 0 ? 22 : 0 }} onClick={() => onRemove(index)}>✕</button>
    </div>
  );
}

function Purchases() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const { data, loading, refetch } = useApi(`/purchases/?page=${page}`, [page]);
  const { data: products } = useApi('/products/?per_page=200');
  const { data: suppliers } = useApi('/suppliers/');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewPO, setViewPO] = useState(null);
  const [form, setForm] = useState({ supplier_id: '', notes: '', items: [{ product_id: '', quantity: '', unit_price: '' }] });

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: '', quantity: '', unit_price: '' }] }));
  const removeItem = i => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, item) => setForm(f => { const items = [...f.items]; items[i] = item; return { ...f, items }; });

  const total = form.items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);

  const handleSubmit = async () => {
    const validItems = form.items.filter(i => i.product_id && i.quantity && i.unit_price);
    if (!validItems.length) return toast('Add at least one item', 'error');
    setSaving(true);
    try {
      await apiFetch('/purchases/', { method: 'POST', body: { ...form, items: validItems } });
      toast('Purchase order created! Stock updated automatically ✅', 'success');
      setShowModal(false);
      setForm({ supplier_id: '', notes: '', items: [{ product_id: '', quantity: '', unit_price: '' }] });
      refetch();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const statusBadge = s => s === 'received' ? <span className="badge badge-success">Received</span> : s === 'pending' ? <span className="badge badge-warning">Pending</span> : <span className="badge badge-danger">Cancelled</span>;

  return (
    <div>
      <div className="alert alert-info mb-4">
        <span>ℹ️</span>
        <span><strong>Workflow:</strong> Create Purchase → Stock automatically increases → Invoice saved to history</span>
      </div>

      <div className="card mb-6" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Purchase Order</button>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Purchase History {data && `(${data.total})`}</div></div>
        {loading ? <Loading /> : !data?.purchases?.length ? (
          <EmptyState icon="🛒" title="No purchases yet" desc="Create your first purchase order" />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Invoice</th><th>Supplier</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {data.purchases.map(p => (
                    <tr key={p.id}>
                      <td><span className="td-mono">{p.invoice_number}</span></td>
                      <td><strong>{p.supplier_name}</strong></td>
                      <td className="text-muted text-sm">{formatDate(p.purchase_date)}</td>
                      <td><span className="badge badge-info">{p.items?.length || 0} items</span></td>
                      <td><strong>{formatCurrency(p.total_amount)}</strong></td>
                      <td>{statusBadge(p.status)}</td>
                      <td><button className="btn btn-sm btn-outline" onClick={() => setViewPO(p)}>👁 View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.pages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={() => setPage(p => p-1)} disabled={page === 1}>‹</button>
                {Array.from({ length: data.pages }, (_, i) => i+1).map(p => (
                  <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="page-btn" onClick={() => setPage(p => p+1)} disabled={page === data.pages}>›</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Purchase Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Purchase Order" size="modal-lg"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-success" onClick={handleSubmit} disabled={saving}>
            {saving ? <><div className="spinner"></div> Processing…</> : '✅ Confirm Purchase'}
          </button>
        </>}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Supplier</label>
            <select className="form-control" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
              <option value="">Walk-in / Direct Purchase</option>
              {(suppliers || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-control" placeholder="Optional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <hr className="divider" />
        <div className="flex items-center justify-between mb-4">
          <strong style={{ fontSize: 13 }}>Purchase Items</strong>
          <button className="btn btn-sm btn-outline" onClick={addItem}>+ Add Item</button>
        </div>

        {form.items.map((item, i) => (
          <PurchaseItemRow key={i} item={item} index={i} products={products?.products} onChange={updateItem} onRemove={removeItem} />
        ))}

        <div className="item-total-row">
          <span className="text-muted">Total Items: {form.items.filter(i => i.product_id).length}</span>
          <span><strong>Total: {formatCurrency(total)}</strong></span>
        </div>
      </Modal>

      {/* View PO Modal */}
      {viewPO && (
        <Modal isOpen={!!viewPO} onClose={() => setViewPO(null)} title={`Purchase Order — ${viewPO.invoice_number}`} size="modal-lg"
          footer={<button className="btn btn-secondary" onClick={() => setViewPO(null)}>Close</button>}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div><div className="text-muted text-sm">Supplier</div><div className="fw-700">{viewPO.supplier_name}</div></div>
            <div><div className="text-muted text-sm">Date</div><div>{formatDate(viewPO.purchase_date)}</div></div>
            <div><div className="text-muted text-sm">Status</div><div>{viewPO.status === 'received' ? <span className="badge badge-success">Received</span> : viewPO.status}</div></div>
          </div>
          <table className="invoice-items-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {(viewPO.items || []).map((item, i) => (
                <tr key={i}>
                  <td className="td-name">{item.product_name}</td>
                  <td><span className="td-mono">{item.product_sku}</span></td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unit_price)}</td>
                  <td className="text-right">{formatCurrency(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4} style={{ paddingTop: 12, fontWeight: 700, textAlign: 'right' }}>Grand Total</td><td className="text-right fw-700" style={{ fontSize: 16, paddingTop: 12 }}>{formatCurrency(viewPO.total_amount)}</td></tr>
            </tfoot>
          </table>
        </Modal>
      )}
    </div>
  );
}

// ─── SALES ────────────────────────────────────────────────────

function Sales() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const { data, loading, refetch } = useApi(`/sales/?page=${page}`, [page]);
  const { data: products } = useApi('/products/?per_page=200');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewSale, setViewSale] = useState(null);
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', payment_method: 'cash', discount: 0, tax_rate: 0, notes: '', items: [{ product_id: '', quantity: '', unit_price: '' }] });

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: '', quantity: '', unit_price: '' }] }));
  const removeItem = i => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, item) => setForm(f => { const items = [...f.items]; items[i] = item; return { ...f, items }; });

  const subtotal = form.items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
  const discount = parseFloat(form.discount) || 0;
  const taxAmount = (subtotal - discount) * (parseFloat(form.tax_rate) || 0) / 100;
  const grandTotal = subtotal - discount + taxAmount;

  const handleSubmit = async () => {
    const validItems = form.items.filter(i => i.product_id && i.quantity && i.unit_price);
    if (!validItems.length) return toast('Add at least one item', 'error');
    setSaving(true);
    try {
      await apiFetch('/sales/', { method: 'POST', body: { ...form, items: validItems } });
      toast('Sale recorded! Stock updated automatically ✅', 'success');
      setShowModal(false);
      setForm({ customer_name: '', customer_phone: '', payment_method: 'cash', discount: 0, tax_rate: 0, notes: '', items: [{ product_id: '', quantity: '', unit_price: '' }] });
      refetch();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const paymentIcon = m => ({ cash: '💵', card: '💳', upi: '📱' }[m] || '💵');

  return (
    <div>
      <div className="alert alert-info mb-4">
        <span>ℹ️</span>
        <span><strong>Workflow:</strong> Create Sale → Stock automatically decreases → Invoice generated → Profit calculated</span>
      </div>

      <div className="card mb-6" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-success" onClick={() => setShowModal(true)}>+ New Sale / Invoice</button>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Sales History {data && `(${data.total})`}</div></div>
        {loading ? <Loading /> : !data?.sales?.length ? (
          <EmptyState icon="🧾" title="No sales yet" desc="Create your first sale" />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Profit</th><th>Payment</th><th>Actions</th></tr></thead>
                <tbody>
                  {data.sales.map(s => (
                    <tr key={s.id}>
                      <td><span className="td-mono">{s.invoice_number}</span></td>
                      <td><strong>{s.customer_name}</strong></td>
                      <td className="text-muted text-sm">{formatDate(s.sale_date)}</td>
                      <td><span className="badge badge-info">{s.items?.length || 0} items</span></td>
                      <td><strong>{formatCurrency(s.total_amount)}</strong></td>
                      <td><span className="text-success fw-700">{formatCurrency(s.profit_amount)}</span></td>
                      <td><span style={{ fontSize: 18 }}>{paymentIcon(s.payment_method)}</span> <span className="text-sm text-muted">{s.payment_method}</span></td>
                      <td><button className="btn btn-sm btn-outline" onClick={() => setViewSale(s)}>🧾 Invoice</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.pages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={() => setPage(p => p-1)} disabled={page === 1}>‹</button>
                {Array.from({ length: data.pages }, (_, i) => i+1).map(p => (
                  <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="page-btn" onClick={() => setPage(p => p+1)} disabled={page === data.pages}>›</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Sale Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Sale / Invoice" size="modal-lg"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-success" onClick={handleSubmit} disabled={saving}>
            {saving ? <><div className="spinner"></div> Processing…</> : '🧾 Confirm Sale'}
          </button>
        </>}>

        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Customer Name</label>
            <input className="form-control" placeholder="Walk-in Customer" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-control" placeholder="+91-..." value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select className="form-control" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
              <option value="cash">💵 Cash</option>
              <option value="card">💳 Card</option>
              <option value="upi">📱 UPI</option>
            </select>
          </div>
        </div>

        <hr className="divider" />
        <div className="flex items-center justify-between mb-4">
          <strong style={{ fontSize: 13 }}>Sale Items</strong>
          <button className="btn btn-sm btn-outline" onClick={addItem}>+ Add Item</button>
        </div>

        {form.items.map((item, i) => (
          <div key={i} className="item-row item-row-5">
            <div className="form-group" style={{ marginBottom: 0 }}>
              {i === 0 && <label className="form-label">Product</label>}
              <select className="form-control" value={item.product_id} onChange={e => {
                const p = products?.products?.find(x => x.id === parseInt(e.target.value));
                updateItem(i, { ...item, product_id: e.target.value, unit_price: p ? p.selling_price : '' });
              }}>
                <option value="">Select product…</option>
                {(products?.products || []).map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity_in_stock})</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              {i === 0 && <label className="form-label">Qty</label>}
              <input type="number" className="form-control" placeholder="0" min="1" value={item.quantity} onChange={e => updateItem(i, { ...item, quantity: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              {i === 0 && <label className="form-label">Price (₹)</label>}
              <input type="number" className="form-control" value={item.unit_price} onChange={e => updateItem(i, { ...item, unit_price: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              {i === 0 && <label className="form-label">Total</label>}
              <div className="form-control" style={{ background: '#f8faff', color: 'var(--text-secondary)' }}>
                {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
              </div>
            </div>
            <button className="remove-btn" style={{ marginTop: i === 0 ? 22 : 0 }} onClick={() => removeItem(i)}>✕</button>
          </div>
        ))}

        <hr className="divider" />
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Discount (₹)</label>
            <input type="number" className="form-control" placeholder="0" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tax Rate (%)</label>
            <input type="number" className="form-control" placeholder="0" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} />
          </div>
        </div>

        <div style={{ background: '#f8faff', padding: '14px 16px', borderRadius: 10, marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="text-muted">Subtotal</span><span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="text-muted">Discount</span><span className="text-danger">-{formatCurrency(discount)}</span>
          </div>}
          {taxAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="text-muted">Tax ({form.tax_rate}%)</span><span>{formatCurrency(taxAmount)}</span>
          </div>}
          <hr className="divider" style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700 }}>Grand Total</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--success)' }}>{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </Modal>

      {/* Invoice View */}
      {viewSale && (
        <Modal isOpen={!!viewSale} onClose={() => setViewSale(null)} title="Sales Invoice" size="modal-lg"
          footer={<><button className="btn btn-outline" onClick={() => window.print()}>🖨️ Print</button><button className="btn btn-secondary" onClick={() => setViewSale(null)}>Close</button></>}>
          <div className="invoice-header">
            <div>
              <div className="invoice-title">INVOICE</div>
              <div className="text-muted text-sm">StockFlow — Inventory System</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="fw-700">{viewSale.invoice_number}</div>
              <div className="text-muted text-sm">{formatDate(viewSale.sale_date)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 48, marginBottom: 24 }}>
            <div><div className="text-muted text-sm">Bill To</div><div className="fw-700">{viewSale.customer_name}</div>{viewSale.customer_phone && <div className="text-sm">{viewSale.customer_phone}</div>}</div>
            <div><div className="text-muted text-sm">Payment</div><div className="fw-700" style={{ textTransform: 'capitalize' }}>{viewSale.payment_method}</div></div>
          </div>
          <table>
            <thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Qty</th><th>Price</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {(viewSale.items || []).map((item, i) => (
                <tr key={i}>
                  <td className="text-muted">{i+1}</td>
                  <td className="td-name">{item.product_name}</td>
                  <td><span className="td-mono">{item.product_sku}</span></td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unit_price)}</td>
                  <td className="text-right">{formatCurrency(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={5} style={{ textAlign: 'right', paddingTop: 12 }}>Subtotal</td><td className="text-right">{formatCurrency(viewSale.subtotal)}</td></tr>
              {viewSale.discount > 0 && <tr><td colSpan={5} style={{ textAlign: 'right' }}>Discount</td><td className="text-right text-danger">-{formatCurrency(viewSale.discount)}</td></tr>}
              {viewSale.tax_amount > 0 && <tr><td colSpan={5} style={{ textAlign: 'right' }}>Tax</td><td className="text-right">{formatCurrency(viewSale.tax_amount)}</td></tr>}
              <tr><td colSpan={5} style={{ textAlign: 'right', fontWeight: 800, paddingTop: 8, borderTop: '2px solid #e2e8f0' }}>Grand Total</td><td className="text-right fw-700" style={{ fontSize: 16, borderTop: '2px solid #e2e8f0', paddingTop: 8 }}>{formatCurrency(viewSale.total_amount)}</td></tr>
              <tr><td colSpan={5} style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>Profit</td><td className="text-right" style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(viewSale.profit_amount)}</td></tr>
            </tfoot>
          </table>
        </Modal>
      )}
    </div>
  );
}

// ─── REPORTS ─────────────────────────────────────────────────

function Reports() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: bestSellers } = useApi('/reports/best-sellers');
  const { data: deadStock } = useApi('/reports/dead-stock');
  const { data: lowStock } = useApi('/reports/low-stock');
  const { data: predictions } = useApi('/reports/reorder-predictions');
  const { data: revenueTrend } = useApi('/reports/revenue-trend');

  const tabs = [
    { id: 'overview', label: '📊 Revenue Trend' },
    { id: 'best', label: '🏆 Best Sellers' },
    { id: 'dead', label: '💀 Dead Stock' },
    { id: 'lowstock', label: '⚠️ Low Stock' },
    { id: 'predict', label: '🔮 Reorder AI' },
  ];

  return (
    <div>
      <div className="tabs">
        {tabs.map(t => (
          <div key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Revenue & Profit Trend</div></div>
          {revenueTrend ? <LineChart data={revenueTrend} /> : <Loading />}
        </div>
      )}

      {activeTab === 'best' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Best Selling Products</div><span className="badge badge-success">By Revenue</span></div>
          {!bestSellers ? <Loading /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Qty Sold</th><th>Revenue</th><th>Profit</th></tr></thead>
                <tbody>
                  {bestSellers.map((p, i) => (
                    <tr key={p.id}>
                      <td><span className="badge badge-neutral">{i+1}</span></td>
                      <td className="td-name">{p.name}</td>
                      <td><span className="td-mono">{p.sku}</span></td>
                      <td>{p.total_qty}</td>
                      <td><strong>{formatCurrency(p.total_revenue)}</strong></td>
                      <td><span className="text-success fw-700">{formatCurrency(p.total_profit)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'dead' && (
        <div>
          <div className="alert alert-warning mb-4">
            <span>⚠️</span>
            <span>Dead stock = products with <strong>no sales in the last 30 days</strong> but still in inventory. Consider discounting or returning.</span>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Dead Stock Products</div>{deadStock && <span className="badge badge-danger">{deadStock.length} products</span>}</div>
            {!deadStock ? <Loading /> : deadStock.length === 0 ? (
              <EmptyState icon="✅" title="No dead stock!" desc="All products have been selling recently" />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Value</th><th>Expiry</th></tr></thead>
                  <tbody>
                    {deadStock.map(p => (
                      <tr key={p.id}>
                        <td className="td-name">{p.name}</td>
                        <td><span className="td-mono">{p.sku}</span></td>
                        <td><span className="badge badge-neutral">{p.category_name}</span></td>
                        <td>{p.quantity_in_stock} {p.unit}</td>
                        <td>{formatCurrency(p.quantity_in_stock * p.purchase_price)}</td>
                        <td>{p.expiry_date ? <span className="badge badge-warning">{formatDate(p.expiry_date)}</span> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'lowstock' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Low Stock Report</div>{lowStock && <span className="badge badge-danger">{lowStock.length} items</span>}</div>
          {!lowStock ? <Loading /> : lowStock.length === 0 ? (
            <EmptyState icon="✅" title="All stocks healthy!" desc="No products below reorder level" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>SKU</th><th>Current Stock</th><th>Reorder At</th><th>Shortage</th><th>Buy Price</th></tr></thead>
                <tbody>
                  {lowStock.map(p => (
                    <tr key={p.id}>
                      <td className="td-name">{p.name}</td>
                      <td><span className="td-mono">{p.sku}</span></td>
                      <td><span className="badge badge-danger">{p.quantity_in_stock} {p.unit}</span></td>
                      <td>{p.reorder_level} {p.unit}</td>
                      <td className="text-danger fw-700">{Math.max(0, p.reorder_level - p.quantity_in_stock)} {p.unit}</td>
                      <td>{formatCurrency(p.purchase_price)}/{p.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'predict' && (
        <div>
          <div className="alert alert-info mb-4">
            <span>🔮</span>
            <span><strong>Smart Reorder Prediction:</strong> Based on average daily sales in the last 30 days, we predict which products will run out of stock within the next 7 days.</span>
          </div>
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">🔮 Reorder Predictions</div><div className="card-subtitle">AI-powered stock depletion forecast</div></div>
              <span className="badge badge-purple">AI Engine</span>
            </div>
            {!predictions ? <Loading /> : predictions.length === 0 ? (
              <EmptyState icon="✅" title="All stocked up!" desc="No products predicted to run out in the next 7 days" />
            ) : (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Product</th><th>Current Stock</th><th>Avg Daily Sales</th><th>Sales (30d)</th><th>Days Left</th><th>Urgency</th></tr>
                    </thead>
                    <tbody>
                      {predictions.map(p => (
                        <tr key={p.product_id}>
                          <td>
                            <div className="td-name">{p.product_name}</div>
                            <div className="td-mono">{p.sku}</div>
                          </td>
                          <td>{p.current_stock} {p.unit}</td>
                          <td>{p.avg_daily_sales} {p.unit}/day</td>
                          <td>{p.qty_sold_30d} {p.unit}</td>
                          <td>
                            <span style={{ fontSize: 20, fontWeight: 800, color: p.urgency === 'critical' ? 'var(--danger)' : 'var(--warning)' }}>
                              {p.days_until_stockout}d
                            </span>
                          </td>
                          <td>
                            {p.urgency === 'critical' ?
                              <span className="badge badge-danger">🔴 Critical</span> :
                              <span className="badge badge-warning">🟡 Warning</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 20 }}>
                  {predictions.map(p => (
                    <div key={p.product_id} className={`prediction-card ${p.urgency}`}>
                      <div className="prediction-icon">{p.urgency === 'critical' ? '🔴' : '🟡'}</div>
                      <div className="prediction-info">
                        <div className="prediction-name">{p.message}</div>
                        <div className="prediction-msg">Reorder level: {p.reorder_level} {p.unit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SIDEBAR NAV ──────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard', icon: '🏠', label: 'Dashboard', section: 'main' },
  { id: 'products', icon: '📦', label: 'Products', section: 'inventory' },
  { id: 'suppliers', icon: '🏭', label: 'Suppliers', section: 'inventory' },
  { id: 'purchases', icon: '🛒', label: 'Purchases', section: 'transactions' },
  { id: 'sales', icon: '🧾', label: 'Sales & Invoices', section: 'transactions' },
  { id: 'reports', icon: '📊', label: 'Reports & Analytics', section: 'insights' },
];

const SECTIONS = [
  { id: 'main', label: 'Overview' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'insights', label: 'Insights' },
];

const PAGE_TITLES = {
  dashboard: { title: 'Dashboard', subtitle: 'Business overview at a glance' },
  products: { title: 'Product Management', subtitle: 'Manage your product catalog and inventory' },
  suppliers: { title: 'Supplier Management', subtitle: 'Manage vendors and purchase history' },
  purchases: { title: 'Purchase Orders', subtitle: 'Record stock purchases from suppliers' },
  sales: { title: 'Sales & Invoices', subtitle: 'Create sales and generate invoices' },
  reports: { title: 'Reports & Analytics', subtitle: 'Data-driven insights for your business' },
};

// ─── MAIN APP ─────────────────────────────────────────────────

function App() {
  const [page, setPage] = useState('dashboard');
  const { data: stats } = useApi('/dashboard/stats');

  const pages = { dashboard: Dashboard, products: Products, suppliers: Suppliers, purchases: Purchases, sales: Sales, reports: Reports };
  const PageComponent = pages[page];
  const pageInfo = PAGE_TITLES[page];
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <div className="brand-icon">📦</div>
            <div>
              <div className="brand-name">StockFlow</div>
              <div className="brand-sub">Inventory Management</div>
            </div>
          </div>
        </div>

        {SECTIONS.map(section => {
          const sectionItems = NAV_ITEMS.filter(n => n.section === section.id);
          if (!sectionItems.length) return null;
          return (
            <div key={section.id} className="sidebar-section">
              <div className="sidebar-section-label">{section.label}</div>
              {sectionItems.map(item => (
                <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}>
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          );
        })}

        <div className="sidebar-footer">
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Stats</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            {stats && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Total Revenue</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>₹{(stats.total_revenue / 1000).toFixed(1)}k</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Products</span>
                  <span style={{ color: '#3b82f6', fontWeight: 600 }}>{stats.total_products}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Low Stock</span>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>{stats.low_stock_count}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">{pageInfo.title}</div>
            <div className="topbar-subtitle">{pageInfo.subtitle}</div>
          </div>
          <div className="topbar-right">
            <span className="topbar-badge">📅 {today}</span>
            {stats?.low_stock_count > 0 && (
              <span className="topbar-badge" style={{ background: '#fee2e2', color: '#dc2626', cursor: 'pointer' }} onClick={() => setPage('reports')}>
                ⚠️ {stats.low_stock_count} Low Stock
              </span>
            )}
            <div className="avatar" style={{ background: '#dbeafe', color: '#2563eb' }}>A</div>
          </div>
        </div>

        <div className="page-content">
          <PageComponent key={page} />
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <App />
  </ToastProvider>
);
