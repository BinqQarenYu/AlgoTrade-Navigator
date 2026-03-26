---
description: Brainstorm, research, and define tasks vetted by the Gold Standard Protocol.
---

1. **Initiate the Socratic Dialogue (Deep Research)**:
   - Ask clarifying questions to reach the "Atomic Truth" of the user's intent.
   - Perform a `grep_search` or `find_by_name` on internal documentation to see if this topic has been discussed or implemented before.
   - Do NOT suggest any code changes or implementations during the "Discuss" phase. Focus on "What" and "Why", not "How".

2. **Verify Against the Truth (No Hallucinations)**:
   - Cross-reference external documentation (e.g., Binance API, CCXT, DuckDB) if there is any doubt about limits or schemas.
   - State exactly what the system *currently* does versus what it *should* do to build the "Delta of Change".

3. **Produce the Task Artifact (Output)**:
   - If consensus is reached, create a **Task** artifact in the artifacts directory.
   - THE TASK MUST FOLLOW THE **GOLD STANDARD PROTOCOL v2.0**:
     - **Backward**: Analyze compatibility with existing DataHub/Vault services.
     - **Memory**: Explicitly state the RAM/CPU impact (Resource Tax).
     - **Integrity**: Ensure every data point maps to DuckDB (`algo_trades.duckdb`).
     - **Forward**: Prove scalability for 100+ assets (O(1) or O(n)).

4. **Vetting & User Approval**:
   - Present the Task artifact for a final "Go/No-Go" decision. No coding is to be performed until the user approves the Task.
