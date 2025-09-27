# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Monorepo with a Laravel 12 backend in backend/ and a React + Vite SPA in frontend/.
- Primary flow: Quote -> Order -> Shipment -> Invoice. The backend exposes REST APIs consumed by the SPA. CORS preflight is enabled for development.
- Tech stack: PHP 8.2, Laravel 12, PHPUnit; Node + Vite + React 19; Tailwind (for Laravel asset pipeline).

Common commands

Backend (Laravel)
- First-time setup
  ```bash path=null start=null
  # from backend/
  composer install
  copy .env.example .env            # use: cp on macOS/Linux
  php artisan key:generate
  
  # configure DB in .env, then initialize schema + demo data
  php artisan migrate --seed
  ```
- Run dev services (HTTP, queue, logs, Vite for Laravel assets)
  ```bash path=null start=null
  # from backend/
  npm install                       # installs vite/concurrently used by the dev script
  composer run dev                  # serves API at http://127.0.0.1:8000
  ```
- Run tests
  ```bash path=null start=null
  # all tests (uses in-memory sqlite per phpunit.xml)
  composer test
  
  # single test class or name
  php artisan test --filter InvoiceController
  
  # single test file
  php artisan test tests/Feature/ExampleTest.php
  ```
- Database utilities
  ```bash path=null start=null
  php artisan migrate               # apply migrations
  php artisan migrate:fresh --seed  # rebuild schema + seed
  ```
- Lint/format (Laravel Pint)
  ```bash path=null start=null
  # from backend/
  vendor/bin/pint                   # add --test to check only
  ```

Frontend (React + Vite)
- First-time setup
  ```bash path=null start=null
  # from frontend/
  npm install
  ```
- Develop
  ```bash path=null start=null
  # serves SPA (default http://127.0.0.1:5173)
  npm run dev
  
  # optionally point the SPA to a non-default API
  # Windows PowerShell
  $env:VITE_API_BASE = "http://localhost:8000"
  npm run dev
  ```
- Build and preview
  ```bash path=null start=null
  npm run build
  npm run preview
  ```
- Lint
  ```bash path=null start=null
  npm run lint
  ```

Integration notes
- The SPA calls the backend via frontend/src/lib/api.js. API base URL is VITE_API_BASE (defaults to http://localhost:8000). Ensure the backend dev server is running on that port.
- Backend enables permissive CORS for development (see backend/routes/api.php Route::options). In production, tighten CORS appropriately.

High-level architecture

Backend (backend/)
- Routing: backend/routes/api.php defines REST endpoints for:
  - Auth: POST /api/auth/register, /api/auth/login
  - Quotes: calculate/store/index, convert-to-order
  - Orders: CRUD-like endpoints, item subresources
  - Shipments: list/show, create from order, status updates, public tracking /api/track/{trackingNumber}
  - Transport: list vehicles/assignments for selection
  - Driver-facing endpoints: login and shipment updates constrained by driver_id and transport assignment
  - Invoices: list/show/create, mark paid, overdue updates, dashboard metrics
  - Dashboard: /api/dashboard/metrics aggregates operational metrics
- Controllers: App/Http/Controllers/Api/* implement request validation and data shaping. They primarily use the DB facade for selective joins and computed fields, with targeted use of Eloquent models (Order, Shipment, Transport, Invoice). Notable behavior:
  - ShipmentController auto-generates invoices when a shipment reaches delivered status
  - InvoiceController exposes both CRUD and reporting-style endpoints, returning preformatted and summarized data for the SPA
  - QuoteController encapsulates pricing rules (distance, volumetric vs actual weight, destination multipliers, minimums, markup) and supports conversion to orders
- Models: App/Models/{Order,Shipment,Transport,Invoice,...} map to normalized tables using custom keys (e.g., order_id, shipment_id). Relationships expose Order->Shipment, Shipment->TrackingHistory, Shipment->Transport, etc.
- Data layer: database/migrations define schema; database/seeders/DatabaseSeeder seeds core demo data (users, schedules, budgets, transport, orders, shipments, tracking history, invoices) for a usable local environment.
- Asset pipeline: backend/vite.config.js integrates laravel-vite-plugin and Tailwind for blade-driven pages (separate from the SPA).

Frontend (frontend/)
- SPA structure: React + Vite with react-router-dom. Key areas include:
  - pages/app/*: business views (Dashboard, Orders, OrderDetail, Shipments, ShipmentDetail, Quotes, Invoices)
  - components/*: presentational and composite UI (e.g., TrackingWidget)
  - routes/RequireAuth.jsx: client-side gating for protected routes
  - lib/api.js: thin fetch wrapper exporting apiGet/apiPost/apiPatch/apiDelete and domain helpers (getShipments, trackShipment, etc.)
- Communication: The SPA consumes the backend’s JSON shapes as returned by controllers (already formatted/summarized for UI consumption: amounts in cents plus formatted strings, derived labels, counts, etc.).

Conventions and gotchas
- Ports: backend defaults to 8000 (php artisan serve); SPA defaults to 5173.
- Tests: phpunit.xml configures an in-memory sqlite database; tests won’t use your app’s configured DB.
- Seeding: DatabaseSeeder wires multiple seeders; use migrate:fresh --seed to restore a coherent demo dataset.
- Windows shell notes: Prefer PowerShell-style env var assignment when setting VITE_API_BASE during local runs.

Cross-references
- docs/LogiSync-Project-Documentation.md outlines the functional scope (shipment/dispatch coordination, fulfillment, quotes, reporting, warehouse, invoice generation, subscription plans) and the intended user roles (admin, head office manager, driver, clients via public tracking). Use it for domain context, not as a source of commands.
