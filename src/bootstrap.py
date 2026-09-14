"""Allow a portable local dependency directory without modifying global Python."""
import sys, site
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
if (ROOT / '.deps').exists():
    sys.path.insert(0, str(ROOT / '.deps'))
if (ROOT / '.mcpdeps').exists():
    sys.path.insert(0, str(ROOT / '.mcpdeps'))
    site.addsitedir(str(ROOT / '.mcpdeps'))
