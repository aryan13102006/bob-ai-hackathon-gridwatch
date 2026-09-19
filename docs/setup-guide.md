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

## Submission

Fill team identity in submission.yaml, upload a 3–5 minute demo and put the accessible URL in demo/demo-video-link.txt. Create a public repository using the official template, copy this project into it without modifying `.github/workflows/validate.yml`, push, verify the action and submit the URL through the organiser's form. Do not claim submission is complete while these remain pending.
