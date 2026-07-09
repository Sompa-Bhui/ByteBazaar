# ByteBazaar

ByteBazaar is a developer-focused marketplace for building complete tech workspaces.

## What Makes It Different

- Marketplace browsing for developer gear
- Explainable Build Lab for compatibility and constraint reasoning
- Failure simulation, regret analysis, and transaction-backed fixes
- Revision history with undo, redo, and replayable proof

## Build Lab

The Build Lab models devices as a graph and explains:

- what is compatible
- what fails
- what should be fixed
- what is likely to become expensive later

Architecture notes: [docs/build-lab-architecture.md](docs/build-lab-architecture.md)

Recruiter demo script: [docs/recruiter-demo.md](docs/recruiter-demo.md)

## Local Setup

1. Copy environment variables:

```bash
copy .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Run the app:

```bash
npm run dev
```

4. Validate Build Lab:

```bash
npm run test:build-lab
npm exec tsc --noEmit
npx eslint src
npm run build
```

## Screenshots

Screenshots not included yet. Add them here when real captures are available.

