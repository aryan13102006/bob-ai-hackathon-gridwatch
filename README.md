# GridWatch

U1: Power Outage Prediction & Grid Equipment Failure Advisor.

GridWatch is a working local prototype for utility operators. It combines a trained synthetic failure model with weather scenarios, asset impact ranking and crew planning. A separate model forecasts real ETT transformer oil temperature 24 hours ahead.

## Run

Python 3.12 is recommended. From this repository:

```sh
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r src/requirements.txt
python src/download_data.py
python src/train.py
python src/test_system.py
python src/server.py
```

Open http://127.0.0.1:8765. Full instructions: [setup guide](docs/setup-guide.md).

## Implemented features

- Real ETTh1 24-hour temperature forecasting with temporal holdout, validation-only model selection and persistence comparison.
- Synthetic 24-hour failure probabilities from sensors, scenario weather and past incidents, compared with a threshold baseline.
- Interactive asset schematic, equipment evidence and area exposure estimates.
- Skill- and capacity-constrained maintenance queue, crew staging and JSON export.
- IBM Bob MCP tools that call the same prediction and planning engine.

## Team

Team: **GridWatch**. Track: **AI**. Team lead: **Vivaa Rathod**. Deployment account and submission contact: **Aryan Chanpa** (`aryanchanpa13@gmail.com`).

## Stack

Python, pandas, NumPy, scikit-learn, MCP Python SDK, WSGI/Gunicorn, HTML/CSS/JavaScript. Deployment targets Vercel for the frontend and Render for the API. IBM Bob connects through a local MCP server. No watsonx integration is claimed.

## Evidence and limitations

See [model card](docs/model-card.md) and the exact machine-readable results in models/metrics.json. The ETT dataset has no outage labels. The failure model and fictional network use simulated data; their metrics do not establish real-world outage reliability. Simulated event prevalence is deliberately high for a visible demonstration. Temperature forecasting and failure prediction are separate models, not a validated fused predictor. Weather is an editable scenario, not a live feed. The planning heuristic does not run power flow, optimize routes or dispatch crews.

## Demo

Try the [live GridWatch dashboard](https://bob-ai-hackathon-gridwatch.vercel.app), watch the [3:39 demo video](https://drive.google.com/file/d/1-yf0U2vGf3dx34Y51KUTEjr7xrzHY-0V/view?usp=drive_link), follow the [demo script](demo/demo-script.md), and inspect [screenshots](demo/screenshots/) and the [final eight-slide presentation](presentation/gridwatch_u1_submission.pptx). The same deck is also stored at the template-compatible path `presentation/slides.pptx`. The [Render API health endpoint](https://bob-ai-hackathon-gridwatch.onrender.com/api/health) exposes backend status.

## Deployment

The frontend is deployed on Vercel and the API is deployed on Render. See the [deployment guide](docs/deployment.md) for the exact settings and [submission status](docs/submission-status.md) for the remaining submission steps. The original organizer validator is preserved; a separate Backend tests workflow verifies model training and serving on a clean runner.

## What we are most proud of

The application exposes measured baseline comparisons, temporal boundaries, uncertain evidence and unassigned jobs. Its useful output is an inspectable plan rather than unsupported claims of prevented blackouts.
