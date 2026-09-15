from bootstrap import ROOT
import json


data = {
    "team": {
        "name": "GridWatch",
        "track": "AI",
        "lead": {"name": "Vivaa Rathod", "email": "24ee055@charusat.edu.in"},
        "members": [
            {"name": "Aryan Chanpa", "email": "24cs011@charusat.edu.in"},
            {"name": "Krishna Patel", "email": "24ec107@charusat.edu.in"},
            {"name": "Yesha Parsana", "email": "24ec091@charusat.edu.in"},
        ],
    },
    "submission": {
        "title": "GridWatch: U1 Outage and Equipment Advisor",
        "problem_statement": "Utility operators need to combine equipment condition, weather and incident history to prioritize maintenance before outages.",
        "solution_summary": "A local prototype with a real ETT temperature forecast, separate synthetic failure classifier, impact ranking, constrained crew planning and IBM Bob MCP tools.",
        "key_features": [
            "Temporal model evaluation against baselines",
            "Synthetic asset and weather risk analysis",
            "Impact-ranked maintenance and constrained crew staging",
            "Interactive dashboard and JSON plan export",
            "IBM Bob MCP analysis and evaluation tools",
        ],
        "tech_stack": {
            "languages": ["Python", "JavaScript"],
            "frameworks": ["scikit-learn", "MCP Python SDK"],
            "ibm_technologies": ["IBM Bob via MCP"],
            "databases": [],
            "other": ["HTML", "CSS", "SVG"],
        },
        "what_we_are_most_proud_of": "Inspectable evidence, reproducible evaluation and explicit unassigned jobs.",
        "known_limitations": "Failure data, topology and weather are synthetic. No field outage accuracy, live weather or dispatch.",
    },
    "artifacts": {
        "source_code": "src/",
        "setup_guide": "docs/setup-guide.md",
        "architecture_doc": "docs/architecture.md",
        "demo_video": "demo/demo-video-link.txt",
        "live_demo": "demo/live-demo-url.txt",
        "screenshots": "demo/screenshots/",
        "presentation": "presentation/",
    },
}


if __name__ == "__main__":
    path = ROOT / "submission.yaml"
    path.write_text(json.dumps(data, indent=2) + "\n")
