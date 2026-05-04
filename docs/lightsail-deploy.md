# Lightsail Deployment

This setup keeps the monthly floor low:

- API on a small Lightsail Linux instance
- PostgreSQL on Supabase
- file storage on S3

It fits this backend well because the app is a long-running Express server with Prisma, multipart uploads, and ZIP streaming.

## 1. Create the Lightsail instance

Use:

- Linux/Unix
- the smallest bundle you are comfortable with
- the IPv6-only bundle if you want the lowest monthly cost and your networking setup supports it

If you want the simplest first deployment, a normal public IPv4 bundle is easier to reason about. It costs a bit more than the IPv6-only option.

## 2. Connect and install Docker

SSH into the instance, then install Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
sudo apt-get update
sudo apt-get install -y docker-compose-plugin
```

## 3. Copy the project to the instance

You can use `git clone`, `scp`, or your normal deployment flow.

Example:

```bash
git clone <your-repo-url> stem-bridge-api
cd stem-bridge-api
```

## 4. Prepare the production env file

Start from the template:

```bash
cp .env.production.example .env.production
```

Set these carefully:

- `NODE_ENV=production`
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `S3_REGION`
- `S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `APP_BASE_URL`

Use your Supabase URLs like this:

- `DATABASE_URL`: pooled connection string, typically the `pooler.supabase.com` host
- `DIRECT_DATABASE_URL`: direct connection string, typically the `db.<project-ref>.supabase.co` host

This split matters because Prisma migrations usually want the direct connection instead of the pooled connection.

## 5. Start the app

Build and run the container:

```bash
docker compose -f docker-compose.lightsail.yml up --build -d
```

What this does:

- builds the Node image from this repo
- injects `.env.production`
- runs `npm run prisma:migrate:deploy`
- starts the API
- maps host port `80` to container port `4000`

The image build itself uses placeholder database URLs only for `prisma generate`, so your real Supabase credentials are needed at runtime, not baked into the image.

Check the container:

```bash
docker compose -f docker-compose.lightsail.yml ps
docker compose -f docker-compose.lightsail.yml logs -f
```

Check health:

```bash
curl http://127.0.0.1/health
```

## 6. Open the instance firewall

In Lightsail networking, allow:

- `80/tcp`

If you later put a reverse proxy with TLS in front, also allow:

- `443/tcp`

## 7. Updating the app

On the instance:

```bash
git pull
docker compose -f docker-compose.lightsail.yml up --build -d
```

Because the compose service runs `prisma migrate deploy` at startup, schema migrations are applied during rollout.

## 8. Cost-sensitive recommendations

To keep cost low:

- keep PostgreSQL on Supabase instead of moving to RDS immediately
- keep file storage on S3
- start with one Lightsail instance
- do not add a Lightsail load balancer yet
- do not add a managed AWS database yet

## 9. Security notes

- Rotate any AWS access keys that have been exposed in local files or screenshots.
- Use an IAM user scoped only to the S3 bucket this app needs.
- Restrict `CORS_ORIGINS` to your frontend domain, not `*`.
- Use a strong `JWT_SECRET`.

## 10. Optional next step

Once the basic deployment works, the next improvement is:

- add a domain
- put Caddy or Nginx on the same instance for HTTPS

That keeps the stack cheap while avoiding plain HTTP.
