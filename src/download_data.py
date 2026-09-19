"""Download original ETT data and submission template files, recording hashes."""
from bootstrap import ROOT
import hashlib, json, urllib.request

def download(url, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=60) as response:
        content = response.read()
    path.write_bytes(content)
    return {'url': url, 'sha256': hashlib.sha256(content).hexdigest(), 'bytes': len(content)}

if __name__ == '__main__':
    provenance = {}
    base = 'https://raw.githubusercontent.com/zhouhaoyi/ETDataset/main/'
    for name in ['ETT-small/ETTh1.csv', 'LICENSE']:
        provenance[name] = download(base + name, ROOT / 'data/raw' / name.split('/')[-1])
    (ROOT / 'data/provenance.json').write_text(json.dumps(provenance, indent=2))
    base = 'https://raw.githubusercontent.com/drijesh-ppatel/bob-ai-hackathon-submission-template/main/'
    for name in ['submission.yaml', 'CONTRIBUTING.md', '.github/workflows/validate.yml']:
        destination = ROOT / name
        if not destination.exists():
            download(base + name, destination)
    print('Downloaded ETT data, license, provenance, and original template files.')
