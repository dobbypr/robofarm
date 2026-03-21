# 2026-03-21 Browser Diagnostics Page

## Goal
Add a dedicated `tests.html` browser diagnostics page that does not reuse the gameplay shell and only loads the minimal browser test stack:

1. `settings.js`
2. shared browser test framework scripts
3. test manifest / discovery script
4. browser runner script

## Implementation Notes
- Keep the page purpose-built for diagnostics with a rigid, flat UI.
- Use a fixed summary header so pass/fail state stays visible while scrolling.
- Keep a collapsible log panel fixed to the viewport so detailed logs remain available.
- Load runtime source files and test files from the manifest inside the browser runner to keep `tests.html` minimal.
- Reuse the existing `test/*.test.js` suites by exposing browser globals for `describe`, `it`, `assert`, and `assertEqual`.

## Manual Verification
1. Open `tests.html` in a browser.
2. Confirm the page does not render the main gameplay shell.
3. Confirm suite/test rows appear with grey dash while queued/running, green check on pass, and red X on failure.
4. Confirm the fixed summary header updates counts during the run.
5. Confirm the bottom detailed log panel can be collapsed/expanded and remains available.
6. Confirm the thumbs-up block and subdued Claude Monet quote appear only when all runnable tests pass.
