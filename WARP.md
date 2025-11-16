# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Monorepo with two apps:
  - backend: Laravel 12 API with Vite/Tailwind for asset bundling
  - frontend: React (Vite) SPA

Commands you’ll use most
Backend (Laravel)
- Install deps
  - composer install
  - npm ci
- First-time app setup
  - Copy env: copy .env.example .env (Windows) or cp .env.example .env (Unix)
  - php artisan key:generate
  - php artisan migrate
- Develop (runs web server, queue listener, logs, and Vite)
  - composer run dev
- Build frontend assets (for Laravel views/assets inside backend)
  - npm run build
- Test
  - All: composer run test or php artisan test
  - Single file: php artisan test tests/Feature/ExampleTest.php
  - Filter by name: php artisan test --filter YourTestOrMethodName
- Lint/format PHP (Laravel Pint)
  - vendor/bin/pint

Frontend (React/Vite)
- Install deps
  - npm ci
- Develop
  - npm run dev
- Lint
  - npm run lint
- Build
  - npm run build
- Preview production build
  - npm run preview

High-level architecture and where to work
Backend (backend/)
- Routing layers
  - routes/api.php exposes JSON REST endpoints; routes/web.php handles web routes. These route files map to controllers in app/Http/Controllers.
  - API controllers live under app/Http/Controllers/Api (e.g., AuthController, OrderController, ShipmentController, PricingController, QuoteController, TransportController, WarehouseController, InvoiceController, DashboardController, etc.). Add or extend endpoints here and register them in routes/api.php.
- Domain models and persistence
  - Eloquent models represent core entities (e.g., Order, Shipment, Quote, Warehouse, Transport, Invoice, Inventory, TrackingHistory, Notification, User) under app/Models. Business logic that belongs to entities should live here.
  - Database schema is defined via migrations in database/migrations. When changing data structures, add a new timestamped migration; run php artisan migrate.
  - Database seeding lives in database/seeders (DatabaseSeeder.php, SubscriptionPlansSeeder.php) for initial/test data.
- Cross-cutting concerns
  - Middleware app/Http/Middleware/CheckRole.php provides role-based access control. Attach it to routes/groups when gating API access.
  - Events app/Events (OrderStatusUpdated, ShipmentStatusUpdated, TestAblyConnection) support real-time or async workflows. If you add event-driven features, define events/listeners and wire them per Laravel conventions.
- Configuration and bootstrapping
  - config/*.php holds app, auth, queue, mail, services, etc.; use these for environment-dependent settings.
  - Service providers under app/Providers (e.g., AppServiceProvider.php) are the place to register bindings and boot logic.
- Testing
  - PHPUnit is configured via phpunit.xml. Tests live under tests/Feature and tests/Unit. Use php artisan test; leverage the in-memory sqlite configuration defined in phpunit.xml for fast tests.
- Asset pipeline for Laravel views
  - Vite is configured in vite.config.js with laravel-vite-plugin and Tailwind. The inputs are resources/css/app.css and resources/js/app.js. Use npm run build for production assets.
- Local dev utility script
  - composer run dev concurrently launches: php artisan serve, queue:listen, log tailing (pail), and Vite.

Frontend (frontend/)
- App structure
  - React SPA built with Vite. Pages under src/pages (e.g., PaymentSuccess; app/ subfolder includes ManageSubscription, SubscriptionManagement, WarehouseInventory, ShipmentDetail variants). A shared component (components/Toast.jsx) exists.
  - Routing handled by react-router-dom.
  - Real-time and mapping capabilities provided by ably and react-leaflet/leaflet.
- Tooling
  - ESLint flat config in eslint.config.js; run npm run lint.
  - Environment files .env and .env.production control runtime settings for dev/production.
  - Build/serve with the standard Vite scripts (dev/build/preview).

Notes for changes spanning both apps
- Backend-first API changes require:
  - Adding/updating routes in routes/api.php
  - Implementing logic in the relevant controller under app/Http/Controllers/Api and the corresponding Eloquent model(s)
  - Updating/adding migrations and running php artisan migrate
  - Adjusting config/*.php if new external services or settings are introduced
- Frontend integration typically involves:
  - Adding or updating pages/components under src/pages or src/components
  - Calling the backend REST endpoints from the frontend (e.g., via fetch/axios in the frontend app)
  - Updating client-side routing and environment variables as needed

CI/CD and deployment hints
- Nixpacks manifests are present for both apps (backend/nixpacks.toml and frontend/nixpacks.toml) showing expected build and start commands for deployments.
