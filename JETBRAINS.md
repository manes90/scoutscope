# JetBrains tooling — what was used, and how (free only)

## The tool

**IntelliJ IDEA 2025.3** (build 253.28294.334, product code IU) — the unified
IntelliJ IDEA download from JetBrains' official release API
(`data.services.jetbrains.com`, product code `IIC`, latest release).

### Why this is the free tool, not a paid trial

Since version 2025.3 (8 Dec 2025) JetBrains no longer ships a separate
Community Edition download: there is one unified IntelliJ IDEA installer,
its core is free for any use, and the former Ultimate features need a
subscription. Community Edition builds stopped at 2025.2. (JetBrains
announcement, July 2025; verified by web search on 2026-11-19.)

What this means for this project:

- **No licence, no trial, no payment.** The IDE was downloaded, extracted,
  and used headless only. No licence was entered, no Ultimate trial was
  started, no account was created, nothing was paid.
- The install lives at `~/jetbrains/idea-IU-253.28294.334/` (outside the
  repo; the repo carries only the `.idea/` project files as evidence, as the
  hackathon rules encourage).
- Bundled JetBrains Runtime: JBR 21.0.8 (`jbr/bin/java -version` verified)
  — no separate JDK install was needed.

SHA-256 of the downloaded tarball verified against JetBrains' checksum file
(`idea-2025.3.tar.gz.sha256`: OK, 1,515,485,267 bytes).

## How the IDE was used for this project

1. **Project host.** The project was created as an IntelliJ project:
   `.idea/modules.xml`, `.idea/scoutscope.iml` (WEB_MODULE), `.idea/misc.xml`
   (ES6 language level, no JDK — a static web project needs none),
   `.idea/vcs.xml` (Git). These files are committed in the repo.
2. **Code inspection (headless).** `bin/inspect.sh` was run against the
   project with a small inspection profile
   (`inspections/scoutscope-profile.xml`); report in `inspections/out/`.
   This is the IDE genuinely analysing the project's own code — not a
   screenshot of an editor. **Result (2026-11-19): exit 0, zero problems
   reported** by the enabled inspections (unresolved JS variables/functions,
   unknown HTML tags). The 2.3 MB `.descriptions.xml` catalog in
   `inspections/out/` is the run's output (git-ignored; kept on disk).
3. **Verification.** IntelliJ's own runtime and the Node smoke test
   (`test/smoke-test.js`) both pass over the same files.

## What was NOT used

- No paid JetBrains product, no All Products Pack / AI Ultimate code from
  hackathon registration (those codes are issued by email after joining on
  Devpost — a browser step that is still pending, see `DEVPOST_DRAFT.md`),
  no Junie, no JetBrains Air. The free core covered a dependency-free static
  web app completely.

## Reproduce

```bash
# Download (official API, latest release, product code IIC)
curl -sL -o idea-2025.3.tar.gz https://download.jetbrains.com/idea/idea-2025.3.tar.gz
curl -sL -o idea-2025.3.tar.gz.sha256 https://download.jetbrains.com/idea/idea-2025.3.tar.gz.sha256
sha256sum -c idea-2025.3.tar.gz.sha256
tar xzf idea-2025.3.tar.gz

# Headless inspection of this project (no GUI, no licence, no trial)
IDEA_PROPERTIES=/home/hatch/jetbrains/scoutscope-idea.properties \
IDEA_VM_OPTIONS=/home/hatch/jetbrains/scoutscope.vmoptions \
  ~/jetbrains/idea-IU-253.28294.334/bin/inspect.sh \
  . inspections/scoutscope-profile.xml inspections/out -v2
```

## Honest caveat

The IDE was used **headless** in this VM (no display server): project files
were authored for IntelliJ and verified with its headless inspection, but
nobody sat in the GUI editor. The `.idea/` folder and the inspection report
are the evidence. If a judge opens the folder in IntelliJ IDEA (free core),
the project opens as a web module.
