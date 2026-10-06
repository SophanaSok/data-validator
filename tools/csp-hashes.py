#!/usr/bin/env python3
"""Print, or check, the CSP hash of every inline <script> in the site's pages.

The Content-Security-Policy <meta> in index.html and readme.html allows each
page's one inline script (the theme bootstrap that runs before first paint) by
its SHA-256 hash, so the hash must change whenever that script's text changes,
even by a single space.

    python3 tools/csp-hashes.py           # print the hashes
    python3 tools/csp-hashes.py --check   # exit 1 if a page's meta lacks one

The hash is over the exact text between <script> and </script>, UTF-8
encoded, as the CSP spec requires. No dependencies beyond the standard library.
"""
import base64
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ["index.html", "readme.html"]
INLINE_SCRIPT = re.compile(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", re.S | re.I)
CSP_META = re.compile(r'<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"', re.I)


def main() -> int:
    check = "--check" in sys.argv[1:]
    ok = True
    for name in PAGES:
        html = (ROOT / name).read_text(encoding="utf-8")
        meta = CSP_META.search(html)
        policy = meta.group(1) if meta else ""
        for body in INLINE_SCRIPT.findall(html):
            digest = base64.b64encode(hashlib.sha256(body.encode("utf-8")).digest()).decode()
            source = f"'sha256-{digest}'"
            present = source in policy
            ok = ok and present
            print(f"{name}: {source}{'' if present else '  <-- missing from the CSP meta'}")
    return 0 if ok or not check else 1


if __name__ == "__main__":
    sys.exit(main())
