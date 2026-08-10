# Graph Report - .  (2026-08-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 184 nodes · 179 edges · 22 communities (19 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `24ae9f2a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- dependencies
- components.json
- compilerOptions
- card.tsx
- env.ts
- scripts
- layout.tsx
- include
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `scripts` - 8 edges
3. `include` - 7 edges
4. `tailwind` - 6 edges
5. `aliases` - 6 edges
6. `env` - 6 edges
7. `cn()` - 6 edges
8. `lib` - 4 edges
9. `engines` - 2 edges
10. `@aws-sdk/client-s3` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (22 total, 3 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.06
Nodes (33): clsx, dotenv, eslint, eslint-config-next, happy-dom, jsdom, devDependencies, clsx (+25 more)

### Community 1 - "dependencies"
Cohesion: 0.08
Nodes (25): @aws-sdk/client-s3, class-variance-authority, framer-motion, next, next-themes, dependencies, @aws-sdk/client-s3, class-variance-authority (+17 more)

### Community 2 - "components.json"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+10 more)

### Community 3 - "compilerOptions"
Cohesion: 0.11
Nodes (19): dom, dom.iterable, esnext, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules (+11 more)

### Community 4 - "card.tsx"
Cohesion: 0.15
Nodes (11): Button, ButtonProps, buttonVariants, Card, CardContent, CardDescription, CardFooter, CardHeader (+3 more)

### Community 5 - "env.ts"
Cohesion: 0.20
Nodes (8): env, publicEnv, serverEnvSchema, createSupabaseServerClient(), getSession(), r2, R2_BUCKET, supabaseServer

### Community 6 - "scripts"
Cohesion: 0.14
Nodes (13): engines, node, name, private, scripts, build, dev, lint (+5 more)

### Community 7 - "layout.tsx"
Cohesion: 0.22
Nodes (7): body, display, heading, metadata, mono, MotionProvider(), ThemeProvider()

### Community 8 - "include"
Cohesion: 0.20
Nodes (9): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx, exclude (+1 more)

## Knowledge Gaps
- **101 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `scripts`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `components.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._