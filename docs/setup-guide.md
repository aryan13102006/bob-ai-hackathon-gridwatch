# Setup guide

## Prerequisites

Python 3.12, network access for package installation and the public ETT download, and a modern browser. IBM Bob is optional for the dashboard but required to demonstrate its MCP workflow. No API keys are used.

## Fresh installation

Run all commands from the repository root:

```sh
python -m venv .venv
```

Activate `.venv\Scripts\activate` on Windows, or `source .venv/bin/activate` on macOS/Linux. Then:

```sh
python -m pip install -r src/requirements.txt
python src/download_data.py
python src/train.py
python src/test_system.py
python src/test_wsgi.py
python src/server.py
```

Visit http://127.0.0.1:8765. Click Storm scenario, inspect an asset, inspect unassigned maintenance jobs, and review the two model benchmarks. `python src/server.py --port 8766` selects another port.

Training generates models locally. Do not copy joblib files from strangers. The downloader preserves existing submission metadata and validator files. ETT downloads include SHA-256 provenance and the source license.

## Existing Codex workspace

This workspace has a local `.deps` directory. `src/bootstrap.py` loads it automatically. The bundled Python used here is `C:/Users/aryan/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`. A normal clean clone should use the virtual environment procedure above.

## IBM Bob

```sh
python src/configure_bob.py
python src/test_mcp.py
```

The first command writes local absolute paths to `.bob/mcp.json`, preserving other configured servers. Open the repository in Bob, sign in, enable MCP servers and inspect GridWatch's tools. Request the prompt in `demo/bob-prompts.md`. This uses project-level stdio configuration documented at https://bob.ibm.com/docs/ide/configuration/mcp/mcp-in-bob.

## Troubleshooting

| Symptom | Resolution |
|---|---|
| Missing scikit-learn or MCP | Activate the environment and install src/requirements.txt |
| Missing model artifact | Run the downloader, then src/train.py |
| Download blocked | Allow access to PyPI and raw.githubusercontent.com |
| Port occupied | Add --port 8766 and use that port in the browser |
| Bob cannot start Python | Regenerate its configuration using the correct environment's Python |
| DLL access denied in a restricted runner | Run the same command in a permitted local terminal |

## Hosted demo

Use [deployment guide](deployment.md) for Render and Vercel. The public API uses `src/wsgi.py` with Gunicorn; keep `src/server.py` for localhost development. Vercel requires `GRIDWATCH_API_URL` at build time. No environment variable is required for the local dashboard, and `.env` files are not loaded automatically. All supported configuration is documented in `src/.env.example`.

## Submission readiness

Team identity, the 3:39 demo link, public repository, live services and presentation are complete. The organizer workflow remains unchanged. Before final entry, confirm the Google Drive video is available to anyone with the link, verify the IBM Bob demonstration, and submit the repository URL through the organiser's form.
