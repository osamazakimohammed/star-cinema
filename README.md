# STAR Cinema

A 3-tier microservices cinema reservation application built with Node.js, Nginx, MySQL, and Kubernetes, powered by an automated Jenkins CI/CD pipeline.

---

## Architecture Overview

```text
               [ Browser / User ]
                       │
                       ▼  (Port 30080)
      ┌─────────────────────────────────┐
      │  Frontend Tier (NodePort)       │
      │  Nginx 1.27 Alpine              │
      │  Static HTML/CSS/JS + API Proxy │
      └────────────────┬────────────────┘
                       │  http://star-cinema-backend:3000
                       ▼
      ┌─────────────────────────────────┐
      │  Backend Tier (ClusterIP)       │
      │  Node.js 22 Express REST API    │
      └────────────────┬────────────────┘
                       │  mysql://star-cinema-db:3306
                       ▼
      ┌─────────────────────────────────┐
      │  Database Tier (ClusterIP)      │
      │  MySQL 8.4 StatefulSet + 5Gi PVC│
      └─────────────────────────────────┘
```

- **Frontend**: Serves the UI and reverse-proxies `/api/` traffic to the backend service. Exposed publicly via **NodePort 30080**.
- **Backend**: RESTful API handling authentication, movie showtimes, and seat reservations. Private **ClusterIP: 3000**.
- **Database**: MySQL 8.4 StatefulSet with persistent storage and automatic schema/seed initialization via ConfigMap. Private **ClusterIP: 3306**.
- **Autoscaling**: Horizontal Pod Autoscaler (HPA) automatically scales the backend from 1 to 3 replicas at 70% CPU utilization.

---

## Quick Start (Local Kubernetes)

### 1. Build Docker Images
```bash
docker build -t osamazakimohammed/star-cinema-backend:latest -f Dockerfile.backend .
docker build -t osamazakimohammed/star-cinema-frontend:latest -f Dockerfile.frontend .
```

### 2. Deploy All Tiers to Kubernetes
```bash
kubectl apply -f k8s/
```

### 3. Access the Application
Open your browser and navigate to:
**[http://localhost:30080](http://localhost:30080)**

Check backend and database health:
```bash
curl http://localhost:30080/api/health
# {"status":"ok","application":"star-cinema","database":"connected"}
```

---

## CI/CD Pipeline (Jenkins)

The pipeline defined in [`Jenkinsfile`](./Jenkinsfile) automatically triggers on any commit pushed to the `main` branch:

1. **Validate**: Runs JavaScript syntax checks and Kubernetes manifest dry-run validation.
2. **Build**: Builds Docker images tagged with `$BUILD_NUMBER` and `latest`.
3. **Push**: Pushes verified images to [Docker Hub (`osamazakimohammed`)](https://hub.docker.com/repositories/osamazakimohammed).
4. **Deploy**: Deploys images and updates deployments on Kubernetes.

---

## Demo Credentials

- **Email**: `user@domain.com`
- **Password**: `password`

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Application & database connection health check |
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/login` | Login and receive secure session cookie |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/auth/logout` | Clear user session cookie |
| `GET` | `/api/movies` | List movie catalog (with optional search filter) |
| `GET` | `/api/movies/:movieId/showtimes` | List upcoming showtimes for a movie |
| `GET` | `/api/showtimes/:showtimeId/seats` | Check real-time seat availability |
| `POST` | `/api/bookings` | Reserve a seat |
| `GET` | `/api/bookings/mine` | View current user's active bookings |
| `DELETE` | `/api/bookings/:bookingId` | Cancel a booking and release the seat |
