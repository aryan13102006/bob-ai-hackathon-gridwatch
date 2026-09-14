# Vercel frontend and Render API

Deployment configuration is prepared. A configuration file is not proof of a live deployment; verified URLs belong in `demo/live-demo-url.txt` after deployment.

## Accounts and repository

Use the Aryan Chanpa account selected by the project owner. Create one **public** repository using **Use this template**, not Fork, from https://github.com/drijesh-ppatel/bob-ai-hackathon-submission-template. Name it `bob-ai-hackathon-<team-name>`. Keep the template's `CONTRIBUTING.md` and `.github/workflows/validate.yml` unchanged. Push the project files to that repository; never push `.env`, local dependency folders, generated build output or machine-specific Bob configuration.

## 1. Render backend

Connect the repository and create a Blueprint using the root `render.yaml`, or use these identical Web Service settings:

| Setting | Value |
| --- | --- |
| Runtime | Python |
| Root directory | Repository root (leave blank) |
| Plan | Free |
| Python | `3.12.8` |
| Build | `pip install -r src/requirements-render.txt && python src/download_data.py && python src/train.py` |
| Start | `gunicorn --chdir src wsgi:application --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 120 --access-logfile -` |
| Health check | `/api/health` |
| Environment | `OPENBLAS_NUM_THREADS=1`, `OMP_NUM_THREADS=1` |

Render supplies `PORT`. Models are trained within the build using pinned package versions and the seeded simulator. No model download from an untrusted source and no API key are needed. Only read-only JSON endpoints are exposed by the WSGI adapter. IBM Bob's stdio MCP server continues to run locally.

Wait for a successful deploy, then visit the service's real `/api/health` URL. It must return `status: ok` and `models_loaded: true`. Also test `/api/analyze?wind=85&rain=65&crews=3`, `/api/metrics`, and `/api/forecast`.

## 2. Vercel frontend

Import the same GitHub repository into Vercel:

| Setting | Value |
| --- | --- |
| Framework preset | Other |
| Root directory | Repository root |
| Build | `npm run build` |
| Output directory | `dist` |
| Environment | `GRIDWATCH_API_URL` = actual Render HTTPS origin, without a path |

Set the variable for Production and Preview. The build emits Vercel Build Output API configuration into `.vercel/output`, containing static files and an external `/api/*` route to Render. The browser calls its own Vercel origin; no wildcard CORS policy is required. The build fails if the backend origin is missing or malformed.

After Vercel reports Ready, open the public production URL without signing in. Confirm default results, the storm scenario, six-crew planning, model evidence, asset details, and plan export. A free Render service can take time to wake after inactivity; the UI provides a retry message. Use the observed URLs, never example addresses, in submission metadata and the README.

## Verification and release

`Backend tests` trains both models on a fresh GitHub runner, checks the local API, production WSGI routes, MCP protocol, and frontend build. `Validate Submission` is the original organizer workflow and can only pass meaningfully once real team information and a demo-video URL are supplied. `python src/check_submission.py` performs additional local checks without changing that workflow.

Sources: [Render web services](https://render.com/docs/web-services), [Render Blueprints](https://render.com/docs/blueprint-spec), [Vercel Build Output configuration](https://vercel.com/docs/build-output-api/configuration).
