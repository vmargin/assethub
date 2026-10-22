# Architecture execution evidence

AssetHub project fallback using @babel/parser; not native Sauron graph

Parsed 19 JavaScript/JSX modules; 41 internal dependency edges; 22 external import references.
Detected 0 cycle paths, 0 unresolved relative imports and 0 frontend/backend boundary violations.

| Module | Lines | Imports | Imported by |
| --- | ---: | ---: | ---: |
| frontend/src/App.jsx | 1079 | 9 | 1 |
| frontend/src/components/UI.jsx | 248 | 2 | 5 |
| frontend/src/pages/AssetsPage.jsx | 1098 | 6 | 1 |
| backend/src/server.js | 146 | 5 | 1 |
| frontend/src/components/Icon.jsx | 141 | 0 | 6 |
| frontend/src/pages/Operations.jsx | 1521 | 5 | 1 |
| frontend/src/lib/format.js | 55 | 0 | 5 |
| frontend/src/pages/Dashboard.jsx | 428 | 4 | 1 |
| backend/src/db/prisma.js | 12 | 0 | 4 |
| frontend/src/api/client.js | 75 | 0 | 4 |
| frontend/src/pages/Access.jsx | 434 | 3 | 1 |
| backend/src/controllers/authController.js | 579 | 2 | 1 |
| backend/src/controllers/workspaceController.js | 1255 | 2 | 1 |
| backend/src/lib/api.js | 217 | 0 | 3 |
| frontend/src/components/AssetVisual.jsx | 186 | 0 | 3 |
| backend/src/middleware/auth.js | 81 | 1 | 1 |
| frontend/src/lib/csv.js | 56 | 0 | 2 |
| api/index.js | 2 | 1 | 0 |
| frontend/src/main.jsx | 11 | 1 | 0 |

Static import/require edges are analyzed without executing product code. Dynamic computed imports, runtime behavior, SQL relations, unused exports and CSS rules are outside this analysis.
Large modules are review candidates, not proof that a rewrite is needed. Existing controller/UI architecture is preserved.
