(function initBrowserRunner(global) {
  if (!global) return;

  const STATUS_SYMBOL = {
    pass: '✓',
    fail: '✕',
    pending: '–',
    skipped: '–',
  };

  const refs = {};
  const rowRefs = new Map();
  let summaryState = {
    suites: 0,
    runnable: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  function nowStamp() {
    const dt = new Date();
    return dt.toISOString().slice(11, 19);
  }

  function formatError(error) {
    if (!error) return '';
    return error.stack || error.message || String(error);
  }

  function logLine(level, message) {
    if (!refs.logOutput) return;
    refs.logOutput.textContent += '[' + nowStamp() + '] ' + level + ' ' + message + '\n';
    refs.logOutput.scrollTop = refs.logOutput.scrollHeight;
  }

  function patchConsole() {
    if (!global.console) return;
    const original = {
      log: global.console.log ? global.console.log.bind(global.console) : null,
      warn: global.console.warn ? global.console.warn.bind(global.console) : null,
      error: global.console.error ? global.console.error.bind(global.console) : null,
    };

    ['log', 'warn', 'error'].forEach(function bindConsole(method) {
      if (!original[method]) return;
      global.console[method] = function patchedConsole() {
        const args = Array.prototype.slice.call(arguments).map(function stringify(part) {
          if (part instanceof Error) return formatError(part);
          return typeof part === 'string' ? part : JSON.stringify(part);
        });
        logLine(method.toUpperCase(), args.join(' '));
        return original[method].apply(null, arguments);
      };
    });
  }

  function getIndicator(status) {
    return STATUS_SYMBOL[status] || STATUS_SYMBOL.pending;
  }

  function createRow(kind, name, scope, status, meta) {
    const row = document.createElement('div');
    row.className = 'result-row ' + kind;

    const indicator = document.createElement('div');
    indicator.className = 'result-indicator result-status-' + status;
    indicator.textContent = getIndicator(status);

    const scopeCell = document.createElement('div');
    scopeCell.className = 'result-scope';
    scopeCell.textContent = scope;

    const nameCell = document.createElement('div');
    nameCell.className = 'result-name';
    nameCell.textContent = name;

    const metaCell = document.createElement('div');
    metaCell.className = 'result-meta';
    metaCell.textContent = meta || '';

    row.appendChild(indicator);
    row.appendChild(scopeCell);
    row.appendChild(nameCell);
    row.appendChild(metaCell);
    return { row, indicator, scopeCell, nameCell, metaCell };
  }

  function ensureRows(framework) {
    refs.results.innerHTML = '';
    rowRefs.clear();
    framework.suites.forEach(function renderSuite(suite) {
      const suiteRow = createRow('suite', suite.name, 'suite', 'pending', suite.tests.length + ' tests');
      refs.results.appendChild(suiteRow.row);
      rowRefs.set(suite.id, suiteRow);

      suite.tests.forEach(function renderTest(test) {
        const testRow = createRow('test', test.name, suite.name, test.status || 'pending', 'queued');
        refs.results.appendChild(testRow.row);
        rowRefs.set(test.id, testRow);
      });
    });
  }

  function updateRow(rowRef, status, meta, errorText) {
    if (!rowRef) return;
    rowRef.indicator.className = 'result-indicator result-status-' + status;
    rowRef.indicator.textContent = getIndicator(status);
    rowRef.metaCell.textContent = meta || '';

    const existingError = rowRef.row.querySelector('.result-error');
    if (existingError) existingError.remove();
    if (errorText) {
      const errorBlock = document.createElement('div');
      errorBlock.className = 'result-error';
      errorBlock.textContent = errorText;
      rowRef.row.appendChild(errorBlock);
    }
  }

  function updateSuiteRow(suite) {
    const status = suite.failed > 0 ? 'fail' : (suite.passed > 0 ? 'pass' : 'skipped');
    const meta = suite.passed + ' pass / ' + suite.failed + ' fail / ' + suite.skipped + ' skip';
    updateRow(rowRefs.get(suite.id), status, meta);
  }

  function updateSummary(partial, statusText) {
    summaryState = Object.assign({}, summaryState, partial || {});
    refs.summarySuites.textContent = String(summaryState.suites || 0);
    refs.summaryRunnable.textContent = String(summaryState.runnable || 0);
    refs.summaryPassed.textContent = String(summaryState.passed || 0);
    refs.summaryFailed.textContent = String(summaryState.failed || 0);
    refs.summarySkipped.textContent = String(summaryState.skipped || 0);
    refs.summaryStatus.textContent = statusText || refs.summaryStatus.textContent;
    refs.summaryProgress.textContent = 'Runnable ' + (summaryState.passed + summaryState.failed) + ' / ' + summaryState.runnable;
  }

  function toggleThumbs(summary) {
    const shouldShow = summary.runnable > 0 && summary.failed === 0 && summary.passed === summary.runnable;
    refs.thumbsPanel.classList.toggle('hidden', !shouldShow);
  }

  function loadScript(path) {
    return new Promise(function(resolve, reject) {
      const script = document.createElement('script');
      script.src = path;
      script.onload = function() {
        logLine('LOAD', 'Loaded ' + path);
        resolve();
      };
      script.onerror = function() {
        reject(new Error('Failed to load ' + path));
      };
      document.head.appendChild(script);
    });
  }

  async function loadManifestScripts(manifest) {
    const files = []
      .concat(manifest.sourceFiles || [])
      .concat(manifest.testFiles || []);

    for (let i = 0; i < files.length; i++) {
      await loadScript(files[i]);
    }
  }

  async function boot() {
    refs.results = document.getElementById('results');
    refs.logOutput = document.getElementById('log-output');
    refs.summarySuites = document.getElementById('summary-suites');
    refs.summaryRunnable = document.getElementById('summary-runnable');
    refs.summaryPassed = document.getElementById('summary-passed');
    refs.summaryFailed = document.getElementById('summary-failed');
    refs.summarySkipped = document.getElementById('summary-skipped');
    refs.summaryStatus = document.getElementById('summary-status');
    refs.summaryProgress = document.getElementById('summary-progress');
    refs.thumbsPanel = document.getElementById('thumbs-up-panel');

    patchConsole();
    logLine('BOOT', 'Browser diagnostics starting');

    const manifest = global.RF_BROWSER_TEST_MANIFEST;
    const framework = global.BrowserTestFramework;
    if (!manifest || !framework) {
      updateSummary({}, 'BOOT ERROR');
      logLine('ERROR', 'Missing manifest or framework');
      return;
    }

    try {
      updateSummary({}, 'LOADING');
      await loadManifestScripts(manifest);
      updateSummary({ suites: framework.suites.length }, 'DISCOVERED');
      ensureRows(framework);
      logLine('DISCOVER', 'Found ' + framework.suites.length + ' suites');

      const summary = await framework.runAll({
        onSuiteStart: function(suite, suiteIndex, suiteCount) {
          updateRow(rowRefs.get(suite.id), 'pending', 'running suite ' + (suiteIndex + 1) + ' / ' + suiteCount);
          updateSummary({ suites: suiteCount }, 'RUNNING');
        },
        onTestStart: function(test) {
          updateRow(rowRefs.get(test.id), 'pending', 'running');
          logLine('TEST', test.suiteName + ' › ' + test.name);
        },
        onTestResult: function(test, suite, currentSummary) {
          const meta = test.runnable ? (Math.round(test.durationMs * 100) / 100) + ' ms' : 'skipped';
          updateRow(rowRefs.get(test.id), test.status, meta, formatError(test.error));
          updateSuiteRow(suite);
          updateSummary(currentSummary, currentSummary.failed > 0 ? 'RUNNING WITH FAILURES' : 'RUNNING');
        },
        onSuiteResult: function(suite, currentSummary) {
          updateSuiteRow(suite);
          updateSummary(currentSummary, currentSummary.failed > 0 ? 'RUNNING WITH FAILURES' : 'RUNNING');
        },
      });

      updateSummary(summary, summary.failed > 0 ? 'FAILED' : 'PASSED');
      toggleThumbs(summary);
      logLine('DONE', summary.passed + ' passed, ' + summary.failed + ' failed, ' + summary.skipped + ' skipped');
    } catch (error) {
      updateSummary({ failed: (summaryState.failed || 0) + 1 }, 'BOOT ERROR');
      logLine('ERROR', formatError(error));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
