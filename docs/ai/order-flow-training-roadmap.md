# BOFI (Bayesian Order Flow Intelligence) Roadmap

## Phase 1: High-Fidelity Data Ingress (The RAG Prep)
To build the most powerful AI for scalping/trading, we must treat **Order Flow** as a multi-dimensional time series.

### 1.1 Vectorization Strategy
We will vectorize each 5-minute window into a "Microstructure Feature Vector":
- **Entropy Pulse**: Shannon entropy of order sizes (Chaos vs Structure).
- **Imbalance Delta**: Net difference between aggressive buying/selling.
- **Toxicity (VPIN)**: informed vs uninformed flow ratio.
- **Whale Fingerprint**: Large block detections and their impact on subsequent delta.

### 1.2 Confluence Attribution
The AI won't just look at flow. It will weight the flow against:
- **Major S/R Zones**.
- **Social Sentiment Divergence**.
- **Funding Rate Pressure**.

---

## Phase 2: The Bayesian Feedback Loop (Log -> Learn)
"We guess, if it fails, log, use as Bayesian until improved."

### 2.1 The Failure Log (The "Why")
When a signal (e.g., "Whale Long Ignition") is generated but price drops 0.5% in 5 mins:
1. **Snap History**: Save the last 100 prints before the failure.
2. **Tag Metadata**: "Failed: Absorption detected too late" or "Failed: Chaos spiked during entry".
3. **Outcome attribution**: Label the vector as a "Negative Sample".

### 2.2 Bayesian Posterior Update
As failures accrue, our AI's "Confidence" in specific patterns (like Spoof shadows) will adjust dynamically.
- **Prior Belief**: "Large orders near price = Breakout."
- **Evidence**: "Multiple large orders were cancelled (Spoofing) leading to price reversal."
- **Posterior Belief**: "Large orders near price in high Chaos = Fake/Spoof. STAY FLAT."

---

## Phase 3: Multi-Horizon Training
We train three distinct global weights:
1. **SCALPER (5-Min)**: High sensitivity to Imbalance and Toxic Traps.
2. **SHORT-TERM (1-Hr)**: Sensitivity to persistent VPIN trends and Liquidity Sweeps.
3. **LONG-TERM (Daily)**: Sensitivity to massive Whale Accumulation/Distribution patterns.

---

## Execution Checklist for Next Step
- [ ] Implement `api/ai/log-outcome` to store results of signals.
- [ ] Connect the AI Research module to the Order Flow DuckDB table.
- [ ] Refine the "Confluence Pulse" on the dashboard to show AI-Confidence percentages.
