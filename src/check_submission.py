"""Extra readiness checks. Does not replace or edit the organizer workflow."""
from bootstrap import ROOT
import json
import sys
from urllib.parse import urlparse


def main():
    missing = []
    required = ['README.md', 'submission.yaml', 'CONTRIBUTING.md',
                '.github/workflows/validate.yml', 'docs/problem-statement.md',
                'docs/solution-overview.md', 'docs/architecture.md',
                'docs/setup-guide.md', 'src/.env.example',
                'demo/demo-video-link.txt', 'demo/live-demo-url.txt']
    for name in required:
        if not (ROOT / name).is_file():
            missing.append(f'Missing file: {name}')
    try:
        # Our submission.yaml deliberately uses the JSON subset of YAML 1.2.
        meta = json.loads((ROOT / 'submission.yaml').read_text())
        for key in ['team.name', 'team.track', 'team.lead.name', 'team.lead.email',
                    'submission.title', 'submission.problem_statement', 'submission.solution_summary']:
            value = meta
            for part in key.split('.'):
                value = value.get(part, {}) if isinstance(value, dict) else None
            if not isinstance(value, str) or not value.strip():
                missing.append(f'Complete {key}')
        if not meta.get('submission', {}).get('key_features'):
            missing.append('Add at least one implemented key feature')
    except (ValueError, FileNotFoundError):
        missing.append('submission.yaml must contain valid project metadata')
    for filename in ['demo-video-link.txt', 'live-demo-url.txt']:
        file = ROOT / 'demo' / filename
        value = file.read_text().strip().splitlines()[0] if file.exists() and file.read_text().strip() else ''
        parsed = urlparse(value)
        if filename == 'live-demo-url.txt' and value == 'NOT DEPLOYED':
            continue  # Allowed by the guide; deployment status is tracked separately.
        if parsed.scheme not in ('http', 'https') or not parsed.hostname or 'your-' in value:
            missing.append(f'Provide a real URL in demo/{filename}')
    screenshots = [p for p in (ROOT / 'demo/screenshots').glob('*') if p.suffix.lower() in ('.png', '.jpg', '.jpeg')]
    if len(screenshots) < 3:
        missing.append('Provide at least three application screenshots')
    if not any((ROOT / 'presentation' / f'slides.{ext}').is_file() for ext in ['pdf', 'pptx']):
        missing.append('Provide presentation/slides.pdf or slides.pptx')
    for issue in missing:
        print(f'PENDING: {issue}')
    print('Local structural checks passed; verify links, Bob demo and organizer Actions separately.' if not missing else f'{len(missing)} submission item(s) pending.')
    return bool(missing)


if __name__ == '__main__':
    sys.exit(main())
