(function initBrowserFramework(global) {
  if (!global || global.BrowserTestFramework) return;

  const suites = [];
  let currentSuite = null;
  let suiteId = 0;
  let testId = 0;

  function makeSuite(name) {
    return {
      id: 'suite-' + (++suiteId),
      name,
      tests: [],
      status: 'pending',
      passed: 0,
      failed: 0,
      skipped: 0,
    };
  }

  function describe(name, fn) {
    const suite = makeSuite(name);
    suites.push(suite);
    const previous = currentSuite;
    currentSuite = suite;
    try {
      fn();
    } finally {
      currentSuite = previous;
    }
  }

  function registerTest(name, fn, options) {
    if (!currentSuite) {
      throw new Error('it("' + name + '") must be declared inside describe(...)');
    }
    currentSuite.tests.push({
      id: 'test-' + (++testId),
      suiteId: currentSuite.id,
      suiteName: currentSuite.name,
      name,
      fn: typeof fn === 'function' ? fn : function noop() {},
      runnable: !(options && options.skip),
      status: options && options.skip ? 'skipped' : 'pending',
      durationMs: 0,
      error: null,
    });
  }

  function it(name, fn) {
    registerTest(name, fn, { skip: false });
  }

  it.skip = function skip(name, fn) {
    registerTest(name, fn, { skip: true });
  };

  async function runAll(hooks) {
    const callbacks = hooks || {};
    const summary = {
      suites: suites.length,
      runnable: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };

    for (let suiteIndex = 0; suiteIndex < suites.length; suiteIndex++) {
      const suite = suites[suiteIndex];
      suite.status = 'pending';
      suite.passed = 0;
      suite.failed = 0;
      suite.skipped = 0;
      if (typeof callbacks.onSuiteStart === 'function') {
        callbacks.onSuiteStart(suite, suiteIndex, suites.length);
      }

      for (let testIndex = 0; testIndex < suite.tests.length; testIndex++) {
        const test = suite.tests[testIndex];
        if (!test.runnable) {
          test.status = 'skipped';
          suite.skipped++;
          summary.skipped++;
          if (typeof callbacks.onTestResult === 'function') {
            callbacks.onTestResult(test, suite, summary);
          }
          continue;
        }

        summary.runnable++;
        if (typeof callbacks.onTestStart === 'function') {
          callbacks.onTestStart(test, suite, summary);
        }

        const start = performance.now();
        try {
          const result = test.fn();
          if (result && typeof result.then === 'function') {
            await result;
          }
          test.status = 'pass';
          suite.passed++;
          summary.passed++;
        } catch (error) {
          test.status = 'fail';
          test.error = error;
          suite.failed++;
          summary.failed++;
        }
        test.durationMs = performance.now() - start;

        if (typeof callbacks.onTestResult === 'function') {
          callbacks.onTestResult(test, suite, summary);
        }
      }

      suite.status = suite.failed > 0 ? 'fail' : (suite.passed > 0 ? 'pass' : 'skipped');
      if (typeof callbacks.onSuiteResult === 'function') {
        callbacks.onSuiteResult(suite, summary);
      }
    }

    return summary;
  }

  global.describe = describe;
  global.it = it;
  global.BrowserTestFramework = {
    suites,
    runAll,
  };
})(typeof window !== 'undefined' ? window : globalThis);
