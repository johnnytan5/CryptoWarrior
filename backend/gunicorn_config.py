"""Gunicorn configuration for production deployment."""

import multiprocessing
import os

# Server socket
bind = os.getenv("GUNICORN_BIND", "0.0.0.0:8000")
backlog = 2048

# Worker processes
# Formula: (2 x CPU cores) + 1
# For EC2: t3.small (2 vCPU) = 5 workers, t3.medium (2 vCPU) = 5 workers
workers = int(os.getenv("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = os.getenv("GUNICORN_ACCESS_LOG", "-")  # stdout by default
errorlog = os.getenv("GUNICORN_ERROR_LOG", "-")   # stderr by default
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")

# Process naming
proc_name = "crypto_warrior_api"

# Server mechanics
daemon = False
pidfile = os.getenv("GUNICORN_PIDFILE", None)
umask = 0
user = os.getenv("GUNICORN_USER", None)
group = os.getenv("GUNICORN_GROUP", None)
tmp_upload_dir = None

# Graceful timeout for worker restart
graceful_timeout = 30

# Preload app for better performance (reduces memory usage)
preload_app = True

# Worker lifecycle
# Restart worker after N requests to prevent memory leaks
max_requests = int(os.getenv("GUNICORN_MAX_REQUESTS", 1000))
max_requests_jitter = int(os.getenv("GUNICORN_MAX_REQUESTS_JITTER", 50))

# Worker timeout (kill worker if it doesn't respond)
# Use /dev/shm on Linux for better performance, fallback to None on other OS
import platform
if platform.system() == "Linux" and os.path.exists("/dev/shm"):
    worker_tmp_dir = "/dev/shm"
else:
    worker_tmp_dir = None  # Use default temp directory

# StatsD integration (optional, for monitoring)
# statsd_host = None
# statsd_prefix = "crypto_warrior_api"

