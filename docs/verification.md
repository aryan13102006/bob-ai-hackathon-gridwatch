# Verification record

Verified locally and in GitHub Actions through 15 September 2026 using Python 3.12, NumPy 2.5.3, pandas 3.0.1, scikit-learn 1.9.1 and MCP 1.30.0.

- Training completed for both models. Exact results and split dates: models/metrics.json.
- Six system tests passed: HTTP/static routes and path isolation, temporal feature/split boundaries, input validation, priority/exposure consistency, crew skill/capacity and storm response.
- MCP protocol test passed: initialize, list tools, invoke both tools, and invalid-input error. On this restricted Windows runner the test required an unrestricted process to load pywin32 dependencies. This is not verification of a signed-in IBM Bob UI session.
- Browser check: baseline has six alerts and two unassigned jobs. Storm at 85 km/h wind and 65 mm rain has ten alerts and six unassigned jobs with three crews. Six crews leave one unassigned job. Equipment details and model metrics render correctly.
- Three screenshots captured from the running application.
- The final eight-slide PPTX is committed at both `presentation/slides.pptx` and `presentation/gridwatch_u1_submission.pptx`.
- Vercel served the frontend with HTTP 200, and its Render proxy returned `status: ok`, `models_loaded: true` and a complete twelve-asset storm analysis.
- The public repository is based on the official template. Both the organizer validator and Backend tests workflow pass.
- The 3:39 demo video is committed in the repository and linked through Google Drive from `demo/demo-video-link.txt`.
- Team name, lead and three member records are complete.

Pending outside repository preparation: confirm anonymous access to the Google Drive video, complete a signed-in IBM Bob tool-call demonstration if the video does not already contain one, and submit the repository URL through the organiser's entry form.
