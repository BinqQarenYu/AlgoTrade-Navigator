import sys
import json
import duckdb
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier
import tempfile
import os

# Ensure absolute path to duckdb
DB_PATH = sys.argv[1] if len(sys.argv) > 1 else 'algo_trades.duckdb'

def main():
    print(f"[ML-Engine] Booting Cognitive Models. Ingesting Parquet Snapshot: {DB_PATH}")
    
    try:
        # Instead of directly opening the locked VAULT, we open an in-memory duckdb
        # and read the parquet snapshot that Node.js safely exported for us!
        con = duckdb.connect(':memory:')
        
        # --- 1. Fetch Training Data ---
        print("[ML-Engine] Querying DataHub Snapshot...")
        
        # We need historical microstructure events to find hidden Market States
        micro_df = con.execute(f"SELECT * FROM read_parquet('{DB_PATH.replace(chr(92), '/')}')").fetchdf()
        
        if len(micro_df) < 50:
            print(json.dumps({"status": "insufficient_data", "rows": len(micro_df)}))
            sys.exit(0)
            
        # --- 2. Unsupervised Learning (Clustering) ---
        print("[ML-Engine] Initializing Unsupervised K-Means clustering...")
        
        # Feature Engineering: Extract mathematical weights from events
        # In a real scenario, we'd parse VPIN offsets and whale USD volumes from metadata
        features = pd.DataFrame()
        features['severity'] = micro_df['severity_score']
        # Map categorical event types to numerical weights for the algorithm
        event_dict = {'WHALE_TX': 1.0, 'LIQUIDATION': 1.5, 'SPOOF_CANCEL': 0.8, 'VPIN_SPIKE': 2.0}
        features['event_weight'] = micro_df['event_type'].map(lambda x: event_dict.get(x, 0.5))
        
        # Clean & Normalize
        features.fillna(0, inplace=True)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(features)
        
        # Train Unsupervised K-Means to find 4 hidden 'Market States'
        kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
        micro_df['ml_cluster_id'] = kmeans.fit_predict(X_scaled)
        
        # Generate Cluster Signatures (The 'Atomic Truth' of the state)
        clusters = []
        for i in range(4):
            cluster_subset = micro_df[micro_df['ml_cluster_id'] == i]
            # Name the cluster based on dominant characteristic
            dominant_event = cluster_subset['event_type'].mode()[0] if not cluster_subset.empty else "UNKNOWN"
            avg_severity = cluster_subset['severity_score'].mean() if not cluster_subset.empty else 0
            
            signature_name = f"State-{i}: "
            if dominant_event == 'VPIN_SPIKE' and avg_severity > 8:
                signature_name += "High Toxicity Distribution"
            elif dominant_event == 'LIQUIDATION':
                signature_name += "Cascade Liquidation"
            elif dominant_event == 'WHALE_TX':
                signature_name += "Institutional Absorption"
            else:
                signature_name += "Background Noise"
                
            clusters.append({
                "cluster_index": i,
                "signature": signature_name,
                "data_points": len(cluster_subset)
            })
            
        # --- 3. Return JSON to Node.js ---
        # Instead of writing to DB here (which would block Node), we stdout the JSON result.
        # Node.js captures stdout and writes safely to the Vault.
        
        result = {
            "status": "success",
            "model_version": "v1.0-kmeans",
            "rows_analyzed": len(micro_df),
            "clusters": clusters
        }
        
        print("\n--- ML_OUTPUT_START ---")
        print(json.dumps(result))
        print("--- ML_OUTPUT_END ---")
        
    except Exception as e:
        print("\n--- ML_OUTPUT_START ---")
        print(json.dumps({"error": str(e)}))
        print("--- ML_OUTPUT_END ---")
    finally:
        con.close()

if __name__ == "__main__":
    main()
