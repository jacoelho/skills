# Bundle validation

Date: 6 October 2026.

## Checks actually run

- Local bundle structure, Markdown link targets, and 12 evaluation-case records:
  **passed** using `python scripts/check_bundle.py`.
- YAML front matter: parsed; skill name and description verified.
- Go formatting: `gofmt` applied to the executable probe file.
- Executable probes: **3 passed** using the installed **Go 1.23.2 linux/amd64**
  toolchain, with automatic toolchain downloads and module proxy access disabled:

```text
GOTOOLCHAIN=local GOPROXY=off go test -count=1 -v ./...

PASS TestOneValueIsNotWholeInput
PASS TestStrictnessAtCustomUnmarshalBoundary
PASS TestAddingVariadicArgumentChangesFunctionType
ok   example.com/go-api-design-probes 0.003s
```

These probes establish the specific behaviours asserted by their tests on that
local toolchain. They do not validate the hypothetical document parser or any
user repository, and they make no claim about testing on Go 1.27.

## Not established

The 12 agent-evaluation scenarios are **authored but not executed**. No improvement
in agent behaviour, benchmark speedup, allocation bound, or full-library correctness
has been measured. The hypothetical worked example is explicitly a design sketch.
The bundle checker does not validate external links or exhaustively audit sources.
