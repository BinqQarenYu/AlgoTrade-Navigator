---
description: Apply the Gold Standard Protocol v2.0 for HFT systems (Jules Role)
---

1. Execute the Pre-Flight Audit (Look Backward)
   - Ensure the request does not duplicate existing DataHub services (WebSockets or fetchers).
   - Ensure you read `.md` files in the `/docs` folder related to the Focus Topic context.
   - Ignore all UI/UX logic if focused on Data; and ignore all Data logic if focused on UI.

2. Estimate the Implementation Tax (Rethink)
   - State the estimated RAM/CPU impact (Resource Tax).
   - Enforce the Cleanup Rule: ensure every useEffect, EventListener, or Stream has an explicit cleanup.
   - Enforce Performance Guards: standard DOM nodes are prohibited for 100+ ticks/sec (must use React.memo, Refs, or Canvas).

3. Enforce the Simulation Integrity (Look Forward)
   - Align to Vault: ensure new data points map to DuckDB (`algo_trades.duckdb`) for AI backtests.
   - Verify scaling logic supports the PriorityList growing to 100+ assets (O(1) or O(n) complexity).

4. Produce the Mandatory Compliance Checklist Code
   - At the end of the response, append the 4-point proof:
     ✅ Backward: Verified against [Insert Doc Section].
     ✅ Memory: No leaks; cleanup logic provided.
     ✅ Integrity: Data piped to Vault (DuckDB) for AI Research.
     ✅ Forward: Scale-ready architecture (O(1) or O(n) complexity).
