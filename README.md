# Demo API Patterns

Quick OpenShift demo showing best practices for deploying different API patterns using Node.js.

## Overview

This repository contains simple example applications demonstrating three common API patterns in OpenShift:

- **GraphQL API** (`gql-app/`) - Apollo Server with multi-database integration
- **REST API** (`rest-app/`) - RESTful API implementation *(coming soon)*
- **gRPC API** (`grpc-app/`) - gRPC service implementation *(coming soon)*
wha
## Architecture

### GraphQL Application (gql-app)

A Node.js GraphQL API using Apollo Server that demonstrates:
- Multi-database connectivity (PostgreSQL, MySQL, SQLite)
- DataLoader for efficient data fetching
- GraphQL subscriptions
- Database seeding with sample data

**Tech Stack:**
- Node.js 20
- Apollo Server 5.x
- PostgreSQL 16
- MySQL 8.0
- SQLite3

## Deployment

### Prerequisites

- OpenShift cluster (tested on ROSA)
- `oc` CLI tool
- `helm` CLI tool

### Deploy with Helm

1. Clone the repository:
```bash
git clone https://github.com/na-launch-workshop/demo-api-patterns.git
cd demo-api-patterns
```

2. Install the Helm chart:
```bash
helm install gql-node-deploy ./helm
```

This will deploy:
- PostgreSQL StatefulSet with persistent storage
- MySQL StatefulSet with persistent storage
- SQLite PVC (optional persistent storage)
- GraphQL application Deployment
- Database seeding Job
- OpenShift Routes with TLS
- ArgoCD Application for GitOps

3. Get the application URL:
```bash
oc get route -l app.kubernetes.io/instance=gql-node-deploy
```

### Configuration

Key values in `helm/values.yaml`:

```yaml
gql-app:
  enabled: true
  service:
    port: 4000
  route:
    enabled: true
    tls:
      termination: edge

postgres:
  enabled: true
  username: dbuser
  password: dbuser
  database: postgres

mysql:
  enabled: true
  username: appuser
  password: apppass
  database: appdb

sqlite:
  enabled: true
  persistent: false  # Set to true for persistent storage
```

## Testing the GraphQL API

### Database Access

#### PostgreSQL
```bash
oc port-forward statefulset/gql-node-deploy-postgres 15432:5432
# Connect with: postgres://dbuser:dbuser@localhost:15432/postgres
```

#### MySQL
```bash
oc port-forward statefulset/gql-node-deploy-mysql 13306:3306
# Test connection:
mysql -h 127.0.0.1 -P 13306 -u appuser -p
# Password: apppass
# Verify data:
mysql -h 127.0.0.1 -P 13306 -u appuser -papppass -e 'USE appdb; SELECT COUNT(*) FROM books;'
```

#### SQLite
```bash
# Access from within the app pod:
oc exec -it deployment/gql-node-deploy-app -- sqlite3 /data/sqlite/reviews.db 'SELECT * FROM reviews;'
```

### Sample GraphQL Queries

Set your GraphQL endpoint:
```bash
export GRAPHQL_URL=$(oc get route gql-node-deploy-app -o jsonpath='{.spec.host}')
export GRAPHQL_URL="https://$GRAPHQL_URL"
```

#### Query: Get all authors
```bash
curl -sS -X POST "$GRAPHQL_URL" \
  -H 'content-type: application/json' \
  -d '{"query":"{ authors { id firstname lastname } }"}' | jq .
```

#### Query: Get author by ID with books
```bash
curl -sS -X POST "$GRAPHQL_URL" \
  -H 'content-type: application/json' \
  -d '{"query":"query($id: ID!) { author(id:$id){ id firstname lastname books { id title } }}","variables":{"id":"1"}}' | jq .
```

#### Query: Get book with reviews
```bash
curl -sS -X POST "$GRAPHQL_URL" \
  -H 'content-type: application/json' \
  -d '{"query":"{ book(id:\"1\"){ id title author { firstname lastname } reviews { id rating reviewerName comment } }}"}' | jq .
```

### Sample GraphQL Mutations

#### Add an author
```bash
curl -sS -X POST "$GRAPHQL_URL" \
  -H 'content-type: application/json' \
  -d '{"query":"mutation($input:AddAuthorInput!){ addAuthor(input:$input){ id firstname lastname dateCreated }}","variables":{"input":{"firstname":"Donald","lastname":"Grafman","birthdate":"1979-05-04","favoriteColor":"teal","bio":"Writes slipstream thrillers."}}}' | jq .
```

#### Add a book
```bash
curl -sS -X POST "$GRAPHQL_URL" \
  -H 'content-type: application/json' \
  -d '{"query":"mutation($input:AddBookInput!){ addBook(input:$input){ id title author { id firstname lastname } }}","variables":{"input":{"authorId":"102","title":"Infinite Tides","synopsis":"Space opera novella."}}}' | jq .
```

#### Add a review
```bash
curl -sS -X POST "$GRAPHQL_URL" \
  -H 'content-type: application/json' \
  -d '{"query":"mutation($bookId:ID!,$name:String!,$rating:Int!,$comment:String!){ addReview(bookId:$bookId,reviewerName:$name,rating:$rating,comment:$comment){ id bookId reviewerName rating comment }}","variables":{"bookId":"1","name":"CLI Tester","rating":5,"comment":"Great read!"}}' | jq .
```

#### Delete an author
```bash
curl -sS -X POST "$GRAPHQL_URL" \
  -H 'content-type: application/json' \
  -d '{"query":"mutation($id:ID!){ deleteAuthor(id:$id) }","variables":{"id":"104"}}' | jq .
```

## Horizontal Pod Autoscaling

Enable autoscaling for the GraphQL app:

```bash
# Create HPA (1-5 replicas, scale at 20% CPU)
oc autoscale deployment/gql-node-deploy-app --min=1 --max=5 --cpu-percent=20

# Watch the HPA
oc get hpa gql-node-deploy-app -w

# Watch pods scaling
oc get pods -w -l app=gql-node-deploy-app

# Clean up HPA
oc delete hpa gql-node-deploy-app

# Reset to single replica
oc scale deployment/gql-node-deploy-app --replicas=1
```

## Development

### Local Development

1. Navigate to the app directory:
```bash
cd gql-app
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Start the server:
```bash
npm start
```

The GraphQL playground will be available at `http://localhost:4000`

### Seed Database

Run the seed script to populate databases with sample data:
```bash
npm run seed
```

## Project Structure

```
demo-api-patterns/
├── gql-app/              # GraphQL application
│   ├── index.js          # Apollo Server setup
│   ├── package.json      # Dependencies
│   ├── Dockerfile        # Container image
│   ├── scripts/
│   │   └── seed.js       # Database seeding script
│   ├── authors.json      # Sample authors data
│   ├── books.json        # Sample books data
│   └── reviews.json      # Sample reviews data
├── rest-app/             # REST API (coming soon)
├── grpc-app/             # gRPC API (coming soon)
└── helm/                 # Helm chart
    ├── Chart.yaml
    ├── values.yaml
    └── templates/
        ├── gql-app-*.yaml
        ├── postgres-*.yaml
        ├── mysql-*.yaml
        └── sqlite-*.yaml
```

## License

ISC
