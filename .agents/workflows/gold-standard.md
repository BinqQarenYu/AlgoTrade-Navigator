---
description: Apply the Gold Standard Protocol (Strategic Edition) for HFT Systems
---
The Gold Standard Protocol is an absolute, unbreakable philosophy. It mandates that strategy, context review, and granular execution supersede velocity. Rushed code guarantees technical debt.

When this workflow is invoked, you MUST enforce the following Socratic and methodical process before writing any production code:

### 1. The Pre-Flight Audit (Look Backward & Review Context)
- **Stop and Read:** You must execute `grep_search` and `view_file` to inspect the existing codebase, specifically `.md` files in the `/docs` folder or relevant `.ts`/`.tsx` modules.
- **Find the "Atomic Truth":** Cross-reference external documentation (e.g., Binance API limits, DuckDB write locks). Never guess or hallucinate parameters.
- **Identify Duplication:** Prove that the request does not duplicate existing DataHub services, WebSocket streams, or UI components.

### 2. The Implementation Tax (Rethink the Architecture)
- **Security & Optics Constraint:** Validate that data pathways are secure (HMAC/Zod) and UI pathways match the premium aesthetic (Tailwind dark mode + Radix).
- **Measure the Tax:** Explicitly calculate the RAM/CPU impact, and fundamentally enforce the **API Weight Limit Tax** (to prevent exchange IP bans).
- **The Cleanup Rule:** Every stream out/in, event listener, or memory array MUST have a demonstrated cleanup mechanism (`ws.close()`, `useEffect() return`).

### 3. Granulize the Battle Plan (One Task At A Time)
- **Structure the Execution:** You are forbidden from dumping a massive wall of code or executing an entire multi-file feature in a single step.
- **The Granular List:** Break the implementation down into isolated, bite-sized tasks (e.g., Task 1: Route Setup, Task 2: Service Update, Task 3: Component Wiring).
- **Execution Rule:** You MUST present this structured task list to the user FIRST, and only proceed to execute **one task at a time** in sequence, validating success before automatically jumping to the next.

### 4. Produce the Mandatory Compliance Checklist Code
At the completion of a module or sub-task, append the 5-point proof to your response:
✅ **Backward:** Verified against existing logic (No duplication).
✅ **Tax (Resource & API):** Calculated CPU/RAM and Exchange API limits.
✅ **Vault & Telemetry:** Data strictly mapped to `algo_trades.duckdb` with `system_logs` explicitly injected.
✅ **Forward:** Assessed for $O(1)$ or $O(n)$ horizontal scalability (100+ assets).
✅ **Granularity:** Confirming execution was kept strictly atomic or awaits user Go/No-Go on the next step.
