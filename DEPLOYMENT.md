# Deployment Guide - All 3 API Patterns

This Helm chart deploys **all three API pattern demos** to OpenShift:
- **GraphQL API** (port 4000)
- **REST API** (port 3000)  
- **gRPC API** (port 50051)

All three apps share the same databases (PostgreSQL, MySQL, SQLite).

## Quick Deploy

```bash
# Clone repository
git clone https://github.com/na-launch-workshop/demo-api-patterns.git
cd demo-api-patterns

# Login to OpenShift
oc login <your-cluster>

# Create or use existing project
oc new-project demo-api-patterns
# OR
oc project <your-project>

# Deploy all 3 apps
helm install api-demo ./helm

# Watch the builds
oc get builds -w
```

## What Gets Deployed

### Applications (3 separate apps):
- ✅ **GraphQL App**
  - BuildConfig + ImageStream
  - Deployment (1 replica)
  - Service (ClusterIP, port 4000)
  - Route (HTTPS)
  
- ✅ **REST App**
  - BuildConfig + ImageStream
  - Deployment (1 replica)
  - Service (ClusterIP, port 3000)
  - Route (HTTPS)
  
- ✅ **gRPC App**
  - BuildConfig + ImageStream
  - Deployment (1 replica)
  - Service (ClusterIP, port 50051)
  - Route (HTTPS with h2)

### Shared Databases:
- ✅ **PostgreSQL StatefulSet** (Authors data)
  - PersistentVolumeClaim (1Gi)
  - Service
  - Secret (credentials)
  
- ✅ **MySQL StatefulSet** (Books data)
  - PersistentVolumeClaim (1Gi)
  - Service
  - Secret (credentials)
  
- ✅ **SQLite PVC** (Reviews data)
  - PersistentVolumeClaim (1Gi, optional)
  - Or emptyDir (default)

### Additional:
- ✅ **Seed Job** (populates databases)
- ✅ **ArgoCD Application** (GitOps)

## Get URLs

```bash
# Get all routes
oc get routes

# GraphQL endpoint
export GRAPHQL_URL=$(oc get route api-demo-gql-app -o jsonpath='{.spec.host}')
echo "GraphQL: https://$GRAPHQL_URL"

# REST endpoint
export REST_URL=$(oc get route api-demo-rest-app -o jsonpath='{.spec.host}')
echo "REST: https://$REST_URL"

# gRPC endpoint
export GRPC_URL=$(oc get route api-demo-grpc-app -o jsonpath='{.spec.host}')
echo "gRPC: $GRPC_URL:443"
```

## Test Each API

### GraphQL API

```bash
# Get all authors
curl -X POST "https://$GRAPHQL_URL" \
  -H 'content-type: application/json' \
  -d '{"query":"{ authors { id firstname lastname } }"}' | jq .

# Get author with books
curl -X POST "https://$GRAPHQL_URL" \
  -H 'content-type: application/json' \
  -d '{"query":"query($id: ID!) { author(id:$id){ id firstname lastname books { id title } }}","variables":{"id":"1"}}' | jq .
```

### REST API

```bash
# Get all authors
curl "https://$REST_URL/api/v1/authors" | jq .

# Get author by ID
curl "https://$REST_URL/api/v1/authors/1" | jq .

# Get all books
curl "https://$REST_URL/api/v1/books" | jq .

# Health check
curl "https://$REST_URL/api/v1/health" | jq .
```

### gRPC API

**Using grpcurl:**

```bash
# Install grpcurl
brew install grpcurl  # macOS
# OR
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest

# List services
grpcurl -insecure $GRPC_URL:443 list

# Health check
grpcurl -insecure $GRPC_URL:443 health.HealthService/Check

# Get author
grpcurl -insecure \
  -d '{"id": 1}' \
  $GRPC_URL:443 authors.AuthorService/GetAuthor

# List books
grpcurl -insecure \
  -d '{"limit": 5, "offset": 0}' \
  $GRPC_URL:443 books.BookService/ListBooks
```

## Configuration

Edit `helm/values.yaml` before deploying:

### Enable/Disable Apps

```yaml
gql-app:
  enabled: true    # Set to false to skip GraphQL app

rest-app:
  enabled: true    # Set to false to skip REST app

grpc-app:
  enabled: true    # Set to false to skip gRPC app
```

### Database Configuration

```yaml
postgres:
  enabled: true
  username: dbuser
  password: dbuser
  database: postgres
  storage: 1Gi

mysql:
  enabled: true
  username: appuser
  password: apppass
  database: appdb
  storage: 1Gi

sqlite:
  enabled: true
  persistent: false  # Set to true for persistent storage
  storage: 1Gi
```

### Custom Git Repository

```yaml
buildConfig:
  git:
    uri: https://github.com/YOUR-USERNAME/demo-api-patterns.git
    ref: main  # or master
```

## Monitoring

### Watch Builds

```bash
# All builds
oc get builds -w

# Specific app build
oc logs -f bc/api-demo-gql-app
oc logs -f bc/api-demo-rest-app
oc logs -f bc/api-demo-grpc-app
```

### Watch Pods

```bash
# All pods
oc get pods -w

# Specific app logs
oc logs -f deployment/api-demo-gql-app
oc logs -f deployment/api-demo-rest-app
oc logs -f deployment/api-demo-grpc-app
```

### Check Databases

```bash
# PostgreSQL
oc port-forward statefulset/api-demo-postgres 15432:5432
psql postgres://dbuser:dbuser@localhost:15432/postgres

# MySQL
oc port-forward statefulset/api-demo-mysql 13306:3306
mysql -h 127.0.0.1 -P 13306 -u appuser -papppass

# SQLite (from app pod)
oc exec -it deployment/api-demo-gql-app -- sqlite3 /data/sqlite/reviews.db 'SELECT COUNT(*) FROM reviews;'
```

## Troubleshooting

### Build Failing

```bash
# Check build logs
oc logs -f bc/api-demo-gql-app
oc logs -f bc/api-demo-rest-app
oc logs -f bc/api-demo-grpc-app

# Restart build
oc start-build api-demo-gql-app
oc start-build api-demo-rest-app
oc start-build api-demo-grpc-app
```

### Pod Not Starting

```bash
# Check pod status
oc get pods
oc describe pod <pod-name>
oc logs <pod-name>

# Check events
oc get events --sort-by='.lastTimestamp'
```

### Database Connection Issues

```bash
# Check secrets
oc get secret api-demo-postgres -o yaml
oc get secret api-demo-mysql -o yaml

# Check service endpoints
oc get svc
oc get endpoints
```

### Seed Job Failed

```bash
# Check seed job logs
oc logs job/api-demo-gql-app-seed

# Re-run seed job (delete and Helm will recreate)
oc delete job api-demo-gql-app-seed
helm upgrade api-demo ./helm
```

## Scaling

### Scale Apps

```bash
# Scale GraphQL app
oc scale deployment/api-demo-gql-app --replicas=3

# Scale REST app
oc scale deployment/api-demo-rest-app --replicas=2

# Auto-scale
oc autoscale deployment/api-demo-gql-app --min=1 --max=5 --cpu-percent=70
```

### Database Scaling

StatefulSets for PostgreSQL and MySQL are set to 1 replica (not designed for HA in this demo).

## Cleanup

### Uninstall Everything

```bash
helm uninstall api-demo
```

### Delete Only Apps (Keep Databases)

```bash
oc delete deployment api-demo-gql-app
oc delete deployment api-demo-rest-app
oc delete deployment api-demo-grpc-app
```

### Force Delete All Resources

```bash
oc delete all,pvc,secret,configmap -l app.kubernetes.io/instance=api-demo
```

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│           External Traffic                  │
│   (Browser, curl, grpcurl, mobile apps)     │
└───────────────────┬─────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          OpenShift Routes (HTTPS)           │
│  ┌────────────┐ ┌────────────┐ ┌─────────┐ │
│  │ GraphQL    │ │   REST     │ │  gRPC   │ │
│  │ Route      │ │   Route    │ │  Route  │ │
│  │ :443       │ │   :443     │ │  :443   │ │
│  └────┬───────┘ └──────┬─────┘ └────┬────┘ │
└───────┼────────────────┼────────────┼───────┘
        ↓                ↓            ↓
┌─────────────────────────────────────────────┐
│            ClusterIP Services               │
│  ┌────────────┐ ┌────────────┐ ┌─────────┐ │
│  │ gql-app    │ │ rest-app   │ │grpc-app │ │
│  │ :4000      │ │ :3000      │ │ :50051  │ │
│  └────┬───────┘ └──────┬─────┘ └────┬────┘ │
└───────┼────────────────┼────────────┼───────┘
        ↓                ↓            ↓
┌─────────────────────────────────────────────┐
│            Application Pods                 │
│  ┌────────────┐ ┌────────────┐ ┌─────────┐ │
│  │ GraphQL    │ │   REST     │ │  gRPC   │ │
│  │ Container  │ │ Container  │ │Container│ │
│  └────┬───────┘ └──────┬─────┘ └────┬────┘ │
└───────┼────────────────┼────────────┼───────┘
        └────────────────┴────────────┘
                         ↓
        ┌────────────────────────────────────┐
        │     Shared Database Services       │
        │  ┌──────────┐ ┌──────┐ ┌────────┐ │
        │  │PostgreSQL│ │MySQL │ │ SQLite │ │
        │  │  :5432   │ │:3306 │ │  PVC   │ │
        │  └────┬─────┘ └───┬──┘ └────┬───┘ │
        └───────┼───────────┼─────────┼─────┘
                ↓           ↓         ↓
        ┌────────────────────────────────────┐
        │    Persistent Storage (PVCs)       │
        │  ┌──────────┐ ┌──────┐ ┌────────┐ │
        │  │Postgres  │ │MySQL │ │SQLite  │ │
        │  │   1Gi    │ │ 1Gi  │ │  1Gi   │ │
        │  └──────────┘ └──────┘ └────────┘ │
        └────────────────────────────────────┘
```

## Performance Comparison

All three apps use the same data model and databases. You can compare:

### Payload Size (Same Data)
- **GraphQL**: ~400 bytes (only requested fields)
- **REST**: ~500 bytes (full JSON)
- **gRPC**: ~200 bytes (binary protobuf)

### Request Overhead
- **GraphQL**: Single endpoint, flexible queries
- **REST**: Multiple endpoints, standard HTTP
- **gRPC**: HTTP/2 multiplexing, binary protocol

### Use Case Fit
- **GraphQL**: Web/mobile apps, flexible data needs
- **REST**: Public APIs, third-party integrations
- **gRPC**: Internal services, high performance, streaming

## Next Steps

1. **Test all three APIs** with the examples above
2. **Compare the code** in `gql-app/`, `rest-app/`, `grpc-app/`
3. **Read best practices**:
   - `REST-BEST-PRACTICES.md`
   - `rest-app/README.md`
   - `grpc-app/README.md`
4. **Modify and experiment** with the code
5. **Scale and monitor** in OpenShift

## Workshop Use

This setup is perfect for demonstrating:
- ✅ Different API architectural patterns
- ✅ When to use each pattern
- ✅ How they differ in implementation
- ✅ Performance characteristics
- ✅ Deployment on OpenShift
- ✅ Shared backend architecture

Enjoy exploring the three API patterns! 🚀
