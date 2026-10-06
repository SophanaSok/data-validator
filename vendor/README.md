# Vendored third-party files

These are committed copies, served from this site's own origin, so no CDN can change
what runs on `sophanasok.github.io`, and a Content-Security-Policy can allow
scripts from `'self'` alone. They are byte-for-byte the files from the npm
registry tarballs below; nothing here is built or edited.

| Directory | Package | npm `dist.integrity` |
| --- | --- | --- |
| `marked-15.0.12/` | `marked@15.0.12` (`marked.min.js`, `LICENSE.md`) | `sha512-8dD6FusOQSrpv9Z1rdNMdlSgQOIP880DHqnohobOmYLElGEqAL/JvxvuxZO16r4HtjTlfPRDC1hbvxC9dPN2nA==` |
| `github-markdown-css-5.8.1/` | `github-markdown-css@5.8.1` (`github-markdown.css`, `license`) | `sha512-8G+PFvqigBQSWLQjyzgpa2ThD9bo7+kDsriUIidGcRhXgmcaAWUIpCZf8DavJgc+xifjbCG+GvMyWr0XMXmc7g==` |

`marked@15.0.12` is the version `https://cdn.jsdelivr.net/npm/marked/marked.min.js`
was serving when it was pinned (2026-10-05, `x-jsd-version: 15.0.12`), so the
User Guide renders exactly as it did. Later majors no longer ship
`marked.min.js` at the package root.

## Refresh or upgrade

```sh
npm pack marked@<version> github-markdown-css@<version>   # npm checks dist.integrity
tar -xzf marked-<version>.tgz && cp package/marked.min.js package/LICENSE.md vendor/marked-<version>/
tar -xzf github-markdown-css-<version>.tgz && cp package/github-markdown.css package/license vendor/github-markdown-css-<version>/
```

Then point `readme.html` at the new directory, delete the old one, and open
`readme.html` over http (for example `python3 -m http.server 8000`) to check
the guide still renders with no CSP errors in the console.

## Inline script hashes

Each page's theme bootstrap `<script>` is allowed by its SHA-256 hash in the
page's CSP `<meta>`. After editing that script, run
`python3 tools/csp-hashes.py` and paste the printed hash into the meta;
`python3 tools/csp-hashes.py --check` exits non-zero while one is missing.
