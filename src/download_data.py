"""Download original ETT data and submission template files, recording hashes."""
from bootstrap import ROOT
import hashlib, json, urllib.request, urllib.error, time, http.client

def download(url, path, expected_sha256=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and expected_sha256:
        cached = path.read_bytes()
        if hashlib.sha256(cached).hexdigest() == expected_sha256:
            return {'url': url, 'sha256': expected_sha256, 'bytes': len(cached)}
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=180) as response:
                content = response.read()
            break
        except (TimeoutError, urllib.error.URLError, http.client.IncompleteRead):
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))
    digest = hashlib.sha256(content).hexdigest()
    if expected_sha256 and digest != expected_sha256:
        raise ValueError(f'Source data checksum changed for {path.name}; review provenance before retraining.')
    path.write_bytes(content)
    return {'url': url, 'sha256': digest, 'bytes': len(content)}

if __name__ == '__main__':
    provenance = {}
    base = 'https://raw.githubusercontent.com/zhouhaoyi/ETDataset/main/'
    expected = {'ETT-small/ETTh1.csv': 'f18de3ad269cef59bb07b5438d79bb3042d3be49bdeecf01c1cd6d29695ee066',
                'LICENSE': '83cbb5c31415b1d0ee1d20d35dae3fda3a045b85fae9364cc57facc9cd6e0946'}
    for name in ['ETT-small/ETTh1.csv', 'LICENSE']:
        provenance[name] = download(base + name, ROOT / 'data/raw' / name.split('/')[-1], expected[name])
    (ROOT / 'data/provenance.json').write_text(json.dumps(provenance, indent=2))
    base = 'https://raw.githubusercontent.com/drijesh-ppatel/bob-ai-hackathon-submission-template/main/'
    for name in ['submission.yaml', 'CONTRIBUTING.md', '.github/workflows/validate.yml']:
        destination = ROOT / name
        if not destination.exists():
            download(base + name, destination)
    print('Downloaded ETT data, license, provenance, and original template files.')
