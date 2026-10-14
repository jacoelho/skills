# British dictionary: required by every profile

Run `python3 scripts/setup-dictionary.py` from the Vale companion folder.
It installs the matching `en_GB.aff`, `en_GB.dic` and `en_GB.LICENSE` files here.
The upstream commit, sizes and Git blob identities are pinned in
`dictionary.lock.json`. The installer verifies the identity of each file and
retains its licence. Run it with `--check` to verify an existing installation.
Commit the resulting files and the lock file to your private project for fully
offline use after setup, subject to the included upstream licence.

The dictionary bytes could not be downloaded in the preparation environment
and are not bundled. Setup therefore needs network access once. It does not
silently fall back to American English. There is no `vale sync` dependency.

The dictionary source is `wooorm/dictionaries`, whose en-GB package is generated
from the SCOWL/wordlist.aspell.net English word lists. No Node.js installation
is required by this configuration. British spelling is not an instruction to
rewrite official product names, API fields or quoted text. Do not replace every
`-ize` suffix indiscriminately: accepted British variants and specialised words
need editorial judgement. Use `program` for computer software, not `programme`.
