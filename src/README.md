# Source layout

download_data.py fetches original data and template metadata. train.py trains both benchmarks. engine.py supplies scenario analysis and planning. server.py serves web/. mcp_server.py exposes the same engine to Bob. configure_bob.py writes machine-local configuration. test_system.py and test_mcp.py verify behaviour and the MCP protocol.

`wsgi.py` is the read-only Render deployment adapter, served by Gunicorn. `test_wsgi.py` checks this adapter against the trained model. `build_frontend.mjs` copies `web/` into a Vercel Build Output deployment with an API proxy configured by `GRIDWATCH_API_URL`. `requirements-core.txt` pins model dependencies; `requirements.txt` adds local MCP support; `requirements-render.txt` adds Gunicorn. See `docs/deployment.md`.
