# Verification record

Verified locally on 13 September 2026 using Python 3.12, NumPy 2.5.3, pandas 3.0.1, scikit-learn 1.9.1 and MCP 1.30.0.

- Training completed for both models. Exact results and split dates: models/metrics.json.
- Six system tests passed: HTTP/static routes and path isolation, temporal feature/split boundaries, input validation, priority/exposure consistency, crew skill/capacity and storm response.
- MCP protocol test passed: initialize, list tools, invoke both tools, and invalid-input error. On this restricted Windows runner the test required an unrestricted process to load pywin32 dependencies. This is not verification of a signed-in IBM Bob UI session.
- Browser check: baseline has six alerts and two unassigned jobs. Storm at 85 km/h wind and 65 mm rain has ten alerts and six unassigned jobs with three crews. Six crews leave one unassigned job. Equipment details and model metrics render correctly.
- Three screenshots captured from the running application.
- Six-slide PPTX passed package, geometry/font-policy and reimport checks; all slide previews inspected. Native PowerPoint application opening was not tested.

Pending: a clean-machine installation, signed-in Bob demonstration, hosted video, team identity, public GitHub repository and submission. The original upstream GitHub validator is preserved, but no GitHub Actions run is claimed. Required identity fields remain blank so validation must not be reported as complete.
