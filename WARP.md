# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository status
- As of 2025-09-25, no common build/test/lint configuration files (e.g., package.json, pyproject.toml, Makefile, go.mod, Cargo.toml, *.sln) were found in this repository. The commands below are conditional: adopt the section that matches the tooling you add.

Commands (detect and use based on what’s present)

Package manager preference for Node.js
- If pnpm-lock.yaml exists, use pnpm; if yarn.lock exists, use yarn; if package-lock.json exists, use npm.

Node.js/TypeScript (if package.json exists)
- Install dependencies
```bash path=null start=null
npm ci
# or: pnpm install
# or: yarn install
```
- Build
```bash path=null start=null
npm run build
# or: pnpm build
# or: yarn build
```
- Lint
```bash path=null start=null
npm run lint
# If no script: npx eslint .
```
- Test (all)
```bash path=null start=null
npm test
# or: pnpm test
# or: yarn test
```
- Test (single)
```bash path=null start=null
# Jest
npx jest path/to/file.test.ts -t "Test name substring"
# Vitest
npx vitest run path/to/file.test.ts -t "Test name substring"
```

Python (if pyproject.toml / requirements*.txt exists)
- Create/activate venv (PowerShell)
```bash path=null start=null
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
```
- Install
```bash path=null start=null
# pyproject + poetry
poetry install
# or: requirements.txt
python -m pip install -U pip
python -m pip install -r requirements.txt
```
- Lint/format (common)
```bash path=null start=null
# Ruff (if configured)
python -m ruff check .
# Black (if configured)
python -m black --check .
```
- Test (all) and single
```bash path=null start=null
# All tests
python -m pytest -q
# Single file / test
python -m pytest tests/path/test_example.py -k "test_name_substring"
```

.NET (if *.sln or *.csproj exists)
- Restore, build, test
```bash path=null start=null
dotnet restore
dotnet build --configuration Release
dotnet test --configuration Release --no-build
```
- Lint/format (if configured)
```bash path=null start=null
# Requires dotnet-format or analyzers configured in the solution
dotnet format
```
- Test (single)
```bash path=null start=null
# By fully qualified name or trait
dotnet test --filter "FullyQualifiedName~Namespace.ClassName.TestMethod"
```

Go (if go.mod exists)
```bash path=null start=null
# Build
go build ./...
# Lint (if golangci-lint is configured)
golangci-lint run
# Test (all)
go test ./...
# Test (single) by regex
go test ./pkg/yourpkg -run TestName
```

Rust (if Cargo.toml exists)
```bash path=null start=null
# Build
cargo build --release
# Lint
a) cargo clippy -- -D warnings
b) cargo fmt -- --check
# Test (all)
cargo test
# Test (single)
cargo test name_substring
```

Makefile (if Makefile exists)
```bash path=null start=null
# Discover tasks
make help
# Common targets (project-specific)
make build
make lint
make test
```

Docker (if Dockerfile or docker-compose*.yml exists)
```bash path=null start=null
# Build image
docker build -t your-image:dev .
# Run tests in container (example)
docker run --rm your-image:dev npm test
# Compose
docker compose up -d --build
```

High-level architecture and structure
- No architecture files were detected yet. When code is added, summarize the big picture by reading the following, if present:
  - Monorepos: package.json (workspaces), pnpm-workspace.yaml, turbo.json, nx.json
  - Python: pyproject.toml (tool sections for package layout), src/ and tests/ structure
  - .NET: *.sln to map projects; *.csproj for output types (Exe/Library) and references; Directory.Build.*
  - Go: go.work/go.mod to map modules; cmd/ (apps) and pkg/internal (libs)
  - Rust: Cargo.toml/Cargo.lock for workspace members and crates
  - Containers/ops: Dockerfile, docker-compose*.yml, .github/workflows/*.yml
- Produce a concise overview:
  - Identify apps/services vs. shared libraries; call out cross-cutting concerns (auth, config, logging, persistence).
  - Note how components communicate (direct imports, HTTP/gRPC, messaging) and where interfaces/DTOs live.
  - Point to the primary entrypoints (e.g., src/main.ts, Program.cs, cmd/<app>/main.go) and composition roots.

Integration with other AI rules/docs
- No CLAUDE.md, Cursor rules, Copilot instructions, or README.md were found. If any are added later, incorporate their important constraints in this section (naming conventions, code style, architectural rules, generation boundaries).

Maintenance
- Update the Commands section when build/lint/test tooling is introduced.
- Add an Architecture summary once the first application and library modules are committed.
