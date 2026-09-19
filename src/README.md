# Source layout

download_data.py fetches original data and template metadata. train.py trains both benchmarks. engine.py supplies scenario analysis and planning. server.py serves web/. mcp_server.py exposes the same engine to Bob. configure_bob.py writes machine-local configuration. test_system.py and test_mcp.py verify behaviour and the MCP protocol.
