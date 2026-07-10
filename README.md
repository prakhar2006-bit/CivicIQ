# CivicIQ — Autonomous Civic Incident Intelligence System

> **Tagline:** "Different complaints. One hidden signal."  
> **Framing Line:** "Cities don't have a shortage of complaints. They have a shortage of intelligence connecting those complaints."

CivicIQ is a multi-agent system designed for municipal operators and citizens to detect, analyze, prioritize, and verify civic infrastructure incidents. By correlating geographical and temporal proximity of independent citizen reports, CivicIQ identifies cascading root-cause failures (e.g., water pipe burst weakening a road base to form potholes that pool water into traffic-blocking waterlogging), automatically assigns resolving departments in sequence, and verifies resolution outcomes with automated GPS and image validation.

---

## 🛠️ Multi-Agent Architecture

CivicIQ operates via a coordinated pipeline of ten specialized backend agents.

| Agent | Responsibility | Core Logic |
| :--- | :--- | :--- |
| **Perception Agent** | Analyzes photos and text description to detect issue type, severity, and confidence. | Deterministic image lookup table + LLM descriptive evidence synthesis. |
| **Clustering Agent** | Finds geographically and temporally related reports. | Pure Python Haversine distance (<180m) and time window (<7 days) math. |
| **Incident Detection Agent** | Analyzes the cluster to determine classification. | Rules: `INDEPENDENT` / `DUPLICATE` / `POSSIBLE_CONNECTED` / `HIGH_CONFIDENCE_CONNECTED` + LLM narrative reasoning. |
| **Root-Cause Agent** | Traces causal connections between multiple issues. | Walks dependency graph (`civic_dependencies.json`) + LLM explaining the cascade hypothesis. |
| **Civic Impact Agent** | Scores real-world public threat severity (0-100). | Weighted formula (Severity 30%, Proximity 20%, Impacted 15%, Duration 10%, Repeats 10%, Risks 15%) + LLM explanation. |
| **Response Agent** | Designates multi-department resolution steps. | Topological sort matching department roles and execution dependencies (`departments.json`). |
| **Filing Agent** | Generates formal, traceable municipal filings. | Generates `FILE-[INC_ID]` context clearly marked as simulated. |
| **Escalation Agent** | Tracks SLA deadlines and alerts management. | State machine transitioner checking deadlines + demo-time traveler. |
| **Verification Agent** | Validates resolution claims via photographic/GPS proof. | Location threshold checking (<100m) + new incoming complaints monitor. |
| **Orchestrator** | Coordinates state transitions of `IncidentContext`. | Writes and persists updates to shared state `incidents.json`. |

---

## 🚀 Setup & Execution

### Prerequisites
- Python 3.10+
- Node.js 18+
- Anthropic API Key (Optional. If not set, system automatically falls back to deterministic mock narratives for 100% stable presentation/offline mode).

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows
.\venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the root folder (or `backend/` folder) containing:
```env
ANTHROPIC_API_KEY=your_api_key_here
```

Generate seed data:
```bash
python -m backend.scripts.seed_data
```

Start the FastAPI server:
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup
Open a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173`.

---

## 🎯 Rehearsed Live Demo Script

Follow this script step-by-step for a successful demonstration:

1. **Submit Initial Report**: Go to the **Submit Report** page. Select the seed image **`leak_01.jpg`** (Water Leakage near Chakala Junction). Click **Submit Complaint Report**.
2. **Launch Agent Analysis**: Click **Go to Dashboard and Analyze**.
3. **Analyze Pipeline**: On the Dashboard, find `CIV-2026-1001` in the *Citizen Reports Feed*. Click **Run Agentic AI**. The live *Agent Pipeline* will animate through the 7 stages of perception, clustering (finding 6 related complaints), detection, root cause, impact, response, and filing.
4. **Inspect Root Cause & Priority**:
   - The Root Cause card displays the cascade hypothesis with the required disclaimer: **"AI-generated civic incident hypothesis. Physical inspection recommended."**
   - The Civic Impact gauge displays **CRITICAL** (88/100) priority.
5. **Approve Multi-Department Plan**: Scroll down to the *Response Plan*. Inspect the sequenced steps (Water Board first, then Drainage, and Roads Department last). Click **Approve Multi-Department Plan** to transition status to `ACTION_IN_PROGRESS`.
6. **Submit Mismatched Resolution (Beat 1)**: In the *Resolution Verification* card, select **`resolved_leak_wrong.jpg`** (a garbage overflow image) and click **Submit and Verify**. The Verification Agent returns **`LOCATION_MISMATCH`** with a low confidence score, refusing to close the ticket.
7. **Submit Correct Resolution (Beat 2)**: Select **`resolved_leak_correct.jpg`** (dry patched road at Chakala) and click **Submit and Verify**. The Verification Agent confirms **`RESOLUTION_VERIFIED`** and transitions status to **RESOLVED**, reducing impact level to **LOW**.
8. **Advance SLA Escalation**: Go to another scenario or reset. Advance time by clicking **Advance Time (+3 Days)** to trigger the SLA monitor. Notice the incident status changing to **ESCALATED** with a detailed SLA breach notification.

---

## ⚖️ MVP vs Stretch Scope

- **Vision Core (MVP):** Swapped live vision models for deterministic lookups for issue categories to ensure zero demo latency and 100% stable presentation, while utilizing Claude to synthesize evidence text on top.
- **Hindi Localization (Stretch):** Cut for time to focus on solid multi-agent coordination visuals.
- **Full Escalation Ladder (Stretch):** Replaced with a single-tier manager alert system.

*Disclaimer: Fictional demonstration system. Fictional city wards. Synthetic citizen data.*
