# 🚀 Deploy StockFlow with SQLite - Super Easy!

Since you're using **SQLite** (not PostgreSQL), deployment is even simpler! No database setup needed.

---

## ⚡ Option 1: Render (FREE - Recommended)

### Why Render with SQLite?
- ✅ **No database setup** needed
- ✅ **Persistent disk** for SQLite file
- ✅ **Free tier** available
- ✅ **HTTPS** included
- ✅ **5 minutes** to deploy

### Step-by-Step:

#### 1. Push to GitHub

```bash
git add .
git commit -m "Add deployment files for SQLite"
git push
```

#### 2. Deploy on Render

1. Go to **https://render.com**
2. Sign up with GitHub
3. Click **"New +"** → **"Web Service"**
4. Connect repository: **StockFlow**
5. Render detects `render.yaml` automatically
6. Click **"Apply"** or **"Create Web Service"**
7. Wait 5-10 minutes

#### 3. Done! 🎉

Your app will be live at:
```
https://stockflow-xxxx.onrender.com
```

### Important: Persistent Disk

The `render.yaml` includes a **persistent disk** configuration:
- SQLite database stored in `/instance` folder
- Data persists across deployments
- 1GB free storage

---

## ⚡ Option 2: Railway (FREE $5 Credit)

### Step-by-Step:

#### 1. Deploy on Railway

1. Go to **https://railway.app**
2. Sign up with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select **StockFlow**
5. Railway auto-deploys!

#### 2. Add Persistent Volume

1. In Railway dashboard, click your service
2. Go to **"Settings"** → **"Volumes"**
3. Click **"+ New Volume"**
4. Mount path: `/app/instance`
5. Size: 1GB

#### 3. Done!

```
https://stockflow-production.up.railway.app
```

---

## ⚡ Option 3: PythonAnywhere (FREE)

### Perfect for SQLite!

#### 1. Sign Up

Go to **https://www.pythonanywhere.com** (free account)

#### 2. Upload Code

**Option A: Upload Files**
- Go to "Files" tab
- Upload your project

**Option B: Clone from GitHub**
```bash
git clone https://github.com/Harshita-0705/StockFlow.git
```

#### 3. Create Virtual Environment

In Bash console:
```bash
cd StockFlow
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 4. Configure Web App

1. Go to **"Web"** tab
2. Click **"Add a new web app"**
3. Choose **"Manual configuration"**
4. Python 3.10
5. Set paths:
   - Source: `/home/yourusername/StockFlow`
   - Virtualenv: `/home/yourusername/StockFlow/venv`

#### 5. Edit WSGI File

Replace content with:
```python
import sys
import os

path = '/home/yourusername/StockFlow'
if path not in sys.path:
    sys.path.append(path)

os.environ['SECRET_KEY'] = 'your-secret-key-here'

from app import create_app
application = create_app()
```

#### 6. Reload

Click **"Reload"** button.

Your app: `https://yourusername.pythonanywhere.com`

---

## 🐳 Option 4: Docker (Any Server)

### Simplified Dockerfile for SQLite

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy and install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create instance directory for SQLite
RUN mkdir -p instance

# Expose port
EXPOSE 8000

# Run with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "app:app"]
```

### Run with Docker

```bash
# Build
docker build -t stockflow .

# Run
docker run -d -p 8000:8000 -v $(pwd)/instance:/app/instance stockflow

# Access
http://localhost:8000
```

The `-v` flag mounts the instance folder so your database persists!

---

## 📝 What's Already Configured

Your project is ready to deploy with SQLite:

✅ **app.py** - Uses SQLite by default
```python
DATABASE_URL = "sqlite:///grocery_erp.db"
```

✅ **requirements.txt** - Includes gunicorn
```
gunicorn==21.2.0
```

✅ **render.yaml** - Configured for SQLite with persistent disk

✅ **Procfile** - Ready for Heroku/Railway
```
web: gunicorn app:app
```

---

## ⚠️ SQLite Limitations

### Good For:
- ✅ Small to medium apps
- ✅ Low traffic (< 100 concurrent users)
- ✅ Single server deployment
- ✅ Development/demo
- ✅ Portfolio projects

### Not Good For:
- ❌ High traffic (1000+ concurrent users)
- ❌ Multiple servers (no shared database)
- ❌ Heavy write operations
- ❌ Large-scale production

### When to Upgrade to PostgreSQL:
- More than 100 concurrent users
- Need multiple servers
- Heavy database operations
- Enterprise requirements

---

## 🎯 Recommended for Your Project

Since this is a **portfolio/demo project**, SQLite is perfect!

**Best Option**: **Render Free Tier**
- Easy to deploy
- Free forever
- Persistent storage
- HTTPS included
- Professional URL

---

## 🔧 Troubleshooting

### Database File Not Found?

Make sure the `instance` folder exists:
```python
# In app.py (already done)
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
```

### Data Lost After Deployment?

**Render**: Make sure persistent disk is configured in `render.yaml`
**Railway**: Add a volume mounted to `/app/instance`
**Docker**: Use `-v` flag to mount instance folder

### Permission Errors?

SQLite needs write permissions:
```bash
chmod 755 instance
chmod 644 instance/grocery_erp.db
```

---

## 💰 Cost Comparison (SQLite)

| Platform | Cost | Storage | Sleep? |
|----------|------|---------|--------|
| **Render** | Free | 1GB | Yes (15 min) |
| **Railway** | $5 credit/mo | 1GB | No |
| **PythonAnywhere** | Free | 512MB | No |
| **Heroku** | $5/mo | Ephemeral | No |

---

## 🚀 Quick Deploy Commands

### For Render/Railway:
```bash
git add .
git commit -m "Ready for deployment"
git push
# Then deploy via web dashboard
```

### For Docker:
```bash
docker build -t stockflow .
docker run -d -p 8000:8000 -v $(pwd)/instance:/app/instance stockflow
```

### For PythonAnywhere:
```bash
# Upload files via web interface
# Or clone from GitHub
git clone https://github.com/Harshita-0705/StockFlow.git
```

---

## ✅ Deployment Checklist

Before deploying:

- [ ] `requirements.txt` includes `gunicorn`
- [ ] `render.yaml` or `Procfile` exists
- [ ] `instance` folder in `.gitignore` (database not in git)
- [ ] `SECRET_KEY` is set (auto-generated on Render)
- [ ] Code pushed to GitHub
- [ ] Ready to deploy!

---

## 🎉 After Deployment

1. **Test your app** - Visit the URL
2. **Add some data** - Create categories, products
3. **Share the link** - Add to resume/portfolio
4. **Monitor** - Check logs if issues

---

## 📚 Next Steps

### To Upgrade to PostgreSQL Later:

1. Change `DATABASE_URL` in environment variables
2. Update `requirements.txt` (already has `psycopg2-binary`)
3. Redeploy

That's it! SQLite → PostgreSQL is seamless with SQLAlchemy.

---

## 🔗 Useful Links

- **Render Dashboard**: https://dashboard.render.com
- **Railway Dashboard**: https://railway.app/dashboard
- **PythonAnywhere**: https://www.pythonanywhere.com
- **Your Repo**: https://github.com/Harshita-0705/StockFlow

---

**Your SQLite app is ready to deploy in 5 minutes! 🚀**

Choose Render for the easiest experience!
