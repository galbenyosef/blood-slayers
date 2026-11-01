!(function() {
  try {
    var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
    e.SENTRY_RELEASE = { id: "c42f2b6ac45f69119209d4d0f1daacfda4b6815d" };
  } catch (e2) {
  }
})();
;
{
  try {
    (function() {
      var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {}, n = new e.Error().stack;
      n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "acde0ed8-2107-4e8a-a91a-9b06f12fbb42", e._sentryDebugIdIdentifier = "sentry-dbid-acde0ed8-2107-4e8a-a91a-9b06f12fbb42");
    })();
  } catch (e) {
  }
}
;
(function() {
  "use strict";
  const DEBUG_BUILD$2 = typeof __SENTRY_DEBUG__ === "undefined" || __SENTRY_DEBUG__;
  const GLOBAL_OBJ = globalThis;
  const SDK_VERSION = "10.31.0";
  function getMainCarrier() {
    getSentryCarrier(GLOBAL_OBJ);
    return GLOBAL_OBJ;
  }
  function getSentryCarrier(carrier) {
    const __SENTRY__ = carrier.__SENTRY__ = carrier.__SENTRY__ || {};
    __SENTRY__.version = __SENTRY__.version || SDK_VERSION;
    return __SENTRY__[SDK_VERSION] = __SENTRY__[SDK_VERSION] || {};
  }
  function getGlobalSingleton(name, creator, obj = GLOBAL_OBJ) {
    const __SENTRY__ = obj.__SENTRY__ = obj.__SENTRY__ || {};
    const carrier = __SENTRY__[SDK_VERSION] = __SENTRY__[SDK_VERSION] || {};
    return carrier[name] || (carrier[name] = creator());
  }
  const CONSOLE_LEVELS = [
    "debug",
    "info",
    "warn",
    "error",
    "log",
    "assert",
    "trace"
  ];
  const PREFIX = "Sentry Logger ";
  const originalConsoleMethods = {};
  function consoleSandbox(callback) {
    if (!("console" in GLOBAL_OBJ)) {
      return callback();
    }
    const console2 = GLOBAL_OBJ.console;
    const wrappedFuncs = {};
    const wrappedLevels = Object.keys(originalConsoleMethods);
    wrappedLevels.forEach((level) => {
      const originalConsoleMethod = originalConsoleMethods[level];
      wrappedFuncs[level] = console2[level];
      console2[level] = originalConsoleMethod;
    });
    try {
      return callback();
    } finally {
      wrappedLevels.forEach((level) => {
        console2[level] = wrappedFuncs[level];
      });
    }
  }
  function enable() {
    _getLoggerSettings().enabled = true;
  }
  function disable() {
    _getLoggerSettings().enabled = false;
  }
  function isEnabled() {
    return _getLoggerSettings().enabled;
  }
  function log(...args) {
    _maybeLog("log", ...args);
  }
  function warn(...args) {
    _maybeLog("warn", ...args);
  }
  function error(...args) {
    _maybeLog("error", ...args);
  }
  function _maybeLog(level, ...args) {
    if (!DEBUG_BUILD$2) {
      return;
    }
    if (isEnabled()) {
      consoleSandbox(() => {
        GLOBAL_OBJ.console[level](`${PREFIX}[${level}]:`, ...args);
      });
    }
  }
  function _getLoggerSettings() {
    if (!DEBUG_BUILD$2) {
      return { enabled: false };
    }
    return getGlobalSingleton("loggerSettings", () => ({ enabled: false }));
  }
  const debug = {
    /** Enable logging. */
    enable,
    /** Disable logging. */
    disable,
    /** Check if logging is enabled. */
    isEnabled,
    /** Log a message. */
    log,
    /** Log a warning. */
    warn,
    /** Log an error. */
    error
  };
  const STACKTRACE_FRAME_LIMIT = 50;
  const UNKNOWN_FUNCTION = "?";
  const WEBPACK_ERROR_REGEXP = /\(error: (.*)\)/;
  const STRIP_FRAME_REGEXP = /captureMessage|captureException/;
  function createStackParser(...parsers) {
    const sortedParsers = parsers.sort((a, b) => a[0] - b[0]).map((p) => p[1]);
    return (stack, skipFirstLines = 0, framesToPop = 0) => {
      const frames = [];
      const lines = stack.split("\n");
      for (let i2 = skipFirstLines; i2 < lines.length; i2++) {
        let line = lines[i2];
        if (line.length > 1024) {
          line = line.slice(0, 1024);
        }
        const cleanedLine = WEBPACK_ERROR_REGEXP.test(line) ? line.replace(WEBPACK_ERROR_REGEXP, "$1") : line;
        if (cleanedLine.match(/\S*Error: /)) {
          continue;
        }
        for (const parser of sortedParsers) {
          const frame = parser(cleanedLine);
          if (frame) {
            frames.push(frame);
            break;
          }
        }
        if (frames.length >= STACKTRACE_FRAME_LIMIT + framesToPop) {
          break;
        }
      }
      return stripSentryFramesAndReverse(frames.slice(framesToPop));
    };
  }
  function stackParserFromStackParserOptions(stackParser) {
    if (Array.isArray(stackParser)) {
      return createStackParser(...stackParser);
    }
    return stackParser;
  }
  function stripSentryFramesAndReverse(stack) {
    if (!stack.length) {
      return [];
    }
    const localStack = Array.from(stack);
    if (/sentryWrapped/.test(getLastStackFrame(localStack).function || "")) {
      localStack.pop();
    }
    localStack.reverse();
    if (STRIP_FRAME_REGEXP.test(getLastStackFrame(localStack).function || "")) {
      localStack.pop();
      if (STRIP_FRAME_REGEXP.test(getLastStackFrame(localStack).function || "")) {
        localStack.pop();
      }
    }
    return localStack.slice(0, STACKTRACE_FRAME_LIMIT).map((frame) => ({
      ...frame,
      filename: frame.filename || getLastStackFrame(localStack).filename,
      function: frame.function || UNKNOWN_FUNCTION
    }));
  }
  function getLastStackFrame(arr) {
    return arr[arr.length - 1] || {};
  }
  const defaultFunctionName = "<anonymous>";
  function getFunctionName$1(fn) {
    try {
      if (!fn || typeof fn !== "function") {
        return defaultFunctionName;
      }
      return fn.name || defaultFunctionName;
    } catch {
      return defaultFunctionName;
    }
  }
  function getFramesFromEvent(event) {
    const exception = event.exception;
    if (exception) {
      const frames = [];
      try {
        exception.values.forEach((value) => {
          if (value.stacktrace.frames) {
            frames.push(...value.stacktrace.frames);
          }
        });
        return frames;
      } catch {
        return void 0;
      }
    }
    return void 0;
  }
  function getVueInternalName(value) {
    const isVNode = "__v_isVNode" in value && value.__v_isVNode;
    return isVNode ? "[VueVNode]" : "[VueViewModel]";
  }
  const handlers = {};
  const instrumented = {};
  function addHandler(type, handler) {
    handlers[type] = handlers[type] || [];
    handlers[type].push(handler);
  }
  function maybeInstrument(type, instrumentFn) {
    if (!instrumented[type]) {
      instrumented[type] = true;
      try {
        instrumentFn();
      } catch (e) {
        DEBUG_BUILD$2 && debug.error(`Error while instrumenting ${type}`, e);
      }
    }
  }
  function triggerHandlers(type, data) {
    const typeHandlers = type && handlers[type];
    if (!typeHandlers) {
      return;
    }
    for (const handler of typeHandlers) {
      try {
        handler(data);
      } catch (e) {
        DEBUG_BUILD$2 && debug.error(
          `Error while triggering instrumentation handler.
Type: ${type}
Name: ${getFunctionName$1(handler)}
Error:`,
          e
        );
      }
    }
  }
  let _oldOnErrorHandler = null;
  function addGlobalErrorInstrumentationHandler(handler) {
    const type = "error";
    addHandler(type, handler);
    maybeInstrument(type, instrumentError);
  }
  function instrumentError() {
    _oldOnErrorHandler = GLOBAL_OBJ.onerror;
    GLOBAL_OBJ.onerror = function(msg, url, line, column, error2) {
      const handlerData = {
        column,
        error: error2,
        line,
        msg,
        url
      };
      triggerHandlers("error", handlerData);
      if (_oldOnErrorHandler) {
        return _oldOnErrorHandler.apply(this, arguments);
      }
      return false;
    };
    GLOBAL_OBJ.onerror.__SENTRY_INSTRUMENTED__ = true;
  }
  let _oldOnUnhandledRejectionHandler = null;
  function addGlobalUnhandledRejectionInstrumentationHandler(handler) {
    const type = "unhandledrejection";
    addHandler(type, handler);
    maybeInstrument(type, instrumentUnhandledRejection);
  }
  function instrumentUnhandledRejection() {
    _oldOnUnhandledRejectionHandler = GLOBAL_OBJ.onunhandledrejection;
    GLOBAL_OBJ.onunhandledrejection = function(e) {
      const handlerData = e;
      triggerHandlers("unhandledrejection", handlerData);
      if (_oldOnUnhandledRejectionHandler) {
        return _oldOnUnhandledRejectionHandler.apply(this, arguments);
      }
      return true;
    };
    GLOBAL_OBJ.onunhandledrejection.__SENTRY_INSTRUMENTED__ = true;
  }
  const objectToString = Object.prototype.toString;
  function isError(wat) {
    switch (objectToString.call(wat)) {
      case "[object Error]":
      case "[object Exception]":
      case "[object DOMException]":
      case "[object WebAssembly.Exception]":
        return true;
      default:
        return isInstanceOf(wat, Error);
    }
  }
  function isBuiltin(wat, className) {
    return objectToString.call(wat) === `[object ${className}]`;
  }
  function isErrorEvent$1(wat) {
    return isBuiltin(wat, "ErrorEvent");
  }
  function isDOMError(wat) {
    return isBuiltin(wat, "DOMError");
  }
  function isDOMException(wat) {
    return isBuiltin(wat, "DOMException");
  }
  function isString(wat) {
    return isBuiltin(wat, "String");
  }
  function isParameterizedString(wat) {
    return typeof wat === "object" && wat !== null && "__sentry_template_string__" in wat && "__sentry_template_values__" in wat;
  }
  function isPrimitive(wat) {
    return wat === null || isParameterizedString(wat) || typeof wat !== "object" && typeof wat !== "function";
  }
  function isPlainObject(wat) {
    return isBuiltin(wat, "Object");
  }
  function isEvent(wat) {
    return typeof Event !== "undefined" && isInstanceOf(wat, Event);
  }
  function isElement(wat) {
    return typeof Element !== "undefined" && isInstanceOf(wat, Element);
  }
  function isRegExp(wat) {
    return isBuiltin(wat, "RegExp");
  }
  function isThenable(wat) {
    return Boolean(wat?.then && typeof wat.then === "function");
  }
  function isSyntheticEvent(wat) {
    return isPlainObject(wat) && "nativeEvent" in wat && "preventDefault" in wat && "stopPropagation" in wat;
  }
  function isInstanceOf(wat, base) {
    try {
      return wat instanceof base;
    } catch {
      return false;
    }
  }
  function isVueViewModel(wat) {
    return !!(typeof wat === "object" && wat !== null && (wat.__isVue || wat._isVue || wat.__v_isVNode));
  }
  function isRequest(request) {
    return typeof Request !== "undefined" && isInstanceOf(request, Request);
  }
  const WINDOW$3 = GLOBAL_OBJ;
  const DEFAULT_MAX_STRING_LENGTH = 80;
  function htmlTreeAsString(elem, options = {}) {
    if (!elem) {
      return "<unknown>";
    }
    try {
      let currentElem = elem;
      const MAX_TRAVERSE_HEIGHT = 5;
      const out = [];
      let height = 0;
      let len2 = 0;
      const separator = " > ";
      const sepLength = separator.length;
      let nextStr;
      const keyAttrs = Array.isArray(options) ? options : options.keyAttrs;
      const maxStringLength = !Array.isArray(options) && options.maxStringLength || DEFAULT_MAX_STRING_LENGTH;
      while (currentElem && height++ < MAX_TRAVERSE_HEIGHT) {
        nextStr = _htmlElementAsString(currentElem, keyAttrs);
        if (nextStr === "html" || height > 1 && len2 + out.length * sepLength + nextStr.length >= maxStringLength) {
          break;
        }
        out.push(nextStr);
        len2 += nextStr.length;
        currentElem = currentElem.parentNode;
      }
      return out.reverse().join(separator);
    } catch {
      return "<unknown>";
    }
  }
  function _htmlElementAsString(el, keyAttrs) {
    const elem = el;
    const out = [];
    if (!elem?.tagName) {
      return "";
    }
    if (WINDOW$3.HTMLElement) {
      if (elem instanceof HTMLElement && elem.dataset) {
        if (elem.dataset["sentryComponent"]) {
          return elem.dataset["sentryComponent"];
        }
        if (elem.dataset["sentryElement"]) {
          return elem.dataset["sentryElement"];
        }
      }
    }
    out.push(elem.tagName.toLowerCase());
    const keyAttrPairs = keyAttrs?.length ? keyAttrs.filter((keyAttr) => elem.getAttribute(keyAttr)).map((keyAttr) => [keyAttr, elem.getAttribute(keyAttr)]) : null;
    if (keyAttrPairs?.length) {
      keyAttrPairs.forEach((keyAttrPair) => {
        out.push(`[${keyAttrPair[0]}="${keyAttrPair[1]}"]`);
      });
    } else {
      if (elem.id) {
        out.push(`#${elem.id}`);
      }
      const className = elem.className;
      if (className && isString(className)) {
        const classes = className.split(/\s+/);
        for (const c of classes) {
          out.push(`.${c}`);
        }
      }
    }
    const allowedAttrs = ["aria-label", "type", "name", "title", "alt"];
    for (const k of allowedAttrs) {
      const attr = elem.getAttribute(k);
      if (attr) {
        out.push(`[${k}="${attr}"]`);
      }
    }
    return out.join("");
  }
  function getLocationHref() {
    try {
      return WINDOW$3.document.location.href;
    } catch {
      return "";
    }
  }
  function getComponentName(elem) {
    if (!WINDOW$3.HTMLElement) {
      return null;
    }
    let currentElem = elem;
    const MAX_TRAVERSE_HEIGHT = 5;
    for (let i2 = 0; i2 < MAX_TRAVERSE_HEIGHT; i2++) {
      if (!currentElem) {
        return null;
      }
      if (currentElem instanceof HTMLElement) {
        if (currentElem.dataset["sentryComponent"]) {
          return currentElem.dataset["sentryComponent"];
        }
        if (currentElem.dataset["sentryElement"]) {
          return currentElem.dataset["sentryElement"];
        }
      }
      currentElem = currentElem.parentNode;
    }
    return null;
  }
  function fill(source2, name, replacementFactory) {
    if (!(name in source2)) {
      return;
    }
    const original = source2[name];
    if (typeof original !== "function") {
      return;
    }
    const wrapped = replacementFactory(original);
    if (typeof wrapped === "function") {
      markFunctionWrapped(wrapped, original);
    }
    try {
      source2[name] = wrapped;
    } catch {
      DEBUG_BUILD$2 && debug.log(`Failed to replace method "${name}" in object`, source2);
    }
  }
  function addNonEnumerableProperty(obj, name, value) {
    try {
      Object.defineProperty(obj, name, {
        // enumerable: false, // the default, so we can save on bundle size by not explicitly setting it
        value,
        writable: true,
        configurable: true
      });
    } catch {
      DEBUG_BUILD$2 && debug.log(`Failed to add non-enumerable property "${name}" to object`, obj);
    }
  }
  function markFunctionWrapped(wrapped, original) {
    try {
      const proto = original.prototype || {};
      wrapped.prototype = original.prototype = proto;
      addNonEnumerableProperty(wrapped, "__sentry_original__", original);
    } catch {
    }
  }
  function getOriginalFunction(func) {
    return func.__sentry_original__;
  }
  function convertToPlainObject(value) {
    if (isError(value)) {
      return {
        message: value.message,
        name: value.name,
        stack: value.stack,
        ...getOwnProperties(value)
      };
    } else if (isEvent(value)) {
      const newObj = {
        type: value.type,
        target: serializeEventTarget(value.target),
        currentTarget: serializeEventTarget(value.currentTarget),
        ...getOwnProperties(value)
      };
      if (typeof CustomEvent !== "undefined" && isInstanceOf(value, CustomEvent)) {
        newObj.detail = value.detail;
      }
      return newObj;
    } else {
      return value;
    }
  }
  function serializeEventTarget(target) {
    try {
      return isElement(target) ? htmlTreeAsString(target) : Object.prototype.toString.call(target);
    } catch {
      return "<unknown>";
    }
  }
  function getOwnProperties(obj) {
    if (typeof obj === "object" && obj !== null) {
      const extractedProps = {};
      for (const property in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, property)) {
          extractedProps[property] = obj[property];
        }
      }
      return extractedProps;
    } else {
      return {};
    }
  }
  function extractExceptionKeysForMessage(exception) {
    const keys = Object.keys(convertToPlainObject(exception));
    keys.sort();
    return !keys[0] ? "[object has no keys]" : keys.join(", ");
  }
  function truncate(str, max = 0) {
    if (typeof str !== "string" || max === 0) {
      return str;
    }
    return str.length <= max ? str : `${str.slice(0, max)}...`;
  }
  function safeJoin(input, delimiter) {
    if (!Array.isArray(input)) {
      return "";
    }
    const output = [];
    for (let i2 = 0; i2 < input.length; i2++) {
      const value = input[i2];
      try {
        if (isVueViewModel(value)) {
          output.push(getVueInternalName(value));
        } else {
          output.push(String(value));
        }
      } catch {
        output.push("[value cannot be serialized]");
      }
    }
    return output.join(delimiter);
  }
  function isMatchingPattern(value, pattern, requireExactStringMatch = false) {
    if (!isString(value)) {
      return false;
    }
    if (isRegExp(pattern)) {
      return pattern.test(value);
    }
    if (isString(pattern)) {
      return requireExactStringMatch ? value === pattern : value.includes(pattern);
    }
    return false;
  }
  function stringMatchesSomePattern(testString, patterns = [], requireExactStringMatch = false) {
    return patterns.some((pattern) => isMatchingPattern(testString, pattern, requireExactStringMatch));
  }
  function getCrypto() {
    const gbl = GLOBAL_OBJ;
    return gbl.crypto || gbl.msCrypto;
  }
  let emptyUuid;
  function getRandomByte() {
    return Math.random() * 16;
  }
  function uuid4(crypto2 = getCrypto()) {
    try {
      if (crypto2?.randomUUID) {
        return crypto2.randomUUID().replace(/-/g, "");
      }
    } catch {
    }
    if (!emptyUuid) {
      emptyUuid = "10000000100040008000" + 1e11;
    }
    return emptyUuid.replace(
      /[018]/g,
      (c) => (
        // eslint-disable-next-line no-bitwise
        (c ^ (getRandomByte() & 15) >> c / 4).toString(16)
      )
    );
  }
  function getFirstException(event) {
    return event.exception?.values?.[0];
  }
  function getEventDescription(event) {
    const { message, event_id: eventId } = event;
    if (message) {
      return message;
    }
    const firstException = getFirstException(event);
    if (firstException) {
      if (firstException.type && firstException.value) {
        return `${firstException.type}: ${firstException.value}`;
      }
      return firstException.type || firstException.value || eventId || "<unknown>";
    }
    return eventId || "<unknown>";
  }
  function addExceptionTypeValue(event, value, type) {
    const exception = event.exception = event.exception || {};
    const values = exception.values = exception.values || [];
    const firstException = values[0] = values[0] || {};
    if (!firstException.value) {
      firstException.value = value || "";
    }
    if (!firstException.type) {
      firstException.type = "Error";
    }
  }
  function addExceptionMechanism(event, newMechanism) {
    const firstException = getFirstException(event);
    if (!firstException) {
      return;
    }
    const defaultMechanism = { type: "generic", handled: true };
    const currentMechanism = firstException.mechanism;
    firstException.mechanism = { ...defaultMechanism, ...currentMechanism, ...newMechanism };
    if (newMechanism && "data" in newMechanism) {
      const mergedData = { ...currentMechanism?.data, ...newMechanism.data };
      firstException.mechanism.data = mergedData;
    }
  }
  function checkOrSetAlreadyCaught(exception) {
    if (isAlreadyCaptured(exception)) {
      return true;
    }
    try {
      addNonEnumerableProperty(exception, "__sentry_captured__", true);
    } catch {
    }
    return false;
  }
  function isAlreadyCaptured(exception) {
    try {
      return exception.__sentry_captured__;
    } catch {
    }
  }
  const ONE_SECOND_IN_MS = 1e3;
  function dateTimestampInSeconds() {
    return Date.now() / ONE_SECOND_IN_MS;
  }
  function createUnixTimestampInSecondsFunc() {
    const { performance: performance2 } = GLOBAL_OBJ;
    if (!performance2?.now || !performance2.timeOrigin) {
      return dateTimestampInSeconds;
    }
    const timeOrigin = performance2.timeOrigin;
    return () => {
      return (timeOrigin + performance2.now()) / ONE_SECOND_IN_MS;
    };
  }
  let _cachedTimestampInSeconds;
  function timestampInSeconds() {
    const func = _cachedTimestampInSeconds ?? (_cachedTimestampInSeconds = createUnixTimestampInSecondsFunc());
    return func();
  }
  function makeSession(context) {
    const startingTime = timestampInSeconds();
    const session = {
      sid: uuid4(),
      init: true,
      timestamp: startingTime,
      started: startingTime,
      duration: 0,
      status: "ok",
      errors: 0,
      ignoreDuration: false,
      toJSON: () => sessionToJSON(session)
    };
    if (context) {
      updateSession(session, context);
    }
    return session;
  }
  function updateSession(session, context = {}) {
    if (context.user) {
      if (!session.ipAddress && context.user.ip_address) {
        session.ipAddress = context.user.ip_address;
      }
      if (!session.did && !context.did) {
        session.did = context.user.id || context.user.email || context.user.username;
      }
    }
    session.timestamp = context.timestamp || timestampInSeconds();
    if (context.abnormal_mechanism) {
      session.abnormal_mechanism = context.abnormal_mechanism;
    }
    if (context.ignoreDuration) {
      session.ignoreDuration = context.ignoreDuration;
    }
    if (context.sid) {
      session.sid = context.sid.length === 32 ? context.sid : uuid4();
    }
    if (context.init !== void 0) {
      session.init = context.init;
    }
    if (!session.did && context.did) {
      session.did = `${context.did}`;
    }
    if (typeof context.started === "number") {
      session.started = context.started;
    }
    if (session.ignoreDuration) {
      session.duration = void 0;
    } else if (typeof context.duration === "number") {
      session.duration = context.duration;
    } else {
      const duration = session.timestamp - session.started;
      session.duration = duration >= 0 ? duration : 0;
    }
    if (context.release) {
      session.release = context.release;
    }
    if (context.environment) {
      session.environment = context.environment;
    }
    if (!session.ipAddress && context.ipAddress) {
      session.ipAddress = context.ipAddress;
    }
    if (!session.userAgent && context.userAgent) {
      session.userAgent = context.userAgent;
    }
    if (typeof context.errors === "number") {
      session.errors = context.errors;
    }
    if (context.status) {
      session.status = context.status;
    }
  }
  function closeSession(session, status) {
    let context = {};
    if (session.status === "ok") {
      context = { status: "exited" };
    }
    updateSession(session, context);
  }
  function sessionToJSON(session) {
    return {
      sid: `${session.sid}`,
      init: session.init,
      // Make sure that sec is converted to ms for date constructor
      started: new Date(session.started * 1e3).toISOString(),
      timestamp: new Date(session.timestamp * 1e3).toISOString(),
      status: session.status,
      errors: session.errors,
      did: typeof session.did === "number" || typeof session.did === "string" ? `${session.did}` : void 0,
      duration: session.duration,
      abnormal_mechanism: session.abnormal_mechanism,
      attrs: {
        release: session.release,
        environment: session.environment,
        ip_address: session.ipAddress,
        user_agent: session.userAgent
      }
    };
  }
  function merge(initialObj, mergeObj, levels = 2) {
    if (!mergeObj || typeof mergeObj !== "object" || levels <= 0) {
      return mergeObj;
    }
    if (initialObj && Object.keys(mergeObj).length === 0) {
      return initialObj;
    }
    const output = { ...initialObj };
    for (const key in mergeObj) {
      if (Object.prototype.hasOwnProperty.call(mergeObj, key)) {
        output[key] = merge(output[key], mergeObj[key], levels - 1);
      }
    }
    return output;
  }
  function generateTraceId() {
    return uuid4();
  }
  function generateSpanId() {
    return uuid4().substring(16);
  }
  const SCOPE_SPAN_FIELD = "_sentrySpan";
  function _setSpanForScope(scope, span) {
    if (span) {
      addNonEnumerableProperty(scope, SCOPE_SPAN_FIELD, span);
    } else {
      delete scope[SCOPE_SPAN_FIELD];
    }
  }
  function _getSpanForScope(scope) {
    return scope[SCOPE_SPAN_FIELD];
  }
  const DEFAULT_MAX_BREADCRUMBS = 100;
  class Scope {
    /** Flag if notifying is happening. */
    /** Callback for client to receive scope changes. */
    /** Callback list that will be called during event processing. */
    /** Array of breadcrumbs. */
    /** User */
    /** Tags */
    /** Attributes */
    /** Extra */
    /** Contexts */
    /** Attachments */
    /** Propagation Context for distributed tracing */
    /**
     * A place to stash data which is needed at some point in the SDK's event processing pipeline but which shouldn't get
     * sent to Sentry
     */
    /** Fingerprint */
    /** Severity */
    /**
     * Transaction Name
     *
     * IMPORTANT: The transaction name on the scope has nothing to do with root spans/transaction objects.
     * It's purpose is to assign a transaction to the scope that's added to non-transaction events.
     */
    /** Session */
    /** The client on this scope */
    /** Contains the last event id of a captured event.  */
    // NOTE: Any field which gets added here should get added not only to the constructor but also to the `clone` method.
    constructor() {
      this._notifyingListeners = false;
      this._scopeListeners = [];
      this._eventProcessors = [];
      this._breadcrumbs = [];
      this._attachments = [];
      this._user = {};
      this._tags = {};
      this._attributes = {};
      this._extra = {};
      this._contexts = {};
      this._sdkProcessingMetadata = {};
      this._propagationContext = {
        traceId: generateTraceId(),
        sampleRand: Math.random()
      };
    }
    /**
     * Clone all data from this scope into a new scope.
     */
    clone() {
      const newScope = new Scope();
      newScope._breadcrumbs = [...this._breadcrumbs];
      newScope._tags = { ...this._tags };
      newScope._attributes = { ...this._attributes };
      newScope._extra = { ...this._extra };
      newScope._contexts = { ...this._contexts };
      if (this._contexts.flags) {
        newScope._contexts.flags = {
          values: [...this._contexts.flags.values]
        };
      }
      newScope._user = this._user;
      newScope._level = this._level;
      newScope._session = this._session;
      newScope._transactionName = this._transactionName;
      newScope._fingerprint = this._fingerprint;
      newScope._eventProcessors = [...this._eventProcessors];
      newScope._attachments = [...this._attachments];
      newScope._sdkProcessingMetadata = { ...this._sdkProcessingMetadata };
      newScope._propagationContext = { ...this._propagationContext };
      newScope._client = this._client;
      newScope._lastEventId = this._lastEventId;
      _setSpanForScope(newScope, _getSpanForScope(this));
      return newScope;
    }
    /**
     * Update the client assigned to this scope.
     * Note that not every scope will have a client assigned - isolation scopes & the global scope will generally not have a client,
     * as well as manually created scopes.
     */
    setClient(client) {
      this._client = client;
    }
    /**
     * Set the ID of the last captured error event.
     * This is generally only captured on the isolation scope.
     */
    setLastEventId(lastEventId) {
      this._lastEventId = lastEventId;
    }
    /**
     * Get the client assigned to this scope.
     */
    getClient() {
      return this._client;
    }
    /**
     * Get the ID of the last captured error event.
     * This is generally only available on the isolation scope.
     */
    lastEventId() {
      return this._lastEventId;
    }
    /**
     * @inheritDoc
     */
    addScopeListener(callback) {
      this._scopeListeners.push(callback);
    }
    /**
     * Add an event processor that will be called before an event is sent.
     */
    addEventProcessor(callback) {
      this._eventProcessors.push(callback);
      return this;
    }
    /**
     * Set the user for this scope.
     * Set to `null` to unset the user.
     */
    setUser(user) {
      this._user = user || {
        email: void 0,
        id: void 0,
        ip_address: void 0,
        username: void 0
      };
      if (this._session) {
        updateSession(this._session, { user });
      }
      this._notifyScopeListeners();
      return this;
    }
    /**
     * Get the user from this scope.
     */
    getUser() {
      return this._user;
    }
    /**
     * Set an object that will be merged into existing tags on the scope,
     * and will be sent as tags data with the event.
     */
    setTags(tags) {
      this._tags = {
        ...this._tags,
        ...tags
      };
      this._notifyScopeListeners();
      return this;
    }
    /**
     * Set a single tag that will be sent as tags data with the event.
     */
    setTag(key, value) {
      return this.setTags({ [key]: value });
    }
    /**
     * Sets attributes onto the scope.
     *
     * TODO:
     * Currently, these attributes are not applied to any telemetry data but they will be in the future.
     *
     * @param newAttributes - The attributes to set on the scope. You can either pass in key-value pairs, or
     * an object with a `value` and an optional `unit` (if applicable to your attribute).
     *
     * @example
     * ```typescript
     * scope.setAttributes({
     *   is_admin: true,
     *   payment_selection: 'credit_card',
     *   clicked_products: [130, 554, 292],
     *   render_duration: { value: 'render_duration', unit: 'ms' },
     * });
     * ```
     */
    setAttributes(newAttributes) {
      this._attributes = {
        ...this._attributes,
        ...newAttributes
      };
      this._notifyScopeListeners();
      return this;
    }
    /**
     * Sets an attribute onto the scope.
     *
     * TODO:
     * Currently, these attributes are not applied to any telemetry data but they will be in the future.
     *
     * @param key - The attribute key.
     * @param value - the attribute value. You can either pass in a raw value, or an attribute
     * object with a `value` and an optional `unit` (if applicable to your attribute).
     *
     * @example
     * ```typescript
     * scope.setAttribute('is_admin', true);
     * scope.setAttribute('clicked_products', [130, 554, 292]);
     * scope.setAttribute('render_duration', { value: 'render_duration', unit: 'ms' });
     * ```
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setAttribute(key, value) {
      return this.setAttributes({ [key]: value });
    }
    /**
     * Removes the attribute with the given key from the scope.
     *
     * @param key - The attribute key.
     *
     * @example
     * ```typescript
     * scope.removeAttribute('is_admin');
     * ```
     */
    removeAttribute(key) {
      if (key in this._attributes) {
        delete this._attributes[key];
        this._notifyScopeListeners();
      }
      return this;
    }
    /**
     * Set an object that will be merged into existing extra on the scope,
     * and will be sent as extra data with the event.
     */
    setExtras(extras) {
      this._extra = {
        ...this._extra,
        ...extras
      };
      this._notifyScopeListeners();
      return this;
    }
    /**
     * Set a single key:value extra entry that will be sent as extra data with the event.
     */
    setExtra(key, extra) {
      this._extra = { ...this._extra, [key]: extra };
      this._notifyScopeListeners();
      return this;
    }
    /**
     * Sets the fingerprint on the scope to send with the events.
     * @param {string[]} fingerprint Fingerprint to group events in Sentry.
     */
    setFingerprint(fingerprint) {
      this._fingerprint = fingerprint;
      this._notifyScopeListeners();
      return this;
    }
    /**
     * Sets the level on the scope for future events.
     */
    setLevel(level) {
      this._level = level;
      this._notifyScopeListeners();
      return this;
    }
    /**
     * Sets the transaction name on the scope so that the name of e.g. taken server route or
     * the page location is attached to future events.
     *
     * IMPORTANT: Calling this function does NOT change the name of the currently active
     * root span. If you want to change the name of the active root span, use
     * `Sentry.updateSpanName(rootSpan, 'new name')` instead.
     *
     * By default, the SDK updates the scope's transaction name automatically on sensible
     * occasions, such as a page navigation or when handling a new request on the server.
     */
    setTransactionName(name) {
      this._transactionName = name;
      this._notifyScopeListeners();
      return this;
    }
    /**
     * Sets context data with the given name.
     * Data passed as context will be normalized. You can also pass `null` to unset the context.
     * Note that context data will not be merged - calling `setContext` will overwrite an existing context with the same key.
     */
    setContext(key, context) {
      if (context === null) {
        delete this._contexts[key];
      } else {
        this._contexts[key] = context;
      }
      this._notifyScopeListeners();
      return this;
    }
    /**
     * Set the session for the scope.
     */
    setSession(session) {
      if (!session) {
        delete this._session;
      } else {
        this._session = session;
      }
      this._notifyScopeListeners();
      return this;
    }
    /**
     * Get the session from the scope.
     */
    getSession() {
      return this._session;
    }
    /**
     * Updates the scope with provided data. Can work in three variations:
     * - plain object containing updatable attributes
     * - Scope instance that'll extract the attributes from
     * - callback function that'll receive the current scope as an argument and allow for modifications
     */
    update(captureContext) {
      if (!captureContext) {
        return this;
      }
      const scopeToMerge = typeof captureContext === "function" ? captureContext(this) : captureContext;
      const scopeInstance = scopeToMerge instanceof Scope ? scopeToMerge.getScopeData() : isPlainObject(scopeToMerge) ? captureContext : void 0;
      const {
        tags,
        attributes,
        extra,
        user,
        contexts,
        level,
        fingerprint = [],
        propagationContext
      } = scopeInstance || {};
      this._tags = { ...this._tags, ...tags };
      this._attributes = { ...this._attributes, ...attributes };
      this._extra = { ...this._extra, ...extra };
      this._contexts = { ...this._contexts, ...contexts };
      if (user && Object.keys(user).length) {
        this._user = user;
      }
      if (level) {
        this._level = level;
      }
      if (fingerprint.length) {
        this._fingerprint = fingerprint;
      }
      if (propagationContext) {
        this._propagationContext = propagationContext;
      }
      return this;
    }
    /**
     * Clears the current scope and resets its properties.
     * Note: The client will not be cleared.
     */
    clear() {
      this._breadcrumbs = [];
      this._tags = {};
      this._attributes = {};
      this._extra = {};
      this._user = {};
      this._contexts = {};
      this._level = void 0;
      this._transactionName = void 0;
      this._fingerprint = void 0;
      this._session = void 0;
      _setSpanForScope(this, void 0);
      this._attachments = [];
      this.setPropagationContext({ traceId: generateTraceId(), sampleRand: Math.random() });
      this._notifyScopeListeners();
      return this;
    }
    /**
     * Adds a breadcrumb to the scope.
     * By default, the last 100 breadcrumbs are kept.
     */
    addBreadcrumb(breadcrumb, maxBreadcrumbs) {
      const maxCrumbs = typeof maxBreadcrumbs === "number" ? maxBreadcrumbs : DEFAULT_MAX_BREADCRUMBS;
      if (maxCrumbs <= 0) {
        return this;
      }
      const mergedBreadcrumb = {
        timestamp: dateTimestampInSeconds(),
        ...breadcrumb,
        // Breadcrumb messages can theoretically be infinitely large and they're held in memory so we truncate them not to leak (too much) memory
        message: breadcrumb.message ? truncate(breadcrumb.message, 2048) : breadcrumb.message
      };
      this._breadcrumbs.push(mergedBreadcrumb);
      if (this._breadcrumbs.length > maxCrumbs) {
        this._breadcrumbs = this._breadcrumbs.slice(-maxCrumbs);
        this._client?.recordDroppedEvent("buffer_overflow", "log_item");
      }
      this._notifyScopeListeners();
      return this;
    }
    /**
     * Get the last breadcrumb of the scope.
     */
    getLastBreadcrumb() {
      return this._breadcrumbs[this._breadcrumbs.length - 1];
    }
    /**
     * Clear all breadcrumbs from the scope.
     */
    clearBreadcrumbs() {
      this._breadcrumbs = [];
      this._notifyScopeListeners();
      return this;
    }
    /**
     * Add an attachment to the scope.
     */
    addAttachment(attachment) {
      this._attachments.push(attachment);
      return this;
    }
    /**
     * Clear all attachments from the scope.
     */
    clearAttachments() {
      this._attachments = [];
      return this;
    }
    /**
     * Get the data of this scope, which should be applied to an event during processing.
     */
    getScopeData() {
      return {
        breadcrumbs: this._breadcrumbs,
        attachments: this._attachments,
        contexts: this._contexts,
        tags: this._tags,
        attributes: this._attributes,
        extra: this._extra,
        user: this._user,
        level: this._level,
        fingerprint: this._fingerprint || [],
        eventProcessors: this._eventProcessors,
        propagationContext: this._propagationContext,
        sdkProcessingMetadata: this._sdkProcessingMetadata,
        transactionName: this._transactionName,
        span: _getSpanForScope(this)
      };
    }
    /**
     * Add data which will be accessible during event processing but won't get sent to Sentry.
     */
    setSDKProcessingMetadata(newData) {
      this._sdkProcessingMetadata = merge(this._sdkProcessingMetadata, newData, 2);
      return this;
    }
    /**
     * Add propagation context to the scope, used for distributed tracing
     */
    setPropagationContext(context) {
      this._propagationContext = context;
      return this;
    }
    /**
     * Get propagation context from the scope, used for distributed tracing
     */
    getPropagationContext() {
      return this._propagationContext;
    }
    /**
     * Capture an exception for this scope.
     *
     * @returns {string} The id of the captured Sentry event.
     */
    captureException(exception, hint) {
      const eventId = hint?.event_id || uuid4();
      if (!this._client) {
        DEBUG_BUILD$2 && debug.warn("No client configured on scope - will not capture exception!");
        return eventId;
      }
      const syntheticException = new Error("Sentry syntheticException");
      this._client.captureException(
        exception,
        {
          originalException: exception,
          syntheticException,
          ...hint,
          event_id: eventId
        },
        this
      );
      return eventId;
    }
    /**
     * Capture a message for this scope.
     *
     * @returns {string} The id of the captured message.
     */
    captureMessage(message, level, hint) {
      const eventId = hint?.event_id || uuid4();
      if (!this._client) {
        DEBUG_BUILD$2 && debug.warn("No client configured on scope - will not capture message!");
        return eventId;
      }
      const syntheticException = hint?.syntheticException ?? new Error(message);
      this._client.captureMessage(
        message,
        level,
        {
          originalException: message,
          syntheticException,
          ...hint,
          event_id: eventId
        },
        this
      );
      return eventId;
    }
    /**
     * Capture a Sentry event for this scope.
     *
     * @returns {string} The id of the captured event.
     */
    captureEvent(event, hint) {
      const eventId = hint?.event_id || uuid4();
      if (!this._client) {
        DEBUG_BUILD$2 && debug.warn("No client configured on scope - will not capture event!");
        return eventId;
      }
      this._client.captureEvent(event, { ...hint, event_id: eventId }, this);
      return eventId;
    }
    /**
     * This will be called on every set call.
     */
    _notifyScopeListeners() {
      if (!this._notifyingListeners) {
        this._notifyingListeners = true;
        this._scopeListeners.forEach((callback) => {
          callback(this);
        });
        this._notifyingListeners = false;
      }
    }
  }
  function getDefaultCurrentScope() {
    return getGlobalSingleton("defaultCurrentScope", () => new Scope());
  }
  function getDefaultIsolationScope() {
    return getGlobalSingleton("defaultIsolationScope", () => new Scope());
  }
  class AsyncContextStack {
    constructor(scope, isolationScope) {
      let assignedScope;
      if (!scope) {
        assignedScope = new Scope();
      } else {
        assignedScope = scope;
      }
      let assignedIsolationScope;
      if (!isolationScope) {
        assignedIsolationScope = new Scope();
      } else {
        assignedIsolationScope = isolationScope;
      }
      this._stack = [{ scope: assignedScope }];
      this._isolationScope = assignedIsolationScope;
    }
    /**
     * Fork a scope for the stack.
     */
    withScope(callback) {
      const scope = this._pushScope();
      let maybePromiseResult;
      try {
        maybePromiseResult = callback(scope);
      } catch (e) {
        this._popScope();
        throw e;
      }
      if (isThenable(maybePromiseResult)) {
        return maybePromiseResult.then(
          (res) => {
            this._popScope();
            return res;
          },
          (e) => {
            this._popScope();
            throw e;
          }
        );
      }
      this._popScope();
      return maybePromiseResult;
    }
    /**
     * Get the client of the stack.
     */
    getClient() {
      return this.getStackTop().client;
    }
    /**
     * Returns the scope of the top stack.
     */
    getScope() {
      return this.getStackTop().scope;
    }
    /**
     * Get the isolation scope for the stack.
     */
    getIsolationScope() {
      return this._isolationScope;
    }
    /**
     * Returns the topmost scope layer in the order domain > local > process.
     */
    getStackTop() {
      return this._stack[this._stack.length - 1];
    }
    /**
     * Push a scope to the stack.
     */
    _pushScope() {
      const scope = this.getScope().clone();
      this._stack.push({
        client: this.getClient(),
        scope
      });
      return scope;
    }
    /**
     * Pop a scope from the stack.
     */
    _popScope() {
      if (this._stack.length <= 1) return false;
      return !!this._stack.pop();
    }
  }
  function getAsyncContextStack() {
    const registry = getMainCarrier();
    const sentry = getSentryCarrier(registry);
    return sentry.stack = sentry.stack || new AsyncContextStack(getDefaultCurrentScope(), getDefaultIsolationScope());
  }
  function withScope$1(callback) {
    return getAsyncContextStack().withScope(callback);
  }
  function withSetScope(scope, callback) {
    const stack = getAsyncContextStack();
    return stack.withScope(() => {
      stack.getStackTop().scope = scope;
      return callback(scope);
    });
  }
  function withIsolationScope(callback) {
    return getAsyncContextStack().withScope(() => {
      return callback(getAsyncContextStack().getIsolationScope());
    });
  }
  function getStackAsyncContextStrategy() {
    return {
      withIsolationScope,
      withScope: withScope$1,
      withSetScope,
      withSetIsolationScope: (_isolationScope, callback) => {
        return withIsolationScope(callback);
      },
      getCurrentScope: () => getAsyncContextStack().getScope(),
      getIsolationScope: () => getAsyncContextStack().getIsolationScope()
    };
  }
  function getAsyncContextStrategy(carrier) {
    const sentry = getSentryCarrier(carrier);
    if (sentry.acs) {
      return sentry.acs;
    }
    return getStackAsyncContextStrategy();
  }
  function getCurrentScope() {
    const carrier = getMainCarrier();
    const acs = getAsyncContextStrategy(carrier);
    return acs.getCurrentScope();
  }
  function getIsolationScope() {
    const carrier = getMainCarrier();
    const acs = getAsyncContextStrategy(carrier);
    return acs.getIsolationScope();
  }
  function getGlobalScope() {
    return getGlobalSingleton("globalScope", () => new Scope());
  }
  function withScope(...rest) {
    const carrier = getMainCarrier();
    const acs = getAsyncContextStrategy(carrier);
    if (rest.length === 2) {
      const [scope, callback] = rest;
      if (!scope) {
        return acs.withScope(callback);
      }
      return acs.withSetScope(scope, callback);
    }
    return acs.withScope(rest[0]);
  }
  function getClient() {
    return getCurrentScope().getClient();
  }
  function getTraceContextFromScope(scope) {
    const propagationContext = scope.getPropagationContext();
    const { traceId, parentSpanId, propagationSpanId } = propagationContext;
    const traceContext = {
      trace_id: traceId,
      span_id: propagationSpanId || generateSpanId()
    };
    if (parentSpanId) {
      traceContext.parent_span_id = parentSpanId;
    }
    return traceContext;
  }
  const SEMANTIC_ATTRIBUTE_SENTRY_SOURCE = "sentry.source";
  const SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE = "sentry.sample_rate";
  const SEMANTIC_ATTRIBUTE_SENTRY_PREVIOUS_TRACE_SAMPLE_RATE = "sentry.previous_trace_sample_rate";
  const SEMANTIC_ATTRIBUTE_SENTRY_OP = "sentry.op";
  const SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN = "sentry.origin";
  const SEMANTIC_ATTRIBUTE_PROFILE_ID = "sentry.profile_id";
  const SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME = "sentry.exclusive_time";
  const SPAN_STATUS_UNSET = 0;
  const SPAN_STATUS_OK = 1;
  const SCOPE_ON_START_SPAN_FIELD = "_sentryScope";
  const ISOLATION_SCOPE_ON_START_SPAN_FIELD = "_sentryIsolationScope";
  function unwrapScopeFromWeakRef(scopeRef) {
    if (!scopeRef) {
      return void 0;
    }
    if (typeof scopeRef === "object" && "deref" in scopeRef && typeof scopeRef.deref === "function") {
      try {
        return scopeRef.deref();
      } catch {
        return void 0;
      }
    }
    return scopeRef;
  }
  function getCapturedScopesOnSpan(span) {
    const spanWithScopes = span;
    return {
      scope: spanWithScopes[SCOPE_ON_START_SPAN_FIELD],
      isolationScope: unwrapScopeFromWeakRef(spanWithScopes[ISOLATION_SCOPE_ON_START_SPAN_FIELD])
    };
  }
  const SENTRY_BAGGAGE_KEY_PREFIX = "sentry-";
  const SENTRY_BAGGAGE_KEY_PREFIX_REGEX = /^sentry-/;
  function baggageHeaderToDynamicSamplingContext(baggageHeader) {
    const baggageObject = parseBaggageHeader(baggageHeader);
    if (!baggageObject) {
      return void 0;
    }
    const dynamicSamplingContext = Object.entries(baggageObject).reduce((acc, [key, value]) => {
      if (key.match(SENTRY_BAGGAGE_KEY_PREFIX_REGEX)) {
        const nonPrefixedKey = key.slice(SENTRY_BAGGAGE_KEY_PREFIX.length);
        acc[nonPrefixedKey] = value;
      }
      return acc;
    }, {});
    if (Object.keys(dynamicSamplingContext).length > 0) {
      return dynamicSamplingContext;
    } else {
      return void 0;
    }
  }
  function parseBaggageHeader(baggageHeader) {
    if (!baggageHeader || !isString(baggageHeader) && !Array.isArray(baggageHeader)) {
      return void 0;
    }
    if (Array.isArray(baggageHeader)) {
      return baggageHeader.reduce((acc, curr) => {
        const currBaggageObject = baggageHeaderToObject(curr);
        Object.entries(currBaggageObject).forEach(([key, value]) => {
          acc[key] = value;
        });
        return acc;
      }, {});
    }
    return baggageHeaderToObject(baggageHeader);
  }
  function baggageHeaderToObject(baggageHeader) {
    return baggageHeader.split(",").map((baggageEntry) => {
      const eqIdx = baggageEntry.indexOf("=");
      if (eqIdx === -1) {
        return [];
      }
      const key = baggageEntry.slice(0, eqIdx);
      const value = baggageEntry.slice(eqIdx + 1);
      return [key, value].map((keyOrValue) => {
        try {
          return decodeURIComponent(keyOrValue.trim());
        } catch {
          return;
        }
      });
    }).reduce((acc, [key, value]) => {
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {});
  }
  const ORG_ID_REGEX = /^o(\d+)\./;
  const DSN_REGEX = /^(?:(\w+):)\/\/(?:(\w+)(?::(\w+)?)?@)([\w.-]+)(?::(\d+))?\/(.+)/;
  function isValidProtocol(protocol) {
    return protocol === "http" || protocol === "https";
  }
  function dsnToString(dsn, withPassword = false) {
    const { host, path, pass, port, projectId, protocol, publicKey } = dsn;
    return `${protocol}://${publicKey}${withPassword && pass ? `:${pass}` : ""}@${host}${port ? `:${port}` : ""}/${path ? `${path}/` : path}${projectId}`;
  }
  function dsnFromString(str) {
    const match = DSN_REGEX.exec(str);
    if (!match) {
      consoleSandbox(() => {
        console.error(`Invalid Sentry Dsn: ${str}`);
      });
      return void 0;
    }
    const [protocol, publicKey, pass = "", host = "", port = "", lastPath = ""] = match.slice(1);
    let path = "";
    let projectId = lastPath;
    const split = projectId.split("/");
    if (split.length > 1) {
      path = split.slice(0, -1).join("/");
      projectId = split.pop();
    }
    if (projectId) {
      const projectMatch = projectId.match(/^\d+/);
      if (projectMatch) {
        projectId = projectMatch[0];
      }
    }
    return dsnFromComponents({ host, pass, path, projectId, port, protocol, publicKey });
  }
  function dsnFromComponents(components) {
    return {
      protocol: components.protocol,
      publicKey: components.publicKey || "",
      pass: components.pass || "",
      host: components.host,
      port: components.port || "",
      path: components.path || "",
      projectId: components.projectId
    };
  }
  function validateDsn(dsn) {
    if (!DEBUG_BUILD$2) {
      return true;
    }
    const { port, projectId, protocol } = dsn;
    const requiredComponents = ["protocol", "publicKey", "host", "projectId"];
    const hasMissingRequiredComponent = requiredComponents.find((component) => {
      if (!dsn[component]) {
        debug.error(`Invalid Sentry Dsn: ${component} missing`);
        return true;
      }
      return false;
    });
    if (hasMissingRequiredComponent) {
      return false;
    }
    if (!projectId.match(/^\d+$/)) {
      debug.error(`Invalid Sentry Dsn: Invalid projectId ${projectId}`);
      return false;
    }
    if (!isValidProtocol(protocol)) {
      debug.error(`Invalid Sentry Dsn: Invalid protocol ${protocol}`);
      return false;
    }
    if (port && isNaN(parseInt(port, 10))) {
      debug.error(`Invalid Sentry Dsn: Invalid port ${port}`);
      return false;
    }
    return true;
  }
  function extractOrgIdFromDsnHost(host) {
    const match = host.match(ORG_ID_REGEX);
    return match?.[1];
  }
  function extractOrgIdFromClient(client) {
    const options = client.getOptions();
    const { host } = client.getDsn() || {};
    let org_id;
    if (options.orgId) {
      org_id = String(options.orgId);
    } else if (host) {
      org_id = extractOrgIdFromDsnHost(host);
    }
    return org_id;
  }
  function makeDsn(from) {
    const components = typeof from === "string" ? dsnFromString(from) : dsnFromComponents(from);
    if (!components || !validateDsn(components)) {
      return void 0;
    }
    return components;
  }
  function parseSampleRate(sampleRate) {
    if (typeof sampleRate === "boolean") {
      return Number(sampleRate);
    }
    const rate = typeof sampleRate === "string" ? parseFloat(sampleRate) : sampleRate;
    if (typeof rate !== "number" || isNaN(rate) || rate < 0 || rate > 1) {
      return void 0;
    }
    return rate;
  }
  const TRACE_FLAG_SAMPLED = 1;
  let hasShownSpanDropWarning = false;
  function spanToTraceContext(span) {
    const { spanId, traceId: trace_id, isRemote } = span.spanContext();
    const parent_span_id = isRemote ? spanId : spanToJSON(span).parent_span_id;
    const scope = getCapturedScopesOnSpan(span).scope;
    const span_id = isRemote ? scope?.getPropagationContext().propagationSpanId || generateSpanId() : spanId;
    return {
      parent_span_id,
      span_id,
      trace_id
    };
  }
  function convertSpanLinksForEnvelope(links) {
    if (links && links.length > 0) {
      return links.map(({ context: { spanId, traceId, traceFlags, ...restContext }, attributes }) => ({
        span_id: spanId,
        trace_id: traceId,
        sampled: traceFlags === TRACE_FLAG_SAMPLED,
        attributes,
        ...restContext
      }));
    } else {
      return void 0;
    }
  }
  function spanTimeInputToSeconds(input) {
    if (typeof input === "number") {
      return ensureTimestampInSeconds(input);
    }
    if (Array.isArray(input)) {
      return input[0] + input[1] / 1e9;
    }
    if (input instanceof Date) {
      return ensureTimestampInSeconds(input.getTime());
    }
    return timestampInSeconds();
  }
  function ensureTimestampInSeconds(timestamp) {
    const isMs = timestamp > 9999999999;
    return isMs ? timestamp / 1e3 : timestamp;
  }
  function spanToJSON(span) {
    if (spanIsSentrySpan(span)) {
      return span.getSpanJSON();
    }
    const { spanId: span_id, traceId: trace_id } = span.spanContext();
    if (spanIsOpenTelemetrySdkTraceBaseSpan(span)) {
      const { attributes, startTime, name, endTime, status, links } = span;
      const parentSpanId = "parentSpanId" in span ? span.parentSpanId : "parentSpanContext" in span ? span.parentSpanContext?.spanId : void 0;
      return {
        span_id,
        trace_id,
        data: attributes,
        description: name,
        parent_span_id: parentSpanId,
        start_timestamp: spanTimeInputToSeconds(startTime),
        // This is [0,0] by default in OTEL, in which case we want to interpret this as no end time
        timestamp: spanTimeInputToSeconds(endTime) || void 0,
        status: getStatusMessage(status),
        op: attributes[SEMANTIC_ATTRIBUTE_SENTRY_OP],
        origin: attributes[SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN],
        links: convertSpanLinksForEnvelope(links)
      };
    }
    return {
      span_id,
      trace_id,
      start_timestamp: 0,
      data: {}
    };
  }
  function spanIsOpenTelemetrySdkTraceBaseSpan(span) {
    const castSpan = span;
    return !!castSpan.attributes && !!castSpan.startTime && !!castSpan.name && !!castSpan.endTime && !!castSpan.status;
  }
  function spanIsSentrySpan(span) {
    return typeof span.getSpanJSON === "function";
  }
  function spanIsSampled(span) {
    const { traceFlags } = span.spanContext();
    return traceFlags === TRACE_FLAG_SAMPLED;
  }
  function getStatusMessage(status) {
    if (!status || status.code === SPAN_STATUS_UNSET) {
      return void 0;
    }
    if (status.code === SPAN_STATUS_OK) {
      return "ok";
    }
    return status.message || "internal_error";
  }
  const ROOT_SPAN_FIELD = "_sentryRootSpan";
  function getRootSpan(span) {
    return span[ROOT_SPAN_FIELD] || span;
  }
  function showSpanDropWarning() {
    if (!hasShownSpanDropWarning) {
      consoleSandbox(() => {
        console.warn(
          "[Sentry] Returning null from `beforeSendSpan` is disallowed. To drop certain spans, configure the respective integrations directly or use `ignoreSpans`."
        );
      });
      hasShownSpanDropWarning = true;
    }
  }
  function hasSpansEnabled(maybeOptions) {
    if (typeof __SENTRY_TRACING__ === "boolean" && !__SENTRY_TRACING__) {
      return false;
    }
    const options = getClient()?.getOptions();
    return !!options && // Note: This check is `!= null`, meaning "nullish". `0` is not "nullish", `undefined` and `null` are. (This comment was brought to you by 15 minutes of questioning life)
    (options.tracesSampleRate != null || !!options.tracesSampler);
  }
  function logIgnoredSpan(droppedSpan) {
    debug.log(`Ignoring span ${droppedSpan.op} - ${droppedSpan.description} because it matches \`ignoreSpans\`.`);
  }
  function shouldIgnoreSpan(span, ignoreSpans) {
    if (!ignoreSpans?.length || !span.description) {
      return false;
    }
    for (const pattern of ignoreSpans) {
      if (isStringOrRegExp(pattern)) {
        if (isMatchingPattern(span.description, pattern)) {
          DEBUG_BUILD$2 && logIgnoredSpan(span);
          return true;
        }
        continue;
      }
      if (!pattern.name && !pattern.op) {
        continue;
      }
      const nameMatches = pattern.name ? isMatchingPattern(span.description, pattern.name) : true;
      const opMatches = pattern.op ? span.op && isMatchingPattern(span.op, pattern.op) : true;
      if (nameMatches && opMatches) {
        DEBUG_BUILD$2 && logIgnoredSpan(span);
        return true;
      }
    }
    return false;
  }
  function reparentChildSpans(spans, dropSpan) {
    const droppedSpanParentId = dropSpan.parent_span_id;
    const droppedSpanId = dropSpan.span_id;
    if (!droppedSpanParentId) {
      return;
    }
    for (const span of spans) {
      if (span.parent_span_id === droppedSpanId) {
        span.parent_span_id = droppedSpanParentId;
      }
    }
  }
  function isStringOrRegExp(value) {
    return typeof value === "string" || value instanceof RegExp;
  }
  const DEFAULT_ENVIRONMENT = "production";
  const FROZEN_DSC_FIELD = "_frozenDsc";
  function getDynamicSamplingContextFromClient(trace_id, client) {
    const options = client.getOptions();
    const { publicKey: public_key } = client.getDsn() || {};
    const dsc = {
      environment: options.environment || DEFAULT_ENVIRONMENT,
      release: options.release,
      public_key,
      trace_id,
      org_id: extractOrgIdFromClient(client)
    };
    client.emit("createDsc", dsc);
    return dsc;
  }
  function getDynamicSamplingContextFromScope(client, scope) {
    const propagationContext = scope.getPropagationContext();
    return propagationContext.dsc || getDynamicSamplingContextFromClient(propagationContext.traceId, client);
  }
  function getDynamicSamplingContextFromSpan(span) {
    const client = getClient();
    if (!client) {
      return {};
    }
    const rootSpan = getRootSpan(span);
    const rootSpanJson = spanToJSON(rootSpan);
    const rootSpanAttributes = rootSpanJson.data;
    const traceState = rootSpan.spanContext().traceState;
    const rootSpanSampleRate = traceState?.get("sentry.sample_rate") ?? rootSpanAttributes[SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE] ?? rootSpanAttributes[SEMANTIC_ATTRIBUTE_SENTRY_PREVIOUS_TRACE_SAMPLE_RATE];
    function applyLocalSampleRateToDsc(dsc2) {
      if (typeof rootSpanSampleRate === "number" || typeof rootSpanSampleRate === "string") {
        dsc2.sample_rate = `${rootSpanSampleRate}`;
      }
      return dsc2;
    }
    const frozenDsc = rootSpan[FROZEN_DSC_FIELD];
    if (frozenDsc) {
      return applyLocalSampleRateToDsc(frozenDsc);
    }
    const traceStateDsc = traceState?.get("sentry.dsc");
    const dscOnTraceState = traceStateDsc && baggageHeaderToDynamicSamplingContext(traceStateDsc);
    if (dscOnTraceState) {
      return applyLocalSampleRateToDsc(dscOnTraceState);
    }
    const dsc = getDynamicSamplingContextFromClient(span.spanContext().traceId, client);
    const source2 = rootSpanAttributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE];
    const name = rootSpanJson.description;
    if (source2 !== "url" && name) {
      dsc.transaction = name;
    }
    if (hasSpansEnabled()) {
      dsc.sampled = String(spanIsSampled(rootSpan));
      dsc.sample_rand = // In OTEL we store the sample rand on the trace state because we cannot access scopes for NonRecordingSpans
      // The Sentry OTEL SpanSampler takes care of writing the sample rand on the root span
      traceState?.get("sentry.sample_rand") ?? // On all other platforms we can actually get the scopes from a root span (we use this as a fallback)
      getCapturedScopesOnSpan(rootSpan).scope?.getPropagationContext().sampleRand.toString();
    }
    applyLocalSampleRateToDsc(dsc);
    client.emit("createDsc", dsc, rootSpan);
    return dsc;
  }
  function normalize(input, depth3 = 100, maxProperties = Infinity) {
    try {
      return visit("", input, depth3, maxProperties);
    } catch (err) {
      return { ERROR: `**non-serializable** (${err})` };
    }
  }
  function normalizeToSize(object, depth3 = 3, maxSize = 100 * 1024) {
    const normalized = normalize(object, depth3);
    if (jsonSize(normalized) > maxSize) {
      return normalizeToSize(object, depth3 - 1, maxSize);
    }
    return normalized;
  }
  function visit(key, value, depth3 = Infinity, maxProperties = Infinity, memo = memoBuilder()) {
    const [memoize, unmemoize] = memo;
    if (value == null || // this matches null and undefined -> eqeq not eqeqeq
    ["boolean", "string"].includes(typeof value) || typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    const stringified = stringifyValue(key, value);
    if (!stringified.startsWith("[object ")) {
      return stringified;
    }
    if (value["__sentry_skip_normalization__"]) {
      return value;
    }
    const remainingDepth = typeof value["__sentry_override_normalization_depth__"] === "number" ? value["__sentry_override_normalization_depth__"] : depth3;
    if (remainingDepth === 0) {
      return stringified.replace("object ", "");
    }
    if (memoize(value)) {
      return "[Circular ~]";
    }
    const valueWithToJSON = value;
    if (valueWithToJSON && typeof valueWithToJSON.toJSON === "function") {
      try {
        const jsonValue = valueWithToJSON.toJSON();
        return visit("", jsonValue, remainingDepth - 1, maxProperties, memo);
      } catch {
      }
    }
    const normalized = Array.isArray(value) ? [] : {};
    let numAdded = 0;
    const visitable = convertToPlainObject(value);
    for (const visitKey in visitable) {
      if (!Object.prototype.hasOwnProperty.call(visitable, visitKey)) {
        continue;
      }
      if (numAdded >= maxProperties) {
        normalized[visitKey] = "[MaxProperties ~]";
        break;
      }
      const visitValue = visitable[visitKey];
      normalized[visitKey] = visit(visitKey, visitValue, remainingDepth - 1, maxProperties, memo);
      numAdded++;
    }
    unmemoize(value);
    return normalized;
  }
  function stringifyValue(key, value) {
    try {
      if (key === "domain" && value && typeof value === "object" && value._events) {
        return "[Domain]";
      }
      if (key === "domainEmitter") {
        return "[DomainEmitter]";
      }
      if (typeof global !== "undefined" && value === global) {
        return "[Global]";
      }
      if (typeof window !== "undefined" && value === window) {
        return "[Window]";
      }
      if (typeof document !== "undefined" && value === document) {
        return "[Document]";
      }
      if (isVueViewModel(value)) {
        return getVueInternalName(value);
      }
      if (isSyntheticEvent(value)) {
        return "[SyntheticEvent]";
      }
      if (typeof value === "number" && !Number.isFinite(value)) {
        return `[${value}]`;
      }
      if (typeof value === "function") {
        return `[Function: ${getFunctionName$1(value)}]`;
      }
      if (typeof value === "symbol") {
        return `[${String(value)}]`;
      }
      if (typeof value === "bigint") {
        return `[BigInt: ${String(value)}]`;
      }
      const objName = getConstructorName(value);
      if (/^HTML(\w*)Element$/.test(objName)) {
        return `[HTMLElement: ${objName}]`;
      }
      return `[object ${objName}]`;
    } catch (err) {
      return `**non-serializable** (${err})`;
    }
  }
  function getConstructorName(value) {
    const prototype = Object.getPrototypeOf(value);
    return prototype?.constructor ? prototype.constructor.name : "null prototype";
  }
  function utf8Length(value) {
    return ~-encodeURI(value).split(/%..|./).length;
  }
  function jsonSize(value) {
    return utf8Length(JSON.stringify(value));
  }
  function memoBuilder() {
    const inner = /* @__PURE__ */ new WeakSet();
    function memoize(obj) {
      if (inner.has(obj)) {
        return true;
      }
      inner.add(obj);
      return false;
    }
    function unmemoize(obj) {
      inner.delete(obj);
    }
    return [memoize, unmemoize];
  }
  function createEnvelope(headers, items = []) {
    return [headers, items];
  }
  function addItemToEnvelope(envelope, newItem) {
    const [headers, items] = envelope;
    return [headers, [...items, newItem]];
  }
  function forEachEnvelopeItem(envelope, callback) {
    const envelopeItems = envelope[1];
    for (const envelopeItem of envelopeItems) {
      const envelopeItemType = envelopeItem[0].type;
      const result = callback(envelopeItem, envelopeItemType);
      if (result) {
        return true;
      }
    }
    return false;
  }
  function encodeUTF8(input) {
    const carrier = getSentryCarrier(GLOBAL_OBJ);
    return carrier.encodePolyfill ? carrier.encodePolyfill(input) : new TextEncoder().encode(input);
  }
  function serializeEnvelope(envelope) {
    const [envHeaders, items] = envelope;
    let parts = JSON.stringify(envHeaders);
    function append2(next) {
      if (typeof parts === "string") {
        parts = typeof next === "string" ? parts + next : [encodeUTF8(parts), next];
      } else {
        parts.push(typeof next === "string" ? encodeUTF8(next) : next);
      }
    }
    for (const item of items) {
      const [itemHeaders, payload] = item;
      append2(`
${JSON.stringify(itemHeaders)}
`);
      if (typeof payload === "string" || payload instanceof Uint8Array) {
        append2(payload);
      } else {
        let stringifiedPayload;
        try {
          stringifiedPayload = JSON.stringify(payload);
        } catch {
          stringifiedPayload = JSON.stringify(normalize(payload));
        }
        append2(stringifiedPayload);
      }
    }
    return typeof parts === "string" ? parts : concatBuffers(parts);
  }
  function concatBuffers(buffers) {
    const totalLength = buffers.reduce((acc, buf) => acc + buf.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
      merged.set(buffer, offset);
      offset += buffer.length;
    }
    return merged;
  }
  function createAttachmentEnvelopeItem(attachment) {
    const buffer = typeof attachment.data === "string" ? encodeUTF8(attachment.data) : attachment.data;
    return [
      {
        type: "attachment",
        length: buffer.length,
        filename: attachment.filename,
        content_type: attachment.contentType,
        attachment_type: attachment.attachmentType
      },
      buffer
    ];
  }
  const ITEM_TYPE_TO_DATA_CATEGORY_MAP = {
    session: "session",
    sessions: "session",
    attachment: "attachment",
    transaction: "transaction",
    event: "error",
    client_report: "internal",
    user_report: "default",
    profile: "profile",
    profile_chunk: "profile",
    replay_event: "replay",
    replay_recording: "replay",
    check_in: "monitor",
    feedback: "feedback",
    span: "span",
    raw_security: "security",
    log: "log_item",
    metric: "metric",
    trace_metric: "metric"
  };
  function envelopeItemTypeToDataCategory(type) {
    return ITEM_TYPE_TO_DATA_CATEGORY_MAP[type];
  }
  function getSdkMetadataForEnvelopeHeader(metadataOrEvent) {
    if (!metadataOrEvent?.sdk) {
      return;
    }
    const { name, version: version2 } = metadataOrEvent.sdk;
    return { name, version: version2 };
  }
  function createEventEnvelopeHeaders(event, sdkInfo, tunnel, dsn) {
    const dynamicSamplingContext = event.sdkProcessingMetadata?.dynamicSamplingContext;
    return {
      event_id: event.event_id,
      sent_at: (/* @__PURE__ */ new Date()).toISOString(),
      ...sdkInfo && { sdk: sdkInfo },
      ...!!tunnel && dsn && { dsn: dsnToString(dsn) },
      ...dynamicSamplingContext && {
        trace: dynamicSamplingContext
      }
    };
  }
  function _enhanceEventWithSdkInfo(event, newSdkInfo) {
    if (!newSdkInfo) {
      return event;
    }
    const eventSdkInfo = event.sdk || {};
    event.sdk = {
      ...eventSdkInfo,
      name: eventSdkInfo.name || newSdkInfo.name,
      version: eventSdkInfo.version || newSdkInfo.version,
      integrations: [...event.sdk?.integrations || [], ...newSdkInfo.integrations || []],
      packages: [...event.sdk?.packages || [], ...newSdkInfo.packages || []],
      settings: event.sdk?.settings || newSdkInfo.settings ? {
        ...event.sdk?.settings,
        ...newSdkInfo.settings
      } : void 0
    };
    return event;
  }
  function createSessionEnvelope(session, dsn, metadata, tunnel) {
    const sdkInfo = getSdkMetadataForEnvelopeHeader(metadata);
    const envelopeHeaders = {
      sent_at: (/* @__PURE__ */ new Date()).toISOString(),
      ...sdkInfo && { sdk: sdkInfo },
      ...!!tunnel && dsn && { dsn: dsnToString(dsn) }
    };
    const envelopeItem = "aggregates" in session ? [{ type: "sessions" }, session] : [{ type: "session" }, session.toJSON()];
    return createEnvelope(envelopeHeaders, [envelopeItem]);
  }
  function createEventEnvelope(event, dsn, metadata, tunnel) {
    const sdkInfo = getSdkMetadataForEnvelopeHeader(metadata);
    const eventType = event.type && event.type !== "replay_event" ? event.type : "event";
    _enhanceEventWithSdkInfo(event, metadata?.sdk);
    const envelopeHeaders = createEventEnvelopeHeaders(event, sdkInfo, tunnel, dsn);
    delete event.sdkProcessingMetadata;
    const eventItem = [{ type: eventType }, event];
    return createEnvelope(envelopeHeaders, [eventItem]);
  }
  const STATE_PENDING = 0;
  const STATE_RESOLVED = 1;
  const STATE_REJECTED = 2;
  function resolvedSyncPromise(value) {
    return new SyncPromise((resolve) => {
      resolve(value);
    });
  }
  function rejectedSyncPromise(reason) {
    return new SyncPromise((_, reject) => {
      reject(reason);
    });
  }
  class SyncPromise {
    constructor(executor) {
      this._state = STATE_PENDING;
      this._handlers = [];
      this._runExecutor(executor);
    }
    /** @inheritdoc */
    then(onfulfilled, onrejected) {
      return new SyncPromise((resolve, reject) => {
        this._handlers.push([
          false,
          (result) => {
            if (!onfulfilled) {
              resolve(result);
            } else {
              try {
                resolve(onfulfilled(result));
              } catch (e) {
                reject(e);
              }
            }
          },
          (reason) => {
            if (!onrejected) {
              reject(reason);
            } else {
              try {
                resolve(onrejected(reason));
              } catch (e) {
                reject(e);
              }
            }
          }
        ]);
        this._executeHandlers();
      });
    }
    /** @inheritdoc */
    catch(onrejected) {
      return this.then((val) => val, onrejected);
    }
    /** @inheritdoc */
    finally(onfinally) {
      return new SyncPromise((resolve, reject) => {
        let val;
        let isRejected;
        return this.then(
          (value) => {
            isRejected = false;
            val = value;
            if (onfinally) {
              onfinally();
            }
          },
          (reason) => {
            isRejected = true;
            val = reason;
            if (onfinally) {
              onfinally();
            }
          }
        ).then(() => {
          if (isRejected) {
            reject(val);
            return;
          }
          resolve(val);
        });
      });
    }
    /** Excute the resolve/reject handlers. */
    _executeHandlers() {
      if (this._state === STATE_PENDING) {
        return;
      }
      const cachedHandlers = this._handlers.slice();
      this._handlers = [];
      cachedHandlers.forEach((handler) => {
        if (handler[0]) {
          return;
        }
        if (this._state === STATE_RESOLVED) {
          handler[1](this._value);
        }
        if (this._state === STATE_REJECTED) {
          handler[2](this._value);
        }
        handler[0] = true;
      });
    }
    /** Run the executor for the SyncPromise. */
    _runExecutor(executor) {
      const setResult = (state2, value) => {
        if (this._state !== STATE_PENDING) {
          return;
        }
        if (isThenable(value)) {
          void value.then(resolve, reject);
          return;
        }
        this._state = state2;
        this._value = value;
        this._executeHandlers();
      };
      const resolve = (value) => {
        setResult(STATE_RESOLVED, value);
      };
      const reject = (reason) => {
        setResult(STATE_REJECTED, reason);
      };
      try {
        executor(resolve, reject);
      } catch (e) {
        reject(e);
      }
    }
  }
  function notifyEventProcessors(processors, event, hint, index = 0) {
    try {
      const result = _notifyEventProcessors(event, hint, processors, index);
      return isThenable(result) ? result : resolvedSyncPromise(result);
    } catch (error2) {
      return rejectedSyncPromise(error2);
    }
  }
  function _notifyEventProcessors(event, hint, processors, index) {
    const processor = processors[index];
    if (!event || !processor) {
      return event;
    }
    const result = processor({ ...event }, hint);
    DEBUG_BUILD$2 && result === null && debug.log(`Event processor "${processor.id || "?"}" dropped event`);
    if (isThenable(result)) {
      return result.then((final) => _notifyEventProcessors(final, hint, processors, index + 1));
    }
    return _notifyEventProcessors(result, hint, processors, index + 1);
  }
  function applyScopeDataToEvent(event, data) {
    const { fingerprint, span, breadcrumbs, sdkProcessingMetadata } = data;
    applyDataToEvent(event, data);
    if (span) {
      applySpanToEvent(event, span);
    }
    applyFingerprintToEvent(event, fingerprint);
    applyBreadcrumbsToEvent(event, breadcrumbs);
    applySdkMetadataToEvent(event, sdkProcessingMetadata);
  }
  function mergeScopeData(data, mergeData) {
    const {
      extra,
      tags,
      user,
      contexts,
      level,
      sdkProcessingMetadata,
      breadcrumbs,
      fingerprint,
      eventProcessors,
      attachments,
      propagationContext,
      transactionName,
      span
    } = mergeData;
    mergeAndOverwriteScopeData(data, "extra", extra);
    mergeAndOverwriteScopeData(data, "tags", tags);
    mergeAndOverwriteScopeData(data, "user", user);
    mergeAndOverwriteScopeData(data, "contexts", contexts);
    data.sdkProcessingMetadata = merge(data.sdkProcessingMetadata, sdkProcessingMetadata, 2);
    if (level) {
      data.level = level;
    }
    if (transactionName) {
      data.transactionName = transactionName;
    }
    if (span) {
      data.span = span;
    }
    if (breadcrumbs.length) {
      data.breadcrumbs = [...data.breadcrumbs, ...breadcrumbs];
    }
    if (fingerprint.length) {
      data.fingerprint = [...data.fingerprint, ...fingerprint];
    }
    if (eventProcessors.length) {
      data.eventProcessors = [...data.eventProcessors, ...eventProcessors];
    }
    if (attachments.length) {
      data.attachments = [...data.attachments, ...attachments];
    }
    data.propagationContext = { ...data.propagationContext, ...propagationContext };
  }
  function mergeAndOverwriteScopeData(data, prop, mergeVal) {
    data[prop] = merge(data[prop], mergeVal, 1);
  }
  function applyDataToEvent(event, data) {
    const { extra, tags, user, contexts, level, transactionName } = data;
    if (Object.keys(extra).length) {
      event.extra = { ...extra, ...event.extra };
    }
    if (Object.keys(tags).length) {
      event.tags = { ...tags, ...event.tags };
    }
    if (Object.keys(user).length) {
      event.user = { ...user, ...event.user };
    }
    if (Object.keys(contexts).length) {
      event.contexts = { ...contexts, ...event.contexts };
    }
    if (level) {
      event.level = level;
    }
    if (transactionName && event.type !== "transaction") {
      event.transaction = transactionName;
    }
  }
  function applyBreadcrumbsToEvent(event, breadcrumbs) {
    const mergedBreadcrumbs = [...event.breadcrumbs || [], ...breadcrumbs];
    event.breadcrumbs = mergedBreadcrumbs.length ? mergedBreadcrumbs : void 0;
  }
  function applySdkMetadataToEvent(event, sdkProcessingMetadata) {
    event.sdkProcessingMetadata = {
      ...event.sdkProcessingMetadata,
      ...sdkProcessingMetadata
    };
  }
  function applySpanToEvent(event, span) {
    event.contexts = {
      trace: spanToTraceContext(span),
      ...event.contexts
    };
    event.sdkProcessingMetadata = {
      dynamicSamplingContext: getDynamicSamplingContextFromSpan(span),
      ...event.sdkProcessingMetadata
    };
    const rootSpan = getRootSpan(span);
    const transactionName = spanToJSON(rootSpan).description;
    if (transactionName && !event.transaction && event.type === "transaction") {
      event.transaction = transactionName;
    }
  }
  function applyFingerprintToEvent(event, fingerprint) {
    event.fingerprint = event.fingerprint ? Array.isArray(event.fingerprint) ? event.fingerprint : [event.fingerprint] : [];
    if (fingerprint) {
      event.fingerprint = event.fingerprint.concat(fingerprint);
    }
    if (!event.fingerprint.length) {
      delete event.fingerprint;
    }
  }
  let parsedStackResults;
  let lastSentryKeysCount;
  let lastNativeKeysCount;
  let cachedFilenameDebugIds;
  function getFilenameToDebugIdMap(stackParser) {
    const sentryDebugIdMap = GLOBAL_OBJ._sentryDebugIds;
    const nativeDebugIdMap = GLOBAL_OBJ._debugIds;
    if (!sentryDebugIdMap && !nativeDebugIdMap) {
      return {};
    }
    const sentryDebugIdKeys = sentryDebugIdMap ? Object.keys(sentryDebugIdMap) : [];
    const nativeDebugIdKeys = nativeDebugIdMap ? Object.keys(nativeDebugIdMap) : [];
    if (cachedFilenameDebugIds && sentryDebugIdKeys.length === lastSentryKeysCount && nativeDebugIdKeys.length === lastNativeKeysCount) {
      return cachedFilenameDebugIds;
    }
    lastSentryKeysCount = sentryDebugIdKeys.length;
    lastNativeKeysCount = nativeDebugIdKeys.length;
    cachedFilenameDebugIds = {};
    if (!parsedStackResults) {
      parsedStackResults = {};
    }
    const processDebugIds = (debugIdKeys, debugIdMap) => {
      for (const key of debugIdKeys) {
        const debugId = debugIdMap[key];
        const result = parsedStackResults?.[key];
        if (result && cachedFilenameDebugIds && debugId) {
          cachedFilenameDebugIds[result[0]] = debugId;
          if (parsedStackResults) {
            parsedStackResults[key] = [result[0], debugId];
          }
        } else if (debugId) {
          const parsedStack = stackParser(key);
          for (let i2 = parsedStack.length - 1; i2 >= 0; i2--) {
            const stackFrame = parsedStack[i2];
            const filename = stackFrame?.filename;
            if (filename && cachedFilenameDebugIds && parsedStackResults) {
              cachedFilenameDebugIds[filename] = debugId;
              parsedStackResults[key] = [filename, debugId];
              break;
            }
          }
        }
      }
    };
    if (sentryDebugIdMap) {
      processDebugIds(sentryDebugIdKeys, sentryDebugIdMap);
    }
    if (nativeDebugIdMap) {
      processDebugIds(nativeDebugIdKeys, nativeDebugIdMap);
    }
    return cachedFilenameDebugIds;
  }
  function prepareEvent(options, event, hint, scope, client, isolationScope) {
    const { normalizeDepth = 3, normalizeMaxBreadth = 1e3 } = options;
    const prepared = {
      ...event,
      event_id: event.event_id || hint.event_id || uuid4(),
      timestamp: event.timestamp || dateTimestampInSeconds()
    };
    const integrations = hint.integrations || options.integrations.map((i2) => i2.name);
    applyClientOptions(prepared, options);
    applyIntegrationsMetadata(prepared, integrations);
    if (client) {
      client.emit("applyFrameMetadata", event);
    }
    if (event.type === void 0) {
      applyDebugIds(prepared, options.stackParser);
    }
    const finalScope = getFinalScope(scope, hint.captureContext);
    if (hint.mechanism) {
      addExceptionMechanism(prepared, hint.mechanism);
    }
    const clientEventProcessors = client ? client.getEventProcessors() : [];
    const data = getGlobalScope().getScopeData();
    if (isolationScope) {
      const isolationData = isolationScope.getScopeData();
      mergeScopeData(data, isolationData);
    }
    if (finalScope) {
      const finalScopeData = finalScope.getScopeData();
      mergeScopeData(data, finalScopeData);
    }
    const attachments = [...hint.attachments || [], ...data.attachments];
    if (attachments.length) {
      hint.attachments = attachments;
    }
    applyScopeDataToEvent(prepared, data);
    const eventProcessors = [
      ...clientEventProcessors,
      // Run scope event processors _after_ all other processors
      ...data.eventProcessors
    ];
    const result = notifyEventProcessors(eventProcessors, prepared, hint);
    return result.then((evt) => {
      if (evt) {
        applyDebugMeta(evt);
      }
      if (typeof normalizeDepth === "number" && normalizeDepth > 0) {
        return normalizeEvent(evt, normalizeDepth, normalizeMaxBreadth);
      }
      return evt;
    });
  }
  function applyClientOptions(event, options) {
    const { environment, release, dist, maxValueLength } = options;
    event.environment = event.environment || environment || DEFAULT_ENVIRONMENT;
    if (!event.release && release) {
      event.release = release;
    }
    if (!event.dist && dist) {
      event.dist = dist;
    }
    const request = event.request;
    if (request?.url && maxValueLength) {
      request.url = truncate(request.url, maxValueLength);
    }
    if (maxValueLength) {
      event.exception?.values?.forEach((exception) => {
        if (exception.value) {
          exception.value = truncate(exception.value, maxValueLength);
        }
      });
    }
  }
  function applyDebugIds(event, stackParser) {
    const filenameDebugIdMap = getFilenameToDebugIdMap(stackParser);
    event.exception?.values?.forEach((exception) => {
      exception.stacktrace?.frames?.forEach((frame) => {
        if (frame.filename) {
          frame.debug_id = filenameDebugIdMap[frame.filename];
        }
      });
    });
  }
  function applyDebugMeta(event) {
    const filenameDebugIdMap = {};
    event.exception?.values?.forEach((exception) => {
      exception.stacktrace?.frames?.forEach((frame) => {
        if (frame.debug_id) {
          if (frame.abs_path) {
            filenameDebugIdMap[frame.abs_path] = frame.debug_id;
          } else if (frame.filename) {
            filenameDebugIdMap[frame.filename] = frame.debug_id;
          }
          delete frame.debug_id;
        }
      });
    });
    if (Object.keys(filenameDebugIdMap).length === 0) {
      return;
    }
    event.debug_meta = event.debug_meta || {};
    event.debug_meta.images = event.debug_meta.images || [];
    const images = event.debug_meta.images;
    Object.entries(filenameDebugIdMap).forEach(([filename, debug_id]) => {
      images.push({
        type: "sourcemap",
        code_file: filename,
        debug_id
      });
    });
  }
  function applyIntegrationsMetadata(event, integrationNames) {
    if (integrationNames.length > 0) {
      event.sdk = event.sdk || {};
      event.sdk.integrations = [...event.sdk.integrations || [], ...integrationNames];
    }
  }
  function normalizeEvent(event, depth3, maxBreadth) {
    if (!event) {
      return null;
    }
    const normalized = {
      ...event,
      ...event.breadcrumbs && {
        breadcrumbs: event.breadcrumbs.map((b) => ({
          ...b,
          ...b.data && {
            data: normalize(b.data, depth3, maxBreadth)
          }
        }))
      },
      ...event.user && {
        user: normalize(event.user, depth3, maxBreadth)
      },
      ...event.contexts && {
        contexts: normalize(event.contexts, depth3, maxBreadth)
      },
      ...event.extra && {
        extra: normalize(event.extra, depth3, maxBreadth)
      }
    };
    if (event.contexts?.trace && normalized.contexts) {
      normalized.contexts.trace = event.contexts.trace;
      if (event.contexts.trace.data) {
        normalized.contexts.trace.data = normalize(event.contexts.trace.data, depth3, maxBreadth);
      }
    }
    if (event.spans) {
      normalized.spans = event.spans.map((span) => {
        return {
          ...span,
          ...span.data && {
            data: normalize(span.data, depth3, maxBreadth)
          }
        };
      });
    }
    if (event.contexts?.flags && normalized.contexts) {
      normalized.contexts.flags = normalize(event.contexts.flags, 3, maxBreadth);
    }
    return normalized;
  }
  function getFinalScope(scope, captureContext) {
    if (!captureContext) {
      return scope;
    }
    const finalScope = scope ? scope.clone() : new Scope();
    finalScope.update(captureContext);
    return finalScope;
  }
  function parseEventHintOrCaptureContext(hint) {
    if (!hint) {
      return void 0;
    }
    if (hintIsScopeOrFunction(hint)) {
      return { captureContext: hint };
    }
    if (hintIsScopeContext(hint)) {
      return {
        captureContext: hint
      };
    }
    return hint;
  }
  function hintIsScopeOrFunction(hint) {
    return hint instanceof Scope || typeof hint === "function";
  }
  const captureContextKeys = [
    "user",
    "level",
    "extra",
    "contexts",
    "tags",
    "fingerprint",
    "propagationContext"
  ];
  function hintIsScopeContext(hint) {
    return Object.keys(hint).some((key) => captureContextKeys.includes(key));
  }
  function captureException(exception, hint) {
    return getCurrentScope().captureException(exception, parseEventHintOrCaptureContext(hint));
  }
  function captureEvent(event, hint) {
    return getCurrentScope().captureEvent(event, hint);
  }
  function setTag(key, value) {
    getIsolationScope().setTag(key, value);
  }
  function startSession(context) {
    const isolationScope = getIsolationScope();
    const currentScope = getCurrentScope();
    const { userAgent } = GLOBAL_OBJ.navigator || {};
    const session = makeSession({
      user: currentScope.getUser() || isolationScope.getUser(),
      ...userAgent && { userAgent },
      ...context
    });
    const currentSession = isolationScope.getSession();
    if (currentSession?.status === "ok") {
      updateSession(currentSession, { status: "exited" });
    }
    endSession();
    isolationScope.setSession(session);
    return session;
  }
  function endSession() {
    const isolationScope = getIsolationScope();
    const currentScope = getCurrentScope();
    const session = currentScope.getSession() || isolationScope.getSession();
    if (session) {
      closeSession(session);
    }
    _sendSessionUpdate();
    isolationScope.setSession();
  }
  function _sendSessionUpdate() {
    const isolationScope = getIsolationScope();
    const client = getClient();
    const session = isolationScope.getSession();
    if (session && client) {
      client.captureSession(session);
    }
  }
  function captureSession(end = false) {
    if (end) {
      endSession();
      return;
    }
    _sendSessionUpdate();
  }
  const SENTRY_API_VERSION = "7";
  function getBaseApiEndpoint(dsn) {
    const protocol = dsn.protocol ? `${dsn.protocol}:` : "";
    const port = dsn.port ? `:${dsn.port}` : "";
    return `${protocol}//${dsn.host}${port}${dsn.path ? `/${dsn.path}` : ""}/api/`;
  }
  function _getIngestEndpoint(dsn) {
    return `${getBaseApiEndpoint(dsn)}${dsn.projectId}/envelope/`;
  }
  function _encodedAuth(dsn, sdkInfo) {
    const params2 = {
      sentry_version: SENTRY_API_VERSION
    };
    if (dsn.publicKey) {
      params2.sentry_key = dsn.publicKey;
    }
    if (sdkInfo) {
      params2.sentry_client = `${sdkInfo.name}/${sdkInfo.version}`;
    }
    return new URLSearchParams(params2).toString();
  }
  function getEnvelopeEndpointWithUrlEncodedAuth(dsn, tunnel, sdkInfo) {
    return tunnel ? tunnel : `${_getIngestEndpoint(dsn)}?${_encodedAuth(dsn, sdkInfo)}`;
  }
  const installedIntegrations = [];
  function filterDuplicates(integrations) {
    const integrationsByName = {};
    integrations.forEach((currentInstance) => {
      const { name } = currentInstance;
      const existingInstance = integrationsByName[name];
      if (existingInstance && !existingInstance.isDefaultInstance && currentInstance.isDefaultInstance) {
        return;
      }
      integrationsByName[name] = currentInstance;
    });
    return Object.values(integrationsByName);
  }
  function getIntegrationsToSetup(options) {
    const defaultIntegrations = options.defaultIntegrations || [];
    const userIntegrations = options.integrations;
    defaultIntegrations.forEach((integration) => {
      integration.isDefaultInstance = true;
    });
    let integrations;
    if (Array.isArray(userIntegrations)) {
      integrations = [...defaultIntegrations, ...userIntegrations];
    } else if (typeof userIntegrations === "function") {
      const resolvedUserIntegrations = userIntegrations(defaultIntegrations);
      integrations = Array.isArray(resolvedUserIntegrations) ? resolvedUserIntegrations : [resolvedUserIntegrations];
    } else {
      integrations = defaultIntegrations;
    }
    return filterDuplicates(integrations);
  }
  function setupIntegrations(client, integrations) {
    const integrationIndex = {};
    integrations.forEach((integration) => {
      if (integration) {
        setupIntegration(client, integration, integrationIndex);
      }
    });
    return integrationIndex;
  }
  function afterSetupIntegrations(client, integrations) {
    for (const integration of integrations) {
      if (integration?.afterAllSetup) {
        integration.afterAllSetup(client);
      }
    }
  }
  function setupIntegration(client, integration, integrationIndex) {
    if (integrationIndex[integration.name]) {
      DEBUG_BUILD$2 && debug.log(`Integration skipped because it was already installed: ${integration.name}`);
      return;
    }
    integrationIndex[integration.name] = integration;
    if (!installedIntegrations.includes(integration.name) && typeof integration.setupOnce === "function") {
      integration.setupOnce();
      installedIntegrations.push(integration.name);
    }
    if (integration.setup && typeof integration.setup === "function") {
      integration.setup(client);
    }
    if (typeof integration.preprocessEvent === "function") {
      const callback = integration.preprocessEvent.bind(integration);
      client.on("preprocessEvent", (event, hint) => callback(event, hint, client));
    }
    if (typeof integration.processEvent === "function") {
      const callback = integration.processEvent.bind(integration);
      const processor = Object.assign((event, hint) => callback(event, hint, client), {
        id: integration.name
      });
      client.addEventProcessor(processor);
    }
    DEBUG_BUILD$2 && debug.log(`Integration installed: ${integration.name}`);
  }
  function defineIntegration(fn) {
    return fn;
  }
  function createLogContainerEnvelopeItem(items) {
    return [
      {
        type: "log",
        item_count: items.length,
        content_type: "application/vnd.sentry.items.log+json"
      },
      {
        items
      }
    ];
  }
  function createLogEnvelope(logs, metadata, tunnel, dsn) {
    const headers = {};
    if (metadata?.sdk) {
      headers.sdk = {
        name: metadata.sdk.name,
        version: metadata.sdk.version
      };
    }
    if (!!tunnel && !!dsn) {
      headers.dsn = dsnToString(dsn);
    }
    return createEnvelope(headers, [createLogContainerEnvelopeItem(logs)]);
  }
  function _INTERNAL_flushLogsBuffer(client, maybeLogBuffer) {
    const logBuffer = maybeLogBuffer ?? _INTERNAL_getLogBuffer(client) ?? [];
    if (logBuffer.length === 0) {
      return;
    }
    const clientOptions = client.getOptions();
    const envelope = createLogEnvelope(logBuffer, clientOptions._metadata, clientOptions.tunnel, client.getDsn());
    _getBufferMap$1().set(client, []);
    client.emit("flushLogs");
    client.sendEnvelope(envelope);
  }
  function _INTERNAL_getLogBuffer(client) {
    return _getBufferMap$1().get(client);
  }
  function _getBufferMap$1() {
    return getGlobalSingleton("clientToLogBufferMap", () => /* @__PURE__ */ new WeakMap());
  }
  function createMetricContainerEnvelopeItem(items) {
    return [
      {
        type: "trace_metric",
        item_count: items.length,
        content_type: "application/vnd.sentry.items.trace-metric+json"
      },
      {
        items
      }
    ];
  }
  function createMetricEnvelope(metrics, metadata, tunnel, dsn) {
    const headers = {};
    if (metadata?.sdk) {
      headers.sdk = {
        name: metadata.sdk.name,
        version: metadata.sdk.version
      };
    }
    if (!!tunnel && !!dsn) {
      headers.dsn = dsnToString(dsn);
    }
    return createEnvelope(headers, [createMetricContainerEnvelopeItem(metrics)]);
  }
  function _INTERNAL_flushMetricsBuffer(client, maybeMetricBuffer) {
    const metricBuffer = maybeMetricBuffer ?? _INTERNAL_getMetricBuffer(client) ?? [];
    if (metricBuffer.length === 0) {
      return;
    }
    const clientOptions = client.getOptions();
    const envelope = createMetricEnvelope(metricBuffer, clientOptions._metadata, clientOptions.tunnel, client.getDsn());
    _getBufferMap().set(client, []);
    client.emit("flushMetrics");
    client.sendEnvelope(envelope);
  }
  function _INTERNAL_getMetricBuffer(client) {
    return _getBufferMap().get(client);
  }
  function _getBufferMap() {
    return getGlobalSingleton("clientToMetricBufferMap", () => /* @__PURE__ */ new WeakMap());
  }
  const SENTRY_BUFFER_FULL_ERROR = /* @__PURE__ */ Symbol.for("SentryBufferFullError");
  function makePromiseBuffer(limit = 100) {
    const buffer = /* @__PURE__ */ new Set();
    function isReady() {
      return buffer.size < limit;
    }
    function remove(task) {
      buffer.delete(task);
    }
    function add(taskProducer) {
      if (!isReady()) {
        return rejectedSyncPromise(SENTRY_BUFFER_FULL_ERROR);
      }
      const task = taskProducer();
      buffer.add(task);
      void task.then(
        () => remove(task),
        () => remove(task)
      );
      return task;
    }
    function drain(timeout) {
      if (!buffer.size) {
        return resolvedSyncPromise(true);
      }
      const drainPromise = Promise.allSettled(Array.from(buffer)).then(() => true);
      if (!timeout) {
        return drainPromise;
      }
      const promises = [drainPromise, new Promise((resolve) => setTimeout(() => resolve(false), timeout))];
      return Promise.race(promises);
    }
    return {
      get $() {
        return Array.from(buffer);
      },
      add,
      drain
    };
  }
  const DEFAULT_RETRY_AFTER = 60 * 1e3;
  function parseRetryAfterHeader(header, now = Date.now()) {
    const headerDelay = parseInt(`${header}`, 10);
    if (!isNaN(headerDelay)) {
      return headerDelay * 1e3;
    }
    const headerDate = Date.parse(`${header}`);
    if (!isNaN(headerDate)) {
      return headerDate - now;
    }
    return DEFAULT_RETRY_AFTER;
  }
  function disabledUntil(limits, dataCategory) {
    return limits[dataCategory] || limits.all || 0;
  }
  function isRateLimited(limits, dataCategory, now = Date.now()) {
    return disabledUntil(limits, dataCategory) > now;
  }
  function updateRateLimits(limits, { statusCode, headers }, now = Date.now()) {
    const updatedRateLimits = {
      ...limits
    };
    const rateLimitHeader = headers?.["x-sentry-rate-limits"];
    const retryAfterHeader = headers?.["retry-after"];
    if (rateLimitHeader) {
      for (const limit of rateLimitHeader.trim().split(",")) {
        const [retryAfter, categories, , , namespaces] = limit.split(":", 5);
        const headerDelay = parseInt(retryAfter, 10);
        const delay = (!isNaN(headerDelay) ? headerDelay : 60) * 1e3;
        if (!categories) {
          updatedRateLimits.all = now + delay;
        } else {
          for (const category of categories.split(";")) {
            if (category === "metric_bucket") {
              if (!namespaces || namespaces.split(";").includes("custom")) {
                updatedRateLimits[category] = now + delay;
              }
            } else {
              updatedRateLimits[category] = now + delay;
            }
          }
        }
      }
    } else if (retryAfterHeader) {
      updatedRateLimits.all = now + parseRetryAfterHeader(retryAfterHeader, now);
    } else if (statusCode === 429) {
      updatedRateLimits.all = now + 60 * 1e3;
    }
    return updatedRateLimits;
  }
  const DEFAULT_TRANSPORT_BUFFER_SIZE = 64;
  function createTransport(options, makeRequest, buffer = makePromiseBuffer(
    options.bufferSize || DEFAULT_TRANSPORT_BUFFER_SIZE
  )) {
    let rateLimits = {};
    const flush = (timeout) => buffer.drain(timeout);
    function send(envelope) {
      const filteredEnvelopeItems = [];
      forEachEnvelopeItem(envelope, (item, type) => {
        const dataCategory = envelopeItemTypeToDataCategory(type);
        if (isRateLimited(rateLimits, dataCategory)) {
          options.recordDroppedEvent("ratelimit_backoff", dataCategory);
        } else {
          filteredEnvelopeItems.push(item);
        }
      });
      if (filteredEnvelopeItems.length === 0) {
        return Promise.resolve({});
      }
      const filteredEnvelope = createEnvelope(envelope[0], filteredEnvelopeItems);
      const recordEnvelopeLoss = (reason) => {
        forEachEnvelopeItem(filteredEnvelope, (item, type) => {
          options.recordDroppedEvent(reason, envelopeItemTypeToDataCategory(type));
        });
      };
      const requestTask = () => makeRequest({ body: serializeEnvelope(filteredEnvelope) }).then(
        (response) => {
          if (response.statusCode !== void 0 && (response.statusCode < 200 || response.statusCode >= 300)) {
            DEBUG_BUILD$2 && debug.warn(`Sentry responded with status code ${response.statusCode} to sent event.`);
          }
          rateLimits = updateRateLimits(rateLimits, response);
          return response;
        },
        (error2) => {
          recordEnvelopeLoss("network_error");
          DEBUG_BUILD$2 && debug.error("Encountered error running transport request:", error2);
          throw error2;
        }
      );
      return buffer.add(requestTask).then(
        (result) => result,
        (error2) => {
          if (error2 === SENTRY_BUFFER_FULL_ERROR) {
            DEBUG_BUILD$2 && debug.error("Skipped sending event because buffer is full.");
            recordEnvelopeLoss("queue_overflow");
            return Promise.resolve({});
          } else {
            throw error2;
          }
        }
      );
    }
    return {
      send,
      flush
    };
  }
  function createClientReportEnvelope(discarded_events, dsn, timestamp) {
    const clientReportItem = [
      { type: "client_report" },
      {
        timestamp: dateTimestampInSeconds(),
        discarded_events
      }
    ];
    return createEnvelope(dsn ? { dsn } : {}, [clientReportItem]);
  }
  function getPossibleEventMessages(event) {
    const possibleMessages = [];
    if (event.message) {
      possibleMessages.push(event.message);
    }
    try {
      const lastException = event.exception.values[event.exception.values.length - 1];
      if (lastException?.value) {
        possibleMessages.push(lastException.value);
        if (lastException.type) {
          possibleMessages.push(`${lastException.type}: ${lastException.value}`);
        }
      }
    } catch {
    }
    return possibleMessages;
  }
  function convertTransactionEventToSpanJson(event) {
    const { trace_id, parent_span_id, span_id, status, origin, data, op } = event.contexts?.trace ?? {};
    return {
      data: data ?? {},
      description: event.transaction,
      op,
      parent_span_id,
      span_id: span_id ?? "",
      start_timestamp: event.start_timestamp ?? 0,
      status,
      timestamp: event.timestamp,
      trace_id: trace_id ?? "",
      origin,
      profile_id: data?.[SEMANTIC_ATTRIBUTE_PROFILE_ID],
      exclusive_time: data?.[SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME],
      measurements: event.measurements,
      is_segment: true
    };
  }
  function convertSpanJsonToTransactionEvent(span) {
    return {
      type: "transaction",
      timestamp: span.timestamp,
      start_timestamp: span.start_timestamp,
      transaction: span.description,
      contexts: {
        trace: {
          trace_id: span.trace_id,
          span_id: span.span_id,
          parent_span_id: span.parent_span_id,
          op: span.op,
          status: span.status,
          origin: span.origin,
          data: {
            ...span.data,
            ...span.profile_id && { [SEMANTIC_ATTRIBUTE_PROFILE_ID]: span.profile_id },
            ...span.exclusive_time && { [SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME]: span.exclusive_time }
          }
        }
      },
      measurements: span.measurements
    };
  }
  const ALREADY_SEEN_ERROR = "Not capturing exception because it's already been captured.";
  const MISSING_RELEASE_FOR_SESSION_ERROR = "Discarded session because of missing or non-string release";
  const INTERNAL_ERROR_SYMBOL = /* @__PURE__ */ Symbol.for("SentryInternalError");
  const DO_NOT_SEND_EVENT_SYMBOL = /* @__PURE__ */ Symbol.for("SentryDoNotSendEventError");
  const DEFAULT_FLUSH_INTERVAL = 5e3;
  function _makeInternalError(message) {
    return {
      message,
      [INTERNAL_ERROR_SYMBOL]: true
    };
  }
  function _makeDoNotSendEventError(message) {
    return {
      message,
      [DO_NOT_SEND_EVENT_SYMBOL]: true
    };
  }
  function _isInternalError(error2) {
    return !!error2 && typeof error2 === "object" && INTERNAL_ERROR_SYMBOL in error2;
  }
  function _isDoNotSendEventError(error2) {
    return !!error2 && typeof error2 === "object" && DO_NOT_SEND_EVENT_SYMBOL in error2;
  }
  function setupWeightBasedFlushing(client, afterCaptureHook, flushHook, estimateSizeFn, flushFn) {
    let weight = 0;
    let flushTimeout;
    let isTimerActive = false;
    client.on(flushHook, () => {
      weight = 0;
      clearTimeout(flushTimeout);
      isTimerActive = false;
    });
    client.on(afterCaptureHook, (item) => {
      weight += estimateSizeFn(item);
      if (weight >= 8e5) {
        flushFn(client);
      } else if (!isTimerActive) {
        isTimerActive = true;
        flushTimeout = setTimeout(() => {
          flushFn(client);
        }, DEFAULT_FLUSH_INTERVAL);
      }
    });
    client.on("flush", () => {
      flushFn(client);
    });
  }
  class Client {
    /** Options passed to the SDK. */
    /** The client Dsn, if specified in options. Without this Dsn, the SDK will be disabled. */
    /** Array of set up integrations. */
    /** Number of calls being processed */
    /** Holds flushable  */
    // eslint-disable-next-line @typescript-eslint/ban-types
    /**
     * Initializes this client instance.
     *
     * @param options Options for the client.
     */
    constructor(options) {
      this._options = options;
      this._integrations = {};
      this._numProcessing = 0;
      this._outcomes = {};
      this._hooks = {};
      this._eventProcessors = [];
      this._promiseBuffer = makePromiseBuffer(options.transportOptions?.bufferSize ?? DEFAULT_TRANSPORT_BUFFER_SIZE);
      if (options.dsn) {
        this._dsn = makeDsn(options.dsn);
      } else {
        DEBUG_BUILD$2 && debug.warn("No DSN provided, client will not send events.");
      }
      if (this._dsn) {
        const url = getEnvelopeEndpointWithUrlEncodedAuth(
          this._dsn,
          options.tunnel,
          options._metadata ? options._metadata.sdk : void 0
        );
        this._transport = options.transport({
          tunnel: this._options.tunnel,
          recordDroppedEvent: this.recordDroppedEvent.bind(this),
          ...options.transportOptions,
          url
        });
      }
      this._options.enableLogs = this._options.enableLogs ?? this._options._experiments?.enableLogs;
      if (this._options.enableLogs) {
        setupWeightBasedFlushing(this, "afterCaptureLog", "flushLogs", estimateLogSizeInBytes, _INTERNAL_flushLogsBuffer);
      }
      const enableMetrics = this._options.enableMetrics ?? this._options._experiments?.enableMetrics ?? true;
      if (enableMetrics) {
        setupWeightBasedFlushing(
          this,
          "afterCaptureMetric",
          "flushMetrics",
          estimateMetricSizeInBytes,
          _INTERNAL_flushMetricsBuffer
        );
      }
    }
    /**
     * Captures an exception event and sends it to Sentry.
     *
     * Unlike `captureException` exported from every SDK, this method requires that you pass it the current scope.
     */
    captureException(exception, hint, scope) {
      const eventId = uuid4();
      if (checkOrSetAlreadyCaught(exception)) {
        DEBUG_BUILD$2 && debug.log(ALREADY_SEEN_ERROR);
        return eventId;
      }
      const hintWithEventId = {
        event_id: eventId,
        ...hint
      };
      this._process(
        () => this.eventFromException(exception, hintWithEventId).then((event) => this._captureEvent(event, hintWithEventId, scope)).then((res) => res),
        "error"
      );
      return hintWithEventId.event_id;
    }
    /**
     * Captures a message event and sends it to Sentry.
     *
     * Unlike `captureMessage` exported from every SDK, this method requires that you pass it the current scope.
     */
    captureMessage(message, level, hint, currentScope) {
      const hintWithEventId = {
        event_id: uuid4(),
        ...hint
      };
      const eventMessage = isParameterizedString(message) ? message : String(message);
      const isMessage = isPrimitive(message);
      const promisedEvent = isMessage ? this.eventFromMessage(eventMessage, level, hintWithEventId) : this.eventFromException(message, hintWithEventId);
      this._process(
        () => promisedEvent.then((event) => this._captureEvent(event, hintWithEventId, currentScope)),
        isMessage ? "unknown" : "error"
      );
      return hintWithEventId.event_id;
    }
    /**
     * Captures a manually created event and sends it to Sentry.
     *
     * Unlike `captureEvent` exported from every SDK, this method requires that you pass it the current scope.
     */
    captureEvent(event, hint, currentScope) {
      const eventId = uuid4();
      if (hint?.originalException && checkOrSetAlreadyCaught(hint.originalException)) {
        DEBUG_BUILD$2 && debug.log(ALREADY_SEEN_ERROR);
        return eventId;
      }
      const hintWithEventId = {
        event_id: eventId,
        ...hint
      };
      const sdkProcessingMetadata = event.sdkProcessingMetadata || {};
      const capturedSpanScope = sdkProcessingMetadata.capturedSpanScope;
      const capturedSpanIsolationScope = sdkProcessingMetadata.capturedSpanIsolationScope;
      const dataCategory = getDataCategoryByType(event.type);
      this._process(
        () => this._captureEvent(event, hintWithEventId, capturedSpanScope || currentScope, capturedSpanIsolationScope),
        dataCategory
      );
      return hintWithEventId.event_id;
    }
    /**
     * Captures a session.
     */
    captureSession(session) {
      this.sendSession(session);
      updateSession(session, { init: false });
    }
    /**
     * Create a cron monitor check in and send it to Sentry. This method is not available on all clients.
     *
     * @param checkIn An object that describes a check in.
     * @param upsertMonitorConfig An optional object that describes a monitor config. Use this if you want
     * to create a monitor automatically when sending a check in.
     * @param scope An optional scope containing event metadata.
     * @returns A string representing the id of the check in.
     */
    /**
     * Get the current Dsn.
     */
    getDsn() {
      return this._dsn;
    }
    /**
     * Get the current options.
     */
    getOptions() {
      return this._options;
    }
    /**
     * Get the SDK metadata.
     * @see SdkMetadata
     */
    getSdkMetadata() {
      return this._options._metadata;
    }
    /**
     * Returns the transport that is used by the client.
     * Please note that the transport gets lazy initialized so it will only be there once the first event has been sent.
     */
    getTransport() {
      return this._transport;
    }
    /**
     * Wait for all events to be sent or the timeout to expire, whichever comes first.
     *
     * @param timeout Maximum time in ms the client should wait for events to be flushed. Omitting this parameter will
     *   cause the client to wait until all events are sent before resolving the promise.
     * @returns A promise that will resolve with `true` if all events are sent before the timeout, or `false` if there are
     * still events in the queue when the timeout is reached.
     */
    // @ts-expect-error - PromiseLike is a subset of Promise
    async flush(timeout) {
      const transport = this._transport;
      if (!transport) {
        return true;
      }
      this.emit("flush");
      const clientFinished = await this._isClientDoneProcessing(timeout);
      const transportFlushed = await transport.flush(timeout);
      return clientFinished && transportFlushed;
    }
    /**
     * Flush the event queue and set the client to `enabled = false`. See {@link Client.flush}.
     *
     * @param {number} timeout Maximum time in ms the client should wait before shutting down. Omitting this parameter will cause
     *   the client to wait until all events are sent before disabling itself.
     * @returns {Promise<boolean>} A promise which resolves to `true` if the flush completes successfully before the timeout, or `false` if
     * it doesn't.
     */
    // @ts-expect-error - PromiseLike is a subset of Promise
    async close(timeout) {
      const result = await this.flush(timeout);
      this.getOptions().enabled = false;
      this.emit("close");
      return result;
    }
    /**
     * Get all installed event processors.
     */
    getEventProcessors() {
      return this._eventProcessors;
    }
    /**
     * Adds an event processor that applies to any event processed by this client.
     */
    addEventProcessor(eventProcessor) {
      this._eventProcessors.push(eventProcessor);
    }
    /**
     * Initialize this client.
     * Call this after the client was set on a scope.
     */
    init() {
      if (this._isEnabled() || // Force integrations to be setup even if no DSN was set when we have
      // Spotlight enabled. This is particularly important for browser as we
      // don't support the `spotlight` option there and rely on the users
      // adding the `spotlightBrowserIntegration()` to their integrations which
      // wouldn't get initialized with the check below when there's no DSN set.
      this._options.integrations.some(({ name }) => name.startsWith("Spotlight"))) {
        this._setupIntegrations();
      }
    }
    /**
     * Gets an installed integration by its name.
     *
     * @returns {Integration|undefined} The installed integration or `undefined` if no integration with that `name` was installed.
     */
    getIntegrationByName(integrationName) {
      return this._integrations[integrationName];
    }
    /**
     * Add an integration to the client.
     * This can be used to e.g. lazy load integrations.
     * In most cases, this should not be necessary,
     * and you're better off just passing the integrations via `integrations: []` at initialization time.
     * However, if you find the need to conditionally load & add an integration, you can use `addIntegration` to do so.
     */
    addIntegration(integration) {
      const isAlreadyInstalled = this._integrations[integration.name];
      setupIntegration(this, integration, this._integrations);
      if (!isAlreadyInstalled) {
        afterSetupIntegrations(this, [integration]);
      }
    }
    /**
     * Send a fully prepared event to Sentry.
     */
    sendEvent(event, hint = {}) {
      this.emit("beforeSendEvent", event, hint);
      let env = createEventEnvelope(event, this._dsn, this._options._metadata, this._options.tunnel);
      for (const attachment of hint.attachments || []) {
        env = addItemToEnvelope(env, createAttachmentEnvelopeItem(attachment));
      }
      this.sendEnvelope(env).then((sendResponse) => this.emit("afterSendEvent", event, sendResponse));
    }
    /**
     * Send a session or session aggregrates to Sentry.
     */
    sendSession(session) {
      const { release: clientReleaseOption, environment: clientEnvironmentOption = DEFAULT_ENVIRONMENT } = this._options;
      if ("aggregates" in session) {
        const sessionAttrs = session.attrs || {};
        if (!sessionAttrs.release && !clientReleaseOption) {
          DEBUG_BUILD$2 && debug.warn(MISSING_RELEASE_FOR_SESSION_ERROR);
          return;
        }
        sessionAttrs.release = sessionAttrs.release || clientReleaseOption;
        sessionAttrs.environment = sessionAttrs.environment || clientEnvironmentOption;
        session.attrs = sessionAttrs;
      } else {
        if (!session.release && !clientReleaseOption) {
          DEBUG_BUILD$2 && debug.warn(MISSING_RELEASE_FOR_SESSION_ERROR);
          return;
        }
        session.release = session.release || clientReleaseOption;
        session.environment = session.environment || clientEnvironmentOption;
      }
      this.emit("beforeSendSession", session);
      const env = createSessionEnvelope(session, this._dsn, this._options._metadata, this._options.tunnel);
      this.sendEnvelope(env);
    }
    /**
     * Record on the client that an event got dropped (ie, an event that will not be sent to Sentry).
     */
    recordDroppedEvent(reason, category, count = 1) {
      if (this._options.sendClientReports) {
        const key = `${reason}:${category}`;
        DEBUG_BUILD$2 && debug.log(`Recording outcome: "${key}"${count > 1 ? ` (${count} times)` : ""}`);
        this._outcomes[key] = (this._outcomes[key] || 0) + count;
      }
    }
    /* eslint-disable @typescript-eslint/unified-signatures */
    /**
     * Register a callback for whenever a span is started.
     * Receives the span as argument.
     * @returns {() => void} A function that, when executed, removes the registered callback.
     */
    /**
     * Register a hook on this client.
     */
    on(hook, callback) {
      const hookCallbacks = this._hooks[hook] = this._hooks[hook] || /* @__PURE__ */ new Set();
      const uniqueCallback = (...args) => callback(...args);
      hookCallbacks.add(uniqueCallback);
      return () => {
        hookCallbacks.delete(uniqueCallback);
      };
    }
    /** Fire a hook whenever a span starts. */
    /**
     * Emit a hook that was previously registered via `on()`.
     */
    emit(hook, ...rest) {
      const callbacks = this._hooks[hook];
      if (callbacks) {
        callbacks.forEach((callback) => callback(...rest));
      }
    }
    /**
     * Send an envelope to Sentry.
     */
    // @ts-expect-error - PromiseLike is a subset of Promise
    async sendEnvelope(envelope) {
      this.emit("beforeEnvelope", envelope);
      if (this._isEnabled() && this._transport) {
        try {
          return await this._transport.send(envelope);
        } catch (reason) {
          DEBUG_BUILD$2 && debug.error("Error while sending envelope:", reason);
          return {};
        }
      }
      DEBUG_BUILD$2 && debug.error("Transport disabled");
      return {};
    }
    /* eslint-enable @typescript-eslint/unified-signatures */
    /** Setup integrations for this client. */
    _setupIntegrations() {
      const { integrations } = this._options;
      this._integrations = setupIntegrations(this, integrations);
      afterSetupIntegrations(this, integrations);
    }
    /** Updates existing session based on the provided event */
    _updateSessionFromEvent(session, event) {
      let crashed = event.level === "fatal";
      let errored = false;
      const exceptions = event.exception?.values;
      if (exceptions) {
        errored = true;
        crashed = false;
        for (const ex of exceptions) {
          if (ex.mechanism?.handled === false) {
            crashed = true;
            break;
          }
        }
      }
      const sessionNonTerminal = session.status === "ok";
      const shouldUpdateAndSend = sessionNonTerminal && session.errors === 0 || sessionNonTerminal && crashed;
      if (shouldUpdateAndSend) {
        updateSession(session, {
          ...crashed && { status: "crashed" },
          errors: session.errors || Number(errored || crashed)
        });
        this.captureSession(session);
      }
    }
    /**
     * Determine if the client is finished processing. Returns a promise because it will wait `timeout` ms before saying
     * "no" (resolving to `false`) in order to give the client a chance to potentially finish first.
     *
     * @param timeout The time, in ms, after which to resolve to `false` if the client is still busy. Passing `0` (or not
     * passing anything) will make the promise wait as long as it takes for processing to finish before resolving to
     * `true`.
     * @returns A promise which will resolve to `true` if processing is already done or finishes before the timeout, and
     * `false` otherwise
     */
    async _isClientDoneProcessing(timeout) {
      let ticked = 0;
      while (!timeout || ticked < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 1));
        if (!this._numProcessing) {
          return true;
        }
        ticked++;
      }
      return false;
    }
    /** Determines whether this SDK is enabled and a transport is present. */
    _isEnabled() {
      return this.getOptions().enabled !== false && this._transport !== void 0;
    }
    /**
     * Adds common information to events.
     *
     * The information includes release and environment from `options`,
     * breadcrumbs and context (extra, tags and user) from the scope.
     *
     * Information that is already present in the event is never overwritten. For
     * nested objects, such as the context, keys are merged.
     *
     * @param event The original event.
     * @param hint May contain additional information about the original exception.
     * @param currentScope A scope containing event metadata.
     * @returns A new event with more information.
     */
    _prepareEvent(event, hint, currentScope, isolationScope) {
      const options = this.getOptions();
      const integrations = Object.keys(this._integrations);
      if (!hint.integrations && integrations?.length) {
        hint.integrations = integrations;
      }
      this.emit("preprocessEvent", event, hint);
      if (!event.type) {
        isolationScope.setLastEventId(event.event_id || hint.event_id);
      }
      return prepareEvent(options, event, hint, currentScope, this, isolationScope).then((evt) => {
        if (evt === null) {
          return evt;
        }
        this.emit("postprocessEvent", evt, hint);
        evt.contexts = {
          trace: getTraceContextFromScope(currentScope),
          ...evt.contexts
        };
        const dynamicSamplingContext = getDynamicSamplingContextFromScope(this, currentScope);
        evt.sdkProcessingMetadata = {
          dynamicSamplingContext,
          ...evt.sdkProcessingMetadata
        };
        return evt;
      });
    }
    /**
     * Processes the event and logs an error in case of rejection
     * @param event
     * @param hint
     * @param scope
     */
    _captureEvent(event, hint = {}, currentScope = getCurrentScope(), isolationScope = getIsolationScope()) {
      if (DEBUG_BUILD$2 && isErrorEvent(event)) {
        debug.log(`Captured error event \`${getPossibleEventMessages(event)[0] || "<unknown>"}\``);
      }
      return this._processEvent(event, hint, currentScope, isolationScope).then(
        (finalEvent) => {
          return finalEvent.event_id;
        },
        (reason) => {
          if (DEBUG_BUILD$2) {
            if (_isDoNotSendEventError(reason)) {
              debug.log(reason.message);
            } else if (_isInternalError(reason)) {
              debug.warn(reason.message);
            } else {
              debug.warn(reason);
            }
          }
          return void 0;
        }
      );
    }
    /**
     * Processes an event (either error or message) and sends it to Sentry.
     *
     * This also adds breadcrumbs and context information to the event. However,
     * platform specific meta data (such as the User's IP address) must be added
     * by the SDK implementor.
     *
     *
     * @param event The event to send to Sentry.
     * @param hint May contain additional information about the original exception.
     * @param currentScope A scope containing event metadata.
     * @returns A SyncPromise that resolves with the event or rejects in case event was/will not be send.
     */
    _processEvent(event, hint, currentScope, isolationScope) {
      const options = this.getOptions();
      const { sampleRate } = options;
      const isTransaction = isTransactionEvent(event);
      const isError2 = isErrorEvent(event);
      const eventType = event.type || "error";
      const beforeSendLabel = `before send for type \`${eventType}\``;
      const parsedSampleRate = typeof sampleRate === "undefined" ? void 0 : parseSampleRate(sampleRate);
      if (isError2 && typeof parsedSampleRate === "number" && Math.random() > parsedSampleRate) {
        this.recordDroppedEvent("sample_rate", "error");
        return rejectedSyncPromise(
          _makeDoNotSendEventError(
            `Discarding event because it's not included in the random sample (sampling rate = ${sampleRate})`
          )
        );
      }
      const dataCategory = getDataCategoryByType(event.type);
      return this._prepareEvent(event, hint, currentScope, isolationScope).then((prepared) => {
        if (prepared === null) {
          this.recordDroppedEvent("event_processor", dataCategory);
          throw _makeDoNotSendEventError("An event processor returned `null`, will not send event.");
        }
        const isInternalException = hint.data && hint.data.__sentry__ === true;
        if (isInternalException) {
          return prepared;
        }
        const result = processBeforeSend(this, options, prepared, hint);
        return _validateBeforeSendResult(result, beforeSendLabel);
      }).then((processedEvent) => {
        if (processedEvent === null) {
          this.recordDroppedEvent("before_send", dataCategory);
          if (isTransaction) {
            const spans = event.spans || [];
            const spanCount = 1 + spans.length;
            this.recordDroppedEvent("before_send", "span", spanCount);
          }
          throw _makeDoNotSendEventError(`${beforeSendLabel} returned \`null\`, will not send event.`);
        }
        const session = currentScope.getSession() || isolationScope.getSession();
        if (isError2 && session) {
          this._updateSessionFromEvent(session, processedEvent);
        }
        if (isTransaction) {
          const spanCountBefore = processedEvent.sdkProcessingMetadata?.spanCountBeforeProcessing || 0;
          const spanCountAfter = processedEvent.spans ? processedEvent.spans.length : 0;
          const droppedSpanCount = spanCountBefore - spanCountAfter;
          if (droppedSpanCount > 0) {
            this.recordDroppedEvent("before_send", "span", droppedSpanCount);
          }
        }
        const transactionInfo = processedEvent.transaction_info;
        if (isTransaction && transactionInfo && processedEvent.transaction !== event.transaction) {
          const source2 = "custom";
          processedEvent.transaction_info = {
            ...transactionInfo,
            source: source2
          };
        }
        this.sendEvent(processedEvent, hint);
        return processedEvent;
      }).then(null, (reason) => {
        if (_isDoNotSendEventError(reason) || _isInternalError(reason)) {
          throw reason;
        }
        this.captureException(reason, {
          mechanism: {
            handled: false,
            type: "internal"
          },
          data: {
            __sentry__: true
          },
          originalException: reason
        });
        throw _makeInternalError(
          `Event processing pipeline threw an error, original event will not be sent. Details have been sent as a new event.
Reason: ${reason}`
        );
      });
    }
    /**
     * Occupies the client with processing and event
     */
    _process(taskProducer, dataCategory) {
      this._numProcessing++;
      void this._promiseBuffer.add(taskProducer).then(
        (value) => {
          this._numProcessing--;
          return value;
        },
        (reason) => {
          this._numProcessing--;
          if (reason === SENTRY_BUFFER_FULL_ERROR) {
            this.recordDroppedEvent("queue_overflow", dataCategory);
          }
          return reason;
        }
      );
    }
    /**
     * Clears outcomes on this client and returns them.
     */
    _clearOutcomes() {
      const outcomes = this._outcomes;
      this._outcomes = {};
      return Object.entries(outcomes).map(([key, quantity]) => {
        const [reason, category] = key.split(":");
        return {
          reason,
          category,
          quantity
        };
      });
    }
    /**
     * Sends client reports as an envelope.
     */
    _flushOutcomes() {
      DEBUG_BUILD$2 && debug.log("Flushing outcomes...");
      const outcomes = this._clearOutcomes();
      if (outcomes.length === 0) {
        DEBUG_BUILD$2 && debug.log("No outcomes to send");
        return;
      }
      if (!this._dsn) {
        DEBUG_BUILD$2 && debug.log("No dsn provided, will not send outcomes");
        return;
      }
      DEBUG_BUILD$2 && debug.log("Sending outcomes:", outcomes);
      const envelope = createClientReportEnvelope(outcomes, this._options.tunnel && dsnToString(this._dsn));
      this.sendEnvelope(envelope);
    }
    /**
     * Creates an {@link Event} from all inputs to `captureException` and non-primitive inputs to `captureMessage`.
     */
  }
  function getDataCategoryByType(type) {
    return type === "replay_event" ? "replay" : type || "error";
  }
  function _validateBeforeSendResult(beforeSendResult, beforeSendLabel) {
    const invalidValueError = `${beforeSendLabel} must return \`null\` or a valid event.`;
    if (isThenable(beforeSendResult)) {
      return beforeSendResult.then(
        (event) => {
          if (!isPlainObject(event) && event !== null) {
            throw _makeInternalError(invalidValueError);
          }
          return event;
        },
        (e) => {
          throw _makeInternalError(`${beforeSendLabel} rejected with ${e}`);
        }
      );
    } else if (!isPlainObject(beforeSendResult) && beforeSendResult !== null) {
      throw _makeInternalError(invalidValueError);
    }
    return beforeSendResult;
  }
  function processBeforeSend(client, options, event, hint) {
    const { beforeSend, beforeSendTransaction, beforeSendSpan, ignoreSpans } = options;
    let processedEvent = event;
    if (isErrorEvent(processedEvent) && beforeSend) {
      return beforeSend(processedEvent, hint);
    }
    if (isTransactionEvent(processedEvent)) {
      if (beforeSendSpan || ignoreSpans) {
        const rootSpanJson = convertTransactionEventToSpanJson(processedEvent);
        if (ignoreSpans?.length && shouldIgnoreSpan(rootSpanJson, ignoreSpans)) {
          return null;
        }
        if (beforeSendSpan) {
          const processedRootSpanJson = beforeSendSpan(rootSpanJson);
          if (!processedRootSpanJson) {
            showSpanDropWarning();
          } else {
            processedEvent = merge(event, convertSpanJsonToTransactionEvent(processedRootSpanJson));
          }
        }
        if (processedEvent.spans) {
          const processedSpans = [];
          const initialSpans = processedEvent.spans;
          for (const span of initialSpans) {
            if (ignoreSpans?.length && shouldIgnoreSpan(span, ignoreSpans)) {
              reparentChildSpans(initialSpans, span);
              continue;
            }
            if (beforeSendSpan) {
              const processedSpan = beforeSendSpan(span);
              if (!processedSpan) {
                showSpanDropWarning();
                processedSpans.push(span);
              } else {
                processedSpans.push(processedSpan);
              }
            } else {
              processedSpans.push(span);
            }
          }
          const droppedSpans = processedEvent.spans.length - processedSpans.length;
          if (droppedSpans) {
            client.recordDroppedEvent("before_send", "span", droppedSpans);
          }
          processedEvent.spans = processedSpans;
        }
      }
      if (beforeSendTransaction) {
        if (processedEvent.spans) {
          const spanCountBefore = processedEvent.spans.length;
          processedEvent.sdkProcessingMetadata = {
            ...event.sdkProcessingMetadata,
            spanCountBeforeProcessing: spanCountBefore
          };
        }
        return beforeSendTransaction(processedEvent, hint);
      }
    }
    return processedEvent;
  }
  function isErrorEvent(event) {
    return event.type === void 0;
  }
  function isTransactionEvent(event) {
    return event.type === "transaction";
  }
  function estimateMetricSizeInBytes(metric) {
    let weight = 0;
    if (metric.name) {
      weight += metric.name.length * 2;
    }
    weight += 8;
    return weight + estimateAttributesSizeInBytes(metric.attributes);
  }
  function estimateLogSizeInBytes(log2) {
    let weight = 0;
    if (log2.message) {
      weight += log2.message.length * 2;
    }
    return weight + estimateAttributesSizeInBytes(log2.attributes);
  }
  function estimateAttributesSizeInBytes(attributes) {
    if (!attributes) {
      return 0;
    }
    let weight = 0;
    Object.values(attributes).forEach((value) => {
      if (Array.isArray(value)) {
        weight += value.length * estimatePrimitiveSizeInBytes(value[0]);
      } else if (isPrimitive(value)) {
        weight += estimatePrimitiveSizeInBytes(value);
      } else {
        weight += 100;
      }
    });
    return weight;
  }
  function estimatePrimitiveSizeInBytes(value) {
    if (typeof value === "string") {
      return value.length * 2;
    } else if (typeof value === "number") {
      return 8;
    } else if (typeof value === "boolean") {
      return 4;
    }
    return 0;
  }
  function initAndBind(clientClass, options) {
    if (options.debug === true) {
      if (DEBUG_BUILD$2) {
        debug.enable();
      } else {
        consoleSandbox(() => {
          console.warn("[Sentry] Cannot initialize SDK with `debug` option using a non-debug bundle.");
        });
      }
    }
    const scope = getCurrentScope();
    scope.update(options.initialScope);
    const client = new clientClass(options);
    setCurrentClient(client);
    client.init();
    return client;
  }
  function setCurrentClient(client) {
    getCurrentScope().setClient(client);
  }
  function parseUrl(url) {
    if (!url) {
      return {};
    }
    const match = url.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/);
    if (!match) {
      return {};
    }
    const query = match[6] || "";
    const fragment = match[8] || "";
    return {
      host: match[4],
      path: match[5],
      protocol: match[2],
      search: query,
      hash: fragment,
      relative: match[5] + query + fragment
      // everything minus origin
    };
  }
  function addAutoIpAddressToSession(session) {
    if ("aggregates" in session) {
      if (session.attrs?.["ip_address"] === void 0) {
        session.attrs = {
          ...session.attrs,
          ip_address: "{{auto}}"
        };
      }
    } else {
      if (session.ipAddress === void 0) {
        session.ipAddress = "{{auto}}";
      }
    }
  }
  function applySdkMetadata(options, name, names = [name], source2 = "npm") {
    const metadata = options._metadata || {};
    if (!metadata.sdk) {
      metadata.sdk = {
        name: `sentry.javascript.${name}`,
        packages: names.map((name2) => ({
          name: `${source2}:@sentry/${name2}`,
          version: SDK_VERSION
        })),
        version: SDK_VERSION
      };
    }
    options._metadata = metadata;
  }
  const DEFAULT_BREADCRUMBS = 100;
  function addBreadcrumb(breadcrumb, hint) {
    const client = getClient();
    const isolationScope = getIsolationScope();
    if (!client) return;
    const { beforeBreadcrumb = null, maxBreadcrumbs = DEFAULT_BREADCRUMBS } = client.getOptions();
    if (maxBreadcrumbs <= 0) return;
    const timestamp = dateTimestampInSeconds();
    const mergedBreadcrumb = { timestamp, ...breadcrumb };
    const finalBreadcrumb = beforeBreadcrumb ? consoleSandbox(() => beforeBreadcrumb(mergedBreadcrumb, hint)) : mergedBreadcrumb;
    if (finalBreadcrumb === null) return;
    if (client.emit) {
      client.emit("beforeAddBreadcrumb", finalBreadcrumb, hint);
    }
    isolationScope.addBreadcrumb(finalBreadcrumb, maxBreadcrumbs);
  }
  let originalFunctionToString;
  const INTEGRATION_NAME$6 = "FunctionToString";
  const SETUP_CLIENTS = /* @__PURE__ */ new WeakMap();
  const _functionToStringIntegration = (() => {
    return {
      name: INTEGRATION_NAME$6,
      setupOnce() {
        originalFunctionToString = Function.prototype.toString;
        try {
          Function.prototype.toString = function(...args) {
            const originalFunction = getOriginalFunction(this);
            const context = SETUP_CLIENTS.has(getClient()) && originalFunction !== void 0 ? originalFunction : this;
            return originalFunctionToString.apply(context, args);
          };
        } catch {
        }
      },
      setup(client) {
        SETUP_CLIENTS.set(client, true);
      }
    };
  });
  const functionToStringIntegration = defineIntegration(_functionToStringIntegration);
  const DEFAULT_IGNORE_ERRORS = [
    /^Script error\.?$/,
    /^Javascript error: Script error\.? on line 0$/,
    /^ResizeObserver loop completed with undelivered notifications.$/,
    // The browser logs this when a ResizeObserver handler takes a bit longer. Usually this is not an actual issue though. It indicates slowness.
    /^Cannot redefine property: googletag$/,
    // This is thrown when google tag manager is used in combination with an ad blocker
    /^Can't find variable: gmo$/,
    // Error from Google Search App https://issuetracker.google.com/issues/396043331
    /^undefined is not an object \(evaluating 'a\.[A-Z]'\)$/,
    // Random error that happens but not actionable or noticeable to end-users.
    `can't redefine non-configurable property "solana"`,
    // Probably a browser extension or custom browser (Brave) throwing this error
    "vv().getRestrictions is not a function. (In 'vv().getRestrictions(1,a)', 'vv().getRestrictions' is undefined)",
    // Error thrown by GTM, seemingly not affecting end-users
    "Can't find variable: _AutofillCallbackHandler",
    // Unactionable error in instagram webview https://developers.facebook.com/community/threads/320013549791141/
    /^Non-Error promise rejection captured with value: Object Not Found Matching Id:\d+, MethodName:simulateEvent, ParamCount:\d+$/,
    // unactionable error from CEFSharp, a .NET library that embeds chromium in .NET apps
    /^Java exception was raised during method invocation$/
    // error from Facebook Mobile browser (https://github.com/getsentry/sentry-javascript/issues/15065)
  ];
  const INTEGRATION_NAME$5 = "EventFilters";
  const eventFiltersIntegration = defineIntegration((options = {}) => {
    let mergedOptions;
    return {
      name: INTEGRATION_NAME$5,
      setup(client) {
        const clientOptions = client.getOptions();
        mergedOptions = _mergeOptions(options, clientOptions);
      },
      processEvent(event, _hint, client) {
        if (!mergedOptions) {
          const clientOptions = client.getOptions();
          mergedOptions = _mergeOptions(options, clientOptions);
        }
        return _shouldDropEvent$1(event, mergedOptions) ? null : event;
      }
    };
  });
  const inboundFiltersIntegration = defineIntegration(((options = {}) => {
    return {
      ...eventFiltersIntegration(options),
      name: "InboundFilters"
    };
  }));
  function _mergeOptions(internalOptions = {}, clientOptions = {}) {
    return {
      allowUrls: [...internalOptions.allowUrls || [], ...clientOptions.allowUrls || []],
      denyUrls: [...internalOptions.denyUrls || [], ...clientOptions.denyUrls || []],
      ignoreErrors: [
        ...internalOptions.ignoreErrors || [],
        ...clientOptions.ignoreErrors || [],
        ...internalOptions.disableErrorDefaults ? [] : DEFAULT_IGNORE_ERRORS
      ],
      ignoreTransactions: [...internalOptions.ignoreTransactions || [], ...clientOptions.ignoreTransactions || []]
    };
  }
  function _shouldDropEvent$1(event, options) {
    if (!event.type) {
      if (_isIgnoredError(event, options.ignoreErrors)) {
        DEBUG_BUILD$2 && debug.warn(
          `Event dropped due to being matched by \`ignoreErrors\` option.
Event: ${getEventDescription(event)}`
        );
        return true;
      }
      if (_isUselessError(event)) {
        DEBUG_BUILD$2 && debug.warn(
          `Event dropped due to not having an error message, error type or stacktrace.
Event: ${getEventDescription(
            event
          )}`
        );
        return true;
      }
      if (_isDeniedUrl(event, options.denyUrls)) {
        DEBUG_BUILD$2 && debug.warn(
          `Event dropped due to being matched by \`denyUrls\` option.
Event: ${getEventDescription(
            event
          )}.
Url: ${_getEventFilterUrl(event)}`
        );
        return true;
      }
      if (!_isAllowedUrl(event, options.allowUrls)) {
        DEBUG_BUILD$2 && debug.warn(
          `Event dropped due to not being matched by \`allowUrls\` option.
Event: ${getEventDescription(
            event
          )}.
Url: ${_getEventFilterUrl(event)}`
        );
        return true;
      }
    } else if (event.type === "transaction") {
      if (_isIgnoredTransaction(event, options.ignoreTransactions)) {
        DEBUG_BUILD$2 && debug.warn(
          `Event dropped due to being matched by \`ignoreTransactions\` option.
Event: ${getEventDescription(event)}`
        );
        return true;
      }
    }
    return false;
  }
  function _isIgnoredError(event, ignoreErrors) {
    if (!ignoreErrors?.length) {
      return false;
    }
    return getPossibleEventMessages(event).some((message) => stringMatchesSomePattern(message, ignoreErrors));
  }
  function _isIgnoredTransaction(event, ignoreTransactions) {
    if (!ignoreTransactions?.length) {
      return false;
    }
    const name = event.transaction;
    return name ? stringMatchesSomePattern(name, ignoreTransactions) : false;
  }
  function _isDeniedUrl(event, denyUrls) {
    if (!denyUrls?.length) {
      return false;
    }
    const url = _getEventFilterUrl(event);
    return !url ? false : stringMatchesSomePattern(url, denyUrls);
  }
  function _isAllowedUrl(event, allowUrls) {
    if (!allowUrls?.length) {
      return true;
    }
    const url = _getEventFilterUrl(event);
    return !url ? true : stringMatchesSomePattern(url, allowUrls);
  }
  function _getLastValidUrl(frames = []) {
    for (let i2 = frames.length - 1; i2 >= 0; i2--) {
      const frame = frames[i2];
      if (frame && frame.filename !== "<anonymous>" && frame.filename !== "[native code]") {
        return frame.filename || null;
      }
    }
    return null;
  }
  function _getEventFilterUrl(event) {
    try {
      const rootException = [...event.exception?.values ?? []].reverse().find((value) => value.mechanism?.parent_id === void 0 && value.stacktrace?.frames?.length);
      const frames = rootException?.stacktrace?.frames;
      return frames ? _getLastValidUrl(frames) : null;
    } catch {
      DEBUG_BUILD$2 && debug.error(`Cannot extract url for event ${getEventDescription(event)}`);
      return null;
    }
  }
  function _isUselessError(event) {
    if (!event.exception?.values?.length) {
      return false;
    }
    return (
      // No top-level message
      !event.message && // There are no exception values that have a stacktrace, a non-generic-Error type or value
      !event.exception.values.some((value) => value.stacktrace || value.type && value.type !== "Error" || value.value)
    );
  }
  function applyAggregateErrorsToEvent(exceptionFromErrorImplementation, parser, key, limit, event, hint) {
    if (!event.exception?.values || !hint || !isInstanceOf(hint.originalException, Error)) {
      return;
    }
    const originalException = event.exception.values.length > 0 ? event.exception.values[event.exception.values.length - 1] : void 0;
    if (originalException) {
      event.exception.values = aggregateExceptionsFromError(
        exceptionFromErrorImplementation,
        parser,
        limit,
        hint.originalException,
        key,
        event.exception.values,
        originalException,
        0
      );
    }
  }
  function aggregateExceptionsFromError(exceptionFromErrorImplementation, parser, limit, error2, key, prevExceptions, exception, exceptionId) {
    if (prevExceptions.length >= limit + 1) {
      return prevExceptions;
    }
    let newExceptions = [...prevExceptions];
    if (isInstanceOf(error2[key], Error)) {
      applyExceptionGroupFieldsForParentException(exception, exceptionId);
      const newException = exceptionFromErrorImplementation(parser, error2[key]);
      const newExceptionId = newExceptions.length;
      applyExceptionGroupFieldsForChildException(newException, key, newExceptionId, exceptionId);
      newExceptions = aggregateExceptionsFromError(
        exceptionFromErrorImplementation,
        parser,
        limit,
        error2[key],
        key,
        [newException, ...newExceptions],
        newException,
        newExceptionId
      );
    }
    if (Array.isArray(error2.errors)) {
      error2.errors.forEach((childError, i2) => {
        if (isInstanceOf(childError, Error)) {
          applyExceptionGroupFieldsForParentException(exception, exceptionId);
          const newException = exceptionFromErrorImplementation(parser, childError);
          const newExceptionId = newExceptions.length;
          applyExceptionGroupFieldsForChildException(newException, `errors[${i2}]`, newExceptionId, exceptionId);
          newExceptions = aggregateExceptionsFromError(
            exceptionFromErrorImplementation,
            parser,
            limit,
            childError,
            key,
            [newException, ...newExceptions],
            newException,
            newExceptionId
          );
        }
      });
    }
    return newExceptions;
  }
  function applyExceptionGroupFieldsForParentException(exception, exceptionId) {
    exception.mechanism = {
      handled: true,
      type: "auto.core.linked_errors",
      ...exception.mechanism,
      ...exception.type === "AggregateError" && { is_exception_group: true },
      exception_id: exceptionId
    };
  }
  function applyExceptionGroupFieldsForChildException(exception, source2, exceptionId, parentId) {
    exception.mechanism = {
      handled: true,
      ...exception.mechanism,
      type: "chained",
      source: source2,
      exception_id: exceptionId,
      parent_id: parentId
    };
  }
  function addConsoleInstrumentationHandler(handler) {
    const type = "console";
    addHandler(type, handler);
    maybeInstrument(type, instrumentConsole);
  }
  function instrumentConsole() {
    if (!("console" in GLOBAL_OBJ)) {
      return;
    }
    CONSOLE_LEVELS.forEach(function(level) {
      if (!(level in GLOBAL_OBJ.console)) {
        return;
      }
      fill(GLOBAL_OBJ.console, level, function(originalConsoleMethod) {
        originalConsoleMethods[level] = originalConsoleMethod;
        return function(...args) {
          const handlerData = { args, level };
          triggerHandlers("console", handlerData);
          const log2 = originalConsoleMethods[level];
          log2?.apply(GLOBAL_OBJ.console, args);
        };
      });
    });
  }
  function severityLevelFromString(level) {
    return level === "warn" ? "warning" : ["fatal", "error", "warning", "log", "info", "debug"].includes(level) ? level : "log";
  }
  const INTEGRATION_NAME$4 = "Dedupe";
  const _dedupeIntegration = (() => {
    let previousEvent;
    return {
      name: INTEGRATION_NAME$4,
      processEvent(currentEvent) {
        if (currentEvent.type) {
          return currentEvent;
        }
        try {
          if (_shouldDropEvent(currentEvent, previousEvent)) {
            DEBUG_BUILD$2 && debug.warn("Event dropped due to being a duplicate of previously captured event.");
            return null;
          }
        } catch {
        }
        return previousEvent = currentEvent;
      }
    };
  });
  const dedupeIntegration = defineIntegration(_dedupeIntegration);
  function _shouldDropEvent(currentEvent, previousEvent) {
    if (!previousEvent) {
      return false;
    }
    if (_isSameMessageEvent(currentEvent, previousEvent)) {
      return true;
    }
    if (_isSameExceptionEvent(currentEvent, previousEvent)) {
      return true;
    }
    return false;
  }
  function _isSameMessageEvent(currentEvent, previousEvent) {
    const currentMessage = currentEvent.message;
    const previousMessage = previousEvent.message;
    if (!currentMessage && !previousMessage) {
      return false;
    }
    if (currentMessage && !previousMessage || !currentMessage && previousMessage) {
      return false;
    }
    if (currentMessage !== previousMessage) {
      return false;
    }
    if (!_isSameFingerprint(currentEvent, previousEvent)) {
      return false;
    }
    if (!_isSameStacktrace(currentEvent, previousEvent)) {
      return false;
    }
    return true;
  }
  function _isSameExceptionEvent(currentEvent, previousEvent) {
    const previousException = _getExceptionFromEvent(previousEvent);
    const currentException = _getExceptionFromEvent(currentEvent);
    if (!previousException || !currentException) {
      return false;
    }
    if (previousException.type !== currentException.type || previousException.value !== currentException.value) {
      return false;
    }
    if (!_isSameFingerprint(currentEvent, previousEvent)) {
      return false;
    }
    if (!_isSameStacktrace(currentEvent, previousEvent)) {
      return false;
    }
    return true;
  }
  function _isSameStacktrace(currentEvent, previousEvent) {
    let currentFrames = getFramesFromEvent(currentEvent);
    let previousFrames = getFramesFromEvent(previousEvent);
    if (!currentFrames && !previousFrames) {
      return true;
    }
    if (currentFrames && !previousFrames || !currentFrames && previousFrames) {
      return false;
    }
    currentFrames = currentFrames;
    previousFrames = previousFrames;
    if (previousFrames.length !== currentFrames.length) {
      return false;
    }
    for (let i2 = 0; i2 < previousFrames.length; i2++) {
      const frameA = previousFrames[i2];
      const frameB = currentFrames[i2];
      if (frameA.filename !== frameB.filename || frameA.lineno !== frameB.lineno || frameA.colno !== frameB.colno || frameA.function !== frameB.function) {
        return false;
      }
    }
    return true;
  }
  function _isSameFingerprint(currentEvent, previousEvent) {
    let currentFingerprint = currentEvent.fingerprint;
    let previousFingerprint = previousEvent.fingerprint;
    if (!currentFingerprint && !previousFingerprint) {
      return true;
    }
    if (currentFingerprint && !previousFingerprint || !currentFingerprint && previousFingerprint) {
      return false;
    }
    currentFingerprint = currentFingerprint;
    previousFingerprint = previousFingerprint;
    try {
      return !!(currentFingerprint.join("") === previousFingerprint.join(""));
    } catch {
      return false;
    }
  }
  function _getExceptionFromEvent(event) {
    return event.exception?.values?.[0];
  }
  function getBreadcrumbLogLevelFromHttpStatusCode(statusCode) {
    if (statusCode === void 0) {
      return void 0;
    } else if (statusCode >= 400 && statusCode < 500) {
      return "warning";
    } else if (statusCode >= 500) {
      return "error";
    } else {
      return void 0;
    }
  }
  const WINDOW$2 = GLOBAL_OBJ;
  function supportsHistory() {
    return "history" in WINDOW$2 && !!WINDOW$2.history;
  }
  function _isFetchSupported() {
    if (!("fetch" in WINDOW$2)) {
      return false;
    }
    try {
      new Headers();
      new Request("data:,");
      new Response();
      return true;
    } catch {
      return false;
    }
  }
  function isNativeFunction(func) {
    return func && /^function\s+\w+\(\)\s+\{\s+\[native code\]\s+\}$/.test(func.toString());
  }
  function supportsNativeFetch() {
    if (typeof EdgeRuntime === "string") {
      return true;
    }
    if (!_isFetchSupported()) {
      return false;
    }
    if (isNativeFunction(WINDOW$2.fetch)) {
      return true;
    }
    let result = false;
    const doc = WINDOW$2.document;
    if (doc && typeof doc.createElement === "function") {
      try {
        const sandbox = doc.createElement("iframe");
        sandbox.hidden = true;
        doc.head.appendChild(sandbox);
        if (sandbox.contentWindow?.fetch) {
          result = isNativeFunction(sandbox.contentWindow.fetch);
        }
        doc.head.removeChild(sandbox);
      } catch (err) {
        DEBUG_BUILD$2 && debug.warn("Could not create sandbox iframe for pure fetch check, bailing to window.fetch: ", err);
      }
    }
    return result;
  }
  function addFetchInstrumentationHandler(handler, skipNativeFetchCheck) {
    const type = "fetch";
    addHandler(type, handler);
    maybeInstrument(type, () => instrumentFetch(void 0, skipNativeFetchCheck));
  }
  function instrumentFetch(onFetchResolved, skipNativeFetchCheck = false) {
    if (skipNativeFetchCheck && !supportsNativeFetch()) {
      return;
    }
    fill(GLOBAL_OBJ, "fetch", function(originalFetch) {
      return function(...args) {
        const virtualError = new Error();
        const { method, url } = parseFetchArgs(args);
        const handlerData = {
          args,
          fetchData: {
            method,
            url
          },
          startTimestamp: timestampInSeconds() * 1e3,
          // // Adding the error to be able to fingerprint the failed fetch event in HttpClient instrumentation
          virtualError,
          headers: getHeadersFromFetchArgs(args)
        };
        {
          triggerHandlers("fetch", {
            ...handlerData
          });
        }
        return originalFetch.apply(GLOBAL_OBJ, args).then(
          async (response) => {
            {
              triggerHandlers("fetch", {
                ...handlerData,
                endTimestamp: timestampInSeconds() * 1e3,
                response
              });
            }
            return response;
          },
          (error2) => {
            triggerHandlers("fetch", {
              ...handlerData,
              endTimestamp: timestampInSeconds() * 1e3,
              error: error2
            });
            if (isError(error2) && error2.stack === void 0) {
              error2.stack = virtualError.stack;
              addNonEnumerableProperty(error2, "framesToPop", 1);
            }
            if (error2 instanceof TypeError && (error2.message === "Failed to fetch" || error2.message === "Load failed" || error2.message === "NetworkError when attempting to fetch resource.")) {
              try {
                const url2 = new URL(handlerData.fetchData.url);
                error2.message = `${error2.message} (${url2.host})`;
              } catch {
              }
            }
            throw error2;
          }
        );
      };
    });
  }
  function hasProp(obj, prop) {
    return !!obj && typeof obj === "object" && !!obj[prop];
  }
  function getUrlFromResource(resource) {
    if (typeof resource === "string") {
      return resource;
    }
    if (!resource) {
      return "";
    }
    if (hasProp(resource, "url")) {
      return resource.url;
    }
    if (resource.toString) {
      return resource.toString();
    }
    return "";
  }
  function parseFetchArgs(fetchArgs) {
    if (fetchArgs.length === 0) {
      return { method: "GET", url: "" };
    }
    if (fetchArgs.length === 2) {
      const [resource, options] = fetchArgs;
      return {
        url: getUrlFromResource(resource),
        method: hasProp(options, "method") ? String(options.method).toUpperCase() : (
          // Request object as first argument
          isRequest(resource) && hasProp(resource, "method") ? String(resource.method).toUpperCase() : "GET"
        )
      };
    }
    const arg = fetchArgs[0];
    return {
      url: getUrlFromResource(arg),
      method: hasProp(arg, "method") ? String(arg.method).toUpperCase() : "GET"
    };
  }
  function getHeadersFromFetchArgs(fetchArgs) {
    const [requestArgument, optionsArgument] = fetchArgs;
    try {
      if (typeof optionsArgument === "object" && optionsArgument !== null && "headers" in optionsArgument && optionsArgument.headers) {
        return new Headers(optionsArgument.headers);
      }
      if (isRequest(requestArgument)) {
        return new Headers(requestArgument.headers);
      }
    } catch {
    }
    return;
  }
  function getSDKSource() {
    return "npm";
  }
  const WINDOW$1 = GLOBAL_OBJ;
  let ignoreOnError = 0;
  function shouldIgnoreOnError() {
    return ignoreOnError > 0;
  }
  function ignoreNextOnError() {
    ignoreOnError++;
    setTimeout(() => {
      ignoreOnError--;
    });
  }
  function wrap(fn, options = {}) {
    function isFunction(fn2) {
      return typeof fn2 === "function";
    }
    if (!isFunction(fn)) {
      return fn;
    }
    try {
      const wrapper = fn.__sentry_wrapped__;
      if (wrapper) {
        if (typeof wrapper === "function") {
          return wrapper;
        } else {
          return fn;
        }
      }
      if (getOriginalFunction(fn)) {
        return fn;
      }
    } catch {
      return fn;
    }
    const sentryWrapped = function(...args) {
      try {
        const wrappedArguments = args.map((arg) => wrap(arg, options));
        return fn.apply(this, wrappedArguments);
      } catch (ex) {
        ignoreNextOnError();
        withScope((scope) => {
          scope.addEventProcessor((event) => {
            if (options.mechanism) {
              addExceptionTypeValue(event, void 0);
              addExceptionMechanism(event, options.mechanism);
            }
            event.extra = {
              ...event.extra,
              arguments: args
            };
            return event;
          });
          captureException(ex);
        });
        throw ex;
      }
    };
    try {
      for (const property in fn) {
        if (Object.prototype.hasOwnProperty.call(fn, property)) {
          sentryWrapped[property] = fn[property];
        }
      }
    } catch {
    }
    markFunctionWrapped(sentryWrapped, fn);
    addNonEnumerableProperty(fn, "__sentry_wrapped__", sentryWrapped);
    try {
      const descriptor = Object.getOwnPropertyDescriptor(sentryWrapped, "name");
      if (descriptor.configurable) {
        Object.defineProperty(sentryWrapped, "name", {
          get() {
            return fn.name;
          }
        });
      }
    } catch {
    }
    return sentryWrapped;
  }
  function getHttpRequestData() {
    const url = getLocationHref();
    const { referrer } = WINDOW$1.document || {};
    const { userAgent } = WINDOW$1.navigator || {};
    const headers = {
      ...referrer && { Referer: referrer },
      ...userAgent && { "User-Agent": userAgent }
    };
    const request = {
      url,
      headers
    };
    return request;
  }
  function exceptionFromError(stackParser, ex) {
    const frames = parseStackFrames(stackParser, ex);
    const exception = {
      type: extractType(ex),
      value: extractMessage(ex)
    };
    if (frames.length) {
      exception.stacktrace = { frames };
    }
    if (exception.type === void 0 && exception.value === "") {
      exception.value = "Unrecoverable error caught";
    }
    return exception;
  }
  function eventFromPlainObject(stackParser, exception, syntheticException, isUnhandledRejection) {
    const client = getClient();
    const normalizeDepth = client?.getOptions().normalizeDepth;
    const errorFromProp = getErrorPropertyFromObject(exception);
    const extra = {
      __serialized__: normalizeToSize(exception, normalizeDepth)
    };
    if (errorFromProp) {
      return {
        exception: {
          values: [exceptionFromError(stackParser, errorFromProp)]
        },
        extra
      };
    }
    const event = {
      exception: {
        values: [
          {
            type: isEvent(exception) ? exception.constructor.name : isUnhandledRejection ? "UnhandledRejection" : "Error",
            value: getNonErrorObjectExceptionValue(exception, { isUnhandledRejection })
          }
        ]
      },
      extra
    };
    if (syntheticException) {
      const frames = parseStackFrames(stackParser, syntheticException);
      if (frames.length) {
        event.exception.values[0].stacktrace = { frames };
      }
    }
    return event;
  }
  function eventFromError(stackParser, ex) {
    return {
      exception: {
        values: [exceptionFromError(stackParser, ex)]
      }
    };
  }
  function parseStackFrames(stackParser, ex) {
    const stacktrace = ex.stacktrace || ex.stack || "";
    const skipLines = getSkipFirstStackStringLines(ex);
    const framesToPop = getPopFirstTopFrames(ex);
    try {
      return stackParser(stacktrace, skipLines, framesToPop);
    } catch {
    }
    return [];
  }
  const reactMinifiedRegexp = /Minified React error #\d+;/i;
  function getSkipFirstStackStringLines(ex) {
    if (ex && reactMinifiedRegexp.test(ex.message)) {
      return 1;
    }
    return 0;
  }
  function getPopFirstTopFrames(ex) {
    if (typeof ex.framesToPop === "number") {
      return ex.framesToPop;
    }
    return 0;
  }
  function isWebAssemblyException(exception) {
    if (typeof WebAssembly !== "undefined" && typeof WebAssembly.Exception !== "undefined") {
      return exception instanceof WebAssembly.Exception;
    } else {
      return false;
    }
  }
  function extractType(ex) {
    const name = ex?.name;
    if (!name && isWebAssemblyException(ex)) {
      const hasTypeInMessage = ex.message && Array.isArray(ex.message) && ex.message.length == 2;
      return hasTypeInMessage ? ex.message[0] : "WebAssembly.Exception";
    }
    return name;
  }
  function extractMessage(ex) {
    const message = ex?.message;
    if (isWebAssemblyException(ex)) {
      if (Array.isArray(ex.message) && ex.message.length == 2) {
        return ex.message[1];
      }
      return "wasm exception";
    }
    if (!message) {
      return "No error message";
    }
    if (message.error && typeof message.error.message === "string") {
      return message.error.message;
    }
    return message;
  }
  function eventFromException(stackParser, exception, hint, attachStacktrace) {
    const syntheticException = hint?.syntheticException || void 0;
    const event = eventFromUnknownInput(stackParser, exception, syntheticException, attachStacktrace);
    addExceptionMechanism(event);
    event.level = "error";
    if (hint?.event_id) {
      event.event_id = hint.event_id;
    }
    return resolvedSyncPromise(event);
  }
  function eventFromMessage(stackParser, message, level = "info", hint, attachStacktrace) {
    const syntheticException = hint?.syntheticException || void 0;
    const event = eventFromString(stackParser, message, syntheticException, attachStacktrace);
    event.level = level;
    if (hint?.event_id) {
      event.event_id = hint.event_id;
    }
    return resolvedSyncPromise(event);
  }
  function eventFromUnknownInput(stackParser, exception, syntheticException, attachStacktrace, isUnhandledRejection) {
    let event;
    if (isErrorEvent$1(exception) && exception.error) {
      const errorEvent = exception;
      return eventFromError(stackParser, errorEvent.error);
    }
    if (isDOMError(exception) || isDOMException(exception)) {
      const domException = exception;
      if ("stack" in exception) {
        event = eventFromError(stackParser, exception);
      } else {
        const name = domException.name || (isDOMError(domException) ? "DOMError" : "DOMException");
        const message = domException.message ? `${name}: ${domException.message}` : name;
        event = eventFromString(stackParser, message, syntheticException, attachStacktrace);
        addExceptionTypeValue(event, message);
      }
      if ("code" in domException) {
        event.tags = { ...event.tags, "DOMException.code": `${domException.code}` };
      }
      return event;
    }
    if (isError(exception)) {
      return eventFromError(stackParser, exception);
    }
    if (isPlainObject(exception) || isEvent(exception)) {
      const objectException = exception;
      event = eventFromPlainObject(stackParser, objectException, syntheticException, isUnhandledRejection);
      addExceptionMechanism(event, {
        synthetic: true
      });
      return event;
    }
    event = eventFromString(stackParser, exception, syntheticException, attachStacktrace);
    addExceptionTypeValue(event, `${exception}`);
    addExceptionMechanism(event, {
      synthetic: true
    });
    return event;
  }
  function eventFromString(stackParser, message, syntheticException, attachStacktrace) {
    const event = {};
    if (attachStacktrace && syntheticException) {
      const frames = parseStackFrames(stackParser, syntheticException);
      if (frames.length) {
        event.exception = {
          values: [{ value: message, stacktrace: { frames } }]
        };
      }
      addExceptionMechanism(event, { synthetic: true });
    }
    if (isParameterizedString(message)) {
      const { __sentry_template_string__, __sentry_template_values__ } = message;
      event.logentry = {
        message: __sentry_template_string__,
        params: __sentry_template_values__
      };
      return event;
    }
    event.message = message;
    return event;
  }
  function getNonErrorObjectExceptionValue(exception, { isUnhandledRejection }) {
    const keys = extractExceptionKeysForMessage(exception);
    const captureType = isUnhandledRejection ? "promise rejection" : "exception";
    if (isErrorEvent$1(exception)) {
      return `Event \`ErrorEvent\` captured as ${captureType} with message \`${exception.message}\``;
    }
    if (isEvent(exception)) {
      const className = getObjectClassName(exception);
      return `Event \`${className}\` (type=${exception.type}) captured as ${captureType}`;
    }
    return `Object captured as ${captureType} with keys: ${keys}`;
  }
  function getObjectClassName(obj) {
    try {
      const prototype = Object.getPrototypeOf(obj);
      return prototype ? prototype.constructor.name : void 0;
    } catch {
    }
  }
  function getErrorPropertyFromObject(obj) {
    for (const prop in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, prop)) {
        const value = obj[prop];
        if (value instanceof Error) {
          return value;
        }
      }
    }
    return void 0;
  }
  class BrowserClient extends Client {
    /**
     * Creates a new Browser SDK instance.
     *
     * @param options Configuration options for this SDK.
     */
    constructor(options) {
      const opts = applyDefaultOptions(options);
      const sdkSource = WINDOW$1.SENTRY_SDK_SOURCE || getSDKSource();
      applySdkMetadata(opts, "browser", ["browser"], sdkSource);
      if (opts._metadata?.sdk) {
        opts._metadata.sdk.settings = {
          infer_ip: opts.sendDefaultPii ? "auto" : "never",
          // purposefully allowing already passed settings to override the default
          ...opts._metadata.sdk.settings
        };
      }
      super(opts);
      const {
        sendDefaultPii,
        sendClientReports,
        enableLogs,
        _experiments,
        enableMetrics: enableMetricsOption
      } = this._options;
      const enableMetrics = enableMetricsOption ?? _experiments?.enableMetrics ?? true;
      if (WINDOW$1.document && (sendClientReports || enableLogs || enableMetrics)) {
        WINDOW$1.document.addEventListener("visibilitychange", () => {
          if (WINDOW$1.document.visibilityState === "hidden") {
            if (sendClientReports) {
              this._flushOutcomes();
            }
            if (enableLogs) {
              _INTERNAL_flushLogsBuffer(this);
            }
            if (enableMetrics) {
              _INTERNAL_flushMetricsBuffer(this);
            }
          }
        });
      }
      if (sendDefaultPii) {
        this.on("beforeSendSession", addAutoIpAddressToSession);
      }
    }
    /**
     * @inheritDoc
     */
    eventFromException(exception, hint) {
      return eventFromException(this._options.stackParser, exception, hint, this._options.attachStacktrace);
    }
    /**
     * @inheritDoc
     */
    eventFromMessage(message, level = "info", hint) {
      return eventFromMessage(this._options.stackParser, message, level, hint, this._options.attachStacktrace);
    }
    /**
     * @inheritDoc
     */
    _prepareEvent(event, hint, currentScope, isolationScope) {
      event.platform = event.platform || "javascript";
      return super._prepareEvent(event, hint, currentScope, isolationScope);
    }
  }
  function applyDefaultOptions(optionsArg) {
    return {
      release: typeof __SENTRY_RELEASE__ === "string" ? __SENTRY_RELEASE__ : WINDOW$1.SENTRY_RELEASE?.id,
      // This supports the variable that sentry-webpack-plugin injects
      sendClientReports: true,
      // We default this to true, as it is the safer scenario
      parentSpanIsAlwaysRootSpan: true,
      ...optionsArg
    };
  }
  const DEBUG_BUILD$1 = typeof __SENTRY_DEBUG__ === "undefined" || __SENTRY_DEBUG__;
  const WINDOW = GLOBAL_OBJ;
  const DEBOUNCE_DURATION = 1e3;
  let debounceTimerID;
  let lastCapturedEventType;
  let lastCapturedEventTargetId;
  function addClickKeypressInstrumentationHandler(handler) {
    const type = "dom";
    addHandler(type, handler);
    maybeInstrument(type, instrumentDOM);
  }
  function instrumentDOM() {
    if (!WINDOW.document) {
      return;
    }
    const triggerDOMHandler = triggerHandlers.bind(null, "dom");
    const globalDOMEventHandler = makeDOMEventHandler(triggerDOMHandler, true);
    WINDOW.document.addEventListener("click", globalDOMEventHandler, false);
    WINDOW.document.addEventListener("keypress", globalDOMEventHandler, false);
    ["EventTarget", "Node"].forEach((target) => {
      const globalObject = WINDOW;
      const proto = globalObject[target]?.prototype;
      if (!proto?.hasOwnProperty?.("addEventListener")) {
        return;
      }
      fill(proto, "addEventListener", function(originalAddEventListener) {
        return function(type, listener, options) {
          if (type === "click" || type == "keypress") {
            try {
              const handlers2 = this.__sentry_instrumentation_handlers__ = this.__sentry_instrumentation_handlers__ || {};
              const handlerForType = handlers2[type] = handlers2[type] || { refCount: 0 };
              if (!handlerForType.handler) {
                const handler = makeDOMEventHandler(triggerDOMHandler);
                handlerForType.handler = handler;
                originalAddEventListener.call(this, type, handler, options);
              }
              handlerForType.refCount++;
            } catch {
            }
          }
          return originalAddEventListener.call(this, type, listener, options);
        };
      });
      fill(
        proto,
        "removeEventListener",
        function(originalRemoveEventListener) {
          return function(type, listener, options) {
            if (type === "click" || type == "keypress") {
              try {
                const handlers2 = this.__sentry_instrumentation_handlers__ || {};
                const handlerForType = handlers2[type];
                if (handlerForType) {
                  handlerForType.refCount--;
                  if (handlerForType.refCount <= 0) {
                    originalRemoveEventListener.call(this, type, handlerForType.handler, options);
                    handlerForType.handler = void 0;
                    delete handlers2[type];
                  }
                  if (Object.keys(handlers2).length === 0) {
                    delete this.__sentry_instrumentation_handlers__;
                  }
                }
              } catch {
              }
            }
            return originalRemoveEventListener.call(this, type, listener, options);
          };
        }
      );
    });
  }
  function isSimilarToLastCapturedEvent(event) {
    if (event.type !== lastCapturedEventType) {
      return false;
    }
    try {
      if (!event.target || event.target._sentryId !== lastCapturedEventTargetId) {
        return false;
      }
    } catch {
    }
    return true;
  }
  function shouldSkipDOMEvent(eventType, target) {
    if (eventType !== "keypress") {
      return false;
    }
    if (!target?.tagName) {
      return true;
    }
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
      return false;
    }
    return true;
  }
  function makeDOMEventHandler(handler, globalListener = false) {
    return (event) => {
      if (!event || event["_sentryCaptured"]) {
        return;
      }
      const target = getEventTarget(event);
      if (shouldSkipDOMEvent(event.type, target)) {
        return;
      }
      addNonEnumerableProperty(event, "_sentryCaptured", true);
      if (target && !target._sentryId) {
        addNonEnumerableProperty(target, "_sentryId", uuid4());
      }
      const name = event.type === "keypress" ? "input" : event.type;
      if (!isSimilarToLastCapturedEvent(event)) {
        const handlerData = { event, name, global: globalListener };
        handler(handlerData);
        lastCapturedEventType = event.type;
        lastCapturedEventTargetId = target ? target._sentryId : void 0;
      }
      clearTimeout(debounceTimerID);
      debounceTimerID = WINDOW.setTimeout(() => {
        lastCapturedEventTargetId = void 0;
        lastCapturedEventType = void 0;
      }, DEBOUNCE_DURATION);
    };
  }
  function getEventTarget(event) {
    try {
      return event.target;
    } catch {
      return null;
    }
  }
  let lastHref;
  function addHistoryInstrumentationHandler(handler) {
    const type = "history";
    addHandler(type, handler);
    maybeInstrument(type, instrumentHistory);
  }
  function instrumentHistory() {
    WINDOW.addEventListener("popstate", () => {
      const to = WINDOW.location.href;
      const from = lastHref;
      lastHref = to;
      if (from === to) {
        return;
      }
      const handlerData = { from, to };
      triggerHandlers("history", handlerData);
    });
    if (!supportsHistory()) {
      return;
    }
    function historyReplacementFunction(originalHistoryFunction) {
      return function(...args) {
        const url = args.length > 2 ? args[2] : void 0;
        if (url) {
          const from = lastHref;
          const to = getAbsoluteUrl(String(url));
          lastHref = to;
          if (from === to) {
            return originalHistoryFunction.apply(this, args);
          }
          const handlerData = { from, to };
          triggerHandlers("history", handlerData);
        }
        return originalHistoryFunction.apply(this, args);
      };
    }
    fill(WINDOW.history, "pushState", historyReplacementFunction);
    fill(WINDOW.history, "replaceState", historyReplacementFunction);
  }
  function getAbsoluteUrl(urlOrPath) {
    try {
      const url = new URL(urlOrPath, WINDOW.location.origin);
      return url.toString();
    } catch {
      return urlOrPath;
    }
  }
  const cachedImplementations = {};
  function getNativeImplementation(name) {
    const cached = cachedImplementations[name];
    if (cached) {
      return cached;
    }
    let impl = WINDOW[name];
    if (isNativeFunction(impl)) {
      return cachedImplementations[name] = impl.bind(WINDOW);
    }
    const document2 = WINDOW.document;
    if (document2 && typeof document2.createElement === "function") {
      try {
        const sandbox = document2.createElement("iframe");
        sandbox.hidden = true;
        document2.head.appendChild(sandbox);
        const contentWindow = sandbox.contentWindow;
        if (contentWindow?.[name]) {
          impl = contentWindow[name];
        }
        document2.head.removeChild(sandbox);
      } catch (e) {
        DEBUG_BUILD$1 && debug.warn(`Could not create sandbox iframe for ${name} check, bailing to window.${name}: `, e);
      }
    }
    if (!impl) {
      return impl;
    }
    return cachedImplementations[name] = impl.bind(WINDOW);
  }
  function clearCachedImplementation(name) {
    cachedImplementations[name] = void 0;
  }
  const SENTRY_XHR_DATA_KEY = "__sentry_xhr_v3__";
  function addXhrInstrumentationHandler(handler) {
    const type = "xhr";
    addHandler(type, handler);
    maybeInstrument(type, instrumentXHR);
  }
  function instrumentXHR() {
    if (!WINDOW.XMLHttpRequest) {
      return;
    }
    const xhrproto = XMLHttpRequest.prototype;
    xhrproto.open = new Proxy(xhrproto.open, {
      apply(originalOpen, xhrOpenThisArg, xhrOpenArgArray) {
        const virtualError = new Error();
        const startTimestamp = timestampInSeconds() * 1e3;
        const method = isString(xhrOpenArgArray[0]) ? xhrOpenArgArray[0].toUpperCase() : void 0;
        const url = parseXhrUrlArg(xhrOpenArgArray[1]);
        if (!method || !url) {
          return originalOpen.apply(xhrOpenThisArg, xhrOpenArgArray);
        }
        xhrOpenThisArg[SENTRY_XHR_DATA_KEY] = {
          method,
          url,
          request_headers: {}
        };
        if (method === "POST" && url.match(/sentry_key/)) {
          xhrOpenThisArg.__sentry_own_request__ = true;
        }
        const onreadystatechangeHandler = () => {
          const xhrInfo = xhrOpenThisArg[SENTRY_XHR_DATA_KEY];
          if (!xhrInfo) {
            return;
          }
          if (xhrOpenThisArg.readyState === 4) {
            try {
              xhrInfo.status_code = xhrOpenThisArg.status;
            } catch {
            }
            const handlerData = {
              endTimestamp: timestampInSeconds() * 1e3,
              startTimestamp,
              xhr: xhrOpenThisArg,
              virtualError
            };
            triggerHandlers("xhr", handlerData);
          }
        };
        if ("onreadystatechange" in xhrOpenThisArg && typeof xhrOpenThisArg.onreadystatechange === "function") {
          xhrOpenThisArg.onreadystatechange = new Proxy(xhrOpenThisArg.onreadystatechange, {
            apply(originalOnreadystatechange, onreadystatechangeThisArg, onreadystatechangeArgArray) {
              onreadystatechangeHandler();
              return originalOnreadystatechange.apply(onreadystatechangeThisArg, onreadystatechangeArgArray);
            }
          });
        } else {
          xhrOpenThisArg.addEventListener("readystatechange", onreadystatechangeHandler);
        }
        xhrOpenThisArg.setRequestHeader = new Proxy(xhrOpenThisArg.setRequestHeader, {
          apply(originalSetRequestHeader, setRequestHeaderThisArg, setRequestHeaderArgArray) {
            const [header, value] = setRequestHeaderArgArray;
            const xhrInfo = setRequestHeaderThisArg[SENTRY_XHR_DATA_KEY];
            if (xhrInfo && isString(header) && isString(value)) {
              xhrInfo.request_headers[header.toLowerCase()] = value;
            }
            return originalSetRequestHeader.apply(setRequestHeaderThisArg, setRequestHeaderArgArray);
          }
        });
        return originalOpen.apply(xhrOpenThisArg, xhrOpenArgArray);
      }
    });
    xhrproto.send = new Proxy(xhrproto.send, {
      apply(originalSend, sendThisArg, sendArgArray) {
        const sentryXhrData = sendThisArg[SENTRY_XHR_DATA_KEY];
        if (!sentryXhrData) {
          return originalSend.apply(sendThisArg, sendArgArray);
        }
        if (sendArgArray[0] !== void 0) {
          sentryXhrData.body = sendArgArray[0];
        }
        const handlerData = {
          startTimestamp: timestampInSeconds() * 1e3,
          xhr: sendThisArg
        };
        triggerHandlers("xhr", handlerData);
        return originalSend.apply(sendThisArg, sendArgArray);
      }
    });
  }
  function parseXhrUrlArg(url) {
    if (isString(url)) {
      return url;
    }
    try {
      return url.toString();
    } catch {
    }
    return void 0;
  }
  const DEFAULT_BROWSER_TRANSPORT_BUFFER_SIZE = 40;
  function makeFetchTransport(options, nativeFetch = getNativeImplementation("fetch")) {
    let pendingBodySize = 0;
    let pendingCount = 0;
    async function makeRequest(request) {
      const requestSize = request.body.length;
      pendingBodySize += requestSize;
      pendingCount++;
      const requestOptions = {
        body: request.body,
        method: "POST",
        referrerPolicy: "strict-origin",
        headers: options.headers,
        // Outgoing requests are usually cancelled when navigating to a different page, causing a "TypeError: Failed to
        // fetch" error and sending a "network_error" client-outcome - in Chrome, the request status shows "(cancelled)".
        // The `keepalive` flag keeps outgoing requests alive, even when switching pages. We want this since we're
        // frequently sending events right before the user is switching pages (eg. when finishing navigation transactions).
        // Gotchas:
        // - `keepalive` isn't supported by Firefox
        // - As per spec (https://fetch.spec.whatwg.org/#http-network-or-cache-fetch):
        //   If the sum of contentLength and inflightKeepaliveBytes is greater than 64 kibibytes, then return a network error.
        //   We will therefore only activate the flag when we're below that limit.
        // There is also a limit of requests that can be open at the same time, so we also limit this to 15
        // See https://github.com/getsentry/sentry-javascript/pull/7553 for details
        keepalive: pendingBodySize <= 6e4 && pendingCount < 15,
        ...options.fetchOptions
      };
      try {
        const response = await nativeFetch(options.url, requestOptions);
        return {
          statusCode: response.status,
          headers: {
            "x-sentry-rate-limits": response.headers.get("X-Sentry-Rate-Limits"),
            "retry-after": response.headers.get("Retry-After")
          }
        };
      } catch (e) {
        clearCachedImplementation("fetch");
        throw e;
      } finally {
        pendingBodySize -= requestSize;
        pendingCount--;
      }
    }
    return createTransport(
      options,
      makeRequest,
      makePromiseBuffer(options.bufferSize || DEFAULT_BROWSER_TRANSPORT_BUFFER_SIZE)
    );
  }
  const DEBUG_BUILD = typeof __SENTRY_DEBUG__ === "undefined" || __SENTRY_DEBUG__;
  const CHROME_PRIORITY = 30;
  const GECKO_PRIORITY = 50;
  function createFrame(filename, func, lineno, colno) {
    const frame = {
      filename,
      function: func === "<anonymous>" ? UNKNOWN_FUNCTION : func,
      in_app: true
      // All browser frames are considered in_app
    };
    if (lineno !== void 0) {
      frame.lineno = lineno;
    }
    if (colno !== void 0) {
      frame.colno = colno;
    }
    return frame;
  }
  const chromeRegexNoFnName = /^\s*at (\S+?)(?::(\d+))(?::(\d+))\s*$/i;
  const chromeRegex = /^\s*at (?:(.+?\)(?: \[.+\])?|.*?) ?\((?:address at )?)?(?:async )?((?:<anonymous>|[-a-z]+:|.*bundle|\/)?.*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i;
  const chromeEvalRegex = /\((\S*)(?::(\d+))(?::(\d+))\)/;
  const chromeDataUriRegex = /at (.+?) ?\(data:(.+?),/;
  const chromeStackParserFn = (line) => {
    const dataUriMatch = line.match(chromeDataUriRegex);
    if (dataUriMatch) {
      return {
        filename: `<data:${dataUriMatch[2]}>`,
        function: dataUriMatch[1]
      };
    }
    const noFnParts = chromeRegexNoFnName.exec(line);
    if (noFnParts) {
      const [, filename, line2, col] = noFnParts;
      return createFrame(filename, UNKNOWN_FUNCTION, +line2, +col);
    }
    const parts = chromeRegex.exec(line);
    if (parts) {
      const isEval = parts[2] && parts[2].indexOf("eval") === 0;
      if (isEval) {
        const subMatch = chromeEvalRegex.exec(parts[2]);
        if (subMatch) {
          parts[2] = subMatch[1];
          parts[3] = subMatch[2];
          parts[4] = subMatch[3];
        }
      }
      const [func, filename] = extractSafariExtensionDetails(parts[1] || UNKNOWN_FUNCTION, parts[2]);
      return createFrame(filename, func, parts[3] ? +parts[3] : void 0, parts[4] ? +parts[4] : void 0);
    }
    return;
  };
  const chromeStackLineParser = [CHROME_PRIORITY, chromeStackParserFn];
  const geckoREgex = /^\s*(.*?)(?:\((.*?)\))?(?:^|@)?((?:[-a-z]+)?:\/.*?|\[native code\]|[^@]*(?:bundle|\d+\.js)|\/[\w\-. /=]+)(?::(\d+))?(?::(\d+))?\s*$/i;
  const geckoEvalRegex = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;
  const gecko = (line) => {
    const parts = geckoREgex.exec(line);
    if (parts) {
      const isEval = parts[3] && parts[3].indexOf(" > eval") > -1;
      if (isEval) {
        const subMatch = geckoEvalRegex.exec(parts[3]);
        if (subMatch) {
          parts[1] = parts[1] || "eval";
          parts[3] = subMatch[1];
          parts[4] = subMatch[2];
          parts[5] = "";
        }
      }
      let filename = parts[3];
      let func = parts[1] || UNKNOWN_FUNCTION;
      [func, filename] = extractSafariExtensionDetails(func, filename);
      return createFrame(filename, func, parts[4] ? +parts[4] : void 0, parts[5] ? +parts[5] : void 0);
    }
    return;
  };
  const geckoStackLineParser = [GECKO_PRIORITY, gecko];
  const defaultStackLineParsers = [chromeStackLineParser, geckoStackLineParser];
  const defaultStackParser = createStackParser(...defaultStackLineParsers);
  const extractSafariExtensionDetails = (func, filename) => {
    const isSafariExtension = func.indexOf("safari-extension") !== -1;
    const isSafariWebExtension = func.indexOf("safari-web-extension") !== -1;
    return isSafariExtension || isSafariWebExtension ? [
      func.indexOf("@") !== -1 ? func.split("@")[0] : UNKNOWN_FUNCTION,
      isSafariExtension ? `safari-extension:${filename}` : `safari-web-extension:${filename}`
    ] : [func, filename];
  };
  const MAX_ALLOWED_STRING_LENGTH = 1024;
  const INTEGRATION_NAME$3 = "Breadcrumbs";
  const _breadcrumbsIntegration = ((options = {}) => {
    const _options = {
      console: true,
      dom: true,
      fetch: true,
      history: true,
      sentry: true,
      xhr: true,
      ...options
    };
    return {
      name: INTEGRATION_NAME$3,
      setup(client) {
        if (_options.console) {
          addConsoleInstrumentationHandler(_getConsoleBreadcrumbHandler(client));
        }
        if (_options.dom) {
          addClickKeypressInstrumentationHandler(_getDomBreadcrumbHandler(client, _options.dom));
        }
        if (_options.xhr) {
          addXhrInstrumentationHandler(_getXhrBreadcrumbHandler(client));
        }
        if (_options.fetch) {
          addFetchInstrumentationHandler(_getFetchBreadcrumbHandler(client));
        }
        if (_options.history) {
          addHistoryInstrumentationHandler(_getHistoryBreadcrumbHandler(client));
        }
        if (_options.sentry) {
          client.on("beforeSendEvent", _getSentryBreadcrumbHandler(client));
        }
      }
    };
  });
  const breadcrumbsIntegration = defineIntegration(_breadcrumbsIntegration);
  function _getSentryBreadcrumbHandler(client) {
    return function addSentryBreadcrumb(event) {
      if (getClient() !== client) {
        return;
      }
      addBreadcrumb(
        {
          category: `sentry.${event.type === "transaction" ? "transaction" : "event"}`,
          event_id: event.event_id,
          level: event.level,
          message: getEventDescription(event)
        },
        {
          event
        }
      );
    };
  }
  function _getDomBreadcrumbHandler(client, dom) {
    return function _innerDomBreadcrumb(handlerData) {
      if (getClient() !== client) {
        return;
      }
      let target;
      let componentName;
      let keyAttrs = typeof dom === "object" ? dom.serializeAttribute : void 0;
      let maxStringLength = typeof dom === "object" && typeof dom.maxStringLength === "number" ? dom.maxStringLength : void 0;
      if (maxStringLength && maxStringLength > MAX_ALLOWED_STRING_LENGTH) {
        DEBUG_BUILD && debug.warn(
          `\`dom.maxStringLength\` cannot exceed ${MAX_ALLOWED_STRING_LENGTH}, but a value of ${maxStringLength} was configured. Sentry will use ${MAX_ALLOWED_STRING_LENGTH} instead.`
        );
        maxStringLength = MAX_ALLOWED_STRING_LENGTH;
      }
      if (typeof keyAttrs === "string") {
        keyAttrs = [keyAttrs];
      }
      try {
        const event = handlerData.event;
        const element = _isEvent(event) ? event.target : event;
        target = htmlTreeAsString(element, { keyAttrs, maxStringLength });
        componentName = getComponentName(element);
      } catch {
        target = "<unknown>";
      }
      if (target.length === 0) {
        return;
      }
      const breadcrumb = {
        category: `ui.${handlerData.name}`,
        message: target
      };
      if (componentName) {
        breadcrumb.data = { "ui.component_name": componentName };
      }
      addBreadcrumb(breadcrumb, {
        event: handlerData.event,
        name: handlerData.name,
        global: handlerData.global
      });
    };
  }
  function _getConsoleBreadcrumbHandler(client) {
    return function _consoleBreadcrumb(handlerData) {
      if (getClient() !== client) {
        return;
      }
      const breadcrumb = {
        category: "console",
        data: {
          arguments: handlerData.args,
          logger: "console"
        },
        level: severityLevelFromString(handlerData.level),
        message: safeJoin(handlerData.args, " ")
      };
      if (handlerData.level === "assert") {
        if (handlerData.args[0] === false) {
          breadcrumb.message = `Assertion failed: ${safeJoin(handlerData.args.slice(1), " ") || "console.assert"}`;
          breadcrumb.data.arguments = handlerData.args.slice(1);
        } else {
          return;
        }
      }
      addBreadcrumb(breadcrumb, {
        input: handlerData.args,
        level: handlerData.level
      });
    };
  }
  function _getXhrBreadcrumbHandler(client) {
    return function _xhrBreadcrumb(handlerData) {
      if (getClient() !== client) {
        return;
      }
      const { startTimestamp, endTimestamp } = handlerData;
      const sentryXhrData = handlerData.xhr[SENTRY_XHR_DATA_KEY];
      if (!startTimestamp || !endTimestamp || !sentryXhrData) {
        return;
      }
      const { method, url, status_code, body } = sentryXhrData;
      const data = {
        method,
        url,
        status_code
      };
      const hint = {
        xhr: handlerData.xhr,
        input: body,
        startTimestamp,
        endTimestamp
      };
      const breadcrumb = {
        category: "xhr",
        data,
        type: "http",
        level: getBreadcrumbLogLevelFromHttpStatusCode(status_code)
      };
      client.emit("beforeOutgoingRequestBreadcrumb", breadcrumb, hint);
      addBreadcrumb(breadcrumb, hint);
    };
  }
  function _getFetchBreadcrumbHandler(client) {
    return function _fetchBreadcrumb(handlerData) {
      if (getClient() !== client) {
        return;
      }
      const { startTimestamp, endTimestamp } = handlerData;
      if (!endTimestamp) {
        return;
      }
      if (handlerData.fetchData.url.match(/sentry_key/) && handlerData.fetchData.method === "POST") {
        return;
      }
      ({
        method: handlerData.fetchData.method,
        url: handlerData.fetchData.url
      });
      if (handlerData.error) {
        const data = handlerData.fetchData;
        const hint = {
          data: handlerData.error,
          input: handlerData.args,
          startTimestamp,
          endTimestamp
        };
        const breadcrumb = {
          category: "fetch",
          data,
          level: "error",
          type: "http"
        };
        client.emit("beforeOutgoingRequestBreadcrumb", breadcrumb, hint);
        addBreadcrumb(breadcrumb, hint);
      } else {
        const response = handlerData.response;
        const data = {
          ...handlerData.fetchData,
          status_code: response?.status
        };
        handlerData.fetchData.request_body_size;
        handlerData.fetchData.response_body_size;
        response?.status;
        const hint = {
          input: handlerData.args,
          response,
          startTimestamp,
          endTimestamp
        };
        const breadcrumb = {
          category: "fetch",
          data,
          type: "http",
          level: getBreadcrumbLogLevelFromHttpStatusCode(data.status_code)
        };
        client.emit("beforeOutgoingRequestBreadcrumb", breadcrumb, hint);
        addBreadcrumb(breadcrumb, hint);
      }
    };
  }
  function _getHistoryBreadcrumbHandler(client) {
    return function _historyBreadcrumb(handlerData) {
      if (getClient() !== client) {
        return;
      }
      let from = handlerData.from;
      let to = handlerData.to;
      const parsedLoc = parseUrl(WINDOW$1.location.href);
      let parsedFrom = from ? parseUrl(from) : void 0;
      const parsedTo = parseUrl(to);
      if (!parsedFrom?.path) {
        parsedFrom = parsedLoc;
      }
      if (parsedLoc.protocol === parsedTo.protocol && parsedLoc.host === parsedTo.host) {
        to = parsedTo.relative;
      }
      if (parsedLoc.protocol === parsedFrom.protocol && parsedLoc.host === parsedFrom.host) {
        from = parsedFrom.relative;
      }
      addBreadcrumb({
        category: "navigation",
        data: {
          from,
          to
        }
      });
    };
  }
  function _isEvent(event) {
    return !!event && !!event.target;
  }
  const DEFAULT_EVENT_TARGET = [
    "EventTarget",
    "Window",
    "Node",
    "ApplicationCache",
    "AudioTrackList",
    "BroadcastChannel",
    "ChannelMergerNode",
    "CryptoOperation",
    "EventSource",
    "FileReader",
    "HTMLUnknownElement",
    "IDBDatabase",
    "IDBRequest",
    "IDBTransaction",
    "KeyOperation",
    "MediaController",
    "MessagePort",
    "ModalWindow",
    "Notification",
    "SVGElementInstance",
    "Screen",
    "SharedWorker",
    "TextTrack",
    "TextTrackCue",
    "TextTrackList",
    "WebSocket",
    "WebSocketWorker",
    "Worker",
    "XMLHttpRequest",
    "XMLHttpRequestEventTarget",
    "XMLHttpRequestUpload"
  ];
  const INTEGRATION_NAME$2 = "BrowserApiErrors";
  const _browserApiErrorsIntegration = ((options = {}) => {
    const _options = {
      XMLHttpRequest: true,
      eventTarget: true,
      requestAnimationFrame: true,
      setInterval: true,
      setTimeout: true,
      unregisterOriginalCallbacks: false,
      ...options
    };
    return {
      name: INTEGRATION_NAME$2,
      // TODO: This currently only works for the first client this is setup
      // We may want to adjust this to check for client etc.
      setupOnce() {
        if (_options.setTimeout) {
          fill(WINDOW$1, "setTimeout", _wrapTimeFunction);
        }
        if (_options.setInterval) {
          fill(WINDOW$1, "setInterval", _wrapTimeFunction);
        }
        if (_options.requestAnimationFrame) {
          fill(WINDOW$1, "requestAnimationFrame", _wrapRAF);
        }
        if (_options.XMLHttpRequest && "XMLHttpRequest" in WINDOW$1) {
          fill(XMLHttpRequest.prototype, "send", _wrapXHR);
        }
        const eventTargetOption = _options.eventTarget;
        if (eventTargetOption) {
          const eventTarget = Array.isArray(eventTargetOption) ? eventTargetOption : DEFAULT_EVENT_TARGET;
          eventTarget.forEach((target) => _wrapEventTarget(target, _options));
        }
      }
    };
  });
  const browserApiErrorsIntegration = defineIntegration(_browserApiErrorsIntegration);
  function _wrapTimeFunction(original) {
    return function(...args) {
      const originalCallback = args[0];
      args[0] = wrap(originalCallback, {
        mechanism: {
          handled: false,
          type: `auto.browser.browserapierrors.${getFunctionName$1(original)}`
        }
      });
      return original.apply(this, args);
    };
  }
  function _wrapRAF(original) {
    return function(callback) {
      return original.apply(this, [
        wrap(callback, {
          mechanism: {
            data: {
              handler: getFunctionName$1(original)
            },
            handled: false,
            type: "auto.browser.browserapierrors.requestAnimationFrame"
          }
        })
      ]);
    };
  }
  function _wrapXHR(originalSend) {
    return function(...args) {
      const xhr = this;
      const xmlHttpRequestProps = ["onload", "onerror", "onprogress", "onreadystatechange"];
      xmlHttpRequestProps.forEach((prop) => {
        if (prop in xhr && typeof xhr[prop] === "function") {
          fill(xhr, prop, function(original) {
            const wrapOptions = {
              mechanism: {
                data: {
                  handler: getFunctionName$1(original)
                },
                handled: false,
                type: `auto.browser.browserapierrors.xhr.${prop}`
              }
            };
            const originalFunction = getOriginalFunction(original);
            if (originalFunction) {
              wrapOptions.mechanism.data.handler = getFunctionName$1(originalFunction);
            }
            return wrap(original, wrapOptions);
          });
        }
      });
      return originalSend.apply(this, args);
    };
  }
  function _wrapEventTarget(target, integrationOptions) {
    const globalObject = WINDOW$1;
    const proto = globalObject[target]?.prototype;
    if (!proto?.hasOwnProperty?.("addEventListener")) {
      return;
    }
    fill(proto, "addEventListener", function(original) {
      return function(eventName, fn, options) {
        try {
          if (isEventListenerObject(fn)) {
            fn.handleEvent = wrap(fn.handleEvent, {
              mechanism: {
                data: {
                  handler: getFunctionName$1(fn),
                  target
                },
                handled: false,
                type: "auto.browser.browserapierrors.handleEvent"
              }
            });
          }
        } catch {
        }
        if (integrationOptions.unregisterOriginalCallbacks) {
          unregisterOriginalCallback(this, eventName, fn);
        }
        return original.apply(this, [
          eventName,
          wrap(fn, {
            mechanism: {
              data: {
                handler: getFunctionName$1(fn),
                target
              },
              handled: false,
              type: "auto.browser.browserapierrors.addEventListener"
            }
          }),
          options
        ]);
      };
    });
    fill(proto, "removeEventListener", function(originalRemoveEventListener) {
      return function(eventName, fn, options) {
        try {
          const originalEventHandler = fn.__sentry_wrapped__;
          if (originalEventHandler) {
            originalRemoveEventListener.call(this, eventName, originalEventHandler, options);
          }
        } catch {
        }
        return originalRemoveEventListener.call(this, eventName, fn, options);
      };
    });
  }
  function isEventListenerObject(obj) {
    return typeof obj.handleEvent === "function";
  }
  function unregisterOriginalCallback(target, eventName, fn) {
    if (target && typeof target === "object" && "removeEventListener" in target && typeof target.removeEventListener === "function") {
      target.removeEventListener(eventName, fn);
    }
  }
  const browserSessionIntegration = defineIntegration(() => {
    return {
      name: "BrowserSession",
      setupOnce() {
        if (typeof WINDOW$1.document === "undefined") {
          DEBUG_BUILD && debug.warn("Using the `browserSessionIntegration` in non-browser environments is not supported.");
          return;
        }
        startSession({ ignoreDuration: true });
        captureSession();
        addHistoryInstrumentationHandler(({ from, to }) => {
          if (from !== void 0 && from !== to) {
            startSession({ ignoreDuration: true });
            captureSession();
          }
        });
      }
    };
  });
  const INTEGRATION_NAME$1 = "GlobalHandlers";
  const _globalHandlersIntegration = ((options = {}) => {
    const _options = {
      onerror: true,
      onunhandledrejection: true,
      ...options
    };
    return {
      name: INTEGRATION_NAME$1,
      setupOnce() {
        Error.stackTraceLimit = 50;
      },
      setup(client) {
        if (_options.onerror) {
          _installGlobalOnErrorHandler(client);
          globalHandlerLog("onerror");
        }
        if (_options.onunhandledrejection) {
          _installGlobalOnUnhandledRejectionHandler(client);
          globalHandlerLog("onunhandledrejection");
        }
      }
    };
  });
  const globalHandlersIntegration = defineIntegration(_globalHandlersIntegration);
  function _installGlobalOnErrorHandler(client) {
    addGlobalErrorInstrumentationHandler((data) => {
      const { stackParser, attachStacktrace } = getOptions();
      if (getClient() !== client || shouldIgnoreOnError()) {
        return;
      }
      const { msg, url, line, column, error: error2 } = data;
      const event = _enhanceEventWithInitialFrame(
        eventFromUnknownInput(stackParser, error2 || msg, void 0, attachStacktrace, false),
        url,
        line,
        column
      );
      event.level = "error";
      captureEvent(event, {
        originalException: error2,
        mechanism: {
          handled: false,
          type: "auto.browser.global_handlers.onerror"
        }
      });
    });
  }
  function _installGlobalOnUnhandledRejectionHandler(client) {
    addGlobalUnhandledRejectionInstrumentationHandler((e) => {
      const { stackParser, attachStacktrace } = getOptions();
      if (getClient() !== client || shouldIgnoreOnError()) {
        return;
      }
      const error2 = _getUnhandledRejectionError(e);
      const event = isPrimitive(error2) ? _eventFromRejectionWithPrimitive(error2) : eventFromUnknownInput(stackParser, error2, void 0, attachStacktrace, true);
      event.level = "error";
      captureEvent(event, {
        originalException: error2,
        mechanism: {
          handled: false,
          type: "auto.browser.global_handlers.onunhandledrejection"
        }
      });
    });
  }
  function _getUnhandledRejectionError(error2) {
    if (isPrimitive(error2)) {
      return error2;
    }
    try {
      if ("reason" in error2) {
        return error2.reason;
      }
      if ("detail" in error2 && "reason" in error2.detail) {
        return error2.detail.reason;
      }
    } catch {
    }
    return error2;
  }
  function _eventFromRejectionWithPrimitive(reason) {
    return {
      exception: {
        values: [
          {
            type: "UnhandledRejection",
            // String() is needed because the Primitive type includes symbols (which can't be automatically stringified)
            value: `Non-Error promise rejection captured with value: ${String(reason)}`
          }
        ]
      }
    };
  }
  function _enhanceEventWithInitialFrame(event, url, line, column) {
    const e = event.exception = event.exception || {};
    const ev = e.values = e.values || [];
    const ev0 = ev[0] = ev[0] || {};
    const ev0s = ev0.stacktrace = ev0.stacktrace || {};
    const ev0sf = ev0s.frames = ev0s.frames || [];
    const colno = column;
    const lineno = line;
    const filename = getFilenameFromUrl(url) ?? getLocationHref();
    if (ev0sf.length === 0) {
      ev0sf.push({
        colno,
        filename,
        function: UNKNOWN_FUNCTION,
        in_app: true,
        lineno
      });
    }
    return event;
  }
  function globalHandlerLog(type) {
    DEBUG_BUILD && debug.log(`Global Handler attached: ${type}`);
  }
  function getOptions() {
    const client = getClient();
    const options = client?.getOptions() || {
      stackParser: () => [],
      attachStacktrace: false
    };
    return options;
  }
  function getFilenameFromUrl(url) {
    if (!isString(url) || url.length === 0) {
      return void 0;
    }
    if (url.startsWith("data:")) {
      const match = url.match(/^data:([^;]+)/);
      const mimeType = match ? match[1] : "text/javascript";
      const isBase64 = url.includes("base64,");
      return `<data:${mimeType}${isBase64 ? ",base64" : ""}>`;
    }
    return url;
  }
  const httpContextIntegration = defineIntegration(() => {
    return {
      name: "HttpContext",
      preprocessEvent(event) {
        if (!WINDOW$1.navigator && !WINDOW$1.location && !WINDOW$1.document) {
          return;
        }
        const reqData = getHttpRequestData();
        const headers = {
          ...reqData.headers,
          ...event.request?.headers
        };
        event.request = {
          ...reqData,
          ...event.request,
          headers
        };
      }
    };
  });
  const DEFAULT_KEY = "cause";
  const DEFAULT_LIMIT = 5;
  const INTEGRATION_NAME = "LinkedErrors";
  const _linkedErrorsIntegration = ((options = {}) => {
    const limit = options.limit || DEFAULT_LIMIT;
    const key = options.key || DEFAULT_KEY;
    return {
      name: INTEGRATION_NAME,
      preprocessEvent(event, hint, client) {
        const options2 = client.getOptions();
        applyAggregateErrorsToEvent(
          // This differs from the LinkedErrors integration in core by using a different exceptionFromError function
          exceptionFromError,
          options2.stackParser,
          key,
          limit,
          event,
          hint
        );
      }
    };
  });
  const linkedErrorsIntegration = defineIntegration(_linkedErrorsIntegration);
  function checkAndWarnIfIsEmbeddedBrowserExtension() {
    if (_isEmbeddedBrowserExtension()) {
      if (DEBUG_BUILD) {
        consoleSandbox(() => {
          console.error(
            "[Sentry] You cannot use Sentry.init() in a browser extension, see: https://docs.sentry.io/platforms/javascript/best-practices/browser-extensions/"
          );
        });
      }
      return true;
    }
    return false;
  }
  function _isEmbeddedBrowserExtension() {
    if (typeof WINDOW$1.window === "undefined") {
      return false;
    }
    const _window = WINDOW$1;
    if (_window.nw) {
      return false;
    }
    const extensionObject = _window["chrome"] || _window["browser"];
    if (!extensionObject?.runtime?.id) {
      return false;
    }
    const href = getLocationHref();
    const extensionProtocols = ["chrome-extension", "moz-extension", "ms-browser-extension", "safari-web-extension"];
    const isDedicatedExtensionPage = WINDOW$1 === WINDOW$1.top && extensionProtocols.some((protocol) => href.startsWith(`${protocol}://`));
    return !isDedicatedExtensionPage;
  }
  function getDefaultIntegrations(_options) {
    return [
      // TODO(v11): Replace with `eventFiltersIntegration` once we remove the deprecated `inboundFiltersIntegration`
      // eslint-disable-next-line deprecation/deprecation
      inboundFiltersIntegration(),
      functionToStringIntegration(),
      browserApiErrorsIntegration(),
      breadcrumbsIntegration(),
      globalHandlersIntegration(),
      linkedErrorsIntegration(),
      dedupeIntegration(),
      httpContextIntegration(),
      browserSessionIntegration()
    ];
  }
  function init(options = {}) {
    const shouldDisableBecauseIsBrowserExtenstion = !options.skipBrowserExtensionCheck && checkAndWarnIfIsEmbeddedBrowserExtension();
    let defaultIntegrations = options.defaultIntegrations == null ? getDefaultIntegrations() : options.defaultIntegrations;
    const clientOptions = {
      ...options,
      enabled: shouldDisableBecauseIsBrowserExtenstion ? false : options.enabled,
      stackParser: stackParserFromStackParserOptions(options.stackParser || defaultStackParser),
      integrations: getIntegrationsToSetup({
        integrations: options.integrations,
        defaultIntegrations
      }),
      transport: options.transport || makeFetchTransport
    };
    return initAndBind(BrowserClient, clientOptions);
  }
  const GAME_ENGINE = {
    GODOT: "GODOT",
    UNITY: "UNITY",
    UNREAL: "UNREAL",
    JSDOS: "JSDOS",
    RUFFLE: "RUFFLE",
    RENPY: "RENPY",
    CUSTOM: "CUSTOM"
  };
  const LOBBY_VISIBILITY = {
    PUBLIC: 0,
    FRIENDS_ONLY: 1,
    PRIVATE: 2
  };
  const LOBBY_MESSAGE_MAX_LENGTH = 500;
  const LEADERBOARD_SORT_ORDER = {
    ASC: 0,
    DESC: 1
  };
  const LEADERBOARD_DISPLAY_TYPE = {
    NUMERIC: 0,
    TIME_SECONDS: 1,
    TIME_MILLISECONDS: 2,
    TIME_GAME_TICKS: 3
    // Added for PGRC, assumes 60fps game ticks for proper display, probably don't want to let other games do this
  };
  const PAID_CONTENT_TYPE = {
    DURABLE: "DURABLE",
    CONSUMABLE: "CONSUMABLE"
  };
  const FULFILL_PURCHASE_STATUS = {
    FULFILLED: "FULFILLED",
    ALREADY_FULFILLED: "ALREADY_FULFILLED",
    NOT_FOUND: "NOT_FOUND"
  };
  const UGC_TYPE = {
    SCREENSHOT: 0,
    VIDEO: 1,
    COMMUNITY: 2,
    GAME_MANAGED: 3,
    // Managed completely by the game, user doesn't edit
    OTHER: 4
  };
  const UGC_VISIBILITY = {
    PUBLIC: 0,
    PRIVATE: 2
  };
  const P2P_SIGNALING_MESSAGE_TYPE = {
    OFFER: "offer",
    ANSWER: "answer",
    ICE_CANDIDATE: "ice-candidate"
  };
  const IFRAME_MESSAGE_TYPE = {
    PROGRESS_UPDATE: "ProgressUpdate",
    LOADING_COMPLETE: "LoadingComplete",
    LOADING_FAILED: "LoadingFailed",
    FRAME_BOOTED: "FrameBooted",
    TOGGLE_OVERLAY: "ToggleOverlay",
    TAKE_FOCUS: "TakeFocus",
    LOBBY_JOINED: "LobbyJoined",
    LOBBY_LEFT: "LobbyLeft",
    GET_LOBBY_INVITE_LINK: "GetLobbyInviteLink",
    GET_DEVICE_FINGERPRINT: "GetDeviceFingerprint",
    SET_FULLSCREEN: "SetFullscreen",
    TOGGLE_FULLSCREEN: "ToggleFullscreen",
    FULLSCREEN_CHANGED: "FullscreenChanged",
    VOLUME_CHANGED: "VolumeChanged",
    SDK_FUNCTION_CALLED: "SdkFunctionCalled",
    SET_MUTE: "SetMute",
    TOGGLE_MUTE: "ToggleMute",
    OVERLAY_CHANGED: "OverlayChanged",
    GAMEPLAY_JWT_READY: "GameplayJwtReady",
    END_SESSION: "EndSession",
    TRIGGER_PAYWALL: "TriggerPaywall",
    LINK_COPIED: "LinkCopied"
  };
  const GAME_ISOLATION_ERROR_PATTERN = /SharedArrayBuffer|shared memory|isolat|threading|DataCloneError|be cloned/i;
  const SERVICE_WORKER_MESSAGE_TYPE = {
    EMBED_CONFIGURE: "embed.configure",
    EMBED_CONFIGURE_ACK: "embed.configure:ack",
    EMBED_CREDS_REQUEST: "embed.creds-request",
    EMBED_CREDS_RESPONSE: "embed.creds-response"
  };
  const LAUNCH_PARAM_PREFIX = "wvdsh_";
  const UrlParams = {
    RedirectUrl: "rdurl",
    EntrypointParams: "entrypointparams",
    Entrypoint: "entrypoint",
    Engine: "engine",
    EngineVersion: "engineversion",
    PlayKey: "pk",
    SdkConfig: "sdkconfig",
    VirtualGamepad: "virtualGamepad",
    // Read by the cross-origin play iframe for its Sentry tags — it can't read this URL.
    GameSlug: "gameSlug",
    // Signed upload URL params authorizing a UGC/userfs PUT (see createUgcUploadUrl).
    UgcUploadExpires: "exp",
    UgcUploadSignature: "sig"
  };
  const UgcStorage = {
    // UGC keys: `{gameCloudId}/ugcid/{uuid}`
    KEY_INFIX: "/ugcid/",
    buildKey(gameCloudId, uuid) {
      return `${gameCloudId}${UgcStorage.KEY_INFIX}${uuid}`;
    },
    // Cheap UGC-vs-userfs classifier used by the R2 event webhook
    isUgcKey(key) {
      return key.indexOf(UgcStorage.KEY_INFIX) > 0;
    },
    // userfs (cloud-save) keys: `{gameCloudId}/userfs/{userId}/{path}`
    USERFS_INFIX: "/userfs/",
    // R2 key prefix covering all of a user's cloud saves in a game cloud
    userfsPrefix(gameCloudId, userId) {
      return userId ? `${gameCloudId}${UgcStorage.USERFS_INFIX}${userId}/` : `${gameCloudId}${UgcStorage.USERFS_INFIX}`;
    },
    // Inverse of userfsPrefix; null when the key isn't a userfs key
    parseUserfsKey(key) {
      const infix = key.indexOf(UgcStorage.USERFS_INFIX);
      if (infix <= 0)
        return null;
      const gameCloudId = key.slice(0, infix);
      const afterInfix = key.slice(infix + UgcStorage.USERFS_INFIX.length);
      const slash = afterInfix.indexOf("/");
      if (slash <= 0)
        return null;
      const userId = afterInfix.slice(0, slash);
      const path = afterInfix.slice(slash + 1);
      if (!path)
        return null;
      return { gameCloudId, userId, path };
    },
    // Signed into upload URLs; digits-only exp + fixed-length sub keep the split unambiguous
    buildUploadSignaturePayload(args) {
      return `${args.exp}@${args.sub}@${args.objectKey}`;
    },
    // Object key → URL path, per segment so keys never encode to `%2F`
    encodeKeyPath(objectKey) {
      return objectKey.split("/").map(encodeURIComponent).join("/");
    },
    // Inverse of encodeKeyPath; malformed escapes fall back to the raw path (matches the worker)
    decodeKeyPath(pathname) {
      const rawPath = pathname.startsWith("/") ? pathname.slice(1) : pathname;
      try {
        return decodeURIComponent(rawPath);
      } catch {
        return rawPath;
      }
    }
  };
  const HEARTBEAT_CLIENT_INTERVAL_MS = 3e4;
  const HEARTBEAT = {
    /** Client sends heartbeat every 30 seconds when tab is visible */
    CLIENT_INTERVAL_MS: HEARTBEAT_CLIENT_INTERVAL_MS,
    /**
     * Client force re-establishes presence at 2.5x interval (75 seconds).
     * If client tab comes alive and has missed 2 heartbeats, it will force re-establish presence.
     * Gives 15s margin before timeout without triggering on single missed heartbeat.
     */
    CLIENT_REESTABLISH_THRESHOLD_MS: HEARTBEAT_CLIENT_INTERVAL_MS * 2.5,
    /**
     * Grace period for regular heartbeats to prevent spam on tab switches.
     * New heartbeat is only sent from a tab-switch if it's been at least CLIENT_INTERVAL_MS - CLIENT_GRACE_MS since last heartbeat.
     * Effective minimum between heartbeats = 25s
     */
    CLIENT_GRACE_MS: HEARTBEAT_CLIENT_INTERVAL_MS / 6
  };
  var lookup = [];
  var revLookup = [];
  var Arr = Uint8Array;
  var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
  }
  revLookup["-".charCodeAt(0)] = 62;
  revLookup["_".charCodeAt(0)] = 63;
  function getLens(b64) {
    var len2 = b64.length;
    if (len2 % 4 > 0) {
      throw new Error("Invalid string. Length must be a multiple of 4");
    }
    var validLen = b64.indexOf("=");
    if (validLen === -1) validLen = len2;
    var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
    return [validLen, placeHoldersLen];
  }
  function _byteLength(_b64, validLen, placeHoldersLen) {
    return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
  }
  function toByteArray(b64) {
    var tmp;
    var lens = getLens(b64);
    var validLen = lens[0];
    var placeHoldersLen = lens[1];
    var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
    var curByte = 0;
    var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
    var i2;
    for (i2 = 0; i2 < len2; i2 += 4) {
      tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
      arr[curByte++] = tmp >> 16 & 255;
      arr[curByte++] = tmp >> 8 & 255;
      arr[curByte++] = tmp & 255;
    }
    if (placeHoldersLen === 2) {
      tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
      arr[curByte++] = tmp & 255;
    }
    if (placeHoldersLen === 1) {
      tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
      arr[curByte++] = tmp >> 8 & 255;
      arr[curByte++] = tmp & 255;
    }
    return arr;
  }
  function tripletToBase64(num) {
    return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
  }
  function encodeChunk(uint8, start, end) {
    var tmp;
    var output = [];
    for (var i2 = start; i2 < end; i2 += 3) {
      tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
      output.push(tripletToBase64(tmp));
    }
    return output.join("");
  }
  function fromByteArray(uint8) {
    var tmp;
    var len2 = uint8.length;
    var extraBytes = len2 % 3;
    var parts = [];
    var maxChunkLength = 16383;
    for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
      parts.push(
        encodeChunk(
          uint8,
          i2,
          i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength
        )
      );
    }
    if (extraBytes === 1) {
      tmp = uint8[len2 - 1];
      parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "==");
    } else if (extraBytes === 2) {
      tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
      parts.push(
        lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
      );
    }
    return parts.join("");
  }
  function parseArgs(args) {
    if (args === void 0) {
      return {};
    }
    if (!isSimpleObject(args)) {
      throw new Error(
        `The arguments to a Convex function must be an object. Received: ${args}`
      );
    }
    return args;
  }
  function validateDeploymentUrl(deploymentUrl) {
    if (typeof deploymentUrl === "undefined") {
      throw new Error(
        `Client created with undefined deployment address. If you used an environment variable, check that it's set.`
      );
    }
    if (typeof deploymentUrl !== "string") {
      throw new Error(
        `Invalid deployment address: found ${deploymentUrl}".`
      );
    }
    if (!(deploymentUrl.startsWith("http:") || deploymentUrl.startsWith("https:"))) {
      throw new Error(
        `Invalid deployment address: Must start with "https://" or "http://". Found "${deploymentUrl}".`
      );
    }
    try {
      new URL(deploymentUrl);
    } catch {
      throw new Error(
        `Invalid deployment address: "${deploymentUrl}" is not a valid URL. If you believe this URL is correct, use the \`skipConvexDeploymentUrlCheck\` option to bypass this.`
      );
    }
    if (deploymentUrl.endsWith(".convex.site")) {
      throw new Error(
        `Invalid deployment address: "${deploymentUrl}" ends with .convex.site, which is used for HTTP Actions. Convex deployment URLs typically end with .convex.cloud? If you believe this URL is correct, use the \`skipConvexDeploymentUrlCheck\` option to bypass this.`
      );
    }
  }
  function isSimpleObject(value) {
    const isObject = typeof value === "object";
    const prototype = Object.getPrototypeOf(value);
    const isSimple = prototype === null || prototype === Object.prototype || // Objects generated from other contexts (e.g. across Node.js `vm` modules) will not satisfy the previous
    // conditions but are still simple objects.
    prototype?.constructor?.name === "Object";
    return isObject && isSimple;
  }
  const LITTLE_ENDIAN = true;
  const MIN_INT64 = BigInt("-9223372036854775808");
  const MAX_INT64 = BigInt("9223372036854775807");
  const ZERO = BigInt("0");
  const EIGHT = BigInt("8");
  const TWOFIFTYSIX = BigInt("256");
  function isSpecial(n) {
    return Number.isNaN(n) || !Number.isFinite(n) || Object.is(n, -0);
  }
  function slowBigIntToBase64(value) {
    if (value < ZERO) {
      value -= MIN_INT64 + MIN_INT64;
    }
    let hex = value.toString(16);
    if (hex.length % 2 === 1) hex = "0" + hex;
    const bytes = new Uint8Array(new ArrayBuffer(8));
    let i2 = 0;
    for (const hexByte of hex.match(/.{2}/g).reverse()) {
      bytes.set([parseInt(hexByte, 16)], i2++);
      value >>= EIGHT;
    }
    return fromByteArray(bytes);
  }
  function slowBase64ToBigInt(encoded) {
    const integerBytes = toByteArray(encoded);
    if (integerBytes.byteLength !== 8) {
      throw new Error(
        `Received ${integerBytes.byteLength} bytes, expected 8 for $integer`
      );
    }
    let value = ZERO;
    let power = ZERO;
    for (const byte of integerBytes) {
      value += BigInt(byte) * TWOFIFTYSIX ** power;
      power++;
    }
    if (value > MAX_INT64) {
      value += MIN_INT64 + MIN_INT64;
    }
    return value;
  }
  function modernBigIntToBase64(value) {
    if (value < MIN_INT64 || MAX_INT64 < value) {
      throw new Error(
        `BigInt ${value} does not fit into a 64-bit signed integer.`
      );
    }
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setBigInt64(0, value, true);
    return fromByteArray(new Uint8Array(buffer));
  }
  function modernBase64ToBigInt(encoded) {
    const integerBytes = toByteArray(encoded);
    if (integerBytes.byteLength !== 8) {
      throw new Error(
        `Received ${integerBytes.byteLength} bytes, expected 8 for $integer`
      );
    }
    const intBytesView = new DataView(integerBytes.buffer);
    return intBytesView.getBigInt64(0, true);
  }
  const bigIntToBase64 = DataView.prototype.setBigInt64 ? modernBigIntToBase64 : slowBigIntToBase64;
  const base64ToBigInt = DataView.prototype.getBigInt64 ? modernBase64ToBigInt : slowBase64ToBigInt;
  const MAX_IDENTIFIER_LEN = 1024;
  function validateObjectField(k) {
    if (k.length > MAX_IDENTIFIER_LEN) {
      throw new Error(
        `Field name ${k} exceeds maximum field name length ${MAX_IDENTIFIER_LEN}.`
      );
    }
    if (k.startsWith("$")) {
      throw new Error(`Field name ${k} starts with a '$', which is reserved.`);
    }
    for (let i2 = 0; i2 < k.length; i2 += 1) {
      const charCode = k.charCodeAt(i2);
      if (charCode < 32 || charCode >= 127) {
        throw new Error(
          `Field name ${k} has invalid character '${k[i2]}': Field names can only contain non-control ASCII characters`
        );
      }
    }
  }
  function jsonToConvex(value) {
    if (value === null) {
      return value;
    }
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((value2) => jsonToConvex(value2));
    }
    if (typeof value !== "object") {
      throw new Error(`Unexpected type of ${value}`);
    }
    const entries = Object.entries(value);
    if (entries.length === 1) {
      const key = entries[0][0];
      if (key === "$bytes") {
        if (typeof value.$bytes !== "string") {
          throw new Error(`Malformed $bytes field on ${value}`);
        }
        return toByteArray(value.$bytes).buffer;
      }
      if (key === "$integer") {
        if (typeof value.$integer !== "string") {
          throw new Error(`Malformed $integer field on ${value}`);
        }
        return base64ToBigInt(value.$integer);
      }
      if (key === "$float") {
        if (typeof value.$float !== "string") {
          throw new Error(`Malformed $float field on ${value}`);
        }
        const floatBytes = toByteArray(value.$float);
        if (floatBytes.byteLength !== 8) {
          throw new Error(
            `Received ${floatBytes.byteLength} bytes, expected 8 for $float`
          );
        }
        const floatBytesView = new DataView(floatBytes.buffer);
        const float = floatBytesView.getFloat64(0, LITTLE_ENDIAN);
        if (!isSpecial(float)) {
          throw new Error(`Float ${float} should be encoded as a number`);
        }
        return float;
      }
      if (key === "$set") {
        throw new Error(
          `Received a Set which is no longer supported as a Convex type.`
        );
      }
      if (key === "$map") {
        throw new Error(
          `Received a Map which is no longer supported as a Convex type.`
        );
      }
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      validateObjectField(k);
      out[k] = jsonToConvex(v);
    }
    return out;
  }
  const MAX_VALUE_FOR_ERROR_LEN = 16384;
  function stringifyValueForError(value) {
    const str = JSON.stringify(value, (_key, value2) => {
      if (value2 === void 0) {
        return "undefined";
      }
      if (typeof value2 === "bigint") {
        return `${value2.toString()}n`;
      }
      return value2;
    });
    if (str.length > MAX_VALUE_FOR_ERROR_LEN) {
      const rest = "[...truncated]";
      let truncateAt = MAX_VALUE_FOR_ERROR_LEN - rest.length;
      const codePoint = str.codePointAt(truncateAt - 1);
      if (codePoint !== void 0 && codePoint > 65535) {
        truncateAt -= 1;
      }
      return str.substring(0, truncateAt) + rest;
    }
    return str;
  }
  function convexToJsonInternal(value, originalValue, context, includeTopLevelUndefined) {
    if (value === void 0) {
      const contextText = context && ` (present at path ${context} in original object ${stringifyValueForError(
        originalValue
      )})`;
      throw new Error(
        `undefined is not a valid Convex value${contextText}. To learn about Convex's supported types, see https://docs.convex.dev/using/types.`
      );
    }
    if (value === null) {
      return value;
    }
    if (typeof value === "bigint") {
      if (value < MIN_INT64 || MAX_INT64 < value) {
        throw new Error(
          `BigInt ${value} does not fit into a 64-bit signed integer.`
        );
      }
      return { $integer: bigIntToBase64(value) };
    }
    if (typeof value === "number") {
      if (isSpecial(value)) {
        const buffer = new ArrayBuffer(8);
        new DataView(buffer).setFloat64(0, value, LITTLE_ENDIAN);
        return { $float: fromByteArray(new Uint8Array(buffer)) };
      } else {
        return value;
      }
    }
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      return value;
    }
    if (value instanceof ArrayBuffer) {
      return { $bytes: fromByteArray(new Uint8Array(value)) };
    }
    if (Array.isArray(value)) {
      return value.map(
        (value2, i2) => convexToJsonInternal(value2, originalValue, context + `[${i2}]`)
      );
    }
    if (value instanceof Set) {
      throw new Error(
        errorMessageForUnsupportedType(context, "Set", [...value], originalValue)
      );
    }
    if (value instanceof Map) {
      throw new Error(
        errorMessageForUnsupportedType(context, "Map", [...value], originalValue)
      );
    }
    if (!isSimpleObject(value)) {
      const theType = value?.constructor?.name;
      const typeName = theType ? `${theType} ` : "";
      throw new Error(
        errorMessageForUnsupportedType(context, typeName, value, originalValue)
      );
    }
    const out = {};
    const entries = Object.entries(value);
    entries.sort(([k1, _v1], [k2, _v2]) => k1 === k2 ? 0 : k1 < k2 ? -1 : 1);
    for (const [k, v] of entries) {
      if (v !== void 0) {
        validateObjectField(k);
        out[k] = convexToJsonInternal(v, originalValue, context + `.${k}`);
      }
    }
    return out;
  }
  function errorMessageForUnsupportedType(context, typeName, value, originalValue) {
    if (context) {
      return `${typeName}${stringifyValueForError(
        value
      )} is not a supported Convex type (present at path ${context} in original object ${stringifyValueForError(
        originalValue
      )}). To learn about Convex's supported types, see https://docs.convex.dev/using/types.`;
    } else {
      return `${typeName}${stringifyValueForError(
        value
      )} is not a supported Convex type.`;
    }
  }
  function convexToJson(value) {
    return convexToJsonInternal(value, value, "");
  }
  var __defProp$b = Object.defineProperty;
  var __defNormalProp$b = (obj, key, value) => key in obj ? __defProp$b(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField$b = (obj, key, value) => __defNormalProp$b(obj, typeof key !== "symbol" ? key + "" : key, value);
  var _a, _b;
  const IDENTIFYING_FIELD = /* @__PURE__ */ Symbol.for("ConvexError");
  class ConvexError extends (_b = Error, _a = IDENTIFYING_FIELD, _b) {
    constructor(data) {
      super(typeof data === "string" ? data : stringifyValueForError(data));
      __publicField$b(this, "name", "ConvexError");
      __publicField$b(this, "data");
      __publicField$b(this, _a, true);
      this.data = data;
    }
  }
  const version = "1.39.1";
  const functionName = /* @__PURE__ */ Symbol.for("functionName");
  const toReferencePath = /* @__PURE__ */ Symbol.for("toReferencePath");
  function extractReferencePath(reference) {
    return reference[toReferencePath] ?? null;
  }
  function isFunctionHandle(s) {
    return s.startsWith("function://");
  }
  function getFunctionAddress(functionReference) {
    let functionAddress;
    if (typeof functionReference === "string") {
      if (isFunctionHandle(functionReference)) {
        functionAddress = { functionHandle: functionReference };
      } else {
        functionAddress = { name: functionReference };
      }
    } else if (functionReference[functionName]) {
      functionAddress = { name: functionReference[functionName] };
    } else {
      const referencePath = extractReferencePath(functionReference);
      if (!referencePath) {
        throw new Error(`${functionReference} is not a functionReference`);
      }
      functionAddress = { reference: referencePath };
    }
    return functionAddress;
  }
  function getFunctionName(functionReference) {
    const address = getFunctionAddress(functionReference);
    if (address.name === void 0) {
      if (address.functionHandle !== void 0) {
        throw new Error(
          `Expected function reference like "api.file.func" or "internal.file.func", but received function handle ${address.functionHandle}`
        );
      } else if (address.reference !== void 0) {
        throw new Error(
          `Expected function reference in the current component like "api.file.func" or "internal.file.func", but received reference ${address.reference}`
        );
      }
      throw new Error(
        `Expected function reference like "api.file.func" or "internal.file.func", but received ${JSON.stringify(address)}`
      );
    }
    if (typeof functionReference === "string") return functionReference;
    const name = functionReference[functionName];
    if (!name) {
      throw new Error(`${functionReference} is not a functionReference`);
    }
    return name;
  }
  function createApi(pathParts = []) {
    const handler = {
      get(_, prop) {
        if (typeof prop === "string") {
          const newParts = [...pathParts, prop];
          return createApi(newParts);
        } else if (prop === functionName) {
          if (pathParts.length < 2) {
            const found = ["api", ...pathParts].join(".");
            throw new Error(
              `API path is expected to be of the form \`api.moduleName.functionName\`. Found: \`${found}\``
            );
          }
          const path = pathParts.slice(0, -1).join("/");
          const exportName = pathParts[pathParts.length - 1];
          if (exportName === "default") {
            return path;
          } else {
            return path + ":" + exportName;
          }
        } else if (prop === Symbol.toStringTag) {
          return "FunctionReference";
        } else {
          return void 0;
        }
      }
    };
    return new Proxy({}, handler);
  }
  const anyApi = createApi();
  const api = anyApi;
  var __defProp$a = Object.defineProperty;
  var __defNormalProp$a = (obj, key, value) => key in obj ? __defProp$a(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField$a = (obj, key, value) => __defNormalProp$a(obj, typeof key !== "symbol" ? key + "" : key, value);
  const INFO_COLOR = "color:rgb(0, 145, 255)";
  function prefix_for_source(source2) {
    switch (source2) {
      case "query":
        return "Q";
      case "mutation":
        return "M";
      case "action":
        return "A";
      case "any":
        return "?";
    }
  }
  class DefaultLogger {
    constructor(options) {
      __publicField$a(this, "_onLogLineFuncs");
      __publicField$a(this, "_verbose");
      this._onLogLineFuncs = {};
      this._verbose = options.verbose;
    }
    addLogLineListener(func) {
      let id = Math.random().toString(36).substring(2, 15);
      for (let i2 = 0; i2 < 10; i2++) {
        if (this._onLogLineFuncs[id] === void 0) {
          break;
        }
        id = Math.random().toString(36).substring(2, 15);
      }
      this._onLogLineFuncs[id] = func;
      return () => {
        delete this._onLogLineFuncs[id];
      };
    }
    logVerbose(...args) {
      if (this._verbose) {
        for (const func of Object.values(this._onLogLineFuncs)) {
          func("debug", `${(/* @__PURE__ */ new Date()).toISOString()}`, ...args);
        }
      }
    }
    log(...args) {
      for (const func of Object.values(this._onLogLineFuncs)) {
        func("info", ...args);
      }
    }
    warn(...args) {
      for (const func of Object.values(this._onLogLineFuncs)) {
        func("warn", ...args);
      }
    }
    error(...args) {
      for (const func of Object.values(this._onLogLineFuncs)) {
        func("error", ...args);
      }
    }
  }
  function instantiateDefaultLogger(options) {
    const logger2 = new DefaultLogger(options);
    logger2.addLogLineListener((level, ...args) => {
      switch (level) {
        case "debug":
          console.debug(...args);
          break;
        case "info":
          console.log(...args);
          break;
        case "warn":
          console.warn(...args);
          break;
        case "error":
          console.error(...args);
          break;
        default: {
          console.log(...args);
        }
      }
    });
    return logger2;
  }
  function instantiateNoopLogger(options) {
    return new DefaultLogger(options);
  }
  function logForFunction(logger2, type, source2, udfPath, message) {
    const prefix = prefix_for_source(source2);
    if (typeof message === "object") {
      message = `ConvexError ${JSON.stringify(message.errorData, null, 2)}`;
    }
    if (type === "info") {
      const match = message.match(/^\[.*?\] /);
      if (match === null) {
        logger2.error(
          `[CONVEX ${prefix}(${udfPath})] Could not parse console.log`
        );
        return;
      }
      const level = message.slice(1, match[0].length - 2);
      const args = message.slice(match[0].length);
      logger2.log(`%c[CONVEX ${prefix}(${udfPath})] [${level}]`, INFO_COLOR, args);
    } else {
      logger2.error(`[CONVEX ${prefix}(${udfPath})] ${message}`);
    }
  }
  function logFatalError(logger2, message) {
    const errorMessage = `[CONVEX FATAL ERROR] ${message}`;
    logger2.error(errorMessage);
    return new Error(errorMessage);
  }
  function createHybridErrorStacktrace(source2, udfPath, result) {
    const prefix = prefix_for_source(source2);
    return `[CONVEX ${prefix}(${udfPath})] ${result.errorMessage}
  Called by client`;
  }
  function forwardData(result, error2) {
    error2.data = result.errorData;
    return error2;
  }
  function canonicalizeUdfPath(udfPath) {
    const pieces = udfPath.split(":");
    let moduleName;
    let functionName2;
    if (pieces.length === 1) {
      moduleName = pieces[0];
      functionName2 = "default";
    } else {
      moduleName = pieces.slice(0, pieces.length - 1).join(":");
      functionName2 = pieces[pieces.length - 1];
    }
    if (moduleName.endsWith(".js")) {
      moduleName = moduleName.slice(0, -3);
    }
    return `${moduleName}:${functionName2}`;
  }
  function serializePathAndArgs(udfPath, args) {
    return JSON.stringify({
      udfPath: canonicalizeUdfPath(udfPath),
      args: convexToJson(args)
    });
  }
  function serializePaginatedPathAndArgs(udfPath, args, options) {
    const { initialNumItems, id } = options;
    const result = JSON.stringify({
      type: "paginated",
      udfPath: canonicalizeUdfPath(udfPath),
      args: convexToJson(args),
      options: convexToJson({ initialNumItems, id })
    });
    return result;
  }
  function serializedQueryTokenIsPaginated(token) {
    return JSON.parse(token).type === "paginated";
  }
  var __defProp$9 = Object.defineProperty;
  var __defNormalProp$9 = (obj, key, value) => key in obj ? __defProp$9(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField$9 = (obj, key, value) => __defNormalProp$9(obj, typeof key !== "symbol" ? key + "" : key, value);
  class LocalSyncState {
    constructor() {
      __publicField$9(this, "nextQueryId");
      __publicField$9(this, "querySetVersion");
      __publicField$9(this, "querySet");
      __publicField$9(this, "queryIdToToken");
      __publicField$9(this, "identityVersion");
      __publicField$9(this, "auth");
      __publicField$9(this, "outstandingQueriesOlderThanRestart");
      __publicField$9(this, "outstandingAuthOlderThanRestart");
      __publicField$9(this, "paused");
      __publicField$9(this, "pendingQuerySetModifications");
      this.nextQueryId = 0;
      this.querySetVersion = 0;
      this.identityVersion = 0;
      this.querySet = /* @__PURE__ */ new Map();
      this.queryIdToToken = /* @__PURE__ */ new Map();
      this.outstandingQueriesOlderThanRestart = /* @__PURE__ */ new Set();
      this.outstandingAuthOlderThanRestart = false;
      this.paused = false;
      this.pendingQuerySetModifications = /* @__PURE__ */ new Map();
    }
    hasSyncedPastLastReconnect() {
      return this.outstandingQueriesOlderThanRestart.size === 0 && !this.outstandingAuthOlderThanRestart;
    }
    markAuthCompletion() {
      this.outstandingAuthOlderThanRestart = false;
    }
    subscribe(udfPath, args, journal, componentPath) {
      const canonicalizedUdfPath = canonicalizeUdfPath(udfPath);
      const queryToken = serializePathAndArgs(canonicalizedUdfPath, args);
      const existingEntry = this.querySet.get(queryToken);
      if (existingEntry !== void 0) {
        existingEntry.numSubscribers += 1;
        return {
          queryToken,
          modification: null,
          unsubscribe: () => this.removeSubscriber(queryToken)
        };
      } else {
        const queryId = this.nextQueryId++;
        const query = {
          id: queryId,
          canonicalizedUdfPath,
          args,
          numSubscribers: 1,
          journal,
          componentPath
        };
        this.querySet.set(queryToken, query);
        this.queryIdToToken.set(queryId, queryToken);
        const baseVersion = this.querySetVersion;
        const newVersion = this.querySetVersion + 1;
        const add = {
          type: "Add",
          queryId,
          udfPath: canonicalizedUdfPath,
          args: [convexToJson(args)],
          journal,
          componentPath
        };
        if (this.paused) {
          this.pendingQuerySetModifications.set(queryId, add);
        } else {
          this.querySetVersion = newVersion;
        }
        const modification = {
          type: "ModifyQuerySet",
          baseVersion,
          newVersion,
          modifications: [add]
        };
        return {
          queryToken,
          modification,
          unsubscribe: () => this.removeSubscriber(queryToken)
        };
      }
    }
    transition(transition) {
      for (const modification of transition.modifications) {
        switch (modification.type) {
          case "QueryUpdated":
          case "QueryFailed": {
            this.outstandingQueriesOlderThanRestart.delete(modification.queryId);
            const journal = modification.journal;
            if (journal !== void 0) {
              const queryToken = this.queryIdToToken.get(modification.queryId);
              if (queryToken !== void 0) {
                this.querySet.get(queryToken).journal = journal;
              }
            }
            break;
          }
          case "QueryRemoved": {
            this.outstandingQueriesOlderThanRestart.delete(modification.queryId);
            break;
          }
          default: {
            throw new Error(`Invalid modification ${modification.type}`);
          }
        }
      }
    }
    queryId(udfPath, args) {
      const canonicalizedUdfPath = canonicalizeUdfPath(udfPath);
      const queryToken = serializePathAndArgs(canonicalizedUdfPath, args);
      const existingEntry = this.querySet.get(queryToken);
      if (existingEntry !== void 0) {
        return existingEntry.id;
      }
      return null;
    }
    isCurrentOrNewerAuthVersion(version2) {
      return version2 >= this.identityVersion;
    }
    getAuth() {
      return this.auth;
    }
    setAuth(value) {
      this.auth = {
        tokenType: "User",
        value
      };
      const baseVersion = this.identityVersion;
      if (!this.paused) {
        this.identityVersion = baseVersion + 1;
      }
      return {
        type: "Authenticate",
        baseVersion,
        ...this.auth
      };
    }
    setAdminAuth(value, actingAs) {
      const auth = {
        tokenType: "Admin",
        value,
        impersonating: actingAs
      };
      this.auth = auth;
      const baseVersion = this.identityVersion;
      if (!this.paused) {
        this.identityVersion = baseVersion + 1;
      }
      return {
        type: "Authenticate",
        baseVersion,
        ...auth
      };
    }
    clearAuth() {
      this.auth = void 0;
      this.markAuthCompletion();
      const baseVersion = this.identityVersion;
      if (!this.paused) {
        this.identityVersion = baseVersion + 1;
      }
      return {
        type: "Authenticate",
        tokenType: "None",
        baseVersion
      };
    }
    hasAuth() {
      return !!this.auth;
    }
    isNewAuth(value) {
      return this.auth?.value !== value;
    }
    queryPath(queryId) {
      const pathAndArgs = this.queryIdToToken.get(queryId);
      if (pathAndArgs) {
        return this.querySet.get(pathAndArgs).canonicalizedUdfPath;
      }
      return null;
    }
    queryArgs(queryId) {
      const pathAndArgs = this.queryIdToToken.get(queryId);
      if (pathAndArgs) {
        return this.querySet.get(pathAndArgs).args;
      }
      return null;
    }
    queryToken(queryId) {
      return this.queryIdToToken.get(queryId) ?? null;
    }
    queryJournal(queryToken) {
      return this.querySet.get(queryToken)?.journal;
    }
    restart() {
      this.unpause();
      this.outstandingQueriesOlderThanRestart.clear();
      const modifications = [];
      for (const localQuery of this.querySet.values()) {
        const add = {
          type: "Add",
          queryId: localQuery.id,
          udfPath: localQuery.canonicalizedUdfPath,
          args: [convexToJson(localQuery.args)],
          journal: localQuery.journal,
          componentPath: localQuery.componentPath
        };
        modifications.push(add);
        this.outstandingQueriesOlderThanRestart.add(localQuery.id);
      }
      this.querySetVersion = 1;
      const querySet = {
        type: "ModifyQuerySet",
        baseVersion: 0,
        newVersion: 1,
        modifications
      };
      if (!this.auth) {
        this.identityVersion = 0;
        return [querySet, void 0];
      }
      this.outstandingAuthOlderThanRestart = true;
      const authenticate = {
        type: "Authenticate",
        baseVersion: 0,
        ...this.auth
      };
      this.identityVersion = 1;
      return [querySet, authenticate];
    }
    pause() {
      this.paused = true;
    }
    resume() {
      const querySet = this.pendingQuerySetModifications.size > 0 ? {
        type: "ModifyQuerySet",
        baseVersion: this.querySetVersion,
        newVersion: ++this.querySetVersion,
        modifications: Array.from(
          this.pendingQuerySetModifications.values()
        )
      } : void 0;
      const authenticate = this.auth !== void 0 ? {
        type: "Authenticate",
        baseVersion: this.identityVersion++,
        ...this.auth
      } : void 0;
      this.unpause();
      return [querySet, authenticate];
    }
    unpause() {
      this.paused = false;
      this.pendingQuerySetModifications.clear();
    }
    removeSubscriber(queryToken) {
      const localQuery = this.querySet.get(queryToken);
      if (localQuery.numSubscribers > 1) {
        localQuery.numSubscribers -= 1;
        return null;
      } else {
        this.querySet.delete(queryToken);
        this.queryIdToToken.delete(localQuery.id);
        this.outstandingQueriesOlderThanRestart.delete(localQuery.id);
        const baseVersion = this.querySetVersion;
        const newVersion = this.querySetVersion + 1;
        const remove = {
          type: "Remove",
          queryId: localQuery.id
        };
        if (this.paused) {
          if (this.pendingQuerySetModifications.has(localQuery.id)) {
            this.pendingQuerySetModifications.delete(localQuery.id);
          } else {
            this.pendingQuerySetModifications.set(localQuery.id, remove);
          }
        } else {
          this.querySetVersion = newVersion;
        }
        return {
          type: "ModifyQuerySet",
          baseVersion,
          newVersion,
          modifications: [remove]
        };
      }
    }
  }
  var __defProp$8 = Object.defineProperty;
  var __defNormalProp$8 = (obj, key, value) => key in obj ? __defProp$8(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField$8 = (obj, key, value) => __defNormalProp$8(obj, typeof key !== "symbol" ? key + "" : key, value);
  class RequestManager {
    constructor(logger2, markConnectionStateDirty) {
      this.logger = logger2;
      this.markConnectionStateDirty = markConnectionStateDirty;
      __publicField$8(this, "inflightRequests");
      __publicField$8(this, "requestsOlderThanRestart");
      __publicField$8(this, "inflightMutationsCount", 0);
      __publicField$8(this, "inflightActionsCount", 0);
      this.inflightRequests = /* @__PURE__ */ new Map();
      this.requestsOlderThanRestart = /* @__PURE__ */ new Set();
    }
    request(message, sent) {
      const result = new Promise((resolve) => {
        const status = sent ? "Requested" : "NotSent";
        this.inflightRequests.set(message.requestId, {
          message,
          status: { status, requestedAt: /* @__PURE__ */ new Date(), onResult: resolve }
        });
        if (message.type === "Mutation") {
          this.inflightMutationsCount++;
        } else if (message.type === "Action") {
          this.inflightActionsCount++;
        }
      });
      this.markConnectionStateDirty();
      return result;
    }
    /**
     * Update the state after receiving a response.
     *
     * @returns A RequestId if the request is complete and its optimistic update
     * can be dropped, null otherwise.
     */
    onResponse(response) {
      const requestInfo = this.inflightRequests.get(response.requestId);
      if (requestInfo === void 0) {
        return null;
      }
      if (requestInfo.status.status === "Completed") {
        return null;
      }
      const udfType = requestInfo.message.type === "Mutation" ? "mutation" : "action";
      const udfPath = requestInfo.message.udfPath;
      for (const line of response.logLines) {
        logForFunction(this.logger, "info", udfType, udfPath, line);
      }
      const status = requestInfo.status;
      let result;
      let onResolve;
      if (response.success) {
        result = {
          success: true,
          logLines: response.logLines,
          value: jsonToConvex(response.result)
        };
        onResolve = () => status.onResult(result);
      } else {
        const errorMessage = response.result;
        const { errorData } = response;
        logForFunction(this.logger, "error", udfType, udfPath, errorMessage);
        result = {
          success: false,
          errorMessage,
          errorData: errorData !== void 0 ? jsonToConvex(errorData) : void 0,
          logLines: response.logLines
        };
        onResolve = () => status.onResult(result);
      }
      if (response.type === "ActionResponse" || !response.success) {
        onResolve();
        this.inflightRequests.delete(response.requestId);
        this.requestsOlderThanRestart.delete(response.requestId);
        if (requestInfo.message.type === "Action") {
          this.inflightActionsCount--;
        } else if (requestInfo.message.type === "Mutation") {
          this.inflightMutationsCount--;
        }
        this.markConnectionStateDirty();
        return { requestId: response.requestId, result };
      }
      requestInfo.status = {
        status: "Completed",
        result,
        ts: response.ts,
        onResolve
      };
      return null;
    }
    // Remove and returns completed requests.
    removeCompleted(ts) {
      const completeRequests = /* @__PURE__ */ new Map();
      for (const [requestId, requestInfo] of this.inflightRequests.entries()) {
        const status = requestInfo.status;
        if (status.status === "Completed" && status.ts.lessThanOrEqual(ts)) {
          status.onResolve();
          completeRequests.set(requestId, status.result);
          if (requestInfo.message.type === "Mutation") {
            this.inflightMutationsCount--;
          } else if (requestInfo.message.type === "Action") {
            this.inflightActionsCount--;
          }
          this.inflightRequests.delete(requestId);
          this.requestsOlderThanRestart.delete(requestId);
        }
      }
      if (completeRequests.size > 0) {
        this.markConnectionStateDirty();
      }
      return completeRequests;
    }
    restart() {
      this.requestsOlderThanRestart = new Set(this.inflightRequests.keys());
      const allMessages = [];
      for (const [requestId, value] of this.inflightRequests) {
        if (value.status.status === "NotSent") {
          value.status.status = "Requested";
          allMessages.push(value.message);
          continue;
        }
        if (value.message.type === "Mutation") {
          allMessages.push(value.message);
        } else if (value.message.type === "Action") {
          this.inflightRequests.delete(requestId);
          this.requestsOlderThanRestart.delete(requestId);
          this.inflightActionsCount--;
          if (value.status.status === "Completed") {
            throw new Error("Action should never be in 'Completed' state");
          }
          value.status.onResult({
            success: false,
            errorMessage: "Connection lost while action was in flight",
            logLines: []
          });
        }
      }
      this.markConnectionStateDirty();
      return allMessages;
    }
    resume() {
      const allMessages = [];
      for (const [, value] of this.inflightRequests) {
        if (value.status.status === "NotSent") {
          value.status.status = "Requested";
          allMessages.push(value.message);
          continue;
        }
      }
      return allMessages;
    }
    /**
     * @returns true if there are any requests that have been requested but have
     * not be completed yet.
     */
    hasIncompleteRequests() {
      for (const requestInfo of this.inflightRequests.values()) {
        if (requestInfo.status.status === "Requested") {
          return true;
        }
      }
      return false;
    }
    /**
     * @returns true if there are any inflight requests, including ones that have
     * completed on the server, but have not been applied.
     */
    hasInflightRequests() {
      return this.inflightRequests.size > 0;
    }
    /**
     * @returns true if there are any inflight requests, that have been hanging around
     * since prior to the most recent restart.
     */
    hasSyncedPastLastReconnect() {
      return this.requestsOlderThanRestart.size === 0;
    }
    timeOfOldestInflightRequest() {
      if (this.inflightRequests.size === 0) {
        return null;
      }
      let oldestInflightRequest = Date.now();
      for (const request of this.inflightRequests.values()) {
        if (request.status.status !== "Completed") {
          if (request.status.requestedAt.getTime() < oldestInflightRequest) {
            oldestInflightRequest = request.status.requestedAt.getTime();
          }
        }
      }
      return new Date(oldestInflightRequest);
    }
    /**
     * @returns The number of mutations currently in flight.
     */
    inflightMutations() {
      return this.inflightMutationsCount;
    }
    /**
     * @returns The number of actions currently in flight.
     */
    inflightActions() {
      return this.inflightActionsCount;
    }
  }
  var __defProp$7 = Object.defineProperty;
  var __defNormalProp$7 = (obj, key, value) => key in obj ? __defProp$7(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField$7 = (obj, key, value) => __defNormalProp$7(obj, typeof key !== "symbol" ? key + "" : key, value);
  class OptimisticLocalStoreImpl {
    constructor(queryResults) {
      __publicField$7(this, "queryResults");
      __publicField$7(this, "modifiedQueries");
      this.queryResults = queryResults;
      this.modifiedQueries = [];
    }
    getQuery(query, ...args) {
      const queryArgs = parseArgs(args[0]);
      const name = getFunctionName(query);
      const queryResult = this.queryResults.get(
        serializePathAndArgs(name, queryArgs)
      );
      if (queryResult === void 0) {
        return void 0;
      }
      return OptimisticLocalStoreImpl.queryValue(queryResult.result);
    }
    getAllQueries(query) {
      const queriesWithName = [];
      const name = getFunctionName(query);
      for (const queryResult of this.queryResults.values()) {
        if (queryResult.udfPath === canonicalizeUdfPath(name)) {
          queriesWithName.push({
            args: queryResult.args,
            value: OptimisticLocalStoreImpl.queryValue(queryResult.result)
          });
        }
      }
      return queriesWithName;
    }
    setQuery(queryReference, args, value) {
      const queryArgs = parseArgs(args);
      const name = getFunctionName(queryReference);
      const queryToken = serializePathAndArgs(name, queryArgs);
      let result;
      if (value === void 0) {
        result = void 0;
      } else {
        result = {
          success: true,
          value,
          // It's an optimistic update, so there are no function logs to show.
          logLines: []
        };
      }
      const query = {
        udfPath: name,
        args: queryArgs,
        result
      };
      this.queryResults.set(queryToken, query);
      this.modifiedQueries.push(queryToken);
    }
    static queryValue(result) {
      if (result === void 0) {
        return void 0;
      } else if (result.success) {
        return result.value;
      } else {
        return void 0;
      }
    }
  }
  class OptimisticQueryResults {
    constructor() {
      __publicField$7(this, "queryResults");
      __publicField$7(this, "optimisticUpdates");
      this.queryResults = /* @__PURE__ */ new Map();
      this.optimisticUpdates = [];
    }
    /**
     * Apply all optimistic updates on top of server query results
     */
    ingestQueryResultsFromServer(serverQueryResults, optimisticUpdatesToDrop) {
      this.optimisticUpdates = this.optimisticUpdates.filter((updateAndId) => {
        return !optimisticUpdatesToDrop.has(updateAndId.mutationId);
      });
      const oldQueryResults = this.queryResults;
      this.queryResults = new Map(serverQueryResults);
      const localStore = new OptimisticLocalStoreImpl(this.queryResults);
      for (const updateAndId of this.optimisticUpdates) {
        updateAndId.update(localStore);
      }
      const changedQueries = [];
      for (const [queryToken, query] of this.queryResults) {
        const oldQuery = oldQueryResults.get(queryToken);
        if (oldQuery === void 0 || oldQuery.result !== query.result) {
          changedQueries.push(queryToken);
        }
      }
      return changedQueries;
    }
    applyOptimisticUpdate(update, mutationId) {
      this.optimisticUpdates.push({
        update,
        mutationId
      });
      const localStore = new OptimisticLocalStoreImpl(this.queryResults);
      update(localStore);
      return localStore.modifiedQueries;
    }
    /**
     * "Raw" with respect to errors vs values, but query results still have
     * optimistic updates applied.
     *
     * @internal
     */
    rawQueryResult(queryToken) {
      const query = this.queryResults.get(queryToken);
      if (query === void 0) {
        return void 0;
      }
      return query.result;
    }
    queryResult(queryToken) {
      const query = this.queryResults.get(queryToken);
      if (query === void 0) {
        return void 0;
      }
      const result = query.result;
      if (result === void 0) {
        return void 0;
      } else if (result.success) {
        return result.value;
      } else {
        if (result.errorData !== void 0) {
          throw forwardData(
            result,
            new ConvexError(
              createHybridErrorStacktrace("query", query.udfPath, result)
            )
          );
        }
        throw new Error(
          createHybridErrorStacktrace("query", query.udfPath, result)
        );
      }
    }
    hasQueryResult(queryToken) {
      return this.queryResults.get(queryToken) !== void 0;
    }
    /**
     * @internal
     */
    queryLogs(queryToken) {
      const query = this.queryResults.get(queryToken);
      return query?.result?.logLines;
    }
  }
  var __defProp$6 = Object.defineProperty;
  var __defNormalProp$6 = (obj, key, value) => key in obj ? __defProp$6(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField$6 = (obj, key, value) => __defNormalProp$6(obj, typeof key !== "symbol" ? key + "" : key, value);
  class Long {
    constructor(low, high) {
      __publicField$6(this, "low");
      __publicField$6(this, "high");
      __publicField$6(this, "__isUnsignedLong__");
      this.low = low | 0;
      this.high = high | 0;
      this.__isUnsignedLong__ = true;
    }
    static isLong(obj) {
      return (obj && obj.__isUnsignedLong__) === true;
    }
    // prettier-ignore
    static fromBytesLE(bytes) {
      return new Long(
        bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24,
        bytes[4] | bytes[5] << 8 | bytes[6] << 16 | bytes[7] << 24
      );
    }
    // prettier-ignore
    toBytesLE() {
      const hi = this.high;
      const lo = this.low;
      return [
        lo & 255,
        lo >>> 8 & 255,
        lo >>> 16 & 255,
        lo >>> 24,
        hi & 255,
        hi >>> 8 & 255,
        hi >>> 16 & 255,
        hi >>> 24
      ];
    }
    static fromNumber(value) {
      if (isNaN(value)) return UZERO;
      if (value < 0) return UZERO;
      if (value >= TWO_PWR_64_DBL) return MAX_UNSIGNED_VALUE;
      return new Long(value % TWO_PWR_32_DBL | 0, value / TWO_PWR_32_DBL | 0);
    }
    toString() {
      return (BigInt(this.high) * BigInt(TWO_PWR_32_DBL) + BigInt(this.low)).toString();
    }
    equals(other) {
      if (!Long.isLong(other)) other = Long.fromValue(other);
      if (this.high >>> 31 === 1 && other.high >>> 31 === 1) return false;
      return this.high === other.high && this.low === other.low;
    }
    notEquals(other) {
      return !this.equals(other);
    }
    comp(other) {
      if (!Long.isLong(other)) other = Long.fromValue(other);
      if (this.equals(other)) return 0;
      return other.high >>> 0 > this.high >>> 0 || other.high === this.high && other.low >>> 0 > this.low >>> 0 ? -1 : 1;
    }
    lessThanOrEqual(other) {
      return this.comp(
        /* validates */
        other
      ) <= 0;
    }
    static fromValue(val) {
      if (typeof val === "number") return Long.fromNumber(val);
      return new Long(val.low, val.high);
    }
  }
  const UZERO = new Long(0, 0);
  const TWO_PWR_16_DBL = 1 << 16;
  const TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL;
  const TWO_PWR_64_DBL = TWO_PWR_32_DBL * TWO_PWR_32_DBL;
  const MAX_UNSIGNED_VALUE = new Long(4294967295 | 0, 4294967295 | 0);
  var __defProp$5 = Object.defineProperty;
  var __defNormalProp$5 = (obj, key, value) => key in obj ? __defProp$5(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField$5 = (obj, key, value) => __defNormalProp$5(obj, typeof key !== "symbol" ? key + "" : key, value);
  class RemoteQuerySet {
    constructor(queryPath, logger2) {
      __publicField$5(this, "version");
      __publicField$5(this, "remoteQuerySet");
      __publicField$5(this, "queryPath");
      __publicField$5(this, "logger");
      this.version = { querySet: 0, ts: Long.fromNumber(0), identity: 0 };
      this.remoteQuerySet = /* @__PURE__ */ new Map();
      this.queryPath = queryPath;
      this.logger = logger2;
    }
    transition(transition) {
      const start = transition.startVersion;
      if (this.version.querySet !== start.querySet || this.version.ts.notEquals(start.ts) || this.version.identity !== start.identity) {
        throw new Error(
          `Invalid start version: ${start.ts.toString()}:${start.querySet}:${start.identity}, transitioning from ${this.version.ts.toString()}:${this.version.querySet}:${this.version.identity}`
        );
      }
      for (const modification of transition.modifications) {
        switch (modification.type) {
          case "QueryUpdated": {
            const queryPath = this.queryPath(modification.queryId);
            if (queryPath) {
              for (const line of modification.logLines) {
                logForFunction(this.logger, "info", "query", queryPath, line);
              }
            }
            const value = jsonToConvex(modification.value ?? null);
            this.remoteQuerySet.set(modification.queryId, {
              success: true,
              value,
              logLines: modification.logLines
            });
            break;
          }
          case "QueryFailed": {
            const queryPath = this.queryPath(modification.queryId);
            if (queryPath) {
              for (const line of modification.logLines) {
                logForFunction(this.logger, "info", "query", queryPath, line);
              }
            }
            const { errorData } = modification;
            this.remoteQuerySet.set(modification.queryId, {
              success: false,
              errorMessage: modification.errorMessage,
              errorData: errorData !== void 0 ? jsonToConvex(errorData) : void 0,
              logLines: modification.logLines
            });
            break;
          }
          case "QueryRemoved": {
            this.remoteQuerySet.delete(modification.queryId);
            break;
          }
          default: {
            throw new Error(`Invalid modification ${modification.type}`);
          }
        }
      }
      this.version = transition.endVersion;
    }
    remoteQueryResults() {
      return this.remoteQuerySet;
    }
    timestamp() {
      return this.version.ts;
    }
  }
  function u64ToLong(encoded) {
    const integerBytes = toByteArray(encoded);
    return Long.fromBytesLE(Array.from(integerBytes));
  }
  function longToU64(raw) {
    const integerBytes = new Uint8Array(raw.toBytesLE());
    return fromByteArray(integerBytes);
  }
  function parseServerMessage(encoded) {
    switch (encoded.type) {
      case "FatalError":
      case "AuthError":
      case "ActionResponse":
      case "TransitionChunk":
      case "Ping": {
        return { ...encoded };
      }
      case "MutationResponse": {
        if (encoded.success) {
          return { ...encoded, ts: u64ToLong(encoded.ts) };
        } else {
          return { ...encoded };
        }
      }
      case "Transition": {
        return {
          ...encoded,
          startVersion: {
            ...encoded.startVersion,
            ts: u64ToLong(encoded.startVersion.ts)
          },
          endVersion: {
            ...encoded.endVersion,
            ts: u64ToLong(encoded.endVersion.ts)
          }
        };
      }
    }
    return void 0;
  }
  function encodeClientMessage(message) {
    switch (message.type) {
      case "Authenticate":
      case "ModifyQuerySet":
      case "Mutation":
      case "Action":
      case "Event": {
        return { ...message };
      }
      case "Connect": {
        if (message.maxObservedTimestamp !== void 0) {
          return {
            ...message,
            maxObservedTimestamp: longToU64(message.maxObservedTimestamp)
          };
        } else {
          return { ...message, maxObservedTimestamp: void 0 };
        }
      }
    }
    return void 0;
  }
  var __defProp$4 = Object.defineProperty;
  var __defNormalProp$4 = (obj, key, value) => key in obj ? __defProp$4(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField$4 = (obj, key, value) => __defNormalProp$4(obj, typeof key !== "symbol" ? key + "" : key, value);
  const CLOSE_NORMAL = 1e3;
  const CLOSE_GOING_AWAY = 1001;
  const CLOSE_NO_STATUS = 1005;
  const CLOSE_NOT_FOUND = 4040;
  let firstTime;
  function monotonicMillis() {
    if (firstTime === void 0) {
      firstTime = Date.now();
    }
    if (typeof performance === "undefined" || !performance.now) {
      return Date.now();
    }
    return Math.round(firstTime + performance.now());
  }
  function prettyNow() {
    return `t=${Math.round((monotonicMillis() - firstTime) / 100) / 10}s`;
  }
  const serverDisconnectErrors = {
    // A known error, e.g. during a restart or push
    InternalServerError: { timeout: 1e3 },
    // ErrorMetadata::overloaded() messages that we realy should back off
    SubscriptionsWorkerFullError: { timeout: 3e3 },
    TooManyConcurrentRequests: { timeout: 3e3 },
    CommitterFullError: { timeout: 3e3 },
    AwsTooManyRequestsException: { timeout: 3e3 },
    ExecuteFullError: { timeout: 3e3 },
    SystemTimeoutError: { timeout: 3e3 },
    ExpiredInQueue: { timeout: 3e3 },
    // ErrorMetadata::feature_temporarily_unavailable() that typically indicate a deploy just happened
    VectorIndexesUnavailable: { timeout: 1e3 },
    SearchIndexesUnavailable: { timeout: 1e3 },
    TableSummariesUnavailable: { timeout: 1e3 },
    // More ErrorMetadata::overloaded()
    VectorIndexTooLarge: { timeout: 3e3 },
    SearchIndexTooLarge: { timeout: 3e3 },
    TooManyWritesInTimePeriod: { timeout: 3e3 }
  };
  function classifyDisconnectError(s) {
    if (s === void 0) return "Unknown";
    for (const prefix of Object.keys(
      serverDisconnectErrors
    )) {
      if (s.startsWith(prefix)) {
        return prefix;
      }
    }
    return "Unknown";
  }
  class WebSocketManager {
    constructor(uri, callbacks, webSocketConstructor, logger2, markConnectionStateDirty, debug2) {
      this.markConnectionStateDirty = markConnectionStateDirty;
      this.debug = debug2;
      __publicField$4(this, "socket");
      __publicField$4(this, "connectionCount");
      __publicField$4(this, "_hasEverConnected", false);
      __publicField$4(this, "lastCloseReason");
      __publicField$4(this, "transitionChunkBuffer", null);
      __publicField$4(this, "defaultInitialBackoff");
      __publicField$4(this, "maxBackoff");
      __publicField$4(this, "retries");
      __publicField$4(this, "serverInactivityThreshold");
      __publicField$4(this, "reconnectDueToServerInactivityTimeout");
      __publicField$4(this, "scheduledReconnect", null);
      __publicField$4(this, "networkOnlineHandler", null);
      __publicField$4(this, "pendingNetworkRecoveryInfo", null);
      __publicField$4(this, "uri");
      __publicField$4(this, "onOpen");
      __publicField$4(this, "onResume");
      __publicField$4(this, "onMessage");
      __publicField$4(this, "webSocketConstructor");
      __publicField$4(this, "logger");
      __publicField$4(this, "onServerDisconnectError");
      this.webSocketConstructor = webSocketConstructor;
      this.socket = { state: "disconnected" };
      this.connectionCount = 0;
      this.lastCloseReason = "InitialConnect";
      this.defaultInitialBackoff = 1e3;
      this.maxBackoff = 16e3;
      this.retries = 0;
      this.serverInactivityThreshold = 6e4;
      this.reconnectDueToServerInactivityTimeout = null;
      this.uri = uri;
      this.onOpen = callbacks.onOpen;
      this.onResume = callbacks.onResume;
      this.onMessage = callbacks.onMessage;
      this.onServerDisconnectError = callbacks.onServerDisconnectError;
      this.logger = logger2;
      this.setupNetworkListener();
      this.connect();
    }
    setSocketState(state2) {
      this.socket = state2;
      this._logVerbose(
        `socket state changed: ${this.socket.state}, paused: ${"paused" in this.socket ? this.socket.paused : void 0}`
      );
      this.markConnectionStateDirty();
    }
    setupNetworkListener() {
      if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
        return;
      }
      if (this.networkOnlineHandler !== null) {
        return;
      }
      this.networkOnlineHandler = () => {
        this._logVerbose("network online event detected");
        this.tryReconnectImmediately();
      };
      window.addEventListener("online", this.networkOnlineHandler);
      this._logVerbose("network online event listener registered");
    }
    cleanupNetworkListener() {
      if (this.networkOnlineHandler && typeof window !== "undefined" && typeof window.removeEventListener === "function") {
        window.removeEventListener("online", this.networkOnlineHandler);
        this.networkOnlineHandler = null;
        this._logVerbose("network online event listener removed");
      }
    }
    assembleTransition(chunk) {
      if (chunk.partNumber < 0 || chunk.partNumber >= chunk.totalParts || chunk.totalParts === 0 || this.transitionChunkBuffer && (this.transitionChunkBuffer.totalParts !== chunk.totalParts || this.transitionChunkBuffer.transitionId !== chunk.transitionId)) {
        this.transitionChunkBuffer = null;
        throw new Error("Invalid TransitionChunk");
      }
      if (this.transitionChunkBuffer === null) {
        this.transitionChunkBuffer = {
          chunks: [],
          totalParts: chunk.totalParts,
          transitionId: chunk.transitionId
        };
      }
      if (chunk.partNumber !== this.transitionChunkBuffer.chunks.length) {
        const expectedLength = this.transitionChunkBuffer.chunks.length;
        this.transitionChunkBuffer = null;
        throw new Error(
          `TransitionChunk received out of order: expected part ${expectedLength}, got ${chunk.partNumber}`
        );
      }
      this.transitionChunkBuffer.chunks.push(chunk.chunk);
      if (this.transitionChunkBuffer.chunks.length === chunk.totalParts) {
        const fullJson = this.transitionChunkBuffer.chunks.join("");
        this.transitionChunkBuffer = null;
        const transition = parseServerMessage(JSON.parse(fullJson));
        if (transition.type !== "Transition") {
          throw new Error(
            `Expected Transition, got ${transition.type} after assembling chunks`
          );
        }
        return transition;
      }
      return null;
    }
    connect() {
      if (this.socket.state === "terminated") {
        return;
      }
      if (this.socket.state !== "disconnected" && this.socket.state !== "stopped") {
        throw new Error(
          "Didn't start connection from disconnected state: " + this.socket.state
        );
      }
      const ws = new this.webSocketConstructor(this.uri);
      this._logVerbose("constructed WebSocket");
      this.setSocketState({
        state: "connecting",
        ws,
        paused: "no"
      });
      this.resetServerInactivityTimeout();
      ws.onopen = () => {
        this.logger.logVerbose("begin ws.onopen");
        if (this.socket.state !== "connecting") {
          throw new Error("onopen called with socket not in connecting state");
        }
        this.setSocketState({
          state: "ready",
          ws,
          paused: this.socket.paused === "yes" ? "uninitialized" : "no"
        });
        this.resetServerInactivityTimeout();
        if (this.socket.paused === "no") {
          this._hasEverConnected = true;
          this.onOpen({
            connectionCount: this.connectionCount,
            lastCloseReason: this.lastCloseReason,
            clientTs: monotonicMillis()
          });
        }
        if (this.lastCloseReason !== "InitialConnect") {
          if (this.lastCloseReason) {
            this.logger.log(
              "WebSocket reconnected at",
              prettyNow(),
              "after disconnect due to",
              this.lastCloseReason
            );
          } else {
            this.logger.log("WebSocket reconnected at", prettyNow());
          }
        }
        this.connectionCount += 1;
        this.lastCloseReason = null;
        if (this.pendingNetworkRecoveryInfo !== null) {
          const { timeSavedMs } = this.pendingNetworkRecoveryInfo;
          this.pendingNetworkRecoveryInfo = null;
          this.sendMessage({
            type: "Event",
            eventType: "NetworkRecoveryReconnect",
            event: { timeSavedMs }
          });
          this.logger.log(
            `Network recovery reconnect saved ~${Math.round(timeSavedMs / 1e3)}s of waiting`
          );
        }
      };
      ws.onerror = (error2) => {
        this.transitionChunkBuffer = null;
        const message = error2.message;
        if (message) {
          this.logger.log(`WebSocket error message: ${message}`);
        }
      };
      ws.onmessage = (message) => {
        this.resetServerInactivityTimeout();
        const messageLength = message.data.length;
        let serverMessage = parseServerMessage(JSON.parse(message.data));
        this._logVerbose(`received ws message with type ${serverMessage.type}`);
        if (serverMessage.type === "Ping") {
          return;
        }
        if (serverMessage.type === "TransitionChunk") {
          const transition = this.assembleTransition(serverMessage);
          if (!transition) {
            return;
          }
          serverMessage = transition;
          this._logVerbose(
            `assembled full ws message of type ${serverMessage.type}`
          );
        }
        if (this.transitionChunkBuffer !== null) {
          this.transitionChunkBuffer = null;
          this.logger.log(
            `Received unexpected ${serverMessage.type} while buffering TransitionChunks`
          );
        }
        if (serverMessage.type === "Transition") {
          this.reportLargeTransition({
            messageLength,
            transition: serverMessage
          });
        }
        const response = this.onMessage(serverMessage);
        if (response.hasSyncedPastLastReconnect) {
          this.retries = 0;
          this.markConnectionStateDirty();
        }
      };
      ws.onclose = (event) => {
        this._logVerbose("begin ws.onclose");
        this.transitionChunkBuffer = null;
        if (this.lastCloseReason === null) {
          this.lastCloseReason = event.reason || `closed with code ${event.code}`;
        }
        if (event.code !== CLOSE_NORMAL && event.code !== CLOSE_GOING_AWAY && // This commonly gets fired on mobile apps when the app is backgrounded
        event.code !== CLOSE_NO_STATUS && event.code !== CLOSE_NOT_FOUND) {
          let msg = `WebSocket closed with code ${event.code}`;
          if (event.reason) {
            msg += `: ${event.reason}`;
          }
          this.logger.log(msg);
          if (this.onServerDisconnectError && event.reason) {
            this.onServerDisconnectError(msg);
          }
        }
        const reason = classifyDisconnectError(event.reason);
        this.scheduleReconnect(reason);
        return;
      };
    }
    /**
     * @returns The state of the {@link Socket}.
     */
    socketState() {
      return this.socket.state;
    }
    /**
     * @param message - A ClientMessage to send.
     * @returns Whether the message (might have been) sent.
     */
    sendMessage(message) {
      const messageForLog = {
        type: message.type,
        ...message.type === "Authenticate" && message.tokenType === "User" ? {
          value: `...${message.value.slice(-7)}`
        } : {}
      };
      if (this.socket.state === "ready" && this.socket.paused === "no") {
        const encodedMessage = encodeClientMessage(message);
        const request = JSON.stringify(encodedMessage);
        let sent = false;
        try {
          this.socket.ws.send(request);
          sent = true;
        } catch (error2) {
          this.logger.log(
            `Failed to send message on WebSocket, reconnecting: ${error2}`
          );
          this.closeAndReconnect("FailedToSendMessage");
        }
        this._logVerbose(
          `${sent ? "sent" : "failed to send"} message with type ${message.type}: ${JSON.stringify(
            messageForLog
          )}`
        );
        return true;
      }
      this._logVerbose(
        `message not sent (socket state: ${this.socket.state}, paused: ${"paused" in this.socket ? this.socket.paused : void 0}): ${JSON.stringify(
          messageForLog
        )}`
      );
      return false;
    }
    resetServerInactivityTimeout() {
      if (this.socket.state === "terminated") {
        return;
      }
      if (this.reconnectDueToServerInactivityTimeout !== null) {
        clearTimeout(this.reconnectDueToServerInactivityTimeout);
        this.reconnectDueToServerInactivityTimeout = null;
      }
      this.reconnectDueToServerInactivityTimeout = setTimeout(() => {
        this.closeAndReconnect("InactiveServer");
      }, this.serverInactivityThreshold);
    }
    scheduleReconnect(reason) {
      if (this.scheduledReconnect) {
        clearTimeout(this.scheduledReconnect.timeout);
        this.scheduledReconnect = null;
      }
      this.socket = { state: "disconnected" };
      const backoff = this.nextBackoff(reason);
      this.markConnectionStateDirty();
      this.logger.log(`Attempting reconnect in ${Math.round(backoff)}ms`);
      const scheduledAt = monotonicMillis();
      const timeoutId = setTimeout(() => {
        if (this.scheduledReconnect?.timeout === timeoutId) {
          this.scheduledReconnect = null;
          this.connect();
        }
      }, backoff);
      this.scheduledReconnect = {
        timeout: timeoutId,
        scheduledAt,
        backoffMs: backoff
      };
    }
    /**
     * Close the WebSocket and schedule a reconnect.
     *
     * This should be used when we hit an error and would like to restart the session.
     */
    closeAndReconnect(closeReason) {
      this._logVerbose(`begin closeAndReconnect with reason ${closeReason}`);
      switch (this.socket.state) {
        case "disconnected":
        case "terminated":
        case "stopped":
          return;
        case "connecting":
        case "ready": {
          this.lastCloseReason = closeReason;
          void this.close();
          this.scheduleReconnect("client");
          return;
        }
        default: {
          this.socket;
        }
      }
    }
    /**
     * Close the WebSocket, being careful to clear the onclose handler to avoid re-entrant
     * calls. Use this instead of directly calling `ws.close()`
     *
     * It is the callers responsibility to update the state after this method is called so that the
     * closed socket is not accessible or used again after this method is called
     */
    close() {
      this.transitionChunkBuffer = null;
      switch (this.socket.state) {
        case "disconnected":
        case "terminated":
        case "stopped":
          return Promise.resolve();
        case "connecting": {
          const ws = this.socket.ws;
          ws.onmessage = (_message) => {
            this._logVerbose("Ignoring message received after close");
          };
          return new Promise((r2) => {
            ws.onclose = () => {
              this._logVerbose("Closed after connecting");
              r2();
            };
            ws.onopen = () => {
              this._logVerbose("Opened after connecting");
              ws.close();
            };
          });
        }
        case "ready": {
          this._logVerbose("ws.close called");
          const ws = this.socket.ws;
          ws.onmessage = (_message) => {
            this._logVerbose("Ignoring message received after close");
          };
          const result = new Promise((r2) => {
            ws.onclose = () => {
              r2();
            };
          });
          ws.close();
          return result;
        }
        default: {
          this.socket;
          return Promise.resolve();
        }
      }
    }
    /**
     * Close the WebSocket and do not reconnect.
     * @returns A Promise that resolves when the WebSocket `onClose` callback is called.
     */
    terminate() {
      if (this.reconnectDueToServerInactivityTimeout) {
        clearTimeout(this.reconnectDueToServerInactivityTimeout);
      }
      if (this.scheduledReconnect) {
        clearTimeout(this.scheduledReconnect.timeout);
        this.scheduledReconnect = null;
      }
      this.cleanupNetworkListener();
      switch (this.socket.state) {
        case "terminated":
        case "stopped":
        case "disconnected":
        case "connecting":
        case "ready": {
          const result = this.close();
          this.setSocketState({ state: "terminated" });
          return result;
        }
        default: {
          this.socket;
          throw new Error(
            `Invalid websocket state: ${this.socket.state}`
          );
        }
      }
    }
    stop() {
      switch (this.socket.state) {
        case "terminated":
          return Promise.resolve();
        case "connecting":
        case "stopped":
        case "disconnected":
        case "ready": {
          this.cleanupNetworkListener();
          const result = this.close();
          this.socket = { state: "stopped" };
          return result;
        }
        default: {
          this.socket;
          return Promise.resolve();
        }
      }
    }
    /**
     * Create a new WebSocket after a previous `stop()`, unless `terminate()` was
     * called before.
     */
    tryRestart() {
      switch (this.socket.state) {
        case "stopped":
          break;
        case "terminated":
        case "connecting":
        case "ready":
        case "disconnected":
          this.logger.logVerbose("Restart called without stopping first");
          return;
        default: {
          this.socket;
        }
      }
      this.setupNetworkListener();
      this.connect();
    }
    pause() {
      switch (this.socket.state) {
        case "disconnected":
        case "stopped":
        case "terminated":
          return;
        case "connecting":
        case "ready": {
          this.socket = { ...this.socket, paused: "yes" };
          return;
        }
        default: {
          this.socket;
          return;
        }
      }
    }
    /**
     * Try to reconnect immediately, canceling any scheduled reconnect.
     * This is useful when detecting network recovery.
     * Only takes action if we're in disconnected state (waiting to reconnect).
     */
    tryReconnectImmediately() {
      this._logVerbose("tryReconnectImmediately called");
      if (this.socket.state !== "disconnected") {
        this._logVerbose(
          `tryReconnectImmediately called but socket state is ${this.socket.state}, no action taken`
        );
        return;
      }
      let timeSavedMs = null;
      if (this.scheduledReconnect) {
        const elapsed = monotonicMillis() - this.scheduledReconnect.scheduledAt;
        timeSavedMs = Math.max(0, this.scheduledReconnect.backoffMs - elapsed);
        this._logVerbose(
          `would have waited ${Math.round(timeSavedMs)}ms more (backoff was ${Math.round(this.scheduledReconnect.backoffMs)}ms, elapsed ${Math.round(elapsed)}ms)`
        );
        clearTimeout(this.scheduledReconnect.timeout);
        this.scheduledReconnect = null;
        this._logVerbose("canceled scheduled reconnect");
      }
      this.logger.log("Network recovery detected, reconnecting immediately");
      this.pendingNetworkRecoveryInfo = timeSavedMs !== null ? { timeSavedMs } : null;
      this.connect();
    }
    /**
     * Resume the state machine if previously paused.
     */
    resume() {
      switch (this.socket.state) {
        case "connecting":
          this.socket = { ...this.socket, paused: "no" };
          return;
        case "ready":
          if (this.socket.paused === "uninitialized") {
            this.socket = { ...this.socket, paused: "no" };
            this._hasEverConnected = true;
            this.onOpen({
              connectionCount: this.connectionCount,
              lastCloseReason: this.lastCloseReason,
              clientTs: monotonicMillis()
            });
          } else if (this.socket.paused === "yes") {
            this.socket = { ...this.socket, paused: "no" };
            this.onResume();
          }
          return;
        case "terminated":
        case "stopped":
        case "disconnected":
          return;
        default: {
          this.socket;
        }
      }
      this.connect();
    }
    connectionState() {
      return {
        isConnected: this.socket.state === "ready",
        hasEverConnected: this._hasEverConnected,
        connectionCount: this.connectionCount,
        connectionRetries: this.retries
      };
    }
    _logVerbose(message) {
      this.logger.logVerbose(message);
    }
    nextBackoff(reason) {
      const initialBackoff = reason === "client" ? 100 : reason === "Unknown" ? this.defaultInitialBackoff : serverDisconnectErrors[reason].timeout;
      const baseBackoff = initialBackoff * Math.pow(2, this.retries);
      this.retries += 1;
      const actualBackoff = Math.min(baseBackoff, this.maxBackoff);
      const jitter = actualBackoff * (Math.random() - 0.5);
      return actualBackoff + jitter;
    }
    reportLargeTransition({
      transition,
      messageLength
    }) {
      if (transition.clientClockSkew === void 0 || transition.serverTs === void 0) {
        return;
      }
      const transitionTransitTime = monotonicMillis() - // client time now
      // clientClockSkew = (server time + upstream latency) - client time
      // clientClockSkew is "how many milliseconds behind (slow) is the client clock"
      // but the latency of the Connect message inflates this, making it appear further behind
      transition.clientClockSkew - transition.serverTs / 1e6;
      const prettyTransitionTime = `${Math.round(transitionTransitTime)}ms`;
      const prettyMessageMB = `${Math.round(messageLength / 1e4) / 100}MB`;
      const bytesPerSecond = messageLength / (transitionTransitTime / 1e3);
      const prettyBytesPerSecond = `${Math.round(bytesPerSecond / 1e4) / 100}MB per second`;
      this._logVerbose(
        `received ${prettyMessageMB} transition in ${prettyTransitionTime} at ${prettyBytesPerSecond}`
      );
      if (messageLength > 2e7) {
        this.logger.log(
          `received query results totaling more that 20MB (${prettyMessageMB}) which will take a long time to download on slower connections`
        );
      } else if (transitionTransitTime > 2e4) {
        this.logger.log(
          `received query results totaling ${prettyMessageMB} which took more than 20s to arrive (${prettyTransitionTime})`
        );
      }
      if (this.debug) {
        this.sendMessage({
          type: "Event",
          eventType: "ClientReceivedTransition",
          event: { transitionTransitTime, messageLength }
        });
      }
    }
  }
  function newSessionId() {
    return uuidv4();
  }
  function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r2 = Math.random() * 16 | 0, v = c === "x" ? r2 : r2 & 3 | 8;
      return v.toString(16);
    });
  }
  class InvalidTokenError extends Error {
  }
  InvalidTokenError.prototype.name = "InvalidTokenError";
  function b64DecodeUnicode(str) {
    return decodeURIComponent(
      atob(str).replace(/(.)/g, (_m, p) => {
        let code2 = p.charCodeAt(0).toString(16).toUpperCase();
        if (code2.length < 2) {
          code2 = "0" + code2;
        }
        return "%" + code2;
      })
    );
  }
  function base64UrlDecode(str) {
    let output = str.replace(/-/g, "+").replace(/_/g, "/");
    switch (output.length % 4) {
      case 0:
        break;
      case 2:
        output += "==";
        break;
      case 3:
        output += "=";
        break;
      default:
        throw new Error("base64 string is not of the correct length");
    }
    try {
      return b64DecodeUnicode(output);
    } catch {
      return atob(output);
    }
  }
  function jwtDecode(token, options) {
    if (typeof token !== "string") {
      throw new InvalidTokenError("Invalid token specified: must be a string");
    }
    options || (options = {});
    const pos = options.header === true ? 0 : 1;
    const part = token.split(".")[pos];
    if (typeof part !== "string") {
      throw new InvalidTokenError(
        `Invalid token specified: missing part #${pos + 1}`
      );
    }
    let decoded;
    try {
      decoded = base64UrlDecode(part);
    } catch (e) {
      throw new InvalidTokenError(
        `Invalid token specified: invalid base64 for part #${pos + 1} (${e.message})`
      );
    }
    try {
      return JSON.parse(decoded);
    } catch (e) {
      throw new InvalidTokenError(
        `Invalid token specified: invalid json for part #${pos + 1} (${e.message})`
      );
    }
  }
  var __defProp$3 = Object.defineProperty;
  var __defNormalProp$3 = (obj, key, value) => key in obj ? __defProp$3(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField$3 = (obj, key, value) => __defNormalProp$3(obj, typeof key !== "symbol" ? key + "" : key, value);
  const MAXIMUM_REFRESH_DELAY = 20 * 24 * 60 * 60 * 1e3;
  const MAX_TOKEN_CONFIRMATION_ATTEMPTS = 2;
  class AuthenticationManager {
    constructor(syncState, callbacks, config) {
      __publicField$3(this, "authState", { state: "noAuth" });
      __publicField$3(this, "configVersion", 0);
      __publicField$3(this, "syncState");
      __publicField$3(this, "authenticate");
      __publicField$3(this, "stopSocket");
      __publicField$3(this, "tryRestartSocket");
      __publicField$3(this, "pauseSocket");
      __publicField$3(this, "resumeSocket");
      __publicField$3(this, "clearAuth");
      __publicField$3(this, "logger");
      __publicField$3(this, "refreshTokenLeewaySeconds");
      __publicField$3(this, "tokenConfirmationAttempts", 0);
      this.syncState = syncState;
      this.authenticate = callbacks.authenticate;
      this.stopSocket = callbacks.stopSocket;
      this.tryRestartSocket = callbacks.tryRestartSocket;
      this.pauseSocket = callbacks.pauseSocket;
      this.resumeSocket = callbacks.resumeSocket;
      this.clearAuth = callbacks.clearAuth;
      this.logger = config.logger;
      this.refreshTokenLeewaySeconds = config.refreshTokenLeewaySeconds;
    }
    async setConfig(fetchToken, onChange) {
      this.resetAuthState();
      this._logVerbose("pausing WS for auth token fetch");
      this.pauseSocket();
      const token = await this.fetchTokenAndGuardAgainstRace(fetchToken, {
        forceRefreshToken: false
      });
      if (token.isFromOutdatedConfig) {
        return;
      }
      if (token.value) {
        this.setAuthState({
          state: "waitingForServerConfirmationOfCachedToken",
          config: { fetchToken, onAuthChange: onChange },
          hasRetried: false
        });
        this.authenticate(token.value);
      } else {
        this.setAuthState({
          state: "initialRefetch",
          config: { fetchToken, onAuthChange: onChange }
        });
        await this.refetchToken();
      }
      this._logVerbose("resuming WS after auth token fetch");
      this.resumeSocket();
    }
    onTransition(serverMessage) {
      if (!this.syncState.isCurrentOrNewerAuthVersion(
        serverMessage.endVersion.identity
      )) {
        return;
      }
      if (serverMessage.endVersion.identity <= serverMessage.startVersion.identity) {
        return;
      }
      this._logVerbose(
        `auth state is ${this.authState.state} when handling transition`
      );
      this.syncState.markAuthCompletion();
      if (this.authState.state === "waitingForServerConfirmationOfCachedToken") {
        this._logVerbose("server confirmed auth token is valid");
        void this.refetchToken();
        this.authState.config.onAuthChange(true);
        return;
      }
      if (this.authState.state === "waitingForServerConfirmationOfFreshToken") {
        this._logVerbose("server confirmed new auth token is valid");
        this.scheduleTokenRefetch(this.authState.token);
        this.tokenConfirmationAttempts = 0;
        if (!this.authState.hadAuth) {
          this.authState.config.onAuthChange(true);
        }
      }
    }
    onAuthError(serverMessage) {
      if (serverMessage.authUpdateAttempted === false && (this.authState.state === "waitingForServerConfirmationOfFreshToken" || this.authState.state === "waitingForServerConfirmationOfCachedToken")) {
        this._logVerbose("ignoring non-auth token expired error");
        return;
      }
      const { baseVersion } = serverMessage;
      if (!this.syncState.isCurrentOrNewerAuthVersion(baseVersion + 1)) {
        this._logVerbose("ignoring auth error for previous auth attempt");
        return;
      }
      void this.tryToReauthenticate(serverMessage);
      return;
    }
    // This is similar to `refetchToken` defined below, in fact we
    // don't represent them as different states, but it is different
    // in that we pause the WebSocket so that mutations
    // don't retry with bad auth.
    async tryToReauthenticate(serverMessage) {
      this._logVerbose(`attempting to reauthenticate: ${serverMessage.error}`);
      if (
        // No way to fetch another token, kaboom
        this.authState.state === "noAuth" || // We failed on a fresh token. After a small number of retries, we give up
        // and clear the auth state to avoid infinite retries.
        this.authState.state === "waitingForServerConfirmationOfFreshToken" && this.tokenConfirmationAttempts >= MAX_TOKEN_CONFIRMATION_ATTEMPTS
      ) {
        this.logger.error(
          `Failed to authenticate: "${serverMessage.error}", check your server auth config`
        );
        if (this.syncState.hasAuth()) {
          this.syncState.clearAuth();
        }
        if (this.authState.state !== "noAuth") {
          this.setAndReportAuthFailed(this.authState.config.onAuthChange);
        }
        return;
      }
      if (this.authState.state === "waitingForServerConfirmationOfFreshToken") {
        this.tokenConfirmationAttempts++;
        this._logVerbose(
          `retrying reauthentication, ${MAX_TOKEN_CONFIRMATION_ATTEMPTS - this.tokenConfirmationAttempts} attempts remaining`
        );
      }
      await this.stopSocket();
      const token = await this.fetchTokenAndGuardAgainstRace(
        this.authState.config.fetchToken,
        {
          forceRefreshToken: true
        }
      );
      if (token.isFromOutdatedConfig) {
        return;
      }
      if (token.value && this.syncState.isNewAuth(token.value)) {
        this.authenticate(token.value);
        this.setAuthState({
          state: "waitingForServerConfirmationOfFreshToken",
          config: this.authState.config,
          token: token.value,
          hadAuth: this.authState.state === "notRefetching" || this.authState.state === "waitingForScheduledRefetch"
        });
      } else {
        this._logVerbose("reauthentication failed, could not fetch a new token");
        if (this.syncState.hasAuth()) {
          this.syncState.clearAuth();
        }
        this.setAndReportAuthFailed(this.authState.config.onAuthChange);
      }
      this.tryRestartSocket();
    }
    // Force refetch the token and schedule another refetch
    // before the token expires - an active client should never
    // need to reauthenticate.
    async refetchToken() {
      if (this.authState.state === "noAuth") {
        return;
      }
      this._logVerbose("refetching auth token");
      const token = await this.fetchTokenAndGuardAgainstRace(
        this.authState.config.fetchToken,
        {
          forceRefreshToken: true
        }
      );
      if (token.isFromOutdatedConfig) {
        return;
      }
      if (token.value) {
        if (this.syncState.isNewAuth(token.value)) {
          this.setAuthState({
            state: "waitingForServerConfirmationOfFreshToken",
            hadAuth: this.syncState.hasAuth(),
            token: token.value,
            config: this.authState.config
          });
          this.authenticate(token.value);
        } else {
          this.setAuthState({
            state: "notRefetching",
            config: this.authState.config
          });
        }
      } else {
        this._logVerbose("refetching token failed");
        if (this.syncState.hasAuth()) {
          this.clearAuth();
        }
        this.setAndReportAuthFailed(this.authState.config.onAuthChange);
      }
      this._logVerbose(
        "restarting WS after auth token fetch (if currently stopped)"
      );
      this.tryRestartSocket();
    }
    scheduleTokenRefetch(token) {
      if (this.authState.state === "noAuth") {
        return;
      }
      const decodedToken = this.decodeToken(token);
      if (!decodedToken) {
        this.logger.error(
          "Auth token is not a valid JWT, cannot refetch the token"
        );
        return;
      }
      const { iat, exp } = decodedToken;
      if (!iat || !exp) {
        this.logger.error(
          "Auth token does not have required fields, cannot refetch the token"
        );
        return;
      }
      const tokenValiditySeconds = exp - iat;
      if (tokenValiditySeconds <= 2) {
        this.logger.error(
          "Auth token does not live long enough, cannot refetch the token"
        );
        return;
      }
      let delay = Math.min(
        MAXIMUM_REFRESH_DELAY,
        (tokenValiditySeconds - this.refreshTokenLeewaySeconds) * 1e3
      );
      if (delay <= 0) {
        this.logger.warn(
          `Refetching auth token immediately, configured leeway ${this.refreshTokenLeewaySeconds}s is larger than the token's lifetime ${tokenValiditySeconds}s`
        );
        delay = 0;
      }
      const refetchTokenTimeoutId = setTimeout(() => {
        this._logVerbose("running scheduled token refetch");
        void this.refetchToken();
      }, delay);
      this.setAuthState({
        state: "waitingForScheduledRefetch",
        refetchTokenTimeoutId,
        config: this.authState.config
      });
      this._logVerbose(
        `scheduled preemptive auth token refetching in ${delay}ms`
      );
    }
    // Protects against simultaneous calls to `setConfig`
    // while we're fetching a token
    async fetchTokenAndGuardAgainstRace(fetchToken, fetchArgs) {
      const originalConfigVersion = ++this.configVersion;
      this._logVerbose(
        `fetching token with config version ${originalConfigVersion}`
      );
      const token = await fetchToken(fetchArgs);
      if (this.configVersion !== originalConfigVersion) {
        this._logVerbose(
          `stale config version, expected ${originalConfigVersion}, got ${this.configVersion}`
        );
        return { isFromOutdatedConfig: true };
      }
      return { isFromOutdatedConfig: false, value: token };
    }
    stop() {
      this.resetAuthState();
      this.configVersion++;
      this._logVerbose(`config version bumped to ${this.configVersion}`);
    }
    setAndReportAuthFailed(onAuthChange) {
      onAuthChange(false);
      this.resetAuthState();
    }
    resetAuthState() {
      this.setAuthState({ state: "noAuth" });
    }
    setAuthState(newAuth) {
      const authStateForLog = newAuth.state === "waitingForServerConfirmationOfFreshToken" ? {
        hadAuth: newAuth.hadAuth,
        state: newAuth.state,
        token: `...${newAuth.token.slice(-7)}`
      } : { state: newAuth.state };
      this._logVerbose(
        `setting auth state to ${JSON.stringify(authStateForLog)}`
      );
      switch (newAuth.state) {
        case "waitingForScheduledRefetch":
        case "notRefetching":
        case "noAuth":
          this.tokenConfirmationAttempts = 0;
          break;
      }
      if (this.authState.state === "waitingForScheduledRefetch") {
        clearTimeout(this.authState.refetchTokenTimeoutId);
      }
      this.authState = newAuth;
    }
    decodeToken(token) {
      try {
        return jwtDecode(token);
      } catch (e) {
        this._logVerbose(
          `Error decoding token: ${e instanceof Error ? e.message : "Unknown error"}`
        );
        return null;
      }
    }
    _logVerbose(message) {
      this.logger.logVerbose(`${message} [v${this.configVersion}]`);
    }
  }
  const markNames = [
    "convexClientConstructed",
    "convexWebSocketOpen",
    "convexFirstMessageReceived"
  ];
  function mark(name, sessionId) {
    const detail = { sessionId };
    if (typeof performance === "undefined" || !performance.mark) return;
    performance.mark(name, { detail });
  }
  function performanceMarkToJson(mark2) {
    let name = mark2.name.slice("convex".length);
    name = name.charAt(0).toLowerCase() + name.slice(1);
    return {
      name,
      startTime: mark2.startTime
    };
  }
  function getMarksReport(sessionId) {
    if (typeof performance === "undefined" || !performance.getEntriesByName) {
      return [];
    }
    const allMarks = [];
    for (const name of markNames) {
      const marks = performance.getEntriesByName(name).filter((entry) => entry.entryType === "mark").filter((mark2) => mark2.detail.sessionId === sessionId);
      allMarks.push(...marks);
    }
    return allMarks.map(performanceMarkToJson);
  }
  var __defProp$2 = Object.defineProperty;
  var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField$2 = (obj, key, value) => __defNormalProp$2(obj, typeof key !== "symbol" ? key + "" : key, value);
  class BaseConvexClient {
    /**
     * @param address - The url of your Convex deployment, often provided
     * by an environment variable. E.g. `https://small-mouse-123.convex.cloud`.
     * @param onTransition - A callback receiving an array of query tokens
     * corresponding to query results that have changed -- additional handlers
     * can be added via `addOnTransitionHandler`.
     * @param options - See {@link BaseConvexClientOptions} for a full description.
     */
    constructor(address, onTransition, options) {
      __publicField$2(this, "address");
      __publicField$2(this, "state");
      __publicField$2(this, "requestManager");
      __publicField$2(this, "webSocketManager");
      __publicField$2(this, "authenticationManager");
      __publicField$2(this, "remoteQuerySet");
      __publicField$2(this, "optimisticQueryResults");
      __publicField$2(this, "_transitionHandlerCounter", 0);
      __publicField$2(this, "_nextRequestId");
      __publicField$2(this, "_onTransitionFns", /* @__PURE__ */ new Map());
      __publicField$2(this, "_sessionId");
      __publicField$2(this, "firstMessageReceived", false);
      __publicField$2(this, "debug");
      __publicField$2(this, "logger");
      __publicField$2(this, "maxObservedTimestamp");
      __publicField$2(this, "connectionStateSubscribers", /* @__PURE__ */ new Map());
      __publicField$2(this, "nextConnectionStateSubscriberId", 0);
      __publicField$2(this, "_lastPublishedConnectionState");
      __publicField$2(this, "markConnectionStateDirty", () => {
        void Promise.resolve().then(() => {
          const curConnectionState = this.connectionState();
          if (JSON.stringify(curConnectionState) !== JSON.stringify(this._lastPublishedConnectionState)) {
            this._lastPublishedConnectionState = curConnectionState;
            for (const cb of this.connectionStateSubscribers.values()) {
              cb(curConnectionState);
            }
          }
        });
      });
      __publicField$2(this, "mark", (name) => {
        if (this.debug) {
          mark(name, this.sessionId);
        }
      });
      if (typeof address === "object") {
        throw new Error(
          "Passing a ClientConfig object is no longer supported. Pass the URL of the Convex deployment as a string directly."
        );
      }
      if (options?.skipConvexDeploymentUrlCheck !== true) {
        validateDeploymentUrl(address);
      }
      options = { ...options };
      const authRefreshTokenLeewaySeconds = options.authRefreshTokenLeewaySeconds ?? 10;
      let webSocketConstructor = options.webSocketConstructor;
      if (!webSocketConstructor && typeof WebSocket === "undefined") {
        throw new Error(
          "No WebSocket global variable defined! To use Convex in an environment without WebSocket try the HTTP client: https://docs.convex.dev/api/classes/browser.ConvexHttpClient"
        );
      }
      webSocketConstructor = webSocketConstructor || WebSocket;
      this.debug = options.reportDebugInfoToConvex ?? false;
      this.address = address;
      this.logger = options.logger === false ? instantiateNoopLogger({ verbose: options.verbose ?? false }) : options.logger !== true && options.logger ? options.logger : instantiateDefaultLogger({ verbose: options.verbose ?? false });
      const i2 = address.search("://");
      if (i2 === -1) {
        throw new Error("Provided address was not an absolute URL.");
      }
      const origin = address.substring(i2 + 3);
      const protocol = address.substring(0, i2);
      let wsProtocol;
      if (protocol === "http") {
        wsProtocol = "ws";
      } else if (protocol === "https") {
        wsProtocol = "wss";
      } else {
        throw new Error(`Unknown parent protocol ${protocol}`);
      }
      const wsUri = `${wsProtocol}://${origin}/api/${version}/sync`;
      this.state = new LocalSyncState();
      this.remoteQuerySet = new RemoteQuerySet(
        (queryId) => this.state.queryPath(queryId),
        this.logger
      );
      this.requestManager = new RequestManager(
        this.logger,
        this.markConnectionStateDirty
      );
      const pauseSocket = () => {
        this.webSocketManager.pause();
        this.state.pause();
      };
      this.authenticationManager = new AuthenticationManager(
        this.state,
        {
          authenticate: (token) => {
            const message = this.state.setAuth(token);
            this.webSocketManager.sendMessage(message);
            return message.baseVersion;
          },
          stopSocket: () => this.webSocketManager.stop(),
          tryRestartSocket: () => this.webSocketManager.tryRestart(),
          pauseSocket,
          resumeSocket: () => this.webSocketManager.resume(),
          clearAuth: () => {
            this.clearAuth();
          }
        },
        {
          logger: this.logger,
          refreshTokenLeewaySeconds: authRefreshTokenLeewaySeconds
        }
      );
      this.optimisticQueryResults = new OptimisticQueryResults();
      this.addOnTransitionHandler((transition) => {
        onTransition(transition.queries.map((q) => q.token));
      });
      this._nextRequestId = 0;
      this._sessionId = newSessionId();
      const { unsavedChangesWarning } = options;
      if (typeof window === "undefined" || typeof window.addEventListener === "undefined") {
        if (unsavedChangesWarning === true) {
          throw new Error(
            "unsavedChangesWarning requested, but window.addEventListener not found! Remove {unsavedChangesWarning: true} from Convex client options."
          );
        }
      } else if (unsavedChangesWarning !== false) {
        window.addEventListener("beforeunload", (e) => {
          if (this.requestManager.hasIncompleteRequests()) {
            e.preventDefault();
            const confirmationMessage = "Are you sure you want to leave? Your changes may not be saved.";
            (e || window.event).returnValue = confirmationMessage;
            return confirmationMessage;
          }
        });
      }
      this.webSocketManager = new WebSocketManager(
        wsUri,
        {
          onOpen: (reconnectMetadata) => {
            this.mark("convexWebSocketOpen");
            this.webSocketManager.sendMessage({
              ...reconnectMetadata,
              type: "Connect",
              sessionId: this._sessionId,
              maxObservedTimestamp: this.maxObservedTimestamp
            });
            this.remoteQuerySet = new RemoteQuerySet(
              (queryId) => this.state.queryPath(queryId),
              this.logger
            );
            const [querySetModification, authModification] = this.state.restart();
            if (authModification) {
              this.webSocketManager.sendMessage(authModification);
            }
            this.webSocketManager.sendMessage(querySetModification);
            for (const message of this.requestManager.restart()) {
              this.webSocketManager.sendMessage(message);
            }
          },
          onResume: () => {
            const [querySetModification, authModification] = this.state.resume();
            if (authModification) {
              this.webSocketManager.sendMessage(authModification);
            }
            if (querySetModification) {
              this.webSocketManager.sendMessage(querySetModification);
            }
            for (const message of this.requestManager.resume()) {
              this.webSocketManager.sendMessage(message);
            }
          },
          onMessage: (serverMessage) => {
            if (!this.firstMessageReceived) {
              this.firstMessageReceived = true;
              this.mark("convexFirstMessageReceived");
              this.reportMarks();
            }
            switch (serverMessage.type) {
              case "Transition": {
                this.observedTimestamp(serverMessage.endVersion.ts);
                this.authenticationManager.onTransition(serverMessage);
                this.remoteQuerySet.transition(serverMessage);
                this.state.transition(serverMessage);
                const completedRequests = this.requestManager.removeCompleted(
                  this.remoteQuerySet.timestamp()
                );
                this.notifyOnQueryResultChanges(completedRequests);
                break;
              }
              case "MutationResponse": {
                if (serverMessage.success) {
                  this.observedTimestamp(serverMessage.ts);
                }
                const completedMutationInfo = this.requestManager.onResponse(serverMessage);
                if (completedMutationInfo !== null) {
                  this.notifyOnQueryResultChanges(
                    /* @__PURE__ */ new Map([
                      [
                        completedMutationInfo.requestId,
                        completedMutationInfo.result
                      ]
                    ])
                  );
                }
                break;
              }
              case "ActionResponse": {
                this.requestManager.onResponse(serverMessage);
                break;
              }
              case "AuthError": {
                this.authenticationManager.onAuthError(serverMessage);
                break;
              }
              case "FatalError": {
                const error2 = logFatalError(this.logger, serverMessage.error);
                void this.webSocketManager.terminate();
                throw error2;
              }
            }
            return {
              hasSyncedPastLastReconnect: this.hasSyncedPastLastReconnect()
            };
          },
          onServerDisconnectError: options.onServerDisconnectError
        },
        webSocketConstructor,
        this.logger,
        this.markConnectionStateDirty,
        this.debug
      );
      this.mark("convexClientConstructed");
      if (options.expectAuth) {
        pauseSocket();
      }
    }
    /**
     * Return true if there is outstanding work from prior to the time of the most recent restart.
     * This indicates that the client has not proven itself to have gotten past the issue that
     * potentially led to the restart. Use this to influence when to reset backoff after a failure.
     */
    hasSyncedPastLastReconnect() {
      const hasSyncedPastLastReconnect = this.requestManager.hasSyncedPastLastReconnect() && this.state.hasSyncedPastLastReconnect();
      return hasSyncedPastLastReconnect;
    }
    observedTimestamp(observedTs) {
      if (this.maxObservedTimestamp === void 0 || this.maxObservedTimestamp.lessThanOrEqual(observedTs)) {
        this.maxObservedTimestamp = observedTs;
      }
    }
    getMaxObservedTimestamp() {
      return this.maxObservedTimestamp;
    }
    /**
     * Compute the current query results based on the remoteQuerySet and the
     * current optimistic updates and call `onTransition` for all the changed
     * queries.
     *
     * @param completedMutations - A set of mutation IDs whose optimistic updates
     * are no longer needed.
     */
    notifyOnQueryResultChanges(completedRequests) {
      const remoteQueryResults = this.remoteQuerySet.remoteQueryResults();
      const queryTokenToValue = /* @__PURE__ */ new Map();
      for (const [queryId, result] of remoteQueryResults) {
        const queryToken = this.state.queryToken(queryId);
        if (queryToken !== null) {
          const query = {
            result,
            udfPath: this.state.queryPath(queryId),
            args: this.state.queryArgs(queryId)
          };
          queryTokenToValue.set(queryToken, query);
        }
      }
      const changedQueryTokens = this.optimisticQueryResults.ingestQueryResultsFromServer(
        queryTokenToValue,
        new Set(completedRequests.keys())
      );
      this.handleTransition({
        queries: changedQueryTokens.map((token) => {
          const optimisticResult = this.optimisticQueryResults.rawQueryResult(token);
          return {
            token,
            modification: {
              kind: "Updated",
              result: optimisticResult
            }
          };
        }),
        reflectedMutations: Array.from(completedRequests).map(
          ([requestId, result]) => ({
            requestId,
            result
          })
        ),
        timestamp: this.remoteQuerySet.timestamp()
      });
    }
    handleTransition(transition) {
      for (const fn of this._onTransitionFns.values()) {
        fn(transition);
      }
    }
    /**
     * Add a handler that will be called on a transition.
     *
     * Any external side effects (e.g. setting React state) should be handled here.
     *
     * @param fn
     *
     * @returns
     */
    addOnTransitionHandler(fn) {
      const id = this._transitionHandlerCounter++;
      this._onTransitionFns.set(id, fn);
      return () => this._onTransitionFns.delete(id);
    }
    /**
     * Get the current JWT auth token and decoded claims.
     */
    getCurrentAuthClaims() {
      const authToken = this.state.getAuth();
      let decoded = {};
      if (authToken && authToken.tokenType === "User") {
        try {
          decoded = authToken ? jwtDecode(authToken.value) : {};
        } catch {
          decoded = {};
        }
      } else {
        return void 0;
      }
      return { token: authToken.value, decoded };
    }
    /**
     * Set the authentication token to be used for subsequent queries and mutations.
     * `fetchToken` will be called automatically again if a token expires.
     * `fetchToken` should return `null` if the token cannot be retrieved, for example
     * when the user's rights were permanently revoked.
     * @param fetchToken - an async function returning the JWT-encoded OpenID Connect Identity Token
     * @param onChange - a callback that will be called when the authentication status changes
     */
    setAuth(fetchToken, onChange) {
      void this.authenticationManager.setConfig(fetchToken, onChange);
    }
    hasAuth() {
      return this.state.hasAuth();
    }
    /** @internal */
    setAdminAuth(value, fakeUserIdentity) {
      const message = this.state.setAdminAuth(value, fakeUserIdentity);
      this.webSocketManager.sendMessage(message);
    }
    clearAuth() {
      const message = this.state.clearAuth();
      this.webSocketManager.sendMessage(message);
    }
    /**
       * Subscribe to a query function.
       *
       * Whenever this query's result changes, the `onTransition` callback
       * passed into the constructor will be called.
       *
       * @param name - The name of the query.
       * @param args - An arguments object for the query. If this is omitted, the
       * arguments will be `{}`.
       * @param options - A {@link SubscribeOptions} options object for this query.
    
       * @returns An object containing a {@link QueryToken} corresponding to this
       * query and an `unsubscribe` callback.
       */
    subscribe(name, args, options) {
      const argsObject = parseArgs(args);
      const { modification, queryToken, unsubscribe } = this.state.subscribe(
        name,
        argsObject,
        options?.journal,
        options?.componentPath
      );
      if (modification !== null) {
        this.webSocketManager.sendMessage(modification);
      }
      return {
        queryToken,
        unsubscribe: () => {
          const modification2 = unsubscribe();
          if (modification2) {
            this.webSocketManager.sendMessage(modification2);
          }
        }
      };
    }
    /**
     * A query result based only on the current, local state.
     *
     * The only way this will return a value is if we're already subscribed to the
     * query or its value has been set optimistically.
     */
    localQueryResult(udfPath, args) {
      const argsObject = parseArgs(args);
      const queryToken = serializePathAndArgs(udfPath, argsObject);
      return this.optimisticQueryResults.queryResult(queryToken);
    }
    /**
     * Get query result by query token based on current, local state
     *
     * The only way this will return a value is if we're already subscribed to the
     * query or its value has been set optimistically.
     *
     * @internal
     */
    localQueryResultByToken(queryToken) {
      return this.optimisticQueryResults.queryResult(queryToken);
    }
    /**
     * Whether local query result is available for a token.
     *
     * This method does not throw if the result is an error.
     *
     * @internal
     */
    hasLocalQueryResultByToken(queryToken) {
      return this.optimisticQueryResults.hasQueryResult(queryToken);
    }
    /**
     * @internal
     */
    localQueryLogs(udfPath, args) {
      const argsObject = parseArgs(args);
      const queryToken = serializePathAndArgs(udfPath, argsObject);
      return this.optimisticQueryResults.queryLogs(queryToken);
    }
    /**
     * Retrieve the current {@link QueryJournal} for this query function.
     *
     * If we have not yet received a result for this query, this will be `undefined`.
     *
     * @param name - The name of the query.
     * @param args - The arguments object for this query.
     * @returns The query's {@link QueryJournal} or `undefined`.
     */
    queryJournal(name, args) {
      const argsObject = parseArgs(args);
      const queryToken = serializePathAndArgs(name, argsObject);
      return this.state.queryJournal(queryToken);
    }
    /**
     * Get the current {@link ConnectionState} between the client and the Convex
     * backend.
     *
     * @returns The {@link ConnectionState} with the Convex backend.
     */
    connectionState() {
      const wsConnectionState = this.webSocketManager.connectionState();
      return {
        hasInflightRequests: this.requestManager.hasInflightRequests(),
        isWebSocketConnected: wsConnectionState.isConnected,
        hasEverConnected: wsConnectionState.hasEverConnected,
        connectionCount: wsConnectionState.connectionCount,
        connectionRetries: wsConnectionState.connectionRetries,
        timeOfOldestInflightRequest: this.requestManager.timeOfOldestInflightRequest(),
        inflightMutations: this.requestManager.inflightMutations(),
        inflightActions: this.requestManager.inflightActions()
      };
    }
    /**
     * Subscribe to the {@link ConnectionState} between the client and the Convex
     * backend, calling a callback each time it changes.
     *
     * Subscribed callbacks will be called when any part of ConnectionState changes.
     * ConnectionState may grow in future versions (e.g. to provide a array of
     * inflight requests) in which case callbacks would be called more frequently.
     *
     * @returns An unsubscribe function to stop listening.
     */
    subscribeToConnectionState(cb) {
      const id = this.nextConnectionStateSubscriberId++;
      this.connectionStateSubscribers.set(id, cb);
      return () => {
        this.connectionStateSubscribers.delete(id);
      };
    }
    /**
       * Execute a mutation function.
       *
       * @param name - The name of the mutation.
       * @param args - An arguments object for the mutation. If this is omitted,
       * the arguments will be `{}`.
       * @param options - A {@link MutationOptions} options object for this mutation.
    
       * @returns - A promise of the mutation's result.
       */
    async mutation(name, args, options) {
      const result = await this.mutationInternal(name, args, options);
      if (!result.success) {
        if (result.errorData !== void 0) {
          throw forwardData(
            result,
            new ConvexError(
              createHybridErrorStacktrace("mutation", name, result)
            )
          );
        }
        throw new Error(createHybridErrorStacktrace("mutation", name, result));
      }
      return result.value;
    }
    /**
     * @internal
     */
    async mutationInternal(udfPath, args, options, componentPath) {
      const { mutationPromise } = this.enqueueMutation(
        udfPath,
        args,
        options,
        componentPath
      );
      return mutationPromise;
    }
    /**
     * @internal
     */
    enqueueMutation(udfPath, args, options, componentPath) {
      const mutationArgs = parseArgs(args);
      this.tryReportLongDisconnect();
      const requestId = this.nextRequestId;
      this._nextRequestId++;
      if (options !== void 0) {
        const optimisticUpdate = options.optimisticUpdate;
        if (optimisticUpdate !== void 0) {
          const wrappedUpdate = (localQueryStore) => {
            const result = optimisticUpdate(
              localQueryStore,
              mutationArgs
            );
            if (result instanceof Promise) {
              this.logger.warn(
                "Optimistic update handler returned a Promise. Optimistic updates should be synchronous."
              );
            }
          };
          const changedQueryTokens = this.optimisticQueryResults.applyOptimisticUpdate(
            wrappedUpdate,
            requestId
          );
          const changedQueries = changedQueryTokens.map((token) => {
            const localResult = this.localQueryResultByToken(token);
            return {
              token,
              modification: {
                kind: "Updated",
                result: localResult === void 0 ? void 0 : {
                  success: true,
                  value: localResult,
                  logLines: []
                }
              }
            };
          });
          this.handleTransition({
            queries: changedQueries,
            reflectedMutations: [],
            timestamp: this.remoteQuerySet.timestamp()
          });
        }
      }
      const message = {
        type: "Mutation",
        requestId,
        udfPath,
        componentPath,
        args: [convexToJson(mutationArgs)]
      };
      const mightBeSent = this.webSocketManager.sendMessage(message);
      const mutationPromise = this.requestManager.request(message, mightBeSent);
      return {
        requestId,
        mutationPromise
      };
    }
    /**
     * Execute an action function.
     *
     * @param name - The name of the action.
     * @param args - An arguments object for the action. If this is omitted,
     * the arguments will be `{}`.
     * @returns A promise of the action's result.
     */
    async action(name, args) {
      const result = await this.actionInternal(name, args);
      if (!result.success) {
        if (result.errorData !== void 0) {
          throw forwardData(
            result,
            new ConvexError(createHybridErrorStacktrace("action", name, result))
          );
        }
        throw new Error(createHybridErrorStacktrace("action", name, result));
      }
      return result.value;
    }
    /**
     * @internal
     */
    async actionInternal(udfPath, args, componentPath) {
      const actionArgs = parseArgs(args);
      const requestId = this.nextRequestId;
      this._nextRequestId++;
      this.tryReportLongDisconnect();
      const message = {
        type: "Action",
        requestId,
        udfPath,
        componentPath,
        args: [convexToJson(actionArgs)]
      };
      const mightBeSent = this.webSocketManager.sendMessage(message);
      return this.requestManager.request(message, mightBeSent);
    }
    /**
     * Close any network handles associated with this client and stop all subscriptions.
     *
     * Call this method when you're done with an {@link BaseConvexClient} to
     * dispose of its sockets and resources.
     *
     * @returns A `Promise` fulfilled when the connection has been completely closed.
     */
    async close() {
      this.authenticationManager.stop();
      return this.webSocketManager.terminate();
    }
    /**
     * Return the address for this client, useful for creating a new client.
     *
     * Not guaranteed to match the address with which this client was constructed:
     * it may be canonicalized.
     */
    get url() {
      return this.address;
    }
    /**
     * @internal
     */
    get nextRequestId() {
      return this._nextRequestId;
    }
    /**
     * @internal
     */
    get sessionId() {
      return this._sessionId;
    }
    /**
     * Reports performance marks to the server. This should only be called when
     * we have a functional websocket.
     */
    reportMarks() {
      if (this.debug) {
        const report = getMarksReport(this.sessionId);
        this.webSocketManager.sendMessage({
          type: "Event",
          eventType: "ClientConnect",
          event: report
        });
      }
    }
    tryReportLongDisconnect() {
      if (!this.debug) {
        return;
      }
      const timeOfOldestRequest = this.connectionState().timeOfOldestInflightRequest;
      if (timeOfOldestRequest === null || Date.now() - timeOfOldestRequest.getTime() <= 60 * 1e3) {
        return;
      }
      const endpoint = `${this.address}/api/debug_event`;
      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Convex-Client": `npm-${version}`
        },
        body: JSON.stringify({ event: "LongWebsocketDisconnect" })
      }).then((response) => {
        if (!response.ok) {
          this.logger.warn(
            "Analytics request failed with response:",
            response.body
          );
        }
      }).catch((error2) => {
        this.logger.warn("Analytics response failed with error:", error2);
      });
    }
  }
  function asPaginationResult(value) {
    if (typeof value !== "object" || value === null || !Array.isArray(value.page) || typeof value.isDone !== "boolean" || typeof value.continueCursor !== "string") {
      throw new Error(`Not a valid paginated query result: ${value?.toString()}`);
    }
    return value;
  }
  var __defProp$1 = Object.defineProperty;
  var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
  class PaginatedQueryClient {
    constructor(client, onTransition) {
      this.client = client;
      this.onTransition = onTransition;
      __publicField$1(this, "paginatedQuerySet", /* @__PURE__ */ new Map());
      __publicField$1(this, "lastTransitionTs");
      this.lastTransitionTs = Long.fromNumber(0);
      this.client.addOnTransitionHandler(
        (transition) => this.onBaseTransition(transition)
      );
    }
    /**
     * Subscribe to a paginated query.
     *
     * @param name - The name of the paginated query function
     * @param args - Arguments for the query (excluding paginationOpts)
     * @param options - Pagination options including initialNumItems
     * @returns Object with paginatedQueryToken and unsubscribe function
     */
    subscribe(name, args, options) {
      const canonicalizedUdfPath = canonicalizeUdfPath(name);
      const token = serializePaginatedPathAndArgs(
        canonicalizedUdfPath,
        args,
        options
      );
      const unsubscribe = () => this.removePaginatedQuerySubscriber(token);
      const existingEntry = this.paginatedQuerySet.get(token);
      if (existingEntry) {
        existingEntry.numSubscribers += 1;
        return {
          paginatedQueryToken: token,
          unsubscribe
        };
      }
      this.paginatedQuerySet.set(token, {
        token,
        canonicalizedUdfPath,
        args,
        numSubscribers: 1,
        options: { initialNumItems: options.initialNumItems },
        nextPageKey: 0,
        pageKeys: [],
        pageKeyToQuery: /* @__PURE__ */ new Map(),
        ongoingSplits: /* @__PURE__ */ new Map(),
        skip: false,
        id: options.id
      });
      this.addPageToPaginatedQuery(token, null, options.initialNumItems);
      return {
        paginatedQueryToken: token,
        unsubscribe
      };
    }
    /**
     * Get current results for a paginated query based on local state.
     *
     * Throws an error when one of the pages has errored.
     */
    localQueryResult(name, args, options) {
      const canonicalizedUdfPath = canonicalizeUdfPath(name);
      const token = serializePaginatedPathAndArgs(
        canonicalizedUdfPath,
        args,
        options
      );
      return this.localQueryResultByToken(token);
    }
    /**
     * @internal
     */
    localQueryResultByToken(token) {
      const paginatedQuery = this.paginatedQuerySet.get(token);
      if (!paginatedQuery) {
        return void 0;
      }
      const activePages = this.activePageQueryTokens(paginatedQuery);
      if (activePages.length === 0) {
        return {
          results: [],
          status: "LoadingFirstPage",
          loadMore: (numItems) => {
            return this.loadMoreOfPaginatedQuery(token, numItems);
          }
        };
      }
      let allResults = [];
      let hasUndefined = false;
      let isDone = false;
      for (const pageToken of activePages) {
        const result = this.client.localQueryResultByToken(pageToken);
        if (result === void 0) {
          hasUndefined = true;
          isDone = false;
          continue;
        }
        const paginationResult = asPaginationResult(result);
        allResults = allResults.concat(paginationResult.page);
        isDone = !!paginationResult.isDone;
      }
      let status;
      if (hasUndefined) {
        status = allResults.length === 0 ? "LoadingFirstPage" : "LoadingMore";
      } else if (isDone) {
        status = "Exhausted";
      } else {
        status = "CanLoadMore";
      }
      return {
        results: allResults,
        status,
        loadMore: (numItems) => {
          return this.loadMoreOfPaginatedQuery(token, numItems);
        }
      };
    }
    onBaseTransition(transition) {
      const changedBaseTokens = transition.queries.map((q) => q.token);
      const changed = this.queriesContainingTokens(changedBaseTokens);
      let paginatedQueries = [];
      if (changed.length > 0) {
        this.processPaginatedQuerySplits(
          changed,
          (token) => this.client.localQueryResultByToken(token)
        );
        paginatedQueries = changed.map((token) => ({
          token,
          modification: {
            kind: "Updated",
            result: this.localQueryResultByToken(token)
          }
        }));
      }
      const extendedTransition = {
        ...transition,
        paginatedQueries
      };
      this.onTransition(extendedTransition);
    }
    /**
     * Load more items for a paginated query.
     *
     * This *always* causes a transition, the status of the query
     * has probably changed from "CanLoadMore" to "LoadingMore".
     * Data might have changed too: maybe a subscription to this page
     * query already exists (unlikely but possible) or this page query
     * has an optimistic update providing some initial data.
     *
     * @internal
     */
    loadMoreOfPaginatedQuery(token, numItems) {
      this.mustGetPaginatedQuery(token);
      const lastPageToken = this.queryTokenForLastPageOfPaginatedQuery(token);
      const lastPageResult = this.client.localQueryResultByToken(lastPageToken);
      if (!lastPageResult) {
        return false;
      }
      const paginationResult = asPaginationResult(lastPageResult);
      if (paginationResult.isDone) {
        return false;
      }
      this.addPageToPaginatedQuery(
        token,
        paginationResult.continueCursor,
        numItems
      );
      const loadMoreTransition = {
        timestamp: this.lastTransitionTs,
        reflectedMutations: [],
        queries: [],
        paginatedQueries: [
          {
            token,
            modification: {
              kind: "Updated",
              result: this.localQueryResultByToken(token)
            }
          }
        ]
      };
      this.onTransition(loadMoreTransition);
      return true;
    }
    /**
     * @internal
     */
    queriesContainingTokens(queryTokens) {
      if (queryTokens.length === 0) {
        return [];
      }
      const changed = [];
      const queryTokenSet = new Set(queryTokens);
      for (const [paginatedToken, paginatedQuery] of this.paginatedQuerySet) {
        for (const pageToken of this.allQueryTokens(paginatedQuery)) {
          if (queryTokenSet.has(pageToken)) {
            changed.push(paginatedToken);
            break;
          }
        }
      }
      return changed;
    }
    /**
     * @internal
     */
    processPaginatedQuerySplits(changed, getResult) {
      for (const paginatedQueryToken of changed) {
        const paginatedQuery = this.mustGetPaginatedQuery(paginatedQueryToken);
        const { ongoingSplits, pageKeyToQuery, pageKeys } = paginatedQuery;
        for (const [pageKey, [splitKey1, splitKey2]] of ongoingSplits) {
          const bothNewPagesLoaded = getResult(pageKeyToQuery.get(splitKey1).queryToken) !== void 0 && getResult(pageKeyToQuery.get(splitKey2).queryToken) !== void 0;
          if (bothNewPagesLoaded) {
            this.completePaginatedQuerySplit(
              paginatedQuery,
              pageKey,
              splitKey1,
              splitKey2
            );
          }
        }
        for (const pageKey of pageKeys) {
          if (ongoingSplits.has(pageKey)) {
            continue;
          }
          const pageToken = pageKeyToQuery.get(pageKey).queryToken;
          const pageResult = getResult(pageToken);
          if (!pageResult) {
            continue;
          }
          const result = asPaginationResult(pageResult);
          const shouldSplit = result.splitCursor && (result.pageStatus === "SplitRecommended" || result.pageStatus === "SplitRequired" || // This client-driven page splitting condition will change in the future.
          result.page.length > paginatedQuery.options.initialNumItems * 2);
          if (shouldSplit) {
            this.splitPaginatedQueryPage(
              paginatedQuery,
              pageKey,
              result.splitCursor,
              // we just checked
              result.continueCursor
            );
          }
        }
      }
    }
    splitPaginatedQueryPage(paginatedQuery, pageKey, splitCursor, continueCursor) {
      const splitKey1 = paginatedQuery.nextPageKey++;
      const splitKey2 = paginatedQuery.nextPageKey++;
      const paginationOpts = {
        cursor: continueCursor,
        numItems: paginatedQuery.options.initialNumItems,
        id: paginatedQuery.id
      };
      const firstSubscription = this.client.subscribe(
        paginatedQuery.canonicalizedUdfPath,
        {
          ...paginatedQuery.args,
          paginationOpts: {
            ...paginationOpts,
            cursor: null,
            // Start from beginning for first split
            endCursor: splitCursor
          }
        }
      );
      paginatedQuery.pageKeyToQuery.set(splitKey1, firstSubscription);
      const secondSubscription = this.client.subscribe(
        paginatedQuery.canonicalizedUdfPath,
        {
          ...paginatedQuery.args,
          paginationOpts: {
            ...paginationOpts,
            cursor: splitCursor,
            endCursor: continueCursor
          }
        }
      );
      paginatedQuery.pageKeyToQuery.set(splitKey2, secondSubscription);
      paginatedQuery.ongoingSplits.set(pageKey, [splitKey1, splitKey2]);
    }
    /**
     * @internal
     */
    addPageToPaginatedQuery(token, continueCursor, numItems) {
      const paginatedQuery = this.mustGetPaginatedQuery(token);
      const pageKey = paginatedQuery.nextPageKey++;
      const paginationOpts = {
        cursor: continueCursor,
        numItems,
        id: paginatedQuery.id
      };
      const pageArgs = {
        ...paginatedQuery.args,
        paginationOpts
      };
      const subscription = this.client.subscribe(
        paginatedQuery.canonicalizedUdfPath,
        pageArgs
      );
      paginatedQuery.pageKeys.push(pageKey);
      paginatedQuery.pageKeyToQuery.set(pageKey, subscription);
      return subscription;
    }
    removePaginatedQuerySubscriber(token) {
      const paginatedQuery = this.paginatedQuerySet.get(token);
      if (!paginatedQuery) {
        return;
      }
      paginatedQuery.numSubscribers -= 1;
      if (paginatedQuery.numSubscribers > 0) {
        return;
      }
      for (const subscription of paginatedQuery.pageKeyToQuery.values()) {
        subscription.unsubscribe();
      }
      this.paginatedQuerySet.delete(token);
    }
    completePaginatedQuerySplit(paginatedQuery, pageKey, splitKey1, splitKey2) {
      const originalQuery = paginatedQuery.pageKeyToQuery.get(pageKey);
      paginatedQuery.pageKeyToQuery.delete(pageKey);
      const pageIndex = paginatedQuery.pageKeys.indexOf(pageKey);
      paginatedQuery.pageKeys.splice(pageIndex, 1, splitKey1, splitKey2);
      paginatedQuery.ongoingSplits.delete(pageKey);
      originalQuery.unsubscribe();
    }
    /** The query tokens for all active pages, in result order */
    activePageQueryTokens(paginatedQuery) {
      return paginatedQuery.pageKeys.map(
        (pageKey) => paginatedQuery.pageKeyToQuery.get(pageKey).queryToken
      );
    }
    allQueryTokens(paginatedQuery) {
      return Array.from(paginatedQuery.pageKeyToQuery.values()).map(
        (sub) => sub.queryToken
      );
    }
    queryTokenForLastPageOfPaginatedQuery(token) {
      const paginatedQuery = this.mustGetPaginatedQuery(token);
      const lastPageKey = paginatedQuery.pageKeys[paginatedQuery.pageKeys.length - 1];
      if (lastPageKey === void 0) {
        throw new Error(`No pages for paginated query ${token}`);
      }
      return paginatedQuery.pageKeyToQuery.get(lastPageKey).queryToken;
    }
    mustGetPaginatedQuery(token) {
      const paginatedQuery = this.paginatedQuerySet.get(token);
      if (!paginatedQuery) {
        throw new Error("paginated query no longer exists for token " + token);
      }
      return paginatedQuery;
    }
  }
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  class ConvexClient {
    /**
     * Construct a client and immediately initiate a WebSocket connection to the passed address.
     *
     * @public
     */
    constructor(address, options = {}) {
      __publicField(this, "listeners");
      __publicField(this, "_client");
      __publicField(this, "_paginatedClient");
      __publicField(this, "callNewListenersWithCurrentValuesTimer");
      __publicField(this, "_closed");
      __publicField(this, "_disabled");
      if (options.skipConvexDeploymentUrlCheck !== true) {
        validateDeploymentUrl(address);
      }
      const { disabled, ...baseOptions } = options;
      this._closed = false;
      this._disabled = !!disabled;
      if (typeof window === "undefined" && !("unsavedChangesWarning" in baseOptions)) {
        baseOptions.unsavedChangesWarning = false;
      }
      if (!this.disabled) {
        this._client = new BaseConvexClient(
          address,
          () => {
          },
          // NOP, let the paginated query client do it all
          baseOptions
        );
        this._paginatedClient = new PaginatedQueryClient(
          this._client,
          (transition) => this._transition(transition)
        );
      }
      this.listeners = /* @__PURE__ */ new Set();
    }
    /**
     * Once closed no registered callbacks will fire again.
     */
    get closed() {
      return this._closed;
    }
    get client() {
      if (this._client) return this._client;
      throw new Error("ConvexClient is disabled");
    }
    /**
     * @internal
     */
    get paginatedClient() {
      if (this._paginatedClient) return this._paginatedClient;
      throw new Error("ConvexClient is disabled");
    }
    get disabled() {
      return this._disabled;
    }
    /**
     * Call a callback whenever a new result for a query is received. The callback
     * will run soon after being registered if a result for the query is already
     * in memory.
     *
     * The return value is an {@link Unsubscribe} object which is both a function
     * an an object with properties. Both of the patterns below work with this object:
     *
     *```ts
     * // call the return value as a function
     * const unsubscribe = client.onUpdate(api.messages.list, {}, (messages) => {
     *   console.log(messages);
     * });
     * unsubscribe();
     *
     * // unpack the return value into its properties
     * const {
     *   getCurrentValue,
     *   unsubscribe,
     * } = client.onUpdate(api.messages.list, {}, (messages) => {
     *   console.log(messages);
     * });
     *```
     *
     * @param query - A {@link server.FunctionReference} for the public query to run.
     * @param args - The arguments to run the query with.
     * @param callback - Function to call when the query result updates.
     * @param onError - Function to call when the query result updates with an error.
     * If not provided, errors will be thrown instead of calling the callback.
     *
     * @return an {@link Unsubscribe} function to stop calling the onUpdate function.
     */
    onUpdate(query, args, callback, onError) {
      if (this.disabled) {
        return this.createDisabledUnsubscribe();
      }
      const { queryToken, unsubscribe } = this.client.subscribe(
        getFunctionName(query),
        args
      );
      const queryInfo = {
        queryToken,
        callback,
        onError,
        unsubscribe,
        hasEverRun: false,
        query,
        args,
        paginationOptions: void 0
      };
      this.listeners.add(queryInfo);
      if (this.queryResultReady(queryToken) && this.callNewListenersWithCurrentValuesTimer === void 0) {
        this.callNewListenersWithCurrentValuesTimer = setTimeout(
          () => this.callNewListenersWithCurrentValues(),
          0
        );
      }
      const unsubscribeProps = {
        unsubscribe: () => {
          if (this.closed) {
            return;
          }
          this.listeners.delete(queryInfo);
          unsubscribe();
        },
        getCurrentValue: () => this.client.localQueryResultByToken(queryToken),
        getQueryLogs: () => this.client.localQueryLogs(queryToken)
      };
      const ret = unsubscribeProps.unsubscribe;
      Object.assign(ret, unsubscribeProps);
      return ret;
    }
    /**
     * Call a callback whenever a new result for a paginated query is received.
     *
     * This is an experimental preview: the final API may change.
     * In particular, caching behavior, page splitting, and required paginated query options
     * may change.
     *
     * @param query - A {@link server.FunctionReference} for the public query to run.
     * @param args - The arguments to run the query with.
     * @param options - Options for the paginated query including initialNumItems and id.
     * @param callback - Function to call when the query result updates.
     * @param onError - Function to call when the query result updates with an error.
     *
     * @return an {@link Unsubscribe} function to stop calling the callback.
     */
    onPaginatedUpdate_experimental(query, args, options, callback, onError) {
      if (this.disabled) {
        return this.createDisabledUnsubscribe();
      }
      const paginationOptions = {
        initialNumItems: options.initialNumItems,
        id: -1
      };
      const { paginatedQueryToken, unsubscribe } = this.paginatedClient.subscribe(
        getFunctionName(query),
        args,
        // Simple client doesn't use IDs, there's no expectation that these queries remain separate.
        paginationOptions
      );
      const queryInfo = {
        queryToken: paginatedQueryToken,
        callback,
        onError,
        unsubscribe,
        hasEverRun: false,
        query,
        args,
        paginationOptions
      };
      this.listeners.add(queryInfo);
      if (!!this.paginatedClient.localQueryResultByToken(paginatedQueryToken) && this.callNewListenersWithCurrentValuesTimer === void 0) {
        this.callNewListenersWithCurrentValuesTimer = setTimeout(
          () => this.callNewListenersWithCurrentValues(),
          0
        );
      }
      const unsubscribeProps = {
        unsubscribe: () => {
          if (this.closed) {
            return;
          }
          this.listeners.delete(queryInfo);
          unsubscribe();
        },
        getCurrentValue: () => {
          const result = this.paginatedClient.localQueryResult(
            getFunctionName(query),
            args,
            paginationOptions
          );
          return result;
        },
        getQueryLogs: () => []
        // Paginated queries don't aggregate their logs
      };
      const ret = unsubscribeProps.unsubscribe;
      Object.assign(ret, unsubscribeProps);
      return ret;
    }
    // Run all callbacks that have never been run before if they have a query
    // result available now.
    callNewListenersWithCurrentValues() {
      this.callNewListenersWithCurrentValuesTimer = void 0;
      this._transition({ queries: [], paginatedQueries: [] }, true);
    }
    queryResultReady(queryToken) {
      return this.client.hasLocalQueryResultByToken(queryToken);
    }
    createDisabledUnsubscribe() {
      const disabledUnsubscribe = (() => {
      });
      const unsubscribeProps = {
        unsubscribe: disabledUnsubscribe,
        getCurrentValue: () => void 0,
        getQueryLogs: () => void 0
      };
      Object.assign(disabledUnsubscribe, unsubscribeProps);
      return disabledUnsubscribe;
    }
    async close() {
      if (this.disabled) return;
      this.listeners.clear();
      this._closed = true;
      if (this._paginatedClient) {
        this._paginatedClient = void 0;
      }
      return this.client.close();
    }
    /**
     * Get the current JWT auth token and decoded claims.
     */
    getAuth() {
      if (this.disabled) return;
      return this.client.getCurrentAuthClaims();
    }
    /**
     * Set the authentication token to be used for subsequent queries and mutations.
     * `fetchToken` will be called automatically again if a token expires.
     * `fetchToken` should return `null` if the token cannot be retrieved, for example
     * when the user's rights were permanently revoked.
     * @param fetchToken - an async function returning the JWT (typically an OpenID Connect Identity Token)
     * @param onChange - a callback that will be called when the authentication status changes
     */
    setAuth(fetchToken, onChange) {
      if (this.disabled) return;
      this.client.setAuth(
        fetchToken,
        onChange ?? (() => {
        })
      );
    }
    /**
     * @internal
     */
    setAdminAuth(token, identity) {
      if (this.closed) {
        throw new Error("ConvexClient has already been closed.");
      }
      if (this.disabled) return;
      this.client.setAdminAuth(token, identity);
    }
    /**
     * @internal
     */
    _transition({
      queries,
      paginatedQueries
    }, callNewListeners = false) {
      const updatedQueries = [
        ...queries.map((q) => q.token),
        ...paginatedQueries.map((q) => q.token)
      ];
      for (const queryInfo of this.listeners) {
        const { callback, queryToken, onError, hasEverRun } = queryInfo;
        const isPaginatedQuery = serializedQueryTokenIsPaginated(queryToken);
        const hasResultReady = isPaginatedQuery ? !!this.paginatedClient.localQueryResultByToken(queryToken) : this.client.hasLocalQueryResultByToken(queryToken);
        if (updatedQueries.includes(queryToken) || callNewListeners && !hasEverRun && hasResultReady) {
          queryInfo.hasEverRun = true;
          let newValue;
          try {
            if (isPaginatedQuery) {
              newValue = this.paginatedClient.localQueryResultByToken(queryToken);
            } else {
              newValue = this.client.localQueryResultByToken(queryToken);
            }
          } catch (error2) {
            if (!(error2 instanceof Error)) throw error2;
            if (onError) {
              onError(
                error2,
                "Second argument to onUpdate onError is reserved for later use"
              );
            } else {
              void Promise.reject(error2);
            }
            continue;
          }
          callback(
            newValue,
            "Second argument to onUpdate callback is reserved for later use"
          );
        }
      }
    }
    /**
     * Execute a mutation function.
     *
     * @param mutation - A {@link server.FunctionReference} for the public mutation
     * to run.
     * @param args - An arguments object for the mutation.
     * @param options - A {@link MutationOptions} options object for the mutation.
     * @returns A promise of the mutation's result.
     */
    async mutation(mutation, args, options) {
      if (this.disabled) throw new Error("ConvexClient is disabled");
      return await this.client.mutation(getFunctionName(mutation), args, options);
    }
    /**
     * Execute an action function.
     *
     * @param action - A {@link server.FunctionReference} for the public action
     * to run.
     * @param args - An arguments object for the action.
     * @returns A promise of the action's result.
     */
    async action(action, args) {
      if (this.disabled) throw new Error("ConvexClient is disabled");
      return await this.client.action(getFunctionName(action), args);
    }
    /**
     * Fetch a query result once.
     *
     * @param query - A {@link server.FunctionReference} for the public query
     * to run.
     * @param args - An arguments object for the query.
     * @returns A promise of the query's result.
     */
    async query(query, args) {
      if (this.disabled) throw new Error("ConvexClient is disabled");
      const value = this.client.localQueryResult(getFunctionName(query), args);
      if (value !== void 0) return Promise.resolve(value);
      return new Promise((resolve, reject) => {
        const { unsubscribe } = this.onUpdate(
          query,
          args,
          (value2) => {
            unsubscribe();
            resolve(value2);
          },
          (e) => {
            unsubscribe();
            reject(e);
          }
        );
      });
    }
    /**
     * Get the current {@link ConnectionState} between the client and the Convex
     * backend.
     *
     * @returns The {@link ConnectionState} with the Convex backend.
     */
    connectionState() {
      if (this.disabled) throw new Error("ConvexClient is disabled");
      return this.client.connectionState();
    }
    /**
     * Subscribe to the {@link ConnectionState} between the client and the Convex
     * backend, calling a callback each time it changes.
     *
     * Subscribed callbacks will be called when any part of ConnectionState changes.
     * ConnectionState may grow in future versions (e.g. to provide a array of
     * inflight requests) in which case callbacks would be called more frequently.
     *
     * @returns An unsubscribe function to stop listening.
     */
    subscribeToConnectionState(cb) {
      if (this.disabled) return () => {
      };
      return this.client.subscribeToConnectionState(cb);
    }
  }
  var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
  function getDefaultExportFromCjs(x) {
    return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
  }
  var lodash_throttle;
  var hasRequiredLodash_throttle;
  function requireLodash_throttle() {
    if (hasRequiredLodash_throttle) return lodash_throttle;
    hasRequiredLodash_throttle = 1;
    var FUNC_ERROR_TEXT = "Expected a function";
    var NAN = 0 / 0;
    var symbolTag = "[object Symbol]";
    var reTrim = /^\s+|\s+$/g;
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
    var reIsBinary = /^0b[01]+$/i;
    var reIsOctal = /^0o[0-7]+$/i;
    var freeParseInt = parseInt;
    var freeGlobal = typeof commonjsGlobal == "object" && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root2 = freeGlobal || freeSelf || Function("return this")();
    var objectProto = Object.prototype;
    var objectToString2 = objectProto.toString;
    var nativeMax = Math.max, nativeMin = Math.min;
    var now = function() {
      return root2.Date.now();
    };
    function debounce(func, wait, options) {
      var lastArgs, lastThis, maxWait, result, timerId, lastCallTime, lastInvokeTime = 0, leading = false, maxing = false, trailing = true;
      if (typeof func != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      wait = toNumber(wait) || 0;
      if (isObject(options)) {
        leading = !!options.leading;
        maxing = "maxWait" in options;
        maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
        trailing = "trailing" in options ? !!options.trailing : trailing;
      }
      function invokeFunc(time) {
        var args = lastArgs, thisArg = lastThis;
        lastArgs = lastThis = void 0;
        lastInvokeTime = time;
        result = func.apply(thisArg, args);
        return result;
      }
      function leadingEdge(time) {
        lastInvokeTime = time;
        timerId = setTimeout(timerExpired, wait);
        return leading ? invokeFunc(time) : result;
      }
      function remainingWait(time) {
        var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime, result2 = wait - timeSinceLastCall;
        return maxing ? nativeMin(result2, maxWait - timeSinceLastInvoke) : result2;
      }
      function shouldInvoke(time) {
        var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime;
        return lastCallTime === void 0 || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
      }
      function timerExpired() {
        var time = now();
        if (shouldInvoke(time)) {
          return trailingEdge(time);
        }
        timerId = setTimeout(timerExpired, remainingWait(time));
      }
      function trailingEdge(time) {
        timerId = void 0;
        if (trailing && lastArgs) {
          return invokeFunc(time);
        }
        lastArgs = lastThis = void 0;
        return result;
      }
      function cancel() {
        if (timerId !== void 0) {
          clearTimeout(timerId);
        }
        lastInvokeTime = 0;
        lastArgs = lastCallTime = lastThis = timerId = void 0;
      }
      function flush() {
        return timerId === void 0 ? result : trailingEdge(now());
      }
      function debounced() {
        var time = now(), isInvoking = shouldInvoke(time);
        lastArgs = arguments;
        lastThis = this;
        lastCallTime = time;
        if (isInvoking) {
          if (timerId === void 0) {
            return leadingEdge(lastCallTime);
          }
          if (maxing) {
            timerId = setTimeout(timerExpired, wait);
            return invokeFunc(lastCallTime);
          }
        }
        if (timerId === void 0) {
          timerId = setTimeout(timerExpired, wait);
        }
        return result;
      }
      debounced.cancel = cancel;
      debounced.flush = flush;
      return debounced;
    }
    function throttle(func, wait, options) {
      var leading = true, trailing = true;
      if (typeof func != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      if (isObject(options)) {
        leading = "leading" in options ? !!options.leading : leading;
        trailing = "trailing" in options ? !!options.trailing : trailing;
      }
      return debounce(func, wait, {
        "leading": leading,
        "maxWait": wait,
        "trailing": trailing
      });
    }
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString2.call(value) == symbolTag;
    }
    function toNumber(value) {
      if (typeof value == "number") {
        return value;
      }
      if (isSymbol(value)) {
        return NAN;
      }
      if (isObject(value)) {
        var other = typeof value.valueOf == "function" ? value.valueOf() : value;
        value = isObject(other) ? other + "" : other;
      }
      if (typeof value != "string") {
        return value === 0 ? value : +value;
      }
      value = value.replace(reTrim, "");
      var isBinary = reIsBinary.test(value);
      return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
    }
    lodash_throttle = throttle;
    return lodash_throttle;
  }
  var lodash_throttleExports = requireLodash_throttle();
  const throttle2 = /* @__PURE__ */ getDefaultExportFromCjs(lodash_throttleExports);
  var LobbyKickedReason = {
    KICKED: "KICKED",
    ERROR: "ERROR"
  };
  var LobbyUserChangeType = {
    JOINED: "JOINED",
    LEFT: "LEFT"
  };
  var P2PPacketDropReason = {
    QUEUE_FULL: "QUEUE_FULL",
    PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
    INVALID_PAYLOAD_SIZE: "INVALID_PAYLOAD_SIZE",
    INVALID_CHANNEL: "INVALID_CHANNEL",
    MALFORMED: "MALFORMED",
    PEER_NOT_READY: "PEER_NOT_READY"
  };
  var AvatarSize = {
    SMALL: 64,
    // Lists, chat bubbles
    MEDIUM: 128,
    // Profile cards
    LARGE: 256
    // Large displays
  };
  var WavedashEvents = {
    // Lobby events
    LOBBY_MESSAGE: "LobbyMessage",
    LOBBY_JOINED: "LobbyJoined",
    // player successfully joined a lobby
    LOBBY_KICKED: "LobbyKicked",
    // player was removed from lobby (kicked by host or disconnected)
    LOBBY_USERS_UPDATED: "LobbyUsersUpdated",
    LOBBY_DATA_UPDATED: "LobbyDataUpdated",
    LOBBY_INVITE: "LobbyInvite",
    // received an invite to join a lobby
    // P2P events
    P2P_CONNECTION_ESTABLISHED: "P2PConnectionEstablished",
    // connection to peer is ready
    P2P_CONNECTION_FAILED: "P2PConnectionFailed",
    // connection to peer failed
    P2P_PEER_DISCONNECTED: "P2PPeerDisconnected",
    // peer disconnected
    P2P_PEER_RECONNECTING: "P2PPeerReconnecting",
    // peer is reconnecting
    P2P_PEER_RECONNECTED: "P2PPeerReconnected",
    // peer reconnected
    P2P_PACKET_DROPPED: "P2PPacketDropped",
    // packet dropped
    // Stats & Achievements events
    STATS_STORED: "StatsStored",
    // stats/achievements persisted to server
    // Backend connection events
    BACKEND_CONNECTED: "BackendConnected",
    // connected to Convex backend
    BACKEND_DISCONNECTED: "BackendDisconnected",
    // disconnected from Convex backend
    BACKEND_RECONNECTING: "BackendReconnecting",
    // attempting to reconnect to backend
    // Fullscreen events
    FULLSCREEN_CHANGED: "FullscreenChanged",
    // fullscreen state changed
    // Paid content events
    /** @deprecated Use PURCHASE_COMPLETED, which also covers consumables. */
    ENTITLEMENTS_GRANTED: "EntitlementsGranted",
    // player was granted paid content (in-game paywall, game page, gift, another tab)
    PURCHASE_COMPLETED: "PurchaseCompleted"
    // player bought paid content (in-game paywall, game page, gift, another tab), or a consumable is still unfulfilled at launch; fulfill consumables
    // TODO: Future events to implement
    // P2P_CONNECTION_REQUESTED: 'P2PConnectionRequested', // for now we always connect all lobby members
  };
  var WavedashManager = class {
    constructor(sdk) {
      this.sdk = sdk;
    }
    destroy() {
    }
  };
  var AudioManager = class extends WavedashManager {
    constructor(sdk, initialVolume = 1) {
      super(sdk);
      this.frames = /* @__PURE__ */ new Set();
      this.iframeBindings = /* @__PURE__ */ new WeakMap();
      this.iframeLoadHandlers = /* @__PURE__ */ new Map();
      this.boundIframes = /* @__PURE__ */ new Set();
      this.handleVolume = (data) => {
        if (!Number.isFinite(data.volume) || data.volume < 0 || data.volume > 1)
          return;
        if (this._volume === data.volume) return;
        this._volume = data.volume;
        const isMuted = this.isMuted();
        this.frames.forEach((shim) => shim.applyMute(isMuted));
      };
      if (!Number.isFinite(initialVolume) || initialVolume < 0 || initialVolume > 1) {
        throw new RangeError(
          "SDKConfig.initialVolume: expected a number from 0 to 1"
        );
      }
      this._volume = initialVolume;
      if (typeof window !== "undefined") {
        this.attachWindow(window);
      }
      this.sdk.iframeMessenger.addEventListener(
        IFRAME_MESSAGE_TYPE.VOLUME_CHANGED,
        this.handleVolume
      );
    }
    isMuted() {
      return this._volume === 0;
    }
    getVolume() {
      return this._volume;
    }
    /** Shim a window we can reach. Same-origin only (cross-origin access throws). */
    attachWindow(win) {
      try {
        void win.document;
      } catch {
        return;
      }
      const shim = new AudioFrameShim(this, win);
      this.frames.add(shim);
    }
    /**
     * Start tracking an iframe: attach now (already-loaded frames) and on every
     * `load` (about:blank → game, and later src swaps). Idempotent.
     */
    bindIframe(iframe) {
      if (!this.boundIframes.has(iframe)) {
        this.boundIframes.add(iframe);
        const onLoad = () => this.attachIframe(iframe);
        this.iframeLoadHandlers.set(iframe, onLoad);
        iframe.addEventListener("load", onLoad);
      }
      this.attachIframe(iframe);
    }
    /** Stop tracking an iframe and tear down its frame (iframe removed from DOM). */
    unbindIframe(iframe) {
      const handler = this.iframeLoadHandlers.get(iframe);
      if (handler) {
        iframe.removeEventListener("load", handler);
        this.iframeLoadHandlers.delete(iframe);
      }
      this.boundIframes.delete(iframe);
      this.teardownFrame(iframe);
    }
    /**
     * Install (or re-install) a shim for an iframe's current document. No-ops
     * while not yet navigated or already shimmed; replaces the previous shim when
     * the iframe navigates to a fresh document, and drops it when it goes
     * cross-origin (we can no longer reach it).
     */
    attachIframe(iframe) {
      let win = null;
      let doc = null;
      try {
        const cw = iframe.contentWindow;
        if (cw) {
          doc = cw.document;
          win = cw;
        }
      } catch {
      }
      if (!win || !doc) {
        this.teardownFrame(iframe);
        return;
      }
      const existing = this.iframeBindings.get(iframe);
      if (existing) {
        if (existing.doc === doc) return;
        this.teardownFrame(iframe);
      }
      const shim = new AudioFrameShim(this, win);
      this.frames.add(shim);
      this.iframeBindings.set(iframe, { doc, shim });
      shim.applyMute(this.isMuted());
    }
    /** Remove and uninstall the shim bound to an iframe's (previous) document. */
    teardownFrame(iframe) {
      const binding = this.iframeBindings.get(iframe);
      if (!binding) return;
      this.frames.delete(binding.shim);
      binding.shim.uninstall();
      this.iframeBindings.delete(iframe);
    }
    destroy() {
      this.sdk.iframeMessenger.removeEventListener(
        IFRAME_MESSAGE_TYPE.VOLUME_CHANGED,
        this.handleVolume
      );
      this.boundIframes.forEach((iframe) => {
        const handler = this.iframeLoadHandlers.get(iframe);
        if (handler) iframe.removeEventListener("load", handler);
      });
      this.boundIframes.clear();
      this.iframeLoadHandlers.clear();
      this.frames.forEach((shim) => shim.uninstall());
      this.frames.clear();
      super.destroy();
    }
  };
  var AudioFrameShim = class {
    constructor(manager, win) {
      this.contexts = new WeakRefSet();
      this.contextGains = /* @__PURE__ */ new WeakMap();
      this.elements = new WeakRefSet();
      this.intendedMuted = /* @__PURE__ */ new WeakMap();
      this.intendedVolume = /* @__PURE__ */ new WeakMap();
      this.webAudioElements = /* @__PURE__ */ new WeakSet();
      this.originalVolumeDescriptor = null;
      this.intendedUtteranceVolume = /* @__PURE__ */ new WeakMap();
      this.boundChildren = /* @__PURE__ */ new Set();
      this.originalAudioContext = null;
      this.originalWebKitAudioContext = null;
      this.originalAudio = null;
      this.originalMutedDescriptor = null;
      this.originalPlay = null;
      this.originalSpeak = null;
      this.originalUtteranceVolumeDescriptor = null;
      this.mutationObserver = null;
      this.pageHideHandler = null;
      this.manager = manager;
      this.win = win;
      this.doc = win.document ?? null;
      this.installShims();
    }
    /** Apply the effective master volume and mute state to tracked audio. */
    applyMute(isMuted) {
      const target = this.manager.getVolume();
      this.contexts.forEach((ctx) => {
        const gain = this.contextGains.get(ctx);
        if (!gain) return;
        const now = ctx.currentTime;
        const param = gain.gain;
        if (typeof param.cancelAndHoldAtTime === "function") {
          param.cancelAndHoldAtTime(now);
        } else {
          const current = param.value;
          param.cancelScheduledValues(now);
          param.setValueAtTime(current, now);
        }
        param.linearRampToValueAtTime(target, now + 0.05);
      });
      const setMutedNative = this.originalMutedDescriptor?.set;
      if (setMutedNative) {
        this.elements.forEach((el) => {
          const intended = this.intendedMuted.get(el) ?? false;
          setMutedNative.call(el, isMuted ? true : intended);
          this.originalVolumeDescriptor?.set?.call(
            el,
            this.intendedVolume.get(el) * (this.webAudioElements.has(el) ? 1 : target)
          );
        });
      }
    }
    /** Hand a discovered child iframe to the manager, remembering it for teardown. */
    bindChild(iframe) {
      this.boundChildren.add(iframe);
      this.manager.bindIframe(iframe);
    }
    /** Stop tracking a child iframe that was removed from this document. */
    unbindChild(iframe) {
      this.boundChildren.delete(iframe);
      this.manager.unbindIframe(iframe);
    }
    /** Track a media element and silence it if currently muted. Idempotent. */
    trackElement(el) {
      if (this.intendedVolume.has(el)) return;
      const volume = this.originalVolumeDescriptor?.get?.call(el) ?? el.volume;
      this.intendedVolume.set(el, volume);
      this.originalVolumeDescriptor?.set?.call(
        el,
        volume * (this.webAudioElements.has(el) ? 1 : this.manager.getVolume())
      );
      const getMuted = this.originalMutedDescriptor?.get;
      const setMuted = this.originalMutedDescriptor?.set;
      const current = this.intendedMuted.get(el) ?? (getMuted ? getMuted.call(el) : el.muted);
      this.intendedMuted.set(el, current);
      this.elements.add(el);
      if (this.manager.isMuted() && !current && setMuted) {
        setMuted.call(el, true);
      }
    }
    installShims() {
      const win = this.win;
      const doc = this.doc;
      if (win.AudioContext) {
        this.originalAudioContext = win.AudioContext;
        win.AudioContext = this.shimAudioContextClass(win.AudioContext);
      }
      const w = win;
      if (w.webkitAudioContext) {
        this.originalWebKitAudioContext = w.webkitAudioContext;
        w.webkitAudioContext = this.shimAudioContextClass(w.webkitAudioContext);
      }
      if (win.Audio) {
        const OriginalAudio = win.Audio;
        this.originalAudio = OriginalAudio;
        ((shim) => {
          const Shimmed = function(src) {
            const audio = new OriginalAudio(src);
            shim.trackElement(audio);
            return audio;
          };
          Shimmed.prototype = OriginalAudio.prototype;
          win.Audio = Shimmed;
        })(this);
      }
      this.originalVolumeDescriptor = Object.getOwnPropertyDescriptor(
        win.HTMLMediaElement.prototype,
        "volume"
      ) ?? null;
      const volumeDescriptor = this.originalVolumeDescriptor;
      if (volumeDescriptor?.get && volumeDescriptor?.set) {
        ((shim) => {
          Object.defineProperty(win.HTMLMediaElement.prototype, "volume", {
            configurable: true,
            get() {
              return shim.intendedVolume.get(this) ?? volumeDescriptor.get.call(this);
            },
            set(value) {
              volumeDescriptor.set.call(this, value);
              const intended = Number(value);
              shim.trackElement(this);
              shim.intendedVolume.set(this, intended);
              volumeDescriptor.set.call(
                this,
                intended * (shim.webAudioElements.has(this) ? 1 : shim.manager.getVolume())
              );
            }
          });
        })(this);
      }
      if (doc) {
        const HTMLMediaElementCtor = win.HTMLMediaElement;
        const HTMLIFrameElementCtor = win.HTMLIFrameElement;
        const HTMLElementCtor = win.HTMLElement;
        doc.querySelectorAll("audio, video").forEach((el) => {
          this.trackElement(el);
        });
        doc.querySelectorAll("iframe").forEach((el) => {
          this.bindChild(el);
        });
        this.mutationObserver = new win.MutationObserver((mutations) => {
          for (const m of mutations) {
            m.addedNodes.forEach((node) => {
              if (node instanceof HTMLMediaElementCtor) {
                this.trackElement(node);
              } else if (node instanceof HTMLIFrameElementCtor) {
                this.bindChild(node);
              } else if (node instanceof HTMLElementCtor) {
                const el = node;
                if (!el.firstElementChild) return;
                el.querySelectorAll("audio, video, iframe").forEach((child2) => {
                  if (child2 instanceof HTMLIFrameElementCtor) {
                    this.bindChild(child2);
                  } else {
                    this.trackElement(child2);
                  }
                });
              }
            });
            m.removedNodes.forEach((node) => {
              if (node instanceof HTMLIFrameElementCtor) {
                this.unbindChild(node);
              } else if (node instanceof HTMLElementCtor) {
                const el = node;
                if (!el.firstElementChild) return;
                el.querySelectorAll("iframe").forEach((f) => {
                  this.unbindChild(f);
                });
              }
            });
          }
        });
        this.mutationObserver.observe(doc.documentElement, {
          childList: true,
          subtree: true
        });
      }
      this.originalMutedDescriptor = Object.getOwnPropertyDescriptor(
        win.HTMLMediaElement.prototype,
        "muted"
      ) ?? null;
      const original = this.originalMutedDescriptor;
      if (original?.get && original?.set) {
        ((shim) => {
          Object.defineProperty(win.HTMLMediaElement.prototype, "muted", {
            configurable: true,
            get() {
              const intended = shim.intendedMuted.get(this);
              return intended !== void 0 ? intended : original.get.call(this);
            },
            set(value) {
              shim.trackElement(this);
              shim.intendedMuted.set(this, value);
              original.set.call(this, shim.manager.isMuted() ? true : value);
            }
          });
        })(this);
      }
      const originalPlay = win.HTMLMediaElement.prototype.play;
      this.originalPlay = originalPlay;
      ((shim) => {
        win.HTMLMediaElement.prototype.play = function() {
          shim.trackElement(this);
          return originalPlay.call(this);
        };
      })(this);
      this.shimSpeechSynthesis();
    }
    /**
     * Shim `speechSynthesis`. We never swallow `speak()` (games sequence off its
     * lifecycle) — instead we sample volume at call time and force it to 0 while
     * muted. Speech already in flight at the mute edge is left to finish.
     */
    shimSpeechSynthesis() {
      const win = this.win;
      if (!win.speechSynthesis) return;
      this.pageHideHandler = () => win.speechSynthesis.cancel();
      win.addEventListener("pagehide", this.pageHideHandler);
      if (typeof win.SpeechSynthesisUtterance === "undefined") return;
      this.originalUtteranceVolumeDescriptor = Object.getOwnPropertyDescriptor(
        win.SpeechSynthesisUtterance.prototype,
        "volume"
      ) ?? null;
      const volDesc = this.originalUtteranceVolumeDescriptor;
      if (volDesc?.get && volDesc?.set) {
        ((shim) => {
          Object.defineProperty(
            win.SpeechSynthesisUtterance.prototype,
            "volume",
            {
              configurable: true,
              get() {
                const intended = shim.intendedUtteranceVolume.get(this);
                return intended !== void 0 ? intended : volDesc.get.call(this);
              },
              set(value) {
                shim.intendedUtteranceVolume.set(this, value);
                volDesc.set.call(this, value);
              }
            }
          );
        })(this);
      }
      const speechSynthesis = win.speechSynthesis;
      const originalSpeak = speechSynthesis.speak;
      this.originalSpeak = originalSpeak;
      ((shim) => {
        speechSynthesis.speak = function(utterance) {
          const intended = shim.intendedUtteranceVolume.get(utterance) ?? (volDesc?.get ? volDesc.get.call(utterance) : utterance.volume);
          shim.intendedUtteranceVolume.set(utterance, intended);
          const volume = intended * shim.manager.getVolume();
          if (volDesc?.set) volDesc.set.call(utterance, volume);
          else utterance.volume = volume;
          return originalSpeak.call(speechSynthesis, utterance);
        };
      })(this);
    }
    shimAudioContextClass(Original) {
      return /* @__PURE__ */ ((shim) => class extends Original {
        createMediaElementSource(element) {
          const source2 = super.createMediaElementSource(element);
          shim.trackElement(element);
          shim.webAudioElements.add(element);
          shim.originalVolumeDescriptor?.set?.call(
            element,
            shim.intendedVolume.get(element)
          );
          return source2;
        }
        constructor(opts) {
          super(opts);
          const realDestination = this.destination;
          const masterGain = this.createGain();
          masterGain.connect(realDestination);
          masterGain.gain.value = shim.manager.getVolume();
          Object.defineProperty(masterGain, "maxChannelCount", {
            configurable: true,
            get: () => realDestination.maxChannelCount
          });
          for (const prop of [
            "channelCount",
            "channelCountMode",
            "channelInterpretation"
          ]) {
            const nativeSet = Object.getOwnPropertyDescriptor(
              shim.win.AudioNode.prototype,
              prop
            )?.set;
            Object.defineProperty(masterGain, prop, {
              configurable: true,
              get: () => realDestination[prop],
              set: (value) => {
                realDestination[prop] = value;
                try {
                  nativeSet?.call(masterGain, value);
                } catch {
                }
              }
            });
          }
          Object.defineProperty(this, "destination", {
            configurable: true,
            get() {
              return masterGain;
            }
          });
          shim.contexts.add(this);
          shim.contextGains.set(this, masterGain);
        }
        close() {
          shim.contextGains.delete(this);
          return super.close();
        }
      })(this);
    }
    /**
     * Restore the globals we patched. Best-effort per statement: a frame reached
     * through an iframe may have navigated away (globals gone) before teardown.
     */
    uninstall() {
      const win = this.win;
      try {
        if (this.mutationObserver) {
          this.mutationObserver.disconnect();
          this.mutationObserver = null;
        }
      } catch {
      }
      this.boundChildren.forEach((child2) => this.manager.unbindIframe(child2));
      this.boundChildren.clear();
      let sameRealm = false;
      try {
        sameRealm = win.document === this.doc;
      } catch {
      }
      if (!sameRealm) {
        this.clearTracking();
        return;
      }
      const restore = (fn) => {
        try {
          fn();
        } catch {
        }
      };
      restore(() => {
        if (this.originalAudioContext)
          win.AudioContext = this.originalAudioContext;
      });
      restore(() => {
        const w = win;
        if (this.originalWebKitAudioContext && w.webkitAudioContext) {
          w.webkitAudioContext = this.originalWebKitAudioContext;
        }
      });
      restore(() => {
        if (this.originalAudio) win.Audio = this.originalAudio;
      });
      restore(() => {
        if (this.originalSpeak && win.speechSynthesis) {
          win.speechSynthesis.speak = this.originalSpeak;
        }
      });
      restore(() => {
        if (this.pageHideHandler) {
          win.removeEventListener("pagehide", this.pageHideHandler);
          this.pageHideHandler = null;
        }
      });
      restore(() => {
        win.speechSynthesis?.cancel();
      });
      restore(() => {
        if (this.originalUtteranceVolumeDescriptor && typeof win.SpeechSynthesisUtterance !== "undefined") {
          Object.defineProperty(
            win.SpeechSynthesisUtterance.prototype,
            "volume",
            this.originalUtteranceVolumeDescriptor
          );
        }
      });
      restore(() => {
        if (this.originalPlay) {
          win.HTMLMediaElement.prototype.play = this.originalPlay;
        }
      });
      restore(() => {
        if (this.originalVolumeDescriptor) {
          this.elements.forEach((el) => {
            this.originalVolumeDescriptor.set?.call(
              el,
              this.intendedVolume.get(el)
            );
          });
          Object.defineProperty(
            win.HTMLMediaElement.prototype,
            "volume",
            this.originalVolumeDescriptor
          );
        }
      });
      restore(() => {
        if (this.originalMutedDescriptor) {
          Object.defineProperty(
            win.HTMLMediaElement.prototype,
            "muted",
            this.originalMutedDescriptor
          );
        }
      });
      this.clearTracking();
    }
    clearTracking() {
      this.contexts.clear();
      this.contextGains = /* @__PURE__ */ new WeakMap();
      this.elements.clear();
      this.intendedMuted = /* @__PURE__ */ new WeakMap();
      this.intendedVolume = /* @__PURE__ */ new WeakMap();
      this.webAudioElements = /* @__PURE__ */ new WeakSet();
      this.intendedUtteranceVolume = /* @__PURE__ */ new WeakMap();
    }
  };
  var WeakRefSet = class {
    constructor() {
      this.set = /* @__PURE__ */ new Set();
    }
    add(value) {
      for (const ref of this.set) {
        if (ref.deref() === value) return;
      }
      this.set.add(new WeakRef(value));
    }
    forEach(callback) {
      for (const ref of this.set) {
        const v = ref.deref();
        if (v === void 0) this.set.delete(ref);
        else callback(v);
      }
    }
    clear() {
      this.set.clear();
    }
  };
  var LOG_LEVEL = {
    DEBUG: 0,
    // Most verbose
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };
  var WavedashLogger = class {
    constructor(logLevel = LOG_LEVEL.WARN) {
      this.logLevel = logLevel;
    }
    setLogLevel(level) {
      this.logLevel = level;
    }
    debug(message, ...args) {
      if (this.logLevel <= LOG_LEVEL.DEBUG) {
        console.log(`[WavedashJS] ${message}`, ...args);
      }
    }
    info(message, ...args) {
      if (this.logLevel <= LOG_LEVEL.INFO) {
        console.log(`[WavedashJS] ${message}`, ...args);
      }
    }
    warn(message, ...args) {
      if (this.logLevel <= LOG_LEVEL.WARN) {
        console.warn(`[WavedashJS] ${message}`, ...args);
      }
    }
    error(message, ...args) {
      if (this.logLevel <= LOG_LEVEL.ERROR) {
        console.error(`[WavedashJS] ${message}`, ...args);
      }
    }
    // Always logs to console
    log(message, ...args) {
      console.log(`[WavedashJS] ${message}`, ...args);
    }
  };
  var logger = new WavedashLogger();
  function decodeJwtPayload(jwt) {
    try {
      const [, payloadB64] = jwt.split(".");
      if (!payloadB64) return null;
      const b64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
      const padded = b64 + "===".slice((b64.length + 3) % 4);
      const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
      const json = new TextDecoder().decode(bytes);
      return JSON.parse(json);
    } catch (err) {
      logger.warn("Failed to decode JWT payload", err);
      return null;
    }
  }
  function readJwtClaim(jwt, claim) {
    return decodeJwtPayload(jwt)?.[claim];
  }
  var RETRY_BASE_MS = 1e3;
  var RETRY_MAX_MS = 3e4;
  var AuthManager = class extends WavedashManager {
    constructor(sdk) {
      super(sdk);
      this.jwt = null;
      this.resolveFirstAuthenticatedAt = null;
      this.jwtPromise = null;
      this.retryTimeout = null;
      this.retryAttempt = 0;
      this.destroyed = false;
      this.firstAuthenticatedAt = new Promise((resolve) => {
        this.resolveFirstAuthenticatedAt = resolve;
      });
      this.setupConvexAuth();
    }
    /**
     * Cached gameplay JWT, awaiting any in-flight fetch. Concurrent callers share
     * one fetch; a forced refresh serializes behind it (it may predate the event
     * that required it, e.g. a purchase) and becomes the current promise. Only
     * the current promise notifies the parent, so a superseded refresh can't
     * broadcast a stale token
     */
    getToken(forceRefresh = false) {
      if (!forceRefresh && this.jwt) return Promise.resolve(this.jwt);
      if (!forceRefresh && this.jwtPromise) return this.jwtPromise;
      const previous = this.jwtPromise;
      const fetchToken = async () => {
        if (previous) await previous.catch(() => {
        });
        const response = await fetch(
          `/auth/refresh${forceRefresh ? "?fresh=1" : ""}`,
          {
            method: "POST",
            credentials: "same-origin"
          }
        );
        if (!response.ok) {
          throw new Error(`Failed to refresh gameplay token: ${response.status}`);
        }
        return response.text();
      };
      const promise = fetchToken().then((token) => {
        this.jwt = token;
        if (this.resolveFirstAuthenticatedAt) {
          this.resolveFirstAuthenticatedAt(
            (readJwtClaim(token, "iat") ?? 0) * 1e3
          );
          this.resolveFirstAuthenticatedAt = null;
        }
        this.retryAttempt = 0;
        if (this.jwtPromise === promise) {
          this.sdk.iframeMessenger.postToParent(
            IFRAME_MESSAGE_TYPE.GAMEPLAY_JWT_READY,
            { gameplayJwt: token }
          );
        }
        return token;
      }).finally(() => {
        if (this.jwtPromise === promise) this.jwtPromise = null;
      });
      this.jwtPromise = promise;
      return promise;
    }
    setupConvexAuth() {
      this.sdk.convexClient.setAuth(
        ({ forceRefreshToken }) => this.getToken(forceRefreshToken).then((token) => {
          this.clearRetry();
          return token;
        }).catch((error2) => {
          logger.error("Failed to fetch gameplay token for Convex", error2);
          this.scheduleRetry();
          return this.jwt;
        }),
        // Safety net for failures Convex detects itself (e.g. server rejects token)
        (isAuthenticated) => {
          if (!isAuthenticated) this.scheduleRetry();
        }
      );
    }
    /** Exponential backoff; the counter resets only on a successful fetch */
    scheduleRetry() {
      if (this.destroyed || this.retryTimeout) return;
      const delayMs = Math.min(
        RETRY_MAX_MS,
        RETRY_BASE_MS * 2 ** Math.min(this.retryAttempt, 10)
      );
      this.retryAttempt++;
      logger.warn(
        `Gameplay token refresh failed, retrying in ${delayMs}ms (attempt ${this.retryAttempt})`
      );
      this.retryTimeout = setTimeout(async () => {
        this.retryTimeout = null;
        if (this.destroyed) return;
        try {
          await this.getToken(true);
        } catch {
          this.scheduleRetry();
          return;
        }
        if (!this.destroyed) this.setupConvexAuth();
      }, delayMs);
    }
    clearRetry() {
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
    }
    destroy() {
      this.destroyed = true;
      this.clearRetry();
    }
  };
  var _parentOrigin = "";
  function setParentOrigin(origin) {
    _parentOrigin = origin;
  }
  function getParentOrigin() {
    return _parentOrigin;
  }
  function hasParentFrame() {
    return _parentOrigin !== "";
  }
  var ExternalLinkManager = class extends WavedashManager {
    constructor(sdk) {
      super(sdk);
      this.nativeOpen = null;
      this.patchedOpen = null;
      this.clickHandler = null;
      if (!hasParentFrame()) return;
      this.installCompatShims();
    }
    /**
     * Copy `url` to the player's clipboard and have the host show an in-game
     * toast. Resolves `false` if the clipboard write failed.
     * Must run inside a user gesture handler.
     *
     * The write happens here rather than in the host because
     * `navigator.clipboard` only honours user activation raised in the calling
     * frame — activation propagated up from this iframe doesn't count out there.
     * The iframe is granted `clipboard-write` for exactly this.
     */
    async copyLink(url) {
      const resolved = this.resolveHttpUrl(url);
      if (!resolved) {
        logger.warn(`copyLink("${url}") ignored — not an http(s) URL`);
        return false;
      }
      const attributed = this.withAttribution(resolved);
      try {
        await navigator.clipboard.writeText(attributed);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn(`copyLink("${attributed}") failed to write the clipboard: ${message}`);
        return false;
      }
      this.sdk.iframeMessenger.postToParent(IFRAME_MESSAGE_TYPE.LINK_COPIED, {
        url: attributed
      });
      return true;
    }
    installCompatShims() {
      if (typeof window === "undefined") return;
      const nativeOpen = window.open.bind(window);
      this.nativeOpen = nativeOpen;
      this.patchedOpen = (url, target, features) => {
        const resolved = this.resolveHttpUrl(url);
        const navigatesInPlace = typeof target === "string" && ["_self", "_parent", "_top"].includes(target.toLowerCase());
        if (!resolved || navigatesInPlace) return nativeOpen(url, target, features);
        void this.copyLink(resolved);
        return null;
      };
      window.open = this.patchedOpen;
      this.clickHandler = (event) => {
        if (event.defaultPrevented) return;
        const origin = event.composedPath?.()[0] ?? event.target;
        const anchor = origin?.closest?.("a[href]");
        if (!(anchor instanceof HTMLAnchorElement)) return;
        const target = (anchor.target || document.querySelector("base[target]")?.getAttribute("target") || "").toLowerCase();
        if (target !== "_blank") return;
        const resolved = this.resolveHttpUrl(anchor.href);
        if (!resolved) return;
        event.preventDefault();
        void this.copyLink(resolved);
      };
      document.addEventListener("click", this.clickHandler);
    }
    destroy() {
      if (this.nativeOpen && window.open === this.patchedOpen) {
        window.open = this.nativeOpen;
      }
      if (this.clickHandler) {
        document.removeEventListener("click", this.clickHandler);
      }
      this.nativeOpen = null;
      this.patchedOpen = null;
      this.clickHandler = null;
      super.destroy();
    }
    /**
     * Standard campaign parameters (Urchin/GA). `referral` is the medium for
     * traffic handed off from another product, as opposed to `cpc` or `email`.
     * Source and medium are overwritten: this platform is who sent the visit.
     * Campaign, term, and content describe the game's own link, so they stay.
     */
    withAttribution(href) {
      const url = new URL(href);
      url.searchParams.set("utm_source", "wavedash");
      url.searchParams.set("utm_medium", "referral");
      return url.href;
    }
    resolveHttpUrl(url) {
      if (!url) return null;
      try {
        const resolved = new URL(String(url), window.location.href);
        if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
          return null;
        }
        return resolved.href;
      } catch {
        return null;
      }
    }
  };
  var LOCAL_STORAGE_DB_NAME = "/userfs";
  var LOCAL_STORAGE_STORE_NAME = "FILE_DATA";
  async function writeToIndexedDB(key, data) {
    return new Promise((resolve, reject) => {
      const openReq = indexedDB.open(LOCAL_STORAGE_DB_NAME);
      openReq.onerror = () => reject(openReq.error);
      openReq.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(LOCAL_STORAGE_STORE_NAME)) {
          db.createObjectStore(LOCAL_STORAGE_STORE_NAME);
        }
      };
      openReq.onsuccess = () => {
        const db = openReq.result;
        const tx = db.transaction(LOCAL_STORAGE_STORE_NAME, "readwrite");
        const store = tx.objectStore(LOCAL_STORAGE_STORE_NAME);
        const value = {
          contents: data,
          timestamp: Date.now(),
          mode: 33206
          // Standard file permissions (rw-rw-rw-)
        };
        const putReq = store.put(value, key);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
        tx.oncomplete = () => db.close();
      };
    });
  }
  async function getRecordFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const openReq = indexedDB.open(LOCAL_STORAGE_DB_NAME);
      openReq.onerror = () => reject(openReq.error);
      openReq.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(LOCAL_STORAGE_STORE_NAME)) {
          db.createObjectStore(LOCAL_STORAGE_STORE_NAME);
        }
      };
      openReq.onsuccess = () => {
        const db = openReq.result;
        const tx = db.transaction(LOCAL_STORAGE_STORE_NAME, "readonly");
        const store = tx.objectStore(LOCAL_STORAGE_STORE_NAME);
        const getReq = store.get(key);
        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => reject(getReq.error);
        tx.oncomplete = () => db.close();
      };
    });
  }
  function toBlobFromIndexedDBValue(value) {
    if (value == null) throw new Error("File not found in IndexedDB");
    if ("contents" in value && value.contents != null) {
      const buf = value.contents instanceof Uint8Array || value.contents instanceof Int8Array ? value.contents : new Uint8Array(value.contents);
      return new Blob([buf], { type: "application/octet-stream" });
    }
    if (value instanceof Blob) return value;
    if (value instanceof Uint8Array || value instanceof Int8Array)
      return new Blob([value], {
        type: "application/octet-stream"
      });
    if (value instanceof ArrayBuffer)
      return new Blob([value], { type: "application/octet-stream" });
    if ("data" in value && value.data instanceof ArrayBuffer)
      return new Blob([value.data], { type: "application/octet-stream" });
    if ("blob" in value && value.blob instanceof Blob) return value.blob;
    throw new Error("Unrecognized value shape from IndexedDB");
  }
  var WAVEDASH_PERSISTENT_DATA_PATH = "/idbfs/wavedash";
  var RATE_LIMITED_ERROR_CODE = "rate_limited";
  var _FileSystemManager = class _FileSystemManager2 extends WavedashManager {
    constructor(sdk) {
      super(sdk);
      this.rateLimitedUntil = 0;
      this.pendingUploads = /* @__PURE__ */ new Map();
      this.queuedUploads = /* @__PURE__ */ new Map();
      this.activeUploads = /* @__PURE__ */ new Set();
    }
    /**
     * Converts a local filesystem path into a full R2 object key.
     * Normalizes the Unity persistentDataPath and prepends the R2 prefix.
     */
    toRemoteKey(localPath) {
      const unityPersistentDataPath = this.sdk.engineInstance?.unityPersistentDataPath;
      const normalized = unityPersistentDataPath ? localPath.replace(
        unityPersistentDataPath,
        WAVEDASH_PERSISTENT_DATA_PATH
      ) : localPath;
      const relative = normalized.startsWith("/") ? normalized.slice(1) : normalized;
      return `${UgcStorage.userfsPrefix(this.sdk.gameCloudId, this.sdk.wavedashUser.id)}${relative}`;
    }
    /**
     * Converts a full R2 object key back into the local filesystem path
     * the engine expects. Inverse of toRemoteKey.
     */
    toLocalPath(r2Key) {
      const prefix = UgcStorage.userfsPrefix(
        this.sdk.gameCloudId,
        this.sdk.wavedashUser.id
      );
      const stripped = r2Key.startsWith(prefix) ? "/" + r2Key.slice(prefix.length) : r2Key;
      const unityPersistentDataPath = this.sdk.engineInstance?.unityPersistentDataPath;
      return unityPersistentDataPath ? stripped.replace(WAVEDASH_PERSISTENT_DATA_PATH, unityPersistentDataPath) : stripped;
    }
    // ================
    // Public Methods
    // ================
    /**
     * Uploads a local file to remote storage
     * @param filePath - The path of the local file to upload
     * @returns The path of the remote file that the local file was uploaded to
     */
    async uploadRemoteFile(filePath) {
      const remoteKey = this.toRemoteKey(filePath);
      const pending = this.pendingUploads.get(remoteKey);
      if (pending) return pending;
      const promise = (async () => {
        let uploadUrl;
        try {
          uploadUrl = await this.getUploadUrl(remoteKey);
        } finally {
          this.pendingUploads.delete(remoteKey);
        }
        const success = await this.upload(uploadUrl, filePath);
        if (!success) {
          throw new Error(`Failed to upload file: ${filePath}`);
        }
        return filePath;
      })();
      this.pendingUploads.set(remoteKey, promise);
      return promise;
    }
    /**
     * Deletes a remote file from storage
     * @param filePath - The path of the remote file to delete
     * @returns The path of the remote file that was deleted
     */
    async deleteRemoteFile(filePath) {
      const url = this.getRemoteStorageUrl(filePath);
      const jwt = await this.sdk.ensureGameplayJwt();
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      });
      if (!response.ok) {
        const msg = `Failed to delete remote file ${filePath}: ${response.status} (${response.statusText})`;
        logger.error(msg);
        throw new Error(msg);
      }
      return filePath;
    }
    /**
     * Downloads a remote file to a local location.
     * Throws on failure; the error message is the server's HTTP status (e.g. "404 (Not Found)")
     * or a network-level description if the server didn't respond. See also: {@link remoteFileExists}
     * @param filePath - The path of the remote file to download
     * @returns The path of the local file that the remote file was downloaded to
     */
    async downloadRemoteFile(filePath) {
      const url = this.getRemoteStorageUrl(filePath);
      await this.download(url, filePath);
      return filePath;
    }
    /**
     * Checks whether a remote file exists by issuing a HEAD request.
     * Does NOT throw for the "file does not exist" case — returns false.
     * Throws only for real errors (network failure, auth failure, server error).
     * @param filePath - The path of the remote file to check
     * @returns true if the remote file exists, false otherwise
     */
    async remoteFileExists(filePath) {
      const url = this.getRemoteStorageUrl(filePath);
      const jwt = await this.sdk.ensureGameplayJwt();
      const response = await fetch(url, {
        method: "HEAD",
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      });
      if (response.status === 404) return false;
      if (response.ok) return true;
      throw new Error(`${response.status} (${response.statusText})`);
    }
    /**
     * Lists each file in a remote directory, including its subdirectories.
     * Returns only file paths, no directory paths.
     * An empty or non-existent directory returns an empty array — not an error.
     * @param path - The path of the remote directory to list
     * @returns A list of metadata for each file in the remote directory
     */
    async listRemoteDirectory(path) {
      const url = this.getRemoteStorageUrl(path) + "?list=true";
      const jwt = await this.sdk.ensureGameplayJwt();
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      });
      if (response.status === 404) return [];
      if (!response.ok) {
        throw new Error(`${response.status} (${response.statusText})`);
      }
      const responseJson = await response.json();
      return responseJson.files.filter((file) => !file.key.endsWith("/")).map((file) => ({
        ...file,
        key: this.toLocalPath(file.key)
      }));
    }
    async downloadRemoteDirectory(path) {
      const files = await this.listRemoteDirectory(path);
      const downloadPromises = files.map(async (file) => {
        const url = this.getRemoteStorageUrl(file.key);
        try {
          await this.download(url, file.key);
          return { fileName: file.name, success: true };
        } catch (error2) {
          const message = error2 instanceof Error ? error2.message : String(error2);
          logger.error(`Failed to download ${file.name}: ${message}`);
          return { fileName: file.name, success: false };
        }
      });
      const downloadResults = await Promise.all(downloadPromises);
      const failedDownloads = downloadResults.filter((result) => !result.success);
      if (failedDownloads.length > 0) {
        throw new Error(
          `Failed to download ${failedDownloads.length} files: ${failedDownloads.map((f) => f.fileName).join(", ")}`
        );
      }
      return path;
    }
    async writeLocalFile(filePath, data) {
      logger.debug(`Writing local file: ${filePath}`);
      if (this.sdk.engineInstance?.FS) {
        logger.error(
          `${this.sdk.engineInstance.type} engine detected, use engine's builtin file access to save files.`
        );
        return false;
      }
      try {
        await writeToIndexedDB(filePath, data);
        return true;
      } catch (error2) {
        logger.error(`Failed to write local file: ${error2}`);
        return false;
      }
    }
    async readLocalFile(filePath) {
      logger.debug(`Reading local file: ${filePath}`);
      if (this.sdk.engineInstance?.FS) {
        logger.error(
          `${this.sdk.engineInstance.type} engine detected, use engine's builtin file access to read files.`
        );
        return null;
      }
      try {
        const blob = await this.readLocalFileBlob(filePath);
        if (!blob) return null;
        const arrayBuffer = await blob.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } catch (error2) {
        logger.error(`Failed to read local file: ${error2}`);
        return null;
      }
    }
    // Queue a local file for upload to its presigned URL; resolves with the
    // outcome of the PUT that carried this request's content
    async upload(presignedUploadUrl, filePath) {
      const key = new URL(presignedUploadUrl).pathname;
      const queued = this.queuedUploads.get(key);
      if (queued) {
        queued.url = presignedUploadUrl;
        queued.filePath = filePath;
        return queued.promise;
      }
      let resolve;
      const promise = new Promise((r2) => resolve = r2);
      this.queuedUploads.set(key, {
        url: presignedUploadUrl,
        filePath,
        promise,
        resolve
      });
      void this.drainUploads(key);
      return promise;
    }
    // Work through a key's queue one PUT at a time (no-op if already draining)
    async drainUploads(key) {
      if (this.activeUploads.has(key)) return;
      this.activeUploads.add(key);
      try {
        let entry;
        while (entry = this.queuedUploads.get(key)) {
          this.queuedUploads.delete(key);
          entry.resolve(
            await this.putLocalFile(entry.url, entry.filePath).catch((err) => {
              logger.error(`Upload failed for ${key}: ${err}`);
              return false;
            })
          );
        }
      } finally {
        this.activeUploads.delete(key);
      }
    }
    // One PUT of one local file to its presigned URL
    async putLocalFile(presignedUploadUrl, filePath) {
      logger.debug(`Uploading ${filePath} to: ${presignedUploadUrl}`);
      if (this.sdk.engineInstance && !this.sdk.engineInstance.FS) {
        logger.error("Engine instance is missing the Emscripten FS API");
        return false;
      }
      if (this.sdk.engineInstance) {
        return await this.uploadFromFS(presignedUploadUrl, filePath);
      }
      return await this.uploadFromIndexedDb(presignedUploadUrl, filePath);
    }
    // Helper to download a file from a URL and save locally.
    // Throws on any failure with a message containing the HTTP status (e.g.
    // "404 (Not Found)") for server-side failures, or a network/FS error
    // description otherwise. Callers should let the error propagate; the
    // public apiCall wrapper surfaces the message in WavedashResponse.message.
    async download(url, filePath) {
      logger.debug(`Downloading ${filePath} from: ${url}`);
      if (this.sdk.engineInstance && !this.sdk.engineInstance.FS) {
        throw new Error("Engine instance is missing the Emscripten FS API");
      }
      const jwt = await this.sdk.ensureGameplayJwt();
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      });
      if (!response.ok) {
        throw new Error(`${response.status} (${response.statusText})`);
      }
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const dataArray = new Uint8Array(arrayBuffer);
      if (this.sdk.engineInstance) {
        const dirPath = filePath.substring(0, filePath.lastIndexOf("/"));
        if (dirPath) {
          try {
            this.sdk.engineInstance.FS.mkdirTree(dirPath);
          } catch (_error) {
          }
        }
        try {
          this.sdk.engineInstance.FS.writeFile(filePath, dataArray);
        } catch (error2) {
          const msg = error2 instanceof Error ? error2.message : String(error2);
          throw new Error(`Failed to save file ${filePath} to engine FS: ${msg}`);
        }
      } else {
        const success = await this.writeLocalFile(filePath, dataArray);
        if (!success) {
          throw new Error(
            `Failed to save file ${filePath} to local IndexedDB storage`
          );
        }
      }
      logger.debug(`Successfully saved to: ${filePath}`);
    }
    // ================
    // Private Methods
    // ================
    async getUploadUrl(remoteKey) {
      const waitMs = this.rateLimitedUntil - Date.now();
      if (waitMs > 0) {
        throw new Error(
          `Upload rate limited; try again in ${Math.ceil(waitMs / 1e3)}s. Upload less often.`
        );
      }
      try {
        return await this.sdk.convexClient.mutation(
          api.sdk.remoteFileStorage.getUploadUrl,
          { path: remoteKey }
        );
      } catch (error2) {
        const data = error2 instanceof ConvexError ? error2.data : void 0;
        if (data?.code === RATE_LIMITED_ERROR_CODE && typeof data.retryAfterMs === "number") {
          this.rateLimitedUntil = Math.max(
            this.rateLimitedUntil,
            Date.now() + data.retryAfterMs
          );
        }
        throw error2;
      }
    }
    getRemoteStorageOrigin() {
      if (this.remoteStorageOrigin) {
        return this.remoteStorageOrigin;
      }
      if (this.sdk.config?.remoteStorageOrigin) {
        this.remoteStorageOrigin = this.sdk.config.remoteStorageOrigin;
        return this.remoteStorageOrigin;
      }
      if (this.sdk.ugcHost) {
        this.remoteStorageOrigin = this.sdk.ugcHost.startsWith("http") ? this.sdk.ugcHost : `https://${this.sdk.ugcHost}`;
        return this.remoteStorageOrigin;
      }
      if (typeof window !== "undefined" && window.location) {
        const hostname = window.location.hostname;
        const parts = hostname.split(".");
        this.remoteStorageOrigin = `${window.location.protocol}//ugc.` + parts.slice(2).join(".");
        return this.remoteStorageOrigin;
      }
      throw new Error("Remote storage origin cannot be determined.");
    }
    getRemoteStorageUrl(localPath) {
      const origin = this.getRemoteStorageOrigin();
      return `${origin}/${UgcStorage.encodeKeyPath(this.toRemoteKey(localPath))}`;
    }
    /**
     * PUT a blob to its signed upload URL. Small bodies use `keepalive` so the
     * upload survives the page unloading mid-save; if the shared keepalive
     * quota is exhausted (fetch throws immediately), retry as a normal request.
     */
    async uploadBlob(uploadUrl, blob) {
      const jwt = await this.sdk.ensureGameplayJwt();
      const headers = {
        Authorization: `Bearer ${jwt}`
      };
      const uploadSignal = () => typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(_FileSystemManager2.UPLOAD_TIMEOUT_MS) : void 0;
      if (blob.size <= _FileSystemManager2.KEEPALIVE_MAX_BYTES) {
        try {
          return await fetch(uploadUrl, {
            method: "PUT",
            headers,
            body: blob,
            keepalive: true,
            signal: uploadSignal()
          });
        } catch (error2) {
          if (error2?.name === "TimeoutError") {
            throw error2;
          }
        }
      }
      return await fetch(uploadUrl, {
        method: "PUT",
        headers,
        body: blob,
        signal: uploadSignal()
      });
    }
    async uploadFromIndexedDb(presignedUploadUrl, indexedDBKey) {
      try {
        const blob = await this.readLocalFileBlob(indexedDBKey);
        if (!blob) {
          logger.error(`File not found in IndexedDB: ${indexedDBKey}`);
          return false;
        }
        const response = await this.uploadBlob(presignedUploadUrl, blob);
        return response.ok;
      } catch (error2) {
        logger.error(`Error uploading from IndexedDB: ${error2}`);
        return false;
      }
    }
    async uploadFromFS(presignedUploadUrl, filePath) {
      try {
        const exists = this.sdk.engineInstance.FS.analyzePath(filePath).exists;
        if (!exists) {
          throw new Error(`File not found in FS: ${filePath}`);
        }
        const data = this.sdk.engineInstance.FS.readFile(
          filePath
        );
        const blob = new Blob([data], { type: "application/octet-stream" });
        const response = await this.uploadBlob(presignedUploadUrl, blob);
        return response.ok;
      } catch (error2) {
        const msg = error2 instanceof Error ? error2.message : String(error2);
        logger.error(`Error uploading from FS: ${msg}`);
        return false;
      }
    }
    async readLocalFileBlob(filePath) {
      logger.debug(`Reading local file (blob): ${filePath}`);
      if (this.sdk.engineInstance?.FS) {
        logger.error(
          `${this.sdk.engineInstance.type} engine detected, use engine's builtin file access to read files.`
        );
        return null;
      }
      try {
        const record = await getRecordFromIndexedDB(filePath);
        if (!record) return null;
        return toBlobFromIndexedDBValue(record);
      } catch (error2) {
        logger.error(`Failed to read local file blob: ${error2}`);
        return null;
      }
    }
  };
  _FileSystemManager.KEEPALIVE_MAX_BYTES = 60 * 1024;
  _FileSystemManager.UPLOAD_TIMEOUT_MS = 10 * 60 * 1e3;
  var FileSystemManager = _FileSystemManager;
  function getAvatarUrl(r2KeyOrUrl, host, size = AvatarSize.MEDIUM) {
    if (!r2KeyOrUrl) return void 0;
    return getCdnImageUrl(r2KeyOrUrl, host, {
      width: size,
      height: size,
      fit: "cover",
      quality: "high",
      sharpen: 1
    });
  }
  function getCdnImageUrl(r2Key, host, options) {
    if (r2Key.startsWith("http://") || r2Key.startsWith("https://")) {
      return r2Key;
    }
    const optionsStr = options ? Object.entries(options).filter(([, value]) => value !== void 0).map(
      ([key, value]) => key === "background" ? `${key}=${encodeURIComponent(value)}` : `${key}=${value}`
    ).join(",") : "";
    return `https://${host}/cdn-cgi/image/${optionsStr}/${r2Key}`;
  }
  var FriendsManager = class extends WavedashManager {
    constructor(sdk) {
      super(sdk);
      this.userCache = /* @__PURE__ */ new Map();
      this.leaderboardPageUserCache = /* @__PURE__ */ new Map();
    }
    /**
     * Returns CDN URL with size transformation for a cached user's avatar.
     * @param userId - The user ID to get the avatar URL for
     * @param size - Pixel size for width and height. Use a value from
     *   `AvatarSize` (SMALL=64, MEDIUM=128, LARGE=256) or any custom pixel size.
     * @returns CDN URL with size transformation, or null if user not cached or has no avatar
     */
    getUserAvatarUrl(userId, size = AvatarSize.MEDIUM) {
      const user = this.userCache.get(userId) ?? this.leaderboardPageUserCache.get(userId);
      if (!user?.avatarR2Key) {
        return null;
      }
      return getAvatarUrl(user.avatarR2Key, this.sdk.uploadsHost, size) ?? null;
    }
    /**
     * Returns the cached username for a given user ID
     * @param userId - The user ID to get the username for
     * @returns The username, or null if user not cached
     */
    getUsername(userId) {
      return this.userCache.get(userId)?.username ?? this.leaderboardPageUserCache.get(userId)?.username ?? null;
    }
    /**
     * List all friends for the logged in user
     * @returns Array<{
     *   avatarUrl?: string;
     *   isOnline: boolean;
     *   userId: UserId;
     *   username: string;
     * }>
     */
    async listFriends() {
      const friends = await this.sdk.convexClient.query(
        api.sdk.friends.listFriends,
        {}
      );
      this.cacheUsers(friends);
      return friends.map((friend) => ({
        ...friend,
        avatarUrl: getAvatarUrl(friend.avatarUrl, this.sdk.uploadsHost)
      }));
    }
    /**
     * Cache users from any source (friends, lobby users)
     * Accepts both Friend format (avatarUrl) and LobbyUser format (userAvatarUrl)
     * @param users - Array of users with userId, username, and optional avatar r2Key
     * @internal
     */
    cacheUsers(users) {
      for (const user of users) {
        this.userCache.set(user.userId, {
          username: user.username,
          // Support both Friend (avatarUrl) and LobbyUser (userAvatarUrl) formats
          avatarR2Key: user.avatarUrl ?? user.userAvatarUrl
        });
      }
    }
    /**
     * Replace the leaderboard-page cache with the users from a single page of
     * leaderboard entries.
     *
     * In general devs should just use the username and userAvatarUrl returned
     * from `listLeaderboardEntries` directly, but we cache the latest leaderboard
     * page here just so getUserAvatarUrl and getUsername still work for the current page.
     * @internal
     */
    cacheLeaderboardPage(users) {
      this.leaderboardPageUserCache.clear();
      for (const user of users) {
        this.leaderboardPageUserCache.set(user.userId, {
          username: user.username,
          avatarR2Key: user.userAvatarUrl
        });
      }
    }
  };
  var ESCAPE_HOLD_DURATION_MS = 2e3;
  var FullscreenManager = class extends WavedashManager {
    constructor(sdk) {
      super(sdk);
      this._isFullscreen = false;
      this.listeners = /* @__PURE__ */ new Set();
      this.escapeKeyHeld = false;
      this.handleEscapeKeyDown = (event) => {
        if (event.key !== "Escape" || // Only a real key press should arm the hold. Games that synthesize
        // Escape keydowns (on-screen back buttons, input shims) rarely pair
        // them with a keyup, which would otherwise exit fullscreen 2s later.
        !event.isTrusted || // OS auto-repeat must not arm (Escape already held when we entered
        // fullscreen) or re-arm (after the timer fired) the hold.
        event.repeat || this.escapeKeyHeld || !this._isFullscreen) {
          return;
        }
        this.escapeKeyHeld = true;
        this.escapeHoldTimer = window.setTimeout(() => {
          this.escapeHoldTimer = void 0;
          if (!this._isFullscreen) return;
          this.requestFullscreen(false).catch((error2) => {
            logger.warn("Escape-hold fullscreen exit failed", error2);
          });
        }, ESCAPE_HOLD_DURATION_MS);
      };
      this.handleEscapeKeyUp = (event) => {
        if (event.key === "Escape") this.cancelEscapeHold();
      };
      this.handleVisibilityChange = () => {
        if (document.hidden) this.cancelEscapeHold();
      };
      this.cancelEscapeHold = () => {
        this.escapeKeyHeld = false;
        if (this.escapeHoldTimer === void 0) return;
        window.clearTimeout(this.escapeHoldTimer);
        this.escapeHoldTimer = void 0;
      };
      if (!hasParentFrame()) return;
      this.sdk.iframeMessenger.addEventListener(
        IFRAME_MESSAGE_TYPE.FULLSCREEN_CHANGED,
        (data) => {
          this.sdk.gameEventManager.notifyGame(
            WavedashEvents.FULLSCREEN_CHANGED,
            { isFullscreen: data.isFullscreen }
          );
          this.setState(data.isFullscreen);
        }
      );
      this.installCompatShims();
      this.installEscapeHold();
    }
    isFullscreen() {
      return this._isFullscreen;
    }
    /**
     * Ask the host to enter (true) or exit (false) fullscreen. Resolves to
     * `true` if the host reports the operation succeeded, `false` otherwise
     * (e.g. browser rejected for lack of user activation).
     */
    async requestFullscreen(fullscreen) {
      if (!hasParentFrame()) {
        logger.debug(
          "requestFullscreen() is disabled outside a Wavedash parent frame (e.g. `wavedash dev`)"
        );
        return false;
      }
      const response = await this.sdk.iframeMessenger.requestFromParent(
        IFRAME_MESSAGE_TYPE.SET_FULLSCREEN,
        { fullscreen }
      );
      return response.success;
    }
    async toggleFullscreen() {
      if (!hasParentFrame()) {
        logger.debug(
          "toggleFullscreen() is disabled outside a Wavedash parent frame (e.g. `wavedash dev`)"
        );
        return false;
      }
      const response = await this.sdk.iframeMessenger.requestFromParent(
        IFRAME_MESSAGE_TYPE.TOGGLE_FULLSCREEN
      );
      return response.success;
    }
    /** Subscribe to state flips. Returns an unsubscribe fn. */
    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    setState(isFullscreen) {
      if (!isFullscreen) this.cancelEscapeHold();
      if (this._isFullscreen === isFullscreen) return;
      this._isFullscreen = isFullscreen;
      for (const listener of this.listeners) listener(isFullscreen);
    }
    installEscapeHold() {
      if (typeof window === "undefined") return;
      window.addEventListener("keydown", this.handleEscapeKeyDown, true);
      window.addEventListener("keyup", this.handleEscapeKeyUp, true);
      window.addEventListener("blur", this.cancelEscapeHold);
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
    installCompatShims() {
      if (typeof document === "undefined") return;
      const fullscreenElementGetter = () => this._isFullscreen ? document.body : null;
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true,
        get: fullscreenElementGetter
      });
      Object.defineProperty(document, "webkitFullscreenElement", {
        configurable: true,
        get: fullscreenElementGetter
      });
      const enter = async () => {
        if (this._isFullscreen) return;
        const ok = await this.requestFullscreen(true);
        if (!ok) throw new Error("Fullscreen request was denied");
      };
      const exit = async () => {
        if (!this._isFullscreen) return;
        const ok = await this.requestFullscreen(false);
        if (!ok) throw new Error("Exit fullscreen request was denied");
      };
      Element.prototype.requestFullscreen = function() {
        return enter();
      };
      Element.prototype.webkitRequestFullscreen = function() {
        return enter();
      };
      Document.prototype.exitFullscreen = function() {
        return exit();
      };
      Document.prototype.webkitExitFullscreen = function() {
        return exit();
      };
      this.subscribe(() => {
        document.dispatchEvent(new Event("fullscreenchange", { bubbles: true }));
      });
    }
    destroy() {
      this.cancelEscapeHold();
      window.removeEventListener("keydown", this.handleEscapeKeyDown, true);
      window.removeEventListener("keyup", this.handleEscapeKeyUp, true);
      window.removeEventListener("blur", this.cancelEscapeHold);
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
      this.listeners.clear();
      super.destroy();
    }
  };
  var GameEventManager = class extends WavedashManager {
    constructor(sdk) {
      super(sdk);
      this.eventQueue = [];
    }
    // ==============================
    // JS -> Game Event Broadcasting
    // ==============================
    notifyGame(event, payload) {
      if (!this.sdk.eventsReady) {
        this.eventQueue.push({ event, payload });
        logger.debug(`Queued event: ${event}`);
        return;
      }
      if (!this.sdk.engineInstance) {
        this.sdk.dispatchEvent(new CustomEvent(event, { detail: payload }));
      } else {
        this.sendGameEvent(event, payload);
      }
    }
    sendGameEvent(event, payload) {
      const data = typeof payload === "object" ? JSON.stringify(payload) : payload;
      if (this.sdk.engineInstance?.SendMessage) {
        this.sdk.engineInstance.SendMessage(
          this.sdk.engineCallbackReceiver,
          event,
          data
        );
      } else {
        logger.error("Engine instance not set. Dropping event:", event);
      }
    }
    flushEventQueue() {
      const toFlush = this.eventQueue;
      this.eventQueue = [];
      for (const queuedEvent of toFlush) {
        this.notifyGame(queuedEvent.event, queuedEvent.payload);
      }
    }
  };
  var GAMEPAD_AXIS_DEADZONE = 0.2;
  function hasGamepadActivity(deadzone = GAMEPAD_AXIS_DEADZONE) {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return false;
    for (const pad of navigator.getGamepads()) {
      if (!pad) continue;
      if (pad.buttons.some((b) => b.pressed)) return true;
      if (pad.axes.some((a) => Math.abs(a) > deadzone)) return true;
    }
    return false;
  }
  var depth = 0;
  var previousDescriptor;
  function suspendGamepads() {
    if (typeof navigator === "undefined" || !navigator.getGamepads)
      return () => {
      };
    if (++depth === 1) {
      previousDescriptor = Object.getOwnPropertyDescriptor(
        navigator,
        "getGamepads"
      );
      Object.defineProperty(navigator, "getGamepads", {
        configurable: true,
        value: () => []
      });
    }
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      if (--depth === 0) {
        if (previousDescriptor) {
          Object.defineProperty(navigator, "getGamepads", previousDescriptor);
        } else {
          Reflect.deleteProperty(navigator, "getGamepads");
        }
        previousDescriptor = void 0;
      }
    };
  }
  var INPUT_LISTENER_OPTS = {
    passive: true,
    capture: true
  };
  var HeartbeatManager = class extends WavedashManager {
    constructor(sdk) {
      super(sdk);
      this.deviceFingerprint = void 0;
      this.testConnectionInterval = null;
      this.heartbeatInterval = null;
      this.gamepadPollInterval = null;
      this.inactivityTimeout = null;
      this.isConnected = false;
      this.sentDisconnectedEvent = false;
      this.disconnectedAt = null;
      this.lastHeartbeatTime = 0;
      this.lastInputResetAt = 0;
      this.heartbeatInFlight = false;
      this.isFirstTick = true;
      this.TEST_CONNECTION_INTERVAL_MS = 1e3;
      this.DISCONNECTED_TIMEOUT_MS = 9e4;
      this.INACTIVITY_TIMEOUT_MS = 15 * 60 * 1e3;
      this.INPUT_THROTTLE_MS = 1e3;
      this.GAMEPAD_POLL_INTERVAL_MS = 1e3;
      this.cachedPresenceData = {};
      this.handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          this.start();
        } else {
          if (this.heartbeatInterval !== null) {
            this.sdk.convexClient.mutation(api.sdk.presence.lastHeartbeat, {}).catch((error2) => {
              logger.error(`Last heartbeat failed: ${error2}`);
            });
          }
          this.stop();
        }
      };
      this.handleUserInput = () => {
        const now = Date.now();
        if (now - this.lastInputResetAt < this.INPUT_THROTTLE_MS) return;
        this.lastInputResetAt = now;
        this.start();
      };
      this.isConnected = this.sdk.convexClient.client.connectionState().isWebSocketConnected;
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
      window.addEventListener(
        "keydown",
        this.handleUserInput,
        INPUT_LISTENER_OPTS
      );
      window.addEventListener(
        "pointerdown",
        this.handleUserInput,
        INPUT_LISTENER_OPTS
      );
      window.addEventListener(
        "pointermove",
        this.handleUserInput,
        INPUT_LISTENER_OPTS
      );
      window.addEventListener("wheel", this.handleUserInput, INPUT_LISTENER_OPTS);
      this.gamepadPollInterval = setInterval(() => {
        this.pollGamepads();
      }, this.GAMEPAD_POLL_INTERVAL_MS);
      this.deviceFingerprintReady = !hasParentFrame() ? Promise.resolve() : this.sdk.iframeMessenger.requestFromParent(IFRAME_MESSAGE_TYPE.GET_DEVICE_FINGERPRINT).then((fingerprint) => {
        this.deviceFingerprint = fingerprint;
      }).catch(() => {
      });
    }
    /**
     * Start (or refresh) the heartbeat. Idempotent: if intervals are already
     * running this just reschedules the inactivity timer. No-op if the game
     * hasn't loaded yet or the tab is hidden.
     */
    start() {
      if (!this.sdk.gameLoaded) return;
      if (document.visibilityState !== "visible") return;
      if (this.inactivityTimeout !== null) {
        clearTimeout(this.inactivityTimeout);
      }
      this.inactivityTimeout = setTimeout(() => {
        this.stop();
      }, this.INACTIVITY_TIMEOUT_MS);
      if (this.heartbeatInterval !== null) return;
      if (this.isFirstTick) {
        void this.deviceFingerprintReady.then(() => {
          if (!this.sdk.gameLoaded || !this.isFirstTick) return;
          this.tickHeartbeat();
        });
      } else {
        this.tickHeartbeat();
      }
      this.heartbeatInterval = setInterval(() => {
        this.tickHeartbeat();
      }, HEARTBEAT.CLIENT_INTERVAL_MS);
      this.testConnectionInterval = setInterval(() => {
        this.testConnection();
      }, this.TEST_CONNECTION_INTERVAL_MS);
    }
    /** Stop the heartbeat and clear the inactivity timer. Idempotent. */
    stop() {
      if (this.inactivityTimeout !== null) {
        clearTimeout(this.inactivityTimeout);
        this.inactivityTimeout = null;
      }
      if (this.heartbeatInterval !== null) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      if (this.testConnectionInterval !== null) {
        clearInterval(this.testConnectionInterval);
        this.testConnectionInterval = null;
      }
    }
    /**
     * Updates user presence in the backend.
     * @param data - Data to send to the backend
     * @returns true if the presence was updated successfully
     */
    async updateUserPresence(data) {
      try {
        this.cachedPresenceData = data;
        await this.sdk.convexClient.mutation(api.sdk.presence.heartbeat, {
          data,
          deviceFingerprint: this.deviceFingerprint
        });
        return true;
      } catch (error2) {
        logger.error(`Error updating presence: ${error2}`);
        return false;
      }
    }
    isCurrentlyConnected() {
      return this.isConnected;
    }
    /** Full teardown — stops intervals and removes all listeners */
    destroy() {
      this.stop();
      if (this.gamepadPollInterval !== null) {
        clearInterval(this.gamepadPollInterval);
        this.gamepadPollInterval = null;
      }
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
      window.removeEventListener(
        "keydown",
        this.handleUserInput,
        INPUT_LISTENER_OPTS
      );
      window.removeEventListener(
        "pointerdown",
        this.handleUserInput,
        INPUT_LISTENER_OPTS
      );
      window.removeEventListener(
        "pointermove",
        this.handleUserInput,
        INPUT_LISTENER_OPTS
      );
      window.removeEventListener(
        "wheel",
        this.handleUserInput,
        INPUT_LISTENER_OPTS
      );
    }
    // =================
    // Private functions
    // =================
    tickHeartbeat() {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeatTime;
      const needsReestablish = this.isFirstTick || timeSinceLastHeartbeat >= HEARTBEAT.CLIENT_REESTABLISH_THRESHOLD_MS;
      this.isFirstTick = false;
      if (needsReestablish) {
        this.sendHeartbeat(true);
      } else if (timeSinceLastHeartbeat >= HEARTBEAT.CLIENT_INTERVAL_MS - HEARTBEAT.CLIENT_GRACE_MS) {
        this.sendHeartbeat(false);
      }
    }
    sendHeartbeat(reestablish) {
      if (!reestablish && this.heartbeatInFlight) return;
      this.heartbeatInFlight = true;
      this.sdk.convexClient.mutation(api.sdk.presence.heartbeat, {
        ...reestablish ? {
          data: this.cachedPresenceData,
          deviceFingerprint: this.deviceFingerprint
        } : {}
      }).then((accepted) => {
        if (accepted) {
          this.lastHeartbeatTime = Date.now();
        }
      }).catch((error2) => {
        logger.error(`Heartbeat failed: ${error2}`);
      }).finally(() => {
        this.heartbeatInFlight = false;
      });
    }
    /**
     * Polls connected gamepads; any activity counts as user input and
     * (re)starts the heartbeat.
     */
    pollGamepads() {
      if (hasGamepadActivity()) this.start();
    }
    /**
     * Tests the connection to the backend
     */
    testConnection() {
      try {
        const wasConnected = this.isConnected;
        const state2 = this.sdk.convexClient.client.connectionState();
        this.isConnected = navigator.onLine && state2.isWebSocketConnected;
        const connection = {
          isConnected: this.isConnected,
          hasEverConnected: state2.hasEverConnected,
          connectionCount: state2.connectionCount,
          connectionRetries: state2.connectionRetries
        };
        if (this.isConnected && !wasConnected) {
          this.disconnectedAt = null;
          this.sentDisconnectedEvent = false;
          this.sdk.gameEventManager.notifyGame(
            WavedashEvents.BACKEND_CONNECTED,
            connection
          );
          this.start();
        } else if (!this.isConnected && wasConnected) {
          this.disconnectedAt = Date.now();
          logger.warn("Backend disconnected - attempting to reconnect...");
          this.sdk.gameEventManager.notifyGame(
            WavedashEvents.BACKEND_RECONNECTING,
            connection
          );
        } else if (!this.isConnected && !wasConnected) {
          if (this.disconnectedAt && !this.sentDisconnectedEvent && Date.now() - this.disconnectedAt > this.DISCONNECTED_TIMEOUT_MS) {
            this.sdk.gameEventManager.notifyGame(
              WavedashEvents.BACKEND_DISCONNECTED,
              connection
            );
            this.sentDisconnectedEvent = true;
          }
        } else if (this.isConnected && wasConnected) {
          this.disconnectedAt = null;
          this.sentDisconnectedEvent = false;
        }
      } catch (error2) {
        logger.error("Error testing connection:", error2);
      }
    }
  };
  var LaunchParamManager = class extends WavedashManager {
    constructor(sdk, configParams = {}) {
      super(sdk);
      this.params = { ...configParams, ...this.readFromUrl() };
    }
    /** Snapshot of the current launch params. */
    get() {
      return { ...this.params };
    }
    /**
     * Set (or clear, with `null`) a launch param and sync it to the frame URL.
     * `key` is the bare name (e.g. `"lobby"`); the prefix is applied on the URL.
     */
    set(key, value) {
      if ((this.params[key] ?? null) === value) return;
      if (value === null) {
        delete this.params[key];
      } else {
        this.params[key] = value;
      }
      this.writeToUrl(key, value);
    }
    readFromUrl() {
      const params2 = {};
      if (typeof window === "undefined") return params2;
      new URLSearchParams(window.location.search).forEach((value, key) => {
        if (key.startsWith(LAUNCH_PARAM_PREFIX)) {
          params2[key.slice(LAUNCH_PARAM_PREFIX.length)] = value;
        }
      });
      return params2;
    }
    writeToUrl(key, value) {
      if (typeof window === "undefined" || hasParentFrame()) return;
      const urlKey = `${LAUNCH_PARAM_PREFIX}${key}`;
      const url = new URL(window.location.href);
      if (value === null) {
        url.searchParams.delete(urlKey);
      } else {
        url.searchParams.set(urlKey, value);
      }
      if (url.href === window.location.href) return;
      try {
        window.history.replaceState(window.history.state, "", url);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.debug(
          `Could not sync launch param "${key}" to the URL: ${message}`
        );
      }
    }
  };
  var LeaderboardManager = class extends WavedashManager {
    constructor(sdk) {
      super(sdk);
      this.leaderboardCache = /* @__PURE__ */ new Map();
    }
    async getLeaderboard(name) {
      const leaderboard = await this.sdk.convexClient.query(
        api.sdk.leaderboards.getLeaderboard,
        { name }
      );
      this.leaderboardCache.set(leaderboard.id, leaderboard);
      return leaderboard;
    }
    async getOrCreateLeaderboard(name, sortOrder, displayType) {
      const leaderboard = await this.sdk.convexClient.mutation(
        api.sdk.leaderboards.getOrCreateLeaderboard,
        { name, sortOrder, displayType }
      );
      this.leaderboardCache.set(leaderboard.id, leaderboard);
      return leaderboard;
    }
    getLeaderboardEntryCount(leaderboardId) {
      const cachedLeaderboard = this.leaderboardCache.get(leaderboardId);
      return cachedLeaderboard ? cachedLeaderboard.totalEntries : -1;
    }
    async getMyLeaderboardEntries(leaderboardId) {
      const result = await this.sdk.convexClient.query(
        api.sdk.leaderboards.getMyLeaderboardEntry,
        { leaderboardId }
      );
      if (result && result.totalEntries) {
        this.updateCachedTotalEntries(leaderboardId, result.totalEntries);
      }
      const entry = result.entry ? {
        ...result.entry,
        userId: this.sdk.wavedashUser.id,
        username: this.sdk.wavedashUser.username,
        userAvatarUrl: getAvatarUrl(
          this.sdk.wavedashUser.avatarUrl,
          this.sdk.uploadsHost
        )
      } : null;
      return entry ? [entry] : [];
    }
    async listLeaderboardEntriesAroundUser(leaderboardId, countAhead, countBehind, friendsOnly = false) {
      const result = await this.sdk.convexClient.query(
        api.sdk.leaderboards.listEntriesAroundUser,
        { leaderboardId, countAhead, countBehind, friendsOnly }
      );
      if (result && result.totalEntries) {
        this.updateCachedTotalEntries(leaderboardId, result.totalEntries);
      }
      this.sdk.friendsManager.cacheLeaderboardPage(result.entries);
      return result.entries.map((entry) => ({
        ...entry,
        userAvatarUrl: getAvatarUrl(entry.userAvatarUrl, this.sdk.uploadsHost)
      }));
    }
    async listLeaderboardEntries(leaderboardId, offset, limit, friendsOnly = false) {
      const result = await this.sdk.convexClient.query(
        api.sdk.leaderboards.listEntries,
        { leaderboardId, offset, limit, friendsOnly }
      );
      if (result && result.totalEntries) {
        this.updateCachedTotalEntries(leaderboardId, result.totalEntries);
      }
      this.sdk.friendsManager.cacheLeaderboardPage(result.entries);
      return result.entries.map((entry) => ({
        ...entry,
        userAvatarUrl: getAvatarUrl(entry.userAvatarUrl, this.sdk.uploadsHost)
      }));
    }
    async uploadLeaderboardScore(leaderboardId, score, keepBest, ugcId, metadata) {
      const result = await this.sdk.convexClient.mutation(
        api.sdk.leaderboards.upsertLeaderboardEntry,
        { leaderboardId, score, keepBest, ugcId, metadata }
      );
      if (result && result.totalEntries) {
        this.updateCachedTotalEntries(leaderboardId, result.totalEntries);
      }
      return {
        // Where your current leaderboard standing ranks
        ...result.entry,
        // Where the submission itself ranks
        submittedScore: result.submission.score,
        submittedRank: result.submission.globalRank,
        // User info
        userId: this.sdk.wavedashUser.id,
        username: this.sdk.wavedashUser.username,
        userAvatarUrl: getAvatarUrl(
          this.sdk.wavedashUser.avatarUrl,
          this.sdk.uploadsHost
        )
      };
    }
    // ================
    // Private Methods
    // ================
    updateCachedTotalEntries(leaderboardId, totalEntries) {
      const cachedLeaderboard = this.leaderboardCache.get(leaderboardId);
      if (cachedLeaderboard && typeof totalEntries === "number") {
        this.leaderboardCache.set(leaderboardId, {
          ...cachedLeaderboard,
          totalEntries
        });
      }
    }
  };
  function getErrorMessage(error2) {
    if (error2 instanceof ConvexError) {
      const data = error2.data;
      if (typeof data === "string") return data;
      if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
        return data.message;
      }
    }
    return error2 instanceof Error ? error2.message : String(error2);
  }
  function isNotLobbyMemberError(error2) {
    return getErrorMessage(error2).includes("not a member");
  }
  var _LobbyManager = class _LobbyManager2 extends WavedashManager {
    constructor(sdk) {
      super(sdk);
      this.unsubscribeLobbyMessages = null;
      this.unsubscribeLobbyUsers = null;
      this.unsubscribeLobbyData = null;
      this.lobbyId = null;
      this.lobbyUsers = [];
      this.lobbyHostId = null;
      this.lobbyMetadata = {};
      this.pendingMetadataUpdates = {};
      this.lobbyMessagesCursor = null;
      this.maybeBeingDeletedLobbyIds = /* @__PURE__ */ new Set();
      this.resetMaybeBeingDeletedLobbyIdTimeouts = /* @__PURE__ */ new Map();
      this.inFlightMetadataUpdate = null;
      this.cachedLobbies = {};
      this.unsubscribeLobbyInvites = null;
      this.seenInviteIds = /* @__PURE__ */ new Set();
      this.p2pUpdateQueue = Promise.resolve();
      this.throttledSetMetadata = throttle2(
        () => this.setMetadata(),
        _LobbyManager2.METADATA_UPDATE_THROTTLE_MS,
        { leading: false, trailing: true }
      );
      this.processUserUpdates = (newUsers) => {
        this.sdk.friendsManager.cacheUsers(newUsers);
        const previousUsers = this.lobbyUsers;
        const previousUserIds = new Set(previousUsers.map((user) => user.userId));
        const newUserIds = new Set(newUsers.map((user) => user.userId));
        this.lobbyUsers = newUsers;
        for (const user of newUsers) {
          if (user.isHost) {
            this.lobbyHostId = user.userId;
          }
          if (!previousUserIds.has(user.userId)) {
            this.sdk.gameEventManager.notifyGame(
              WavedashEvents.LOBBY_USERS_UPDATED,
              {
                ...user,
                userAvatarUrl: getAvatarUrl(
                  user.userAvatarUrl,
                  this.sdk.uploadsHost
                ),
                changeType: LobbyUserChangeType.JOINED
              }
            );
          }
        }
        for (const user of previousUsers) {
          if (!newUserIds.has(user.userId)) {
            if (user.userId === this.sdk.getUserId()) {
              logger.warn(
                "USER WAS KICKED FROM LOBBY! Received notification for myself leaving."
              );
            }
            this.sdk.gameEventManager.notifyGame(
              WavedashEvents.LOBBY_USERS_UPDATED,
              {
                ...user,
                userAvatarUrl: getAvatarUrl(
                  user.userAvatarUrl,
                  this.sdk.uploadsHost
                ),
                isHost: false,
                changeType: LobbyUserChangeType.LEFT
              }
            );
          }
        }
        if (this.lobbyId) {
          this.p2pUpdateQueue = this.p2pUpdateQueue.then(() => this.updateP2PConnections(this.lobbyUsers)).catch((error2) => {
            logger.error("Error in queued P2P update:", error2);
          });
        }
      };
      this.onLobbySubscriptionError = (error2) => {
        logger.error(`Lobby subscription error: ${error2.message}`);
        if (isNotLobbyMemberError(error2)) {
          this.handleLobbyKicked(LobbyKickedReason.KICKED);
        }
      };
      this.processInviteUpdates = (invites) => {
        for (const invite of invites) {
          if (!this.seenInviteIds.has(invite.notificationId)) {
            this.seenInviteIds.add(invite.notificationId);
            this.sdk.gameEventManager.notifyGame(
              WavedashEvents.LOBBY_INVITE,
              invite
            );
          }
        }
        this.seenInviteIds = new Set(
          invites.map((invite) => invite.notificationId)
        );
      };
      this.unsubscribeLobbyInvites = this.sdk.convexClient.onUpdate(
        api.sdk.gameLobby.getLobbyInvites,
        {},
        this.processInviteUpdates,
        (error2) => {
          logger.error(`Lobby invites subscription error: ${error2}`);
        }
      );
    }
    async createLobby(visibility, maxPlayers) {
      const result = await this.sdk.convexClient.mutation(
        api.sdk.gameLobby.createAndJoinLobby,
        { visibility, maxPlayers }
      );
      this.handleLobbyJoin(result);
      return result.lobbyId;
    }
    /**
     * Join a lobby
     * @param lobbyId - The ID of the lobby to join
     * @returns true on success. Full lobby context comes via LobbyJoined event.
     * @emits LobbyJoined event on success with full lobby context
     */
    async joinLobby(lobbyId) {
      const result = await this.sdk.convexClient.mutation(
        api.sdk.gameLobby.joinLobby,
        { lobbyId }
      );
      this.handleLobbyJoin(result);
      return true;
    }
    getLobbyUsers(lobbyId) {
      if (this.lobbyId !== lobbyId) {
        logger.error("Must be a member of the lobby to access user list");
        return [];
      }
      return this.lobbyUsers.map((user) => ({
        ...user,
        userAvatarUrl: getAvatarUrl(user.userAvatarUrl, this.sdk.uploadsHost)
      }));
    }
    getHostId(lobbyId) {
      if (this.lobbyId !== lobbyId) {
        logger.error("Must be a member of the lobby to access the host ID");
        return null;
      }
      return this.lobbyHostId;
    }
    getLobbyData(lobbyId, key) {
      if (this.lobbyId === lobbyId) {
        return this.lobbyMetadata[key] ?? null;
      }
      if (!this.cachedLobbies[lobbyId]) {
        return null;
      }
      return this.cachedLobbies[lobbyId].metadata[key] ?? null;
    }
    deleteLobbyData(lobbyId, key) {
      return this.setLobbyData(lobbyId, key, null);
    }
    setLobbyData(lobbyId, key, value) {
      if (this.lobbyId !== lobbyId || this.lobbyHostId !== this.sdk.getUserId()) {
        return false;
      }
      if (this.lobbyMetadata[key] === value) return true;
      if (value === null) {
        delete this.lobbyMetadata[key];
      } else {
        this.lobbyMetadata[key] = value;
      }
      this.pendingMetadataUpdates[key] = value;
      this.throttledSetMetadata();
      return true;
    }
    getLobbyMaxPlayers(lobbyId) {
      if (!this.cachedLobbies[lobbyId]) {
        return 0;
      }
      return this.cachedLobbies[lobbyId].maxPlayers;
    }
    getNumLobbyUsers(lobbyId) {
      if (this.lobbyId === lobbyId) {
        return this.lobbyUsers.length;
      }
      if (!this.cachedLobbies[lobbyId]) {
        return 0;
      }
      return this.cachedLobbies[lobbyId].playerCount;
    }
    async leaveLobby(lobbyId) {
      this.cleanupLobbyState();
      await this.sdk.convexClient.mutation(api.sdk.gameLobby.leaveLobby, {
        lobbyId
      });
      this.sdk.iframeMessenger.postToParent(IFRAME_MESSAGE_TYPE.LOBBY_LEFT, {
        lobbyId
      });
      return lobbyId;
    }
    // TODO: Implement more query filters (IP distance, arbitrary key/value matching, etc)
    async listAvailableLobbies(friendsOnly = false) {
      const filters = friendsOnly ? { friendsOnly } : void 0;
      const lobbies = await this.sdk.convexClient.query(
        api.sdk.gameLobby.listAvailable,
        { filters }
      );
      const filteredLobbies = lobbies.filter(
        (lobby) => !this.maybeBeingDeletedLobbyIds.has(lobby.lobbyId)
      );
      for (const lobby of filteredLobbies) {
        this.cachedLobbies[lobby.lobbyId] = lobby;
      }
      return filteredLobbies;
    }
    async getLobby(lobbyId) {
      const lobby = await this.sdk.convexClient.query(
        api.sdk.gameLobby.getLobby,
        { lobbyId }
      );
      this.cachedLobbies[lobbyId] = lobby;
      return lobby;
    }
    sendLobbyMessage(lobbyId, message) {
      const args = { lobbyId, message };
      if (message.length === 0) {
        logger.error("Message cannot be empty");
        return false;
      }
      if (message.length > LOBBY_MESSAGE_MAX_LENGTH) {
        logger.error(
          `Message cannot be longer than ${LOBBY_MESSAGE_MAX_LENGTH} characters`
        );
        return false;
      }
      this.sdk.convexClient.mutation(api.sdk.gameLobby.sendMessage, args).catch((error2) => {
        logger.error(`Error sending lobby message: ${error2}`);
        this.handleLobbyMutationError(lobbyId, error2);
      });
      return true;
    }
    async inviteUserToLobby(lobbyId, userId) {
      await this.sdk.convexClient.mutation(api.sdk.gameLobby.inviteToLobby, {
        lobbyId,
        targetUserId: userId
      });
      return true;
    }
    async getLobbyInviteLink(copyToClipboard = false) {
      if (!this.lobbyId) {
        throw new Error("User is not in a lobby");
      }
      if (!hasParentFrame()) {
        const url = new URL(window.location.href);
        url.searchParams.set(`${LAUNCH_PARAM_PREFIX}lobby`, this.lobbyId);
        const link = url.href;
        if (copyToClipboard) {
          await this.sdk.externalLinkManager.copyLink(link);
        }
        return link;
      }
      const inviteLink = await this.sdk.iframeMessenger.requestFromParent(
        IFRAME_MESSAGE_TYPE.GET_LOBBY_INVITE_LINK,
        { lobbyId: this.lobbyId, copyToClipboard }
      );
      if (!inviteLink) {
        throw new Error("Parent could not generate invite link");
      }
      return inviteLink;
    }
    // ================
    // Private Methods
    // ================
    /**
     * Update the current lobby id and mirror it onto the `lobby` launch param so
     * the frame URL (and any link copied from it) tracks lobby membership.
     */
    setLobbyId(lobbyId) {
      this.lobbyId = lobbyId;
      this.sdk.launchParamManager.set("lobby", lobbyId);
    }
    /**
     * Initialize local lobby state and subscribe to all relevant updates.
     * Sets up Convex subscriptions for messages, users, and metadata.
     * Emits LobbyJoined event to the game engine.
     * @precondition - The user has already joined the lobby via mutation
     * @param response - The full response from createAndJoinLobby or joinLobby mutation
     */
    handleLobbyJoin(response) {
      this.cleanupLobbyState(response.lobbyId);
      this.lobbyHostId = response.hostId;
      this.lobbyUsers = response.users;
      this.lobbyMetadata = response.metadata;
      this.sdk.p2pManager.setSignalingCursor(response.joinCommitTs);
      this.sdk.friendsManager.cacheUsers(response.users);
      this.subscribeToLobbyMessages(response.lobbyId);
      this.unsubscribeLobbyData = this.sdk.convexClient.onUpdate(
        api.sdk.gameLobby.getLobbyMetadata,
        { lobbyId: response.lobbyId },
        (lobbyMetadata) => {
          this.lobbyMetadata = lobbyMetadata;
          this.sdk.gameEventManager.notifyGame(
            WavedashEvents.LOBBY_DATA_UPDATED,
            lobbyMetadata
          );
        },
        this.onLobbySubscriptionError
      );
      this.unsubscribeLobbyUsers = this.sdk.convexClient.onUpdate(
        api.sdk.gameLobby.lobbyUsers,
        { lobbyId: response.lobbyId },
        this.processUserUpdates,
        this.onLobbySubscriptionError
      );
      if (response.users.length > 1) {
        this.p2pUpdateQueue = this.updateP2PConnections(response.users).catch(
          (error2) => {
            logger.error("Error initializing P2P on join:", error2);
          }
        );
      }
      this.sdk.iframeMessenger.postToParent(IFRAME_MESSAGE_TYPE.LOBBY_JOINED, {
        lobbyId: response.lobbyId
      });
      this.sdk.gameEventManager.notifyGame(WavedashEvents.LOBBY_JOINED, {
        lobbyId: response.lobbyId,
        hostId: response.hostId,
        users: response.users,
        metadata: response.metadata
      });
      logger.debug("Subscribed to lobby:", response.lobbyId);
    }
    /**
     * Handle being kicked or removed from a lobby.
     * Called when a subscription fails with "User is not a member of this lobby".
     * Multiple subscriptions may error at once, so we guard against emitting multiple events.
     */
    handleLobbyKicked(reason = LobbyKickedReason.KICKED) {
      const lobbyId = this.lobbyId;
      if (!lobbyId) return;
      logger.warn(`User was removed from lobby: ${lobbyId} (reason: ${reason})`);
      this.cleanupLobbyState();
      this.sdk.iframeMessenger.postToParent(IFRAME_MESSAGE_TYPE.LOBBY_LEFT, {
        lobbyId
      });
      this.sdk.gameEventManager.notifyGame(WavedashEvents.LOBBY_KICKED, {
        lobbyId,
        reason
      });
    }
    /**
     * A lobby mutation failing with "not a member" means the server already
     * removed us. Treat it as a kick so we stop querying and mutating the lobby,
     * in case the subscription errors haven't arrived (or were missed).
     * Ignored when the mutation targeted a lobby other than the current one.
     */
    handleLobbyMutationError(lobbyId, error2) {
      if (this.lobbyId === lobbyId && isNotLobbyMemberError(error2)) {
        this.handleLobbyKicked(LobbyKickedReason.KICKED);
      }
    }
    /**
     * Clean up lobby state without emitting events
     * Used internally by handleLobbyJoin() and handleLobbyKicked()
     * @param nextLobbyId - The lobby being joined in place of the current one, if any
     */
    cleanupLobbyState(nextLobbyId = null) {
      const currentLobbyId = this.lobbyId;
      this.setLobbyId(nextLobbyId);
      this.throttledSetMetadata.cancel();
      this.pendingMetadataUpdates = {};
      if (this.unsubscribeLobbyMessages) {
        this.unsubscribeLobbyMessages();
        this.unsubscribeLobbyMessages = null;
      }
      if (this.unsubscribeLobbyUsers) {
        this.unsubscribeLobbyUsers();
        this.unsubscribeLobbyUsers = null;
      }
      if (this.unsubscribeLobbyData) {
        this.unsubscribeLobbyData();
        this.unsubscribeLobbyData = null;
      }
      this.sdk.p2pManager.disconnectP2P();
      if (currentLobbyId && this.lobbyUsers.length === 1) {
        const existingTimeout = this.resetMaybeBeingDeletedLobbyIdTimeouts.get(currentLobbyId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        this.maybeBeingDeletedLobbyIds.add(currentLobbyId);
        const timeoutId = setTimeout(() => {
          this.maybeBeingDeletedLobbyIds.delete(currentLobbyId);
          this.resetMaybeBeingDeletedLobbyIdTimeouts.delete(currentLobbyId);
        }, 500);
        this.resetMaybeBeingDeletedLobbyIdTimeouts.set(currentLobbyId, timeoutId);
      }
      this.lobbyUsers = [];
      this.lobbyHostId = null;
      this.lobbyMetadata = {};
      this.lobbyMessagesCursor = null;
      this.p2pUpdateQueue = Promise.resolve();
    }
    /**
     * Public method to clean up lobby state without emitting events
     * Used for session end cleanup
     */
    unsubscribeFromCurrentLobby() {
      this.cleanupLobbyState();
    }
    /**
     * Fully destroy the LobbyManager, cleaning up all subscriptions and timeouts.
     * Called during session end to ensure no lingering listeners.
     */
    destroy() {
      this.cleanupLobbyState();
      if (this.unsubscribeLobbyInvites) {
        this.unsubscribeLobbyInvites();
        this.unsubscribeLobbyInvites = null;
      }
      for (const timeoutId of this.resetMaybeBeingDeletedLobbyIdTimeouts.values()) {
        clearTimeout(timeoutId);
      }
      this.resetMaybeBeingDeletedLobbyIdTimeouts.clear();
      this.maybeBeingDeletedLobbyIds.clear();
      this.seenInviteIds.clear();
      this.cachedLobbies = {};
    }
    setMetadata() {
      if (this.inFlightMetadataUpdate !== null) return;
      if (this.lobbyId === null) return;
      if (Object.keys(this.pendingMetadataUpdates).length === 0) return;
      const lobbyId = this.lobbyId;
      const updates = this.pendingMetadataUpdates;
      this.pendingMetadataUpdates = {};
      this.inFlightMetadataUpdate = this.sdk.convexClient.mutation(api.sdk.gameLobby.setLobbyMetadata, { lobbyId, updates }).catch((error2) => {
        logger.error("Error updating lobby metadata:", error2);
        this.handleLobbyMutationError(lobbyId, error2);
      }).finally(() => {
        this.inFlightMetadataUpdate = null;
        if (Object.keys(this.pendingMetadataUpdates).length > 0) {
          this.throttledSetMetadata();
        }
      });
    }
    /**
     * (Re)subscribe to lobby messages from the current cursor: the latest 10
     * until we've emitted one, then only messages committed after the last.
     */
    subscribeToLobbyMessages(lobbyId) {
      const unsubscribePrevious = this.unsubscribeLobbyMessages;
      this.unsubscribeLobbyMessages = this.sdk.convexClient.onUpdate(
        api.sdk.gameLobby.syncLobbyMessages,
        this.lobbyMessagesCursor === null ? { lobbyId } : { lobbyId, after: this.lobbyMessagesCursor },
        (messages) => this.processMessageUpdates(lobbyId, messages),
        this.onLobbySubscriptionError
      );
      unsubscribePrevious?.();
    }
    processMessageUpdates(lobbyId, messages) {
      const cursor = this.lobbyMessagesCursor;
      const newMessages = cursor === null ? messages : messages.filter((message) => message.commitTs > cursor);
      if (newMessages.length === 0) return;
      this.lobbyMessagesCursor = newMessages[newMessages.length - 1].commitTs;
      this.subscribeToLobbyMessages(lobbyId);
      for (const { commitTs: _commitTs, ...message } of newMessages) {
        this.sdk.gameEventManager.notifyGame(
          WavedashEvents.LOBBY_MESSAGE,
          message
        );
      }
    }
    // ================
    // P2P Integration Methods
    // ================
    /**
     * Update P2P connections when lobby membership changes
     * @param newUsers - The updated list of lobby users
     */
    async updateP2PConnections(newUsers) {
      if (!this.lobbyId || !this.sdk.p2pManager.isMeshEnabled()) {
        return;
      }
      try {
        if (newUsers.length <= 1) {
          this.sdk.p2pManager.disconnectP2P();
          logger.debug("Only one user in lobby, P2P connections disconnected");
          return;
        }
        const wavedashUsers = newUsers.map((lobbyUser) => ({
          id: lobbyUser.userId,
          username: lobbyUser.username,
          avatarUrl: lobbyUser.userAvatarUrl
        }));
        await this.sdk.p2pManager.initializeP2PForCurrentLobby(
          this.lobbyId,
          wavedashUsers
        );
        logger.debug(
          `P2P connections updated for lobby ${this.lobbyId} with ${wavedashUsers.length} users`
        );
      } catch (error2) {
        logger.error("Error updating P2P connections:", error2);
      }
    }
  };
  _LobbyManager.METADATA_UPDATE_THROTTLE_MS = 150;
  var LobbyManager = _LobbyManager;
  var DEFAULT_P2P_CONFIG = {
    enableReliableChannel: true,
    enableUnreliableChannel: true,
    messageSize: 2048,
    maxIncomingMessages: 1024
  };
  var _P2PManager = class _P2PManager2 extends WavedashManager {
    constructor(sdk) {
      super(sdk);
      this.currentConnection = null;
      this.peerConnections = /* @__PURE__ */ new Map();
      this.reliableChannels = /* @__PURE__ */ new Map();
      this.unreliableChannels = /* @__PURE__ */ new Map();
      this.pendingIceCandidates = /* @__PURE__ */ new Map();
      this.iceRestartAttempts = /* @__PURE__ */ new Map();
      this.iceRestartInProgress = /* @__PURE__ */ new Set();
      this.iceRestartTimers = /* @__PURE__ */ new Map();
      this.MAX_ICE_RESTART_ATTEMPTS = 6;
      this.ICE_RESTART_BASE_TIMEOUT_MS = 1e4;
      this.ICE_RESTART_MAX_TIMEOUT_MS = 3e4;
      this.ICE_DISCONNECTED_GRACE_MS = 2e4;
      this.currentOfferIds = /* @__PURE__ */ new Map();
      this.answeringOffers = /* @__PURE__ */ new WeakMap();
      this.answeredOffers = /* @__PURE__ */ new WeakMap();
      this.applyingAnswers = /* @__PURE__ */ new WeakSet();
      this.candidateBatchPeers = /* @__PURE__ */ new Set();
      this.queuedIceCandidates = /* @__PURE__ */ new Map();
      this.iceCandidateSendsInFlight = /* @__PURE__ */ new Set();
      this.reconnectingPeers = /* @__PURE__ */ new Set();
      this.establishedPeers = /* @__PURE__ */ new Set();
      this.packetDropTrackers = /* @__PURE__ */ new Map();
      this.PACKET_DROP_WINDOW_MS = 500;
      this.turnCredentials = null;
      this.turnCredentialsInitPromise = null;
      this.unsubscribeFromSignalingMessages = null;
      this.signalingCursor = null;
      this.initializationInProgress = null;
      this.initializationLobbyId = null;
      this.signalingSubscriptionReady = null;
      this.signalingSubscriptionReadyResolver = null;
      this.channelQueues = /* @__PURE__ */ new Map();
      this.MESSAGE_SLOT_HEADER_SIZE = 4;
      this.MAX_CHANNELS = 8;
      this.USERID_SIZE = 32;
      this.CHANNEL_SIZE = 4;
      this.DATALENGTH_SIZE = 4;
      this.CHANNEL_OFFSET = this.USERID_SIZE;
      this.DATALENGTH_OFFSET = this.USERID_SIZE + this.CHANNEL_SIZE;
      this.PAYLOAD_OFFSET = this.USERID_SIZE + this.CHANNEL_SIZE + this.DATALENGTH_SIZE;
      this.WIRE_CHANNEL_SIZE = 1;
      this.WIRE_CHANNEL_OFFSET = 0;
      this.WIRE_PAYLOAD_OFFSET = this.WIRE_CHANNEL_SIZE;
      this.textEncoder = new TextEncoder();
      this.textDecoder = new TextDecoder();
      this.initialized = false;
      this.config = { ...DEFAULT_P2P_CONFIG };
    }
    destroy() {
      this.disconnectP2P();
    }
    ensureInitialized() {
      if (!this.initialized) {
        this.init();
      }
    }
    init(config) {
      if (this.initialized && !config) return;
      this.config = { ...DEFAULT_P2P_CONFIG, ...config };
      const minMessageSize = this.MESSAGE_SLOT_HEADER_SIZE + this.PAYLOAD_OFFSET + 1;
      const rawMessageSize = this.config.messageSize;
      const rawQueueSize = this.config.maxIncomingMessages;
      if (rawMessageSize < minMessageSize) {
        throw new Error(
          `P2P messageSize must be at least ${minMessageSize} bytes (got ${rawMessageSize})`
        );
      }
      if (rawMessageSize > _P2PManager2.MAX_MESSAGE_SIZE) {
        console.warn(
          `P2P messageSize ${rawMessageSize} exceeds max ${_P2PManager2.MAX_MESSAGE_SIZE}, clamping to ${_P2PManager2.MAX_MESSAGE_SIZE}`
        );
      }
      if (rawQueueSize < 1) {
        throw new Error(
          `P2P maxIncomingMessages must be at least 1 (got ${rawQueueSize})`
        );
      }
      this.MESSAGE_SIZE = Math.min(rawMessageSize, _P2PManager2.MAX_MESSAGE_SIZE);
      this.QUEUE_SIZE = rawQueueSize;
      this.MAX_PAYLOAD_SIZE = this.MESSAGE_SIZE - this.MESSAGE_SLOT_HEADER_SIZE - this.PAYLOAD_OFFSET;
      this.outgoingMessageBuffer = new Uint8Array(this.MAX_PAYLOAD_SIZE);
      const worstCaseMemory = this.MESSAGE_SIZE * this.QUEUE_SIZE * this.MAX_CHANNELS;
      if (worstCaseMemory > _P2PManager2.MEMORY_WARNING_THRESHOLD_BYTES) {
        console.warn(
          `P2P ring buffer memory could reach ${(worstCaseMemory / 1024 / 1024).toFixed(1)}MB if all ${this.MAX_CHANNELS} channels are used (messageSize=${this.MESSAGE_SIZE} x maxIncomingMessages=${this.QUEUE_SIZE} per channel). Consider reducing maxIncomingMessages if memory is a concern.`
        );
      }
      this.initialized = true;
    }
    // ================
    // Connection Setup
    // ================
    // With both channel types disabled there's nothing a connection could carry,
    // so the game gets no mesh at all: no signaling, no TURN credentials, no
    // peer connections. For games that network some other way (e.g. a
    // dedicated server), where a mesh across a large lobby is pure overhead.
    isMeshEnabled() {
      return this.config.enableReliableChannel || this.config.enableUnreliableChannel;
    }
    async initializeP2PForCurrentLobby(lobbyId, members) {
      this.ensureInitialized();
      if (!this.isMeshEnabled()) {
        logger.debug("P2P channels disabled, skipping P2P setup for lobby");
        return null;
      }
      if (this.currentConnection && this.currentConnection.lobbyId === lobbyId) {
        return this.updateP2PConnection(members);
      }
      if (this.initializationInProgress && this.initializationLobbyId === lobbyId) {
        logger.debug("P2P initialization already in progress, waiting...");
        await this.initializationInProgress;
        if (this.currentConnection) {
          return this.updateP2PConnection(members);
        }
      }
      this.initializationLobbyId = lobbyId;
      this.initializationInProgress = this.doInitializeP2P(lobbyId, members);
      try {
        return await this.initializationInProgress;
      } finally {
        this.initializationInProgress = null;
        this.initializationLobbyId = null;
      }
    }
    /**
     * Internal method that performs the actual P2P initialization.
     * Called by initializeP2PForCurrentLobby with proper locking.
     */
    async doInitializeP2P(lobbyId, members) {
      const connection = {
        lobbyId,
        peers: {}
      };
      members.forEach((member) => {
        if (member.id !== this.sdk.getUserId()) {
          connection.peers[member.id] = {
            userId: member.id,
            username: member.username
          };
        }
      });
      this.currentConnection = connection;
      await this.establishWebRTCConnections(connection);
      return connection;
    }
    /**
     * Get ICE servers, initializing TURN credentials if necessary.
     * Uses a promise to debounce concurrent calls and prevent race conditions.
     */
    async getIceServers() {
      const CREDENTIALS_EXPIRY_BUFFER_MS = 1e3 * 60 * 60;
      if (this.turnCredentials && this.turnCredentials.expiresAt > Date.now() + CREDENTIALS_EXPIRY_BUFFER_MS) {
        return this.turnCredentials.iceServers;
      }
      if (this.turnCredentialsInitPromise) {
        await this.turnCredentialsInitPromise;
        return this.turnCredentials?.iceServers ?? null;
      }
      this.turnCredentialsInitPromise = (async () => {
        try {
          this.turnCredentials = await this.sdk.convexClient.action(
            api.sdk.turnCredentials.getOrCreate,
            {}
          );
        } finally {
          this.turnCredentialsInitPromise = null;
        }
      })();
      await this.turnCredentialsInitPromise;
      return this.turnCredentials?.iceServers ?? null;
    }
    async updateP2PConnection(members) {
      if (!this.currentConnection) {
        throw new Error("No existing P2P connection to update");
      }
      logger.debug("Updating P2P connection with new member list");
      const currentPeerUserIds = new Set(
        Object.keys(this.currentConnection.peers)
      );
      currentPeerUserIds.add(this.sdk.getUserId());
      const newPeerUserIds = new Set(members.map((member) => member.id));
      for (const userId of Object.keys(
        this.currentConnection.peers
      )) {
        if (!newPeerUserIds.has(userId)) {
          const peer = this.currentConnection.peers[userId];
          logger.debug(`Peer left: ${peer.username} (${userId})`);
          this.dropPeerConnection(userId);
          this.reconnectingPeers.delete(userId);
          this.establishedPeers.delete(userId);
          delete this.currentConnection.peers[userId];
        }
      }
      const connectionsToCreate = [];
      for (const member of members) {
        if (member.id === this.sdk.getUserId()) continue;
        const existingPeer = this.currentConnection.peers[member.id];
        if (existingPeer) {
          if (!existingPeer.username && member.username) {
            existingPeer.username = member.username;
          }
          if (!this.peerConnections.has(member.id)) {
            logger.debug(
              `Reconnecting to peer ${member.id} with a new connection`
            );
            connectionsToCreate.push(member.id);
          }
        } else {
          logger.debug(`Adding new peer: ${member.username} (${member.id})`);
          this.currentConnection.peers[member.id] = {
            userId: member.id,
            username: member.username
          };
          connectionsToCreate.push(member.id);
        }
      }
      if (connectionsToCreate.length > 0) {
        const currentUserId = this.sdk.getUserId();
        const connectionPromises = connectionsToCreate.map((userId) => {
          const shouldCreateChannels = currentUserId < userId;
          logger.debug(
            `Creating connection to new peer ${userId}, shouldCreateChannels: ${shouldCreateChannels}`
          );
          return this.createPeerConnection(
            userId,
            this.currentConnection,
            shouldCreateChannels
          );
        });
        await Promise.all(connectionPromises);
        const peersToInitiate = connectionsToCreate.filter(
          (userId) => currentUserId < userId
        );
        if (peersToInitiate.length > 0) {
          const offerPromises = peersToInitiate.map((userId) => {
            logger.debug(
              `Initiating offer to new peer ${userId} (lower userId rule)`
            );
            return this.createOfferToPeer(userId);
          });
          await Promise.all(offerPromises);
          logger.debug(`Initiated ${offerPromises.length} offers to new peers`);
        }
      }
      return this.currentConnection;
    }
    async establishWebRTCConnections(connection) {
      this.subscribeToSignalingMessages(connection);
      if (this.signalingSubscriptionReady) {
        await this.signalingSubscriptionReady;
        logger.debug("Signaling subscription confirmed ready");
      }
      await this.establishPeerConnections(connection);
    }
    /**
     * Start a new signaling session (on lobby join): only messages committed
     * after `joinCommitTs` are delivered.
     */
    setSignalingCursor(joinCommitTs) {
      this.signalingCursor = joinCommitTs;
    }
    subscribeToSignalingMessages(connection) {
      this.signalingSubscriptionReady = new Promise((resolve) => {
        this.signalingSubscriptionReadyResolver = resolve;
      });
      this.subscribeToSignalingMessagesAfterCursor(connection);
    }
    /**
     * (Re)subscribe from the current cursor, so each query only reads and sends
     * messages newer than what we've already handled.
     */
    subscribeToSignalingMessagesAfterCursor(connection) {
      const unsubscribePrevious = this.unsubscribeFromSignalingMessages;
      this.unsubscribeFromSignalingMessages = this.sdk.convexClient.onUpdate(
        api.sdk.p2pSignaling.getSignalingMessages,
        { lobbyId: connection.lobbyId, after: this.signalingCursor },
        (messages) => {
          this.signalingSubscriptionReadyResolver?.();
          this.signalingSubscriptionReadyResolver = null;
          if (messages) {
            this.processSignalingMessages(messages, connection);
          }
        }
      );
      unsubscribePrevious?.();
    }
    stopSignalingMessageSubscription() {
      if (this.unsubscribeFromSignalingMessages !== null) {
        this.unsubscribeFromSignalingMessages();
        this.unsubscribeFromSignalingMessages = null;
      }
    }
    async processSignalingMessages(messages, connection) {
      const newMessages = messages.filter(
        (message) => message.commitTs > this.signalingCursor
      );
      if (newMessages.length === 0) return;
      this.signalingCursor = newMessages[newMessages.length - 1].commitTs;
      this.subscribeToSignalingMessagesAfterCursor(connection);
      for (const message of newMessages) {
        try {
          await this.handleSignalingMessage(message, connection);
        } catch (error2) {
          logger.error("Error handling signaling message:", error2);
        }
      }
    }
    async handleSignalingMessage(message, connection) {
      if (message.fromUserId === this.sdk.getUserId()) {
        return;
      }
      const remoteUserId = message.fromUserId;
      if (!this.peerConnections.has(remoteUserId)) {
        if (message.messageType === P2P_SIGNALING_MESSAGE_TYPE.OFFER) {
          logger.debug(
            `Received offer from ${remoteUserId} before peer connection exists, creating on-demand`
          );
          if (!connection.peers[remoteUserId]) {
            connection.peers[remoteUserId] = {
              userId: remoteUserId,
              username: ""
              // Will be updated when member list arrives
            };
          }
          const success = await this.createPeerConnection(
            remoteUserId,
            connection,
            false
            // shouldCreateChannels = false, we'll receive them via ondatachannel
          );
          if (!success) {
            logger.error(
              `Failed to create on-demand peer connection for ${remoteUserId}`
            );
            return;
          }
        } else {
          logger.warn(
            `No peer connection for user ${remoteUserId}, dropping ${message.messageType} message`
          );
          return;
        }
      }
      const pc = this.peerConnections.get(remoteUserId);
      switch (message.messageType) {
        case P2P_SIGNALING_MESSAGE_TYPE.OFFER: {
          this.iceRestartInProgress.delete(remoteUserId);
          const offerData = message.data;
          const { offerId } = offerData;
          if (offerId !== void 0 && this.answeringOffers.get(pc) === offerId) {
            logger.debug(
              `Ignoring copy of offer ${offerId} from peer ${remoteUserId}, already answering it`
            );
            await this.addRemoteIceCandidates(
              remoteUserId,
              pc,
              this.candidatesInSdp(offerData.sdp ?? "")
            );
            break;
          }
          if (offerId !== void 0 && this.answeredOffers.get(pc) === offerId && pc.signalingState === "stable" && pc.localDescription?.type === "answer") {
            logger.debug(
              `Resending answer to offer ${offerId} from peer ${remoteUserId}`
            );
            this.updateCandidateBatching(remoteUserId, offerData);
            await this.addRemoteIceCandidates(
              remoteUserId,
              pc,
              this.candidatesInSdp(offerData.sdp ?? "")
            );
            const answerData = {
              type: "answer",
              sdp: pc.localDescription.sdp,
              offerId,
              acceptsCandidateBatches: true
            };
            await this.sendSignalingMessage(remoteUserId, {
              type: P2P_SIGNALING_MESSAGE_TYPE.ANSWER,
              data: answerData
            });
            break;
          }
          logger.debug(`Processing offer from peer ${remoteUserId}:`);
          if (offerId !== void 0) this.answeringOffers.set(pc, offerId);
          try {
            this.updateCandidateBatching(remoteUserId, offerData);
            await pc.setRemoteDescription(
              new RTCSessionDescription({
                type: offerData.type,
                sdp: offerData.sdp
              })
            );
            await this.flushPendingIceCandidates(remoteUserId, pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (offerId !== void 0) {
              this.answeredOffers.set(pc, offerId);
            } else {
              this.answeredOffers.delete(pc);
            }
            logger.debug(`  Answer created, waiting for ondatachannel events...`);
            const answerData = {
              type: answer.type,
              sdp: answer.sdp,
              offerId,
              acceptsCandidateBatches: true
            };
            await this.sendSignalingMessage(remoteUserId, {
              type: P2P_SIGNALING_MESSAGE_TYPE.ANSWER,
              data: answerData
            });
          } finally {
            if (this.answeringOffers.get(pc) === offerId) {
              this.answeringOffers.delete(pc);
            }
          }
          break;
        }
        case P2P_SIGNALING_MESSAGE_TYPE.ANSWER: {
          const answerData = message.data;
          if (pc.signalingState !== "have-local-offer") {
            logger.debug(
              `Ignoring answer from peer ${remoteUserId} in signaling state ${pc.signalingState}`
            );
            break;
          }
          if (answerData.offerId !== void 0 && answerData.offerId !== this.currentOfferIds.get(remoteUserId)) {
            logger.debug(
              `Ignoring answer from peer ${remoteUserId} to superseded offer ${answerData.offerId}`
            );
            break;
          }
          if (this.applyingAnswers.has(pc)) {
            logger.debug(
              `Ignoring copy of answer from peer ${remoteUserId}, already applying one`
            );
            break;
          }
          this.applyingAnswers.add(pc);
          try {
            this.updateCandidateBatching(remoteUserId, answerData);
            await pc.setRemoteDescription(
              new RTCSessionDescription({
                type: answerData.type,
                sdp: answerData.sdp
              })
            );
            await this.flushPendingIceCandidates(remoteUserId, pc);
          } finally {
            this.applyingAnswers.delete(pc);
          }
          break;
        }
        case P2P_SIGNALING_MESSAGE_TYPE.ICE_CANDIDATE: {
          const data = message.data;
          await this.addRemoteIceCandidates(
            remoteUserId,
            pc,
            "candidates" in data ? JSON.parse(data.candidates) : [data]
          );
          break;
        }
        default:
          logger.warn("Unknown signaling message type:", message.messageType);
      }
    }
    /**
     * Add a peer's ICE candidates, buffering them until its remote description
     * is set. Each is added on its own, so one bad candidate doesn't cost the
     * rest; re-adding one the pc already has is a harmless no-op.
     */
    async addRemoteIceCandidates(remoteUserId, pc, candidates) {
      for (const iceData of candidates) {
        if (!pc.remoteDescription) {
          const pending = this.pendingIceCandidates.get(remoteUserId) || [];
          pending.push(iceData);
          this.pendingIceCandidates.set(remoteUserId, pending);
          logger.debug(
            `Buffered ICE candidate for ${remoteUserId} (remote description not yet set, ${pending.length} buffered)`
          );
        } else {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(iceData));
          } catch (error2) {
            logger.warn(
              `Failed to add ICE candidate for ${remoteUserId}:`,
              error2
            );
          }
        }
      }
    }
    /**
     * The candidates inside an SDP (a=candidate lines), as the peer would have
     * trickled them. Each carries its section's ICE ufrag, so a browser rejects
     * it (rather than applying it to other credentials) if that SDP is no longer
     * the pc's remote description by the time it's added.
     */
    candidatesInSdp(sdp) {
      const [session, ...mediaSections] = sdp.split(/\r?\n(?=m=)/);
      const ufragIn = (section) => /^a=ice-ufrag:(\S+)/m.exec(section)?.[1];
      return mediaSections.flatMap((section, sdpMLineIndex) => {
        const usernameFragment = ufragIn(section) ?? ufragIn(session) ?? null;
        return section.split(/\r?\n/).filter((line) => line.startsWith("a=candidate:")).map((line) => ({
          candidate: line.slice("a=".length),
          sdpMLineIndex,
          usernameFragment
        }));
      });
    }
    /**
     * Flush any buffered ICE candidates for a peer after remote description is set.
     * This handles the race condition where ICE candidates arrive before the offer/answer.
     */
    async flushPendingIceCandidates(remoteUserId, pc) {
      const pending = this.pendingIceCandidates.get(remoteUserId);
      if (pending && pending.length > 0) {
        for (const candidate of pending) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error2) {
            logger.warn(
              `Failed to add buffered ICE candidate for ${remoteUserId}:`,
              error2
            );
          }
        }
        this.pendingIceCandidates.delete(remoteUserId);
      }
    }
    async establishPeerConnections(connection) {
      logger.debug("Establishing WebRTC connections to peers...");
      const currentUserId = this.sdk.getUserId();
      const connectionPromises = [];
      Object.entries(connection.peers).forEach(
        ([userId, peer]) => {
          const shouldCreateChannels = currentUserId < userId;
          logger.debug(
            `Creating connection to peer ${userId} (${peer.username}), shouldCreateChannels: ${shouldCreateChannels}`
          );
          connectionPromises.push(
            this.createPeerConnection(userId, connection, shouldCreateChannels)
          );
        }
      );
      await Promise.all(connectionPromises);
      const peersToInitiate = Object.keys(connection.peers).filter(
        (userId) => currentUserId < userId
      );
      if (peersToInitiate.length > 0) {
        const offerPromises = peersToInitiate.map((userId) => {
          logger.debug(`Initiating offer to peer ${userId} (lower userId rule)`);
          return this.createOfferToPeer(userId);
        });
        await Promise.all(offerPromises);
        logger.debug(
          `Created ${connectionPromises.length} peer connections and initiated ${offerPromises.length} offers`
        );
      } else {
        logger.debug(
          `Created ${connectionPromises.length} peer connections, no offers to initiate`
        );
      }
    }
    async createOfferToPeer(remoteUserId) {
      const pc = this.peerConnections.get(remoteUserId);
      if (!pc) {
        throw new Error(`No peer connection for user ${remoteUserId}`);
      }
      const reliableChannel = this.reliableChannels.get(remoteUserId);
      const unreliableChannel = this.unreliableChannels.get(remoteUserId);
      logger.debug(`Creating offer to peer ${remoteUserId}:`);
      logger.debug(
        `  Reliable channel state: ${reliableChannel?.readyState || "none"}`
      );
      logger.debug(
        `  Unreliable channel state: ${unreliableChannel?.readyState || "none"}`
      );
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const offerId = crypto.randomUUID();
      this.currentOfferIds.set(remoteUserId, offerId);
      this.scheduleIceRetry(remoteUserId, pc, this.ICE_RESTART_BASE_TIMEOUT_MS);
      const offerData = {
        type: offer.type,
        sdp: offer.sdp,
        offerId,
        acceptsCandidateBatches: true
      };
      await this.sendSignalingMessage(remoteUserId, {
        type: P2P_SIGNALING_MESSAGE_TYPE.OFFER,
        data: offerData
      });
    }
    async createPeerConnection(remoteUserId, connection, shouldCreateChannels = false) {
      const iceServers = await this.getIceServers();
      if (this.currentConnection !== connection) return false;
      if (!connection.peers[remoteUserId]) return false;
      if (this.peerConnections.has(remoteUserId)) return true;
      if (!iceServers) {
        logger.error(`No ICE servers available for peer ${remoteUserId}`);
        this.sdk.gameEventManager.notifyGame(
          WavedashEvents.P2P_CONNECTION_FAILED,
          {
            userId: remoteUserId,
            username: connection.peers[remoteUserId]?.username || "",
            error: "No ICE servers available"
          }
        );
        return false;
      }
      const pc = new RTCPeerConnection({
        iceServers,
        // Disable candidate pre-gathering - gather ICE candidates only after setLocalDescription()
        // This ensures proper sequencing and avoids race conditions at the cost of
        // slightly slower initial connection (more reliable)
        iceCandidatePoolSize: 0,
        // Allow all IP addresses (helpful for same-device testing)
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require"
      });
      if (shouldCreateChannels) {
        logger.debug(`Creating data channels for peer ${remoteUserId}`);
        if (this.config.enableReliableChannel) {
          const reliableChannel = pc.createDataChannel("reliable", {
            ordered: true,
            maxRetransmits: void 0
            // Full reliability, will retransmit until received
          });
          this.reliableChannels.set(remoteUserId, reliableChannel);
          this.setupDataChannelHandlers(
            reliableChannel,
            remoteUserId,
            "reliable"
          );
        }
        if (this.config.enableUnreliableChannel) {
          const unreliableChannel = pc.createDataChannel("unreliable", {
            ordered: false,
            maxRetransmits: 0
            // No retransmits, will drop if not received
          });
          this.unreliableChannels.set(remoteUserId, unreliableChannel);
          this.setupDataChannelHandlers(
            unreliableChannel,
            remoteUserId,
            "unreliable"
          );
        }
      } else {
        logger.debug(
          `Will receive data channels from peer ${remoteUserId} via ondatachannel`
        );
      }
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidateType = event.candidate.candidate.includes("typ host") ? "host" : event.candidate.candidate.includes("typ srflx") ? "srflx (STUN)" : event.candidate.candidate.includes("typ relay") ? "relay (TURN)" : "unknown";
          logger.debug(
            `Peer ${remoteUserId} gathered ICE candidate: ${candidateType}`
          );
          logger.debug(`  Candidate: ${event.candidate.candidate}`);
          const candidateData = {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment
          };
          if (this.candidateBatchPeers.has(remoteUserId)) {
            this.queueIceCandidate(remoteUserId, pc, candidateData);
            return;
          }
          this.sendSignalingMessage(remoteUserId, {
            type: P2P_SIGNALING_MESSAGE_TYPE.ICE_CANDIDATE,
            data: candidateData
          });
        }
      };
      pc.ondatachannel = (event) => {
        const channel = event.channel;
        logger.debug(
          `Received ${channel.label} data channel from peer ${remoteUserId}`
        );
        if (channel.label === "reliable") {
          this.reliableChannels.set(remoteUserId, channel);
        } else if (channel.label === "unreliable") {
          this.unreliableChannels.set(remoteUserId, channel);
        }
        this.setupDataChannelHandlers(
          channel,
          remoteUserId,
          channel.label
        );
      };
      pc.onconnectionstatechange = () => {
        logger.debug(
          `Peer ${remoteUserId} connection state: ${pc.connectionState}`
        );
        if (pc.connectionState === "connected") {
          logger.debug(
            `  Peer ${remoteUserId} fully connected, expecting ondatachannel events now...`
          );
        }
      };
      pc.oniceconnectionstatechange = () => {
        logger.debug(
          `Peer ${remoteUserId} ICE connection state: ${pc.iceConnectionState}`
        );
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          logger.debug(
            `  ICE connected to peer ${remoteUserId}, data channels should be available...`
          );
          this.iceRestartAttempts.delete(remoteUserId);
          this.iceRestartInProgress.delete(remoteUserId);
          this.clearIceRestartTimer(remoteUserId);
          if (this.reconnectingPeers.delete(remoteUserId)) {
            const peer = this.currentConnection?.peers[remoteUserId];
            if (peer) {
              this.sdk.gameEventManager.notifyGame(
                WavedashEvents.P2P_PEER_RECONNECTED,
                {
                  userId: peer.userId,
                  username: peer.username
                }
              );
            }
          }
        } else if (pc.iceConnectionState === "failed") {
          logger.debug(
            `ICE connection to peer ${remoteUserId} failed, will retry in 500ms...`
          );
          this.markPeerReconnecting(remoteUserId);
          setTimeout(() => {
            if (pc.iceConnectionState === "failed") {
              logger.warn(
                `ICE connection to peer ${remoteUserId} still failed after delay, attempting ICE restart...`
              );
              this.attemptIceRestart(remoteUserId, pc);
            }
          }, 500);
        } else if (pc.iceConnectionState === "disconnected") {
          logger.debug(
            `ICE connection to peer ${remoteUserId} disconnected, restarting ICE if not recovered in ${this.ICE_DISCONNECTED_GRACE_MS}ms...`
          );
          setTimeout(() => {
            if (this.peerConnections.get(remoteUserId) === pc && pc.iceConnectionState === "disconnected") {
              logger.warn(
                `ICE connection to peer ${remoteUserId} still disconnected after ${this.ICE_DISCONNECTED_GRACE_MS}ms, attempting ICE restart...`
              );
              this.markPeerReconnecting(remoteUserId);
              this.attemptIceRestart(remoteUserId, pc);
            }
          }, this.ICE_DISCONNECTED_GRACE_MS);
        }
      };
      pc.onicegatheringstatechange = () => {
        logger.debug(
          `Peer ${remoteUserId} ICE gathering state: ${pc.iceGatheringState}`
        );
      };
      this.peerConnections.set(remoteUserId, pc);
      return true;
    }
    updateCandidateBatching(remoteUserId, description) {
      if (description.acceptsCandidateBatches) {
        this.candidateBatchPeers.add(remoteUserId);
      } else {
        this.candidateBatchPeers.delete(remoteUserId);
      }
    }
    queueIceCandidate(remoteUserId, pc, candidate) {
      const queued = this.queuedIceCandidates.get(pc);
      if (queued) {
        queued.push(candidate);
      } else {
        this.queuedIceCandidates.set(pc, [candidate]);
      }
      if (!this.iceCandidateSendsInFlight.has(pc)) {
        this.sendQueuedIceCandidates(remoteUserId, pc);
      }
    }
    /**
     * Send everything queued for a peer connection as one message, then repeat
     * for whatever was queued while that send was in flight, until none is left
     * or the connection has been replaced.
     */
    async sendQueuedIceCandidates(remoteUserId, pc) {
      this.iceCandidateSendsInFlight.add(pc);
      try {
        let batch = this.queuedIceCandidates.get(pc);
        while (batch && this.peerConnections.get(remoteUserId) === pc) {
          this.queuedIceCandidates.delete(pc);
          await this.sendSignalingMessage(remoteUserId, {
            type: P2P_SIGNALING_MESSAGE_TYPE.ICE_CANDIDATE,
            data: { candidates: JSON.stringify(batch) }
          });
          batch = this.queuedIceCandidates.get(pc);
        }
      } catch {
      } finally {
        this.iceCandidateSendsInFlight.delete(pc);
      }
    }
    /**
     * Attempt to restart ICE when connection fails.
     * Only the peer with the lower userId initiates the restart to avoid conflicts.
     */
    async attemptIceRestart(remoteUserId, pc) {
      if (this.peerConnections.get(remoteUserId) !== pc) return;
      const currentUserId = this.sdk.getUserId();
      if (currentUserId > remoteUserId) {
        logger.debug(
          `Waiting for peer ${remoteUserId} to initiate ICE restart (they have lower userId)`
        );
        return;
      }
      if (this.iceRestartInProgress.has(remoteUserId)) {
        logger.debug(
          `ICE restart already in progress for peer ${remoteUserId}, skipping`
        );
        return;
      }
      const attempts = this.iceRestartAttempts.get(remoteUserId) || 0;
      if (attempts >= this.MAX_ICE_RESTART_ATTEMPTS) {
        this.clearIceRestartTimer(remoteUserId);
        logger.error(
          `Max ICE restart attempts (${this.MAX_ICE_RESTART_ATTEMPTS}) reached for peer ${remoteUserId}, giving up`
        );
        this.reconnectingPeers.delete(remoteUserId);
        this.establishedPeers.delete(remoteUserId);
        const peer = this.currentConnection?.peers[remoteUserId];
        if (peer) {
          this.sdk.gameEventManager.notifyGame(
            WavedashEvents.P2P_CONNECTION_FAILED,
            {
              userId: peer.userId,
              username: peer.username,
              error: "ICE restart failed after maximum attempts"
            }
          );
        }
        this.dropPeerConnection(remoteUserId);
        return;
      }
      this.iceRestartAttempts.set(remoteUserId, attempts + 1);
      this.iceRestartInProgress.add(remoteUserId);
      logger.debug(
        `ICE restart attempt ${attempts + 1}/${this.MAX_ICE_RESTART_ATTEMPTS} for peer ${remoteUserId}`
      );
      try {
        if (pc.signalingState === "have-local-offer") {
          const offerData = {
            type: "offer",
            sdp: pc.localDescription.sdp,
            offerId: this.currentOfferIds.get(remoteUserId),
            acceptsCandidateBatches: true
          };
          await this.sendSignalingMessage(remoteUserId, {
            type: P2P_SIGNALING_MESSAGE_TYPE.OFFER,
            data: offerData
          });
          logger.debug(`Unanswered offer resent to peer ${remoteUserId}`);
        } else {
          pc.restartIce();
          const offer = await pc.createOffer({ iceRestart: true });
          await pc.setLocalDescription(offer);
          const offerId = crypto.randomUUID();
          this.currentOfferIds.set(remoteUserId, offerId);
          const offerData = {
            type: offer.type,
            sdp: offer.sdp,
            offerId,
            acceptsCandidateBatches: true
          };
          await this.sendSignalingMessage(remoteUserId, {
            type: P2P_SIGNALING_MESSAGE_TYPE.OFFER,
            data: offerData
          });
          logger.debug(`ICE restart offer sent to peer ${remoteUserId}`);
        }
      } catch (error2) {
        logger.error(
          `Failed to initiate ICE restart for peer ${remoteUserId}:`,
          error2
        );
      }
      this.scheduleIceRetry(
        remoteUserId,
        pc,
        Math.min(
          this.ICE_RESTART_BASE_TIMEOUT_MS * 2 ** attempts,
          this.ICE_RESTART_MAX_TIMEOUT_MS
        )
      );
    }
    /**
     * Make the next ICE restart attempt (or give up) if ICE to this peer still
     * isn't connected after `timeout`. Replaces any retry already scheduled.
     */
    scheduleIceRetry(remoteUserId, pc, timeout) {
      this.clearIceRestartTimer(remoteUserId);
      this.iceRestartTimers.set(
        remoteUserId,
        setTimeout(() => {
          this.iceRestartTimers.delete(remoteUserId);
          if (this.peerConnections.get(remoteUserId) !== pc) return;
          if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
            return;
          }
          logger.debug(
            `ICE to peer ${remoteUserId} not connected after ${timeout}ms, retrying`
          );
          this.iceRestartInProgress.delete(remoteUserId);
          this.attemptIceRestart(remoteUserId, pc);
        }, timeout)
      );
    }
    clearIceRestartTimer(remoteUserId) {
      const timer = this.iceRestartTimers.get(remoteUserId);
      if (timer) {
        clearTimeout(timer);
        this.iceRestartTimers.delete(remoteUserId);
      }
    }
    markPeerReconnecting(remoteUserId) {
      if (this.reconnectingPeers.has(remoteUserId)) return;
      this.reconnectingPeers.add(remoteUserId);
      const peer = this.currentConnection?.peers[remoteUserId];
      if (peer) {
        this.sdk.gameEventManager.notifyGame(
          WavedashEvents.P2P_PEER_RECONNECTING,
          {
            userId: peer.userId,
            username: peer.username
          }
        );
      }
    }
    /**
     * Close and forget a peer's connection and everything tied to it, but keep
     * them as a member: a later member update (or their offer) connects afresh.
     * Channel maps are cleared before closing, so the closing channels'
     * onclose handlers see they're no longer current.
     */
    dropPeerConnection(remoteUserId) {
      const pc = this.peerConnections.get(remoteUserId);
      this.peerConnections.delete(remoteUserId);
      this.reliableChannels.delete(remoteUserId);
      this.unreliableChannels.delete(remoteUserId);
      this.pendingIceCandidates.delete(remoteUserId);
      this.iceRestartAttempts.delete(remoteUserId);
      this.iceRestartInProgress.delete(remoteUserId);
      this.clearIceRestartTimer(remoteUserId);
      this.currentOfferIds.delete(remoteUserId);
      this.candidateBatchPeers.delete(remoteUserId);
      if (pc) this.queuedIceCandidates.delete(pc);
      pc?.close();
    }
    setupDataChannelHandlers(channel, remoteUserId, type) {
      channel.binaryType = "arraybuffer";
      channel.onopen = () => {
        logger.debug(`${type} data channel opened with peer ${remoteUserId}`);
        if (this.isPeerReady(remoteUserId) && !this.establishedPeers.has(remoteUserId)) {
          this.establishedPeers.add(remoteUserId);
          const peer = this.currentConnection?.peers[remoteUserId];
          if (peer) {
            this.sdk.gameEventManager.notifyGame(
              WavedashEvents.P2P_CONNECTION_ESTABLISHED,
              {
                userId: peer.userId,
                username: peer.username
              }
            );
          }
        }
      };
      channel.onmessage = (event) => {
        this.enqueueMessage(event.data, remoteUserId);
      };
      channel.onerror = (error2) => {
        logger.error(`Data channel error with peer ${remoteUserId}:`, error2);
        const peer = this.currentConnection?.peers[remoteUserId];
        if (peer) {
          this.sdk.gameEventManager.notifyGame(
            WavedashEvents.P2P_CONNECTION_FAILED,
            {
              userId: peer.userId,
              username: peer.username,
              error: error2.toString()
            }
          );
        }
      };
      channel.onclose = () => {
        logger.debug(`${type} data channel closed with peer ${remoteUserId}`);
        this.establishedPeers.delete(remoteUserId);
        this.reconnectingPeers.delete(remoteUserId);
        if (this.reliableChannels.get(remoteUserId) === channel || this.unreliableChannels.get(remoteUserId) === channel) {
          this.dropPeerConnection(remoteUserId);
        }
        const peer = this.currentConnection?.peers[remoteUserId];
        if (peer) {
          this.sdk.gameEventManager.notifyGame(
            WavedashEvents.P2P_PEER_DISCONNECTED,
            {
              userId: peer.userId,
              username: peer.username
            }
          );
        }
      };
    }
    // ================
    // Message Sending
    // ================
    sendP2PMessage(toUserId, appChannel = 0, reliable = true, payload, payloadSize = payload.length) {
      this.ensureInitialized();
      try {
        if (!this.currentConnection) {
          logger.error(
            `P2P send called before P2P is initialized, dropping message.`
          );
          this.reportPacketDrop(appChannel, "SEND", "PEER_NOT_READY");
          return false;
        }
        if (!payload) {
          logger.error(`P2P send called with missing payload, dropping message.`);
          this.reportPacketDrop(appChannel, "SEND", "INVALID_PAYLOAD_SIZE");
          return false;
        }
        if (!Number.isInteger(appChannel) || appChannel < 0 || appChannel >= this.MAX_CHANNELS) {
          logger.error(
            `P2P appChannel must be an integer in [0, ${this.MAX_CHANNELS}), received ${appChannel}, dropping message.`
          );
          this.reportPacketDrop(-1, "SEND", "INVALID_CHANNEL");
          return false;
        }
        if (payloadSize <= 0) {
          logger.error(
            `P2P payloadSize must be greater than 0, received ${payloadSize}, dropping message.`
          );
          this.reportPacketDrop(appChannel, "SEND", "INVALID_PAYLOAD_SIZE");
          return false;
        }
        if (payloadSize > this.MAX_PAYLOAD_SIZE) {
          logger.error(
            `P2P payload too large: ${payloadSize} bytes exceeds max ${this.MAX_PAYLOAD_SIZE} bytes, dropping message.`
          );
          this.reportPacketDrop(appChannel, "SEND", "PAYLOAD_TOO_LARGE");
          return false;
        }
        if (payloadSize > payload.length) {
          logger.error(
            `payloadSize is greater than payload buffer length: ${payloadSize} > ${payload.length}, dropping message.`
          );
          this.reportPacketDrop(appChannel, "SEND", "INVALID_PAYLOAD_SIZE");
          return false;
        }
        const data = payloadSize < payload.length ? payload.subarray(0, payloadSize) : payload;
        const messageData = this.encodeWireMessage(appChannel, data);
        const channelMap = reliable ? this.reliableChannels : this.unreliableChannels;
        if (toUserId === void 0) {
          channelMap.forEach((channel, peerUserId) => {
            if (channel.readyState !== "open") return;
            try {
              channel.send(messageData);
            } catch (error2) {
              logger.error(`P2P broadcast to peer ${peerUserId} failed:`, error2);
            }
          });
        } else {
          const channel = channelMap.get(toUserId);
          if (!channel || channel.readyState !== "open") {
            logger.error(
              `P2P no open channel to peer ${toUserId}, dropping message.`
            );
            this.reportPacketDrop(appChannel, "SEND", "PEER_NOT_READY");
            return false;
          }
          try {
            channel.send(messageData);
          } catch (error2) {
            logger.error(
              `P2P send to peer ${toUserId} failed, dropping message:`,
              error2
            );
            this.reportPacketDrop(appChannel, "SEND", "PEER_NOT_READY");
            return false;
          }
        }
        return true;
      } catch (error2) {
        logger.error(`Error sending P2P message:`, error2);
        return false;
      }
    }
    // ================================
    // P2P Signaling Handshake Messages
    // ================================
    async sendSignalingMessage(toUserId, message) {
      if (!this.currentConnection) {
        throw new Error("No active P2P connection for signaling");
      }
      try {
        await this.sdk.convexClient.mutation(
          api.sdk.p2pSignaling.sendSignalingMessage,
          {
            lobbyId: this.currentConnection.lobbyId,
            toUserId,
            messageType: message.type,
            data: message.data
          }
        );
        logger.debug("Sent signaling message:", message.type);
      } catch (error2) {
        logger.error("Failed to send signaling message:", error2);
        throw error2;
      }
    }
    // ===============
    // Cleanup
    // ===============
    disconnectP2P() {
      if (!this.currentConnection) {
        return;
      }
      this.stopSignalingMessageSubscription();
      Object.entries(this.currentConnection.peers).forEach(([userId, _]) => {
        const pc = this.peerConnections.get(userId);
        if (pc) {
          pc.close();
          this.peerConnections.delete(userId);
        }
        this.reliableChannels.delete(userId);
        this.unreliableChannels.delete(userId);
      });
      this.currentConnection = null;
      this.pendingIceCandidates.clear();
      this.iceRestartAttempts.clear();
      this.iceRestartInProgress.clear();
      this.iceRestartTimers.forEach((timer) => clearTimeout(timer));
      this.iceRestartTimers.clear();
      this.currentOfferIds.clear();
      this.candidateBatchPeers.clear();
      this.queuedIceCandidates.clear();
      this.reconnectingPeers.clear();
      this.establishedPeers.clear();
      this.clearPacketDropTrackers();
      this.initializationInProgress = null;
      this.initializationLobbyId = null;
      this.signalingSubscriptionReady = null;
      this.signalingSubscriptionReadyResolver = null;
    }
    // ===============
    // Helper Methods
    // ===============
    // Check if channels are ready for a specific peer
    isPeerReady(userId) {
      if (!this.currentConnection) return false;
      const reliableChannel = this.reliableChannels.get(userId);
      const unreliableChannel = this.unreliableChannels.get(userId);
      const reliableReady = !this.config.enableReliableChannel || reliableChannel?.readyState === "open";
      const unreliableReady = !this.config.enableUnreliableChannel || unreliableChannel?.readyState === "open";
      return reliableReady && unreliableReady;
    }
    // Check if a broadcast on the selected transport could reach a peer: that
    // channel type must be enabled and we must have a channel of it to someone.
    isBroadcastReady(reliable) {
      if (!this.currentConnection) return false;
      return reliable ? this.config.enableReliableChannel && this.reliableChannels.size > 0 : this.config.enableUnreliableChannel && this.unreliableChannels.size > 0;
    }
    // Get status of all peer connections
    getPeerStatuses() {
      if (!this.currentConnection) return {};
      const statuses = {};
      for (const userId of Object.keys(
        this.currentConnection.peers
      )) {
        const reliableChannel = this.reliableChannels.get(userId);
        const unreliableChannel = this.unreliableChannels.get(userId);
        statuses[userId] = {
          reliable: reliableChannel?.readyState,
          unreliable: unreliableChannel?.readyState,
          ready: this.isPeerReady(userId)
        };
      }
      return statuses;
    }
    // ================
    // Incoming Message Queues
    // ================
    // Lazily allocate an incoming ring buffer for the given channel.
    // Called from enqueueMessage when the first message arrives on a channel
    // that hasn't been used yet — games that never receive P2P traffic (or
    // only use a subset of channels) never pay for unused queues.
    createChannelQueue(channel) {
      const queueDataSize = this.MESSAGE_SIZE * this.QUEUE_SIZE;
      const buffer = new ArrayBuffer(queueDataSize);
      const incomingDataView = new Uint8Array(buffer);
      this.channelQueues.set(channel, {
        buffer,
        writeIndex: 0,
        readIndex: 0,
        messageCount: 0,
        incomingDataView
      });
      logger.debug(
        `Allocated P2P ring buffer for channel ${channel} (${(queueDataSize / 1024 / 1024).toFixed(1)}MB)`
      );
    }
    /**
     * Record a packet drop and emit P2P_PACKET_DROPPED with rate-limiting per
     * (channel, direction, reason) tuple. First drop on an idle tuple fires
     * immediately; subsequent drops within PACKET_DROP_WINDOW_MS are coalesced
     * into a single event at the end of the window.
     */
    reportPacketDrop(channel, direction, reason) {
      const key = `${direction}:${channel}:${reason}`;
      let tracker = this.packetDropTrackers.get(key);
      if (!tracker) {
        tracker = {
          channel,
          direction,
          reason,
          pendingCount: 0,
          windowTimer: null,
          droppedTotal: 0
        };
        this.packetDropTrackers.set(key, tracker);
      }
      tracker.droppedTotal += 1;
      if (tracker.windowTimer === null) {
        this.emitPacketDropped(tracker, 1);
        tracker.windowTimer = setTimeout(
          () => this.flushPacketDropWindow(key),
          this.PACKET_DROP_WINDOW_MS
        );
        return;
      }
      tracker.pendingCount += 1;
    }
    flushPacketDropWindow(key) {
      const tracker = this.packetDropTrackers.get(key);
      if (!tracker) return;
      if (tracker.pendingCount > 0) {
        const count = tracker.pendingCount;
        tracker.pendingCount = 0;
        this.emitPacketDropped(tracker, count);
        tracker.windowTimer = setTimeout(
          () => this.flushPacketDropWindow(key),
          this.PACKET_DROP_WINDOW_MS
        );
      } else {
        tracker.windowTimer = null;
      }
    }
    emitPacketDropped(tracker, droppedCount) {
      this.sdk.gameEventManager.notifyGame(WavedashEvents.P2P_PACKET_DROPPED, {
        channel: tracker.channel,
        direction: tracker.direction,
        reason: tracker.reason,
        droppedCount,
        droppedTotal: tracker.droppedTotal
      });
    }
    clearPacketDropTrackers() {
      for (const tracker of this.packetDropTrackers.values()) {
        if (tracker.windowTimer !== null) {
          clearTimeout(tracker.windowTimer);
        }
      }
      this.packetDropTrackers.clear();
    }
    enqueueMessage(wireData, fromUserId) {
      try {
        if (wireData.byteLength < this.WIRE_PAYLOAD_OFFSET) {
          logger.warn("Binary message too short to extract channel");
          this.reportPacketDrop(-1, "RECEIVE", "MALFORMED");
          return;
        }
        const wireBytes = new Uint8Array(wireData);
        const channel = wireBytes[this.WIRE_CHANNEL_OFFSET];
        if (!this.channelQueues.has(channel)) {
          if (channel >= this.MAX_CHANNELS) {
            logger.warn(
              `Channel ${channel} exceeds max channels (${this.MAX_CHANNELS}), dropping message`
            );
            this.reportPacketDrop(channel, "RECEIVE", "INVALID_CHANNEL");
            return;
          }
          this.createChannelQueue(channel);
        }
        const queue = this.channelQueues.get(channel);
        if (queue.messageCount >= this.QUEUE_SIZE) {
          logger.warn(
            `P2P message queue full for channel ${channel}, dropping message`
          );
          this.reportPacketDrop(channel, "RECEIVE", "QUEUE_FULL");
          return;
        }
        const payloadLength = wireData.byteLength - this.WIRE_PAYLOAD_OFFSET;
        const storedSize = this.PAYLOAD_OFFSET + payloadLength;
        const maxMessageSize = this.MESSAGE_SIZE - this.MESSAGE_SLOT_HEADER_SIZE;
        if (storedSize > maxMessageSize) {
          logger.warn(
            `Message too large for queue: ${storedSize} > ${maxMessageSize}, dropping message.`
          );
          this.reportPacketDrop(channel, "RECEIVE", "PAYLOAD_TOO_LARGE");
          return;
        }
        const writeOffset = queue.writeIndex * this.MESSAGE_SIZE;
        const slotContentOffset = writeOffset + this.MESSAGE_SLOT_HEADER_SIZE;
        const slotView = new DataView(
          queue.buffer,
          writeOffset,
          this.MESSAGE_SIZE
        );
        slotView.setUint32(0, storedSize, true);
        const fromUserIdBytes = this.textEncoder.encode(fromUserId).slice(0, this.USERID_SIZE);
        queue.incomingDataView.fill(
          0,
          slotContentOffset,
          slotContentOffset + this.USERID_SIZE
        );
        queue.incomingDataView.set(fromUserIdBytes, slotContentOffset);
        slotView.setUint32(
          this.MESSAGE_SLOT_HEADER_SIZE + this.CHANNEL_OFFSET,
          channel,
          true
        );
        slotView.setUint32(
          this.MESSAGE_SLOT_HEADER_SIZE + this.DATALENGTH_OFFSET,
          payloadLength,
          true
        );
        if (payloadLength > 0) {
          queue.incomingDataView.set(
            wireBytes.subarray(this.WIRE_PAYLOAD_OFFSET),
            slotContentOffset + this.PAYLOAD_OFFSET
          );
        }
        queue.writeIndex = (queue.writeIndex + 1) % this.QUEUE_SIZE;
        queue.messageCount++;
      } catch (error2) {
        logger.error(`Error enqueuing binary P2P message:`, error2);
      }
    }
    // Returns the max payload size (what game engines should report as max packet size)
    getMaxPayloadSize() {
      this.ensureInitialized();
      return this.MAX_PAYLOAD_SIZE;
    }
    // Returns the configured max incoming messages per channel queue
    getMaxIncomingMessages() {
      this.ensureInitialized();
      return this.QUEUE_SIZE;
    }
    // Get pre-allocated buffer for outgoing messages (for game engine to write directly)
    // Game engine can write payload here, then call sendP2PMessage with the same buffer
    // Godot uses this to write binary payloads to a pre-allocated place that JS can read from.
    // Not needed in Unity because Unity can pass along a direct view into its own WASM heap
    getOutgoingMessageBuffer() {
      this.ensureInitialized();
      return this.outgoingMessageBuffer;
    }
    // Read the next message from a channel as a decoded P2PMessage.
    // Returns null if the queue is empty or hasn't been created yet.
    // Engine builds never call this — they use drainChannelToBuffer to
    // minimize WASM<->JS boundary crossings. JS-only games use this directly.
    readMessageFromChannel(appChannel) {
      this.ensureInitialized();
      const queue = this.channelQueues.get(appChannel);
      if (!queue) return null;
      const view = this.readRawMessage(queue);
      return view ? this.decodeBinaryMessage(view) : null;
    }
    // Internal helper: pull the next message's raw bytes from a queue as a
    // zero-copy view and advance read pointers. Returns null if the queue is
    // empty or the next slot's header is invalid (invalid slots are dropped —
    // read pointers advance past them even when null is returned).
    readRawMessage(queue) {
      if (queue.messageCount === 0) return null;
      const readOffset = queue.readIndex * this.MESSAGE_SIZE;
      const slotView = new DataView(queue.buffer, readOffset, this.MESSAGE_SIZE);
      const messageSize = slotView.getUint32(0, true);
      const maxMessageSize = this.MESSAGE_SIZE - this.MESSAGE_SLOT_HEADER_SIZE;
      if (messageSize === 0 || messageSize > maxMessageSize) {
        queue.readIndex = (queue.readIndex + 1) % this.QUEUE_SIZE;
        queue.messageCount--;
        return null;
      }
      const view = new Uint8Array(
        queue.buffer,
        readOffset + this.MESSAGE_SLOT_HEADER_SIZE,
        messageSize
      );
      queue.readIndex = (queue.readIndex + 1) % this.QUEUE_SIZE;
      queue.messageCount--;
      return view;
    }
    // Drain all messages from a channel in one call (reduces WASM↔JS boundary crossings)
    // Only intended to be used in game engine context to give raw binary packets to the game engine
    // JS games should just call readMessageFromChannel repeatedly to get decoded P2PMessages
    // Format: [size:4][msg:N][size:4][msg:N]... (tightly packed)
    // Game iterates by reading size, advancing by 4+size, repeat until end of buffer
    // If buffer is provided, fills until full and leaves remaining messages in queue
    // If no buffer provided, allocates exact size needed and drains all messages
    // Returns subarray of buffer containing only the written data (use .length to know how many bytes were written)
    drainChannelToBuffer(appChannel, buffer) {
      this.ensureInitialized();
      const queue = this.channelQueues.get(appChannel);
      if (!queue || queue.messageCount === 0) {
        return new Uint8Array(0);
      }
      if (!buffer || buffer.byteLength === 0) {
        const messages = [];
        let totalSize = 0;
        while (queue.messageCount > 0) {
          const msg = this.readRawMessage(queue);
          if (!msg) continue;
          messages.push(msg);
          totalSize += this.MESSAGE_SLOT_HEADER_SIZE + msg.length;
        }
        if (messages.length === 0) {
          return new Uint8Array(0);
        }
        const result = new Uint8Array(totalSize);
        const resultView2 = new DataView(result.buffer);
        let writePos2 = 0;
        for (const msg of messages) {
          resultView2.setUint32(writePos2, msg.length, true);
          writePos2 += this.MESSAGE_SLOT_HEADER_SIZE;
          result.set(msg, writePos2);
          writePos2 += msg.length;
        }
        return result;
      }
      const resultView = new DataView(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength
      );
      const queueView = new DataView(queue.buffer);
      const maxMessageSize = this.MESSAGE_SIZE - this.MESSAGE_SLOT_HEADER_SIZE;
      let writePos = 0;
      while (queue.messageCount > 0) {
        const readOffset = queue.readIndex * this.MESSAGE_SIZE;
        const messageSize = queueView.getUint32(readOffset, true);
        if (messageSize === 0 || messageSize > maxMessageSize) {
          queue.readIndex = (queue.readIndex + 1) % this.QUEUE_SIZE;
          queue.messageCount--;
          continue;
        }
        const spaceNeeded = this.MESSAGE_SLOT_HEADER_SIZE + messageSize;
        if (writePos + spaceNeeded > buffer.byteLength) {
          break;
        }
        resultView.setUint32(writePos, messageSize, true);
        writePos += this.MESSAGE_SLOT_HEADER_SIZE;
        buffer.set(
          new Uint8Array(
            queue.buffer,
            readOffset + this.MESSAGE_SLOT_HEADER_SIZE,
            messageSize
          ),
          writePos
        );
        writePos += messageSize;
        queue.readIndex = (queue.readIndex + 1) % this.QUEUE_SIZE;
        queue.messageCount--;
      }
      return buffer.subarray(0, writePos);
    }
    // ================
    // Binary Message Encoding/Decoding
    // ================
    // Wire format: [channel(1)][payload(...)] (no userId, no dataLength)
    encodeWireMessage(channel, payload) {
      if (channel < 0 || channel >= this.MAX_CHANNELS) {
        throw new Error(
          `P2P channel ${channel} must be between 0 and ${this.MAX_CHANNELS - 1}`
        );
      }
      const totalLength = this.WIRE_PAYLOAD_OFFSET + payload.length;
      const uint8View = new Uint8Array(totalLength);
      uint8View[this.WIRE_CHANNEL_OFFSET] = channel;
      if (payload.length > 0) {
        uint8View.set(payload, this.WIRE_PAYLOAD_OFFSET);
      }
      return uint8View;
    }
    decodeBinaryMessage(data) {
      if (data.byteLength < this.PAYLOAD_OFFSET) {
        throw new Error("Invalid binary message: too short");
      }
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const uint8View = data;
      let offset = 0;
      const fromUserIdBytes = uint8View.slice(offset, offset + this.USERID_SIZE);
      const fromUserId = this.textDecoder.decode(fromUserIdBytes).replace(/\0+$/, "");
      offset += this.USERID_SIZE;
      const channel = view.getUint32(offset, true);
      offset += this.CHANNEL_SIZE;
      const dataLength = view.getUint32(offset, true);
      offset += this.DATALENGTH_SIZE;
      const payload = data.slice(offset, offset + dataLength);
      return {
        fromUserId,
        channel,
        payload
      };
    }
  };
  _P2PManager.MAX_MESSAGE_SIZE = 64 * 1024;
  _P2PManager.MEMORY_WARNING_THRESHOLD_BYTES = 128 * 1024 * 1024;
  var P2PManager = _P2PManager;
  var Z_INDEX = 2147483647;
  function showDevPaywall(contentIdentifier) {
    if (typeof document === "undefined") return Promise.resolve(false);
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;z-index:" + Z_INDEX + ";display:flex;align-items:center;justify-content:center;background:rgba(8,10,18,0.72);font:14px ui-sans-serif,system-ui,sans-serif;color:#e2e8f0";
      const card = document.createElement("div");
      card.style.cssText = "max-width:420px;width:calc(100% - 48px);background:#11151f;border:1px solid #2a3344;border-radius:12px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.5);box-sizing:border-box";
      const badge = document.createElement("p");
      badge.textContent = "wavedash dev — simulated purchase";
      badge.style.cssText = "margin:0 0 12px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#7c8aa5";
      const title = document.createElement("p");
      title.textContent = "Unlock paid content?";
      title.style.cssText = "margin:0 0 8px;font-size:18px;font-weight:600;color:#f1f5f9";
      const body = document.createElement("p");
      body.style.cssText = "margin:0 0 20px;line-height:1.5;color:#cbd5e1";
      body.append(
        document.createTextNode("This game is requesting purchase of “")
      );
      const id = document.createElement("code");
      id.textContent = contentIdentifier;
      id.style.cssText = "background:#1c2433;border-radius:4px;padding:1px 6px;color:#93c5fd";
      body.append(
        id,
        document.createTextNode(
          "”. No real payment happens in dev — simulate the outcome to test your flow."
        )
      );
      const buttons = document.createElement("div");
      buttons.style.cssText = "display:flex;gap:12px;justify-content:flex-end";
      const baseBtn = "border-radius:8px;padding:9px 18px;font-size:14px;font-weight:600;cursor:pointer;border:1px solid transparent";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel";
      cancel.style.cssText = baseBtn + ";background:transparent;border-color:#374151;color:#cbd5e1";
      const buy = document.createElement("button");
      buy.type = "button";
      buy.textContent = "Simulate purchase";
      buy.style.cssText = baseBtn + ";background:#2563eb;color:#fff";
      buttons.append(cancel, buy);
      card.append(badge, title, body, buttons);
      overlay.append(card);
      let settled = false;
      const finish = (purchased) => {
        if (settled) return;
        settled = true;
        document.removeEventListener("keydown", onKeyDown, true);
        overlay.remove();
        resolve(purchased);
      };
      const onKeyDown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          finish(false);
        }
      };
      cancel.addEventListener("click", () => finish(false));
      buy.addEventListener("click", () => finish(true));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) finish(false);
      });
      document.addEventListener("keydown", onKeyDown, true);
      document.body.append(overlay);
    });
  }
  var hasDom = typeof Element !== "undefined" && typeof document !== "undefined";
  var nativeRequestPointerLock = hasDom ? Element.prototype.requestPointerLock : void 0;
  var depth2 = 0;
  function suspendPointerLock() {
    if (!hasDom || !nativeRequestPointerLock) return () => {
    };
    if (++depth2 === 1) {
      Element.prototype.requestPointerLock = function() {
        return Promise.resolve();
      };
    }
    document.exitPointerLock();
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      if (--depth2 === 0)
        Element.prototype.requestPointerLock = nativeRequestPointerLock;
    };
  }
  var PAYWALL_TIMEOUT_MS = 10 * 60 * 1e3;
  var PaidContentManager = class extends WavedashManager {
    constructor(sdk) {
      super(sdk);
      this.paywallOpen = false;
      this.seenPurchaseIds = /* @__PURE__ */ new Set();
      this.purchaseUpdates = Promise.resolve();
      this.entitlementChecks = Promise.resolve();
      this.unsubscribePurchases = null;
      this.destroyed = false;
      void this.sdk.authManager.firstAuthenticatedAt.then((since) => {
        if (this.destroyed) return;
        this.unsubscribePurchases = this.sdk.convexClient.onUpdate(
          api.sdk.paidContent.listNewAndUnfulfilled,
          { since },
          (purchases) => {
            this.purchaseUpdates = this.purchaseUpdates.then(() => this.handlePurchasesUpdate(purchases)).catch((err) => {
              logger.error("Failed to deliver purchases", err);
            });
          },
          (error2) => {
            logger.error(`Purchases subscription error: ${error2}`);
          }
        );
      });
    }
    /**
     * One stream for launch and live delivery, so no purchase falls between
     * them, and it works with or without a host (`wavedash dev` included). Like
     * StoreKit's transaction listener: the first result delivers every
     * unfulfilled consumable (bought while the game was closed, or never
     * fulfilled) plus durables bought this session; after that, each new
     * id is a purchase from any source (paywall, game page, gift, another tab).
     * Events queue until the game is ready for them.
     */
    async handlePurchasesUpdate(purchases) {
      const fresh = purchases.filter(
        (p) => !this.seenPurchaseIds.has(p.purchaseId)
      );
      for (const purchase of fresh) {
        this.seenPurchaseIds.add(purchase.purchaseId);
      }
      await this.notifyPurchasesCompleted(fresh);
    }
    /**
     * Make sure the gameplay JWT entitles every new durable first, so
     * isEntitled() is already true by the time the game receives the events.
     * New durables also fire the deprecated EntitlementsGranted, one
     * event per update so a bundle's contents arrive together.
     */
    async notifyPurchasesCompleted(purchases) {
      const granted = purchases.filter((p) => p.type === PAID_CONTENT_TYPE.DURABLE).map((p) => p.contentIdentifier);
      if (granted.length > 0) {
        try {
          await this.ensureJwtEntitles(granted);
        } catch (err) {
          logger.error("Failed to refresh gameplay JWT after purchase", err);
        }
      }
      for (const purchase of purchases) {
        this.sdk.gameEventManager.notifyGame(
          WavedashEvents.PURCHASE_COMPLETED,
          purchase
        );
      }
      if (granted.length > 0) {
        this.sdk.gameEventManager.notifyGame(
          WavedashEvents.ENTITLEMENTS_GRANTED,
          {
            contentIdentifiers: [...new Set(granted)]
          }
        );
      }
    }
    /** Force-refresh the gameplay JWT only if its `ents` lacks any of these identifiers. */
    ensureJwtEntitles(contentIdentifiers) {
      const check = async () => {
        const jwt = await this.sdk.ensureGameplayJwt();
        const entitlements = readJwtClaim(jwt, "ents") ?? [];
        if (contentIdentifiers.every((id) => entitlements.includes(id))) return;
        await this.sdk.ensureGameplayJwt(true);
      };
      const result = this.entitlementChecks.then(check, check);
      this.entitlementChecks = result.catch(() => {
      });
      return result;
    }
    async isEntitled(contentIdentifier) {
      const jwt = await this.sdk.ensureGameplayJwt();
      const entitlements = readJwtClaim(jwt, "ents") ?? [];
      return entitlements.includes(contentIdentifier);
    }
    async getEntitlements() {
      const jwt = await this.sdk.ensureGameplayJwt();
      const entitlements = readJwtClaim(jwt, "ents") ?? [];
      return entitlements;
    }
    async getUnfulfilledPurchases() {
      const purchases = await this.sdk.convexClient.query(
        api.sdk.paidContent.listNewAndUnfulfilled,
        { since: await this.sdk.authManager.firstAuthenticatedAt }
      );
      return purchases.filter((p) => !p.fulfilled);
    }
    async fulfillPurchase(purchaseId) {
      return await this.sdk.convexClient.mutation(
        api.sdk.paidContent.fulfillPurchase,
        { purchaseId }
      );
    }
    async triggerPaywall(contentIdentifier) {
      if (await this.isEntitled(contentIdentifier)) return true;
      if (this.paywallOpen) {
        throw new Error("Paywall already in progress");
      }
      this.paywallOpen = true;
      this.restorePointerLock = suspendPointerLock();
      this.restoreGamepads = suspendGamepads();
      if (!hasParentFrame()) {
        let purchased;
        try {
          purchased = await showDevPaywall(contentIdentifier);
        } finally {
          this.restorePointerLock?.();
          this.restorePointerLock = void 0;
          this.restoreGamepads?.();
          this.restoreGamepads = void 0;
          this.paywallOpen = false;
        }
        if (!purchased) return false;
        const purchase = await this.sdk.convexClient.mutation(
          api.sdk.paidContent.mockPurchase,
          { contentIdentifier }
        );
        if (purchase.type === PAID_CONTENT_TYPE.DURABLE) {
          await this.ensureJwtEntitles([contentIdentifier]);
        }
        return true;
      }
      let response;
      try {
        response = await this.sdk.iframeMessenger.requestFromParent(
          IFRAME_MESSAGE_TYPE.TRIGGER_PAYWALL,
          { contentIdentifier },
          PAYWALL_TIMEOUT_MS
        );
      } finally {
        this.restorePointerLock?.();
        this.restorePointerLock = void 0;
        this.restoreGamepads?.();
        this.restoreGamepads = void 0;
        this.paywallOpen = false;
      }
      if (!response.purchased) return false;
      if (response.type !== PAID_CONTENT_TYPE.CONSUMABLE) {
        await this.ensureJwtEntitles([contentIdentifier]);
      }
      return true;
    }
    isPaywallOpen() {
      return this.paywallOpen;
    }
    destroy() {
      this.destroyed = true;
      this.unsubscribePurchases?.();
      this.unsubscribePurchases = null;
      this.restorePointerLock?.();
      this.restorePointerLock = void 0;
      this.restoreGamepads?.();
      this.restoreGamepads = void 0;
    }
  };
  var STORE_THROTTLE_MS = 1e3;
  var StatsManager = class extends WavedashManager {
    constructor(sdk) {
      super(sdk);
      this.stats = /* @__PURE__ */ new Map();
      this.unlockedAchievements = /* @__PURE__ */ new Set();
      this.dirtyStats = /* @__PURE__ */ new Set();
      this.dirtyAchievements = /* @__PURE__ */ new Set();
      this.knownStatIds = /* @__PURE__ */ new Set();
      this.knownAchievementIds = /* @__PURE__ */ new Set();
      this.loaded = { stats: false, achievements: false };
      this.subscriptions = [];
      this.inFlightPersist = null;
      this.flushRequested = false;
      this.throttledPersist = throttle2(() => this.persist(), STORE_THROTTLE_MS, {
        leading: false,
        trailing: true
      });
      this.subscribe();
      this.requestStats().catch((error2) => {
        logger.error("Initial stats fetch failed:", error2);
      });
    }
    destroy() {
      this.throttledPersist.cancel();
      for (const unsub of this.subscriptions) unsub();
      this.subscriptions = [];
    }
    isReady() {
      return this.loaded.stats && this.loaded.achievements;
    }
    // ================
    // Subscriptions
    // ================
    subscribe() {
      this.subscriptions.push(
        this.sdk.convexClient.onUpdate(
          api.sdk.gameAchievements.listStatIdentifiers,
          {},
          (ids) => {
            this.knownStatIds = new Set(ids);
          },
          (error2) => {
            logger.error("Stat identifiers subscription error:", error2);
          }
        ),
        this.sdk.convexClient.onUpdate(
          api.sdk.gameAchievements.listAchievementIdentifiers,
          {},
          (ids) => {
            this.knownAchievementIds = new Set(ids);
          },
          (error2) => {
            logger.error("Achievement identifiers subscription error:", error2);
          }
        ),
        this.sdk.convexClient.onUpdate(
          api.sdk.gameAchievements.getMyAchievementsForGame,
          {},
          (achievements) => {
            this.loaded.achievements = true;
            for (const { achievement } of achievements) {
              this.unlockedAchievements.add(achievement.identifier);
            }
          },
          (error2) => {
            logger.error("Achievement subscription error:", error2);
          }
        )
      );
    }
    async requestStats() {
      const newStats = await this.sdk.convexClient.query(
        api.sdk.gameAchievements.getMyStatsForGame,
        {}
      );
      this.loaded.stats = true;
      for (const stat of newStats) {
        if (!this.stats.has(stat.identifier)) {
          this.stats.set(stat.identifier, stat.value);
        }
      }
      return true;
    }
    storeStats() {
      if (!this.isReady()) return false;
      this.throttledPersist();
      this.requestPersistFlush();
      return true;
    }
    // Force-fire the throttled persist now. If a mutation is already in flight,
    // the gate will swallow the flush(), so we also flag flushRequested so the
    // next .finally() flushes again instead of waiting a full throttle window.
    requestPersistFlush() {
      if (this.inFlightPersist !== null) this.flushRequested = true;
      this.throttledPersist.flush();
    }
    persist() {
      if (this.inFlightPersist !== null) return;
      if (this.dirtyStats.size === 0 && this.dirtyAchievements.size === 0) return;
      const pending = this.getPendingData();
      if (!pending) return;
      this.inFlightPersist = Promise.all([
        pending.stats.length > 0 ? this.sdk.convexClient.mutation(
          api.sdk.gameAchievements.setUserGameStats,
          { stats: pending.stats }
        ) : Promise.resolve(),
        pending.achievements.length > 0 ? this.sdk.convexClient.mutation(
          api.sdk.gameAchievements.setUserGameAchievements,
          { achievements: pending.achievements }
        ) : Promise.resolve()
      ]).then(() => {
        this.sdk.gameEventManager.notifyGame(WavedashEvents.STATS_STORED, {
          success: true
        });
      }).catch((error2) => {
        const message = error2 instanceof Error ? error2.message : `Error storing stats: ${error2}`;
        logger.error(message);
        this.sdk.gameEventManager.notifyGame(WavedashEvents.STATS_STORED, {
          success: false,
          message
        });
      }).finally(() => {
        this.inFlightPersist = null;
        const shouldFlushNow = this.flushRequested;
        this.flushRequested = false;
        if (this.dirtyStats.size > 0 || this.dirtyAchievements.size > 0) {
          this.throttledPersist();
          if (shouldFlushNow) this.throttledPersist.flush();
        }
      });
    }
    // ================
    // Stats
    // ================
    getStat(identifier) {
      if (!this.isReady() || !this.knownStatIds.has(identifier)) return 0;
      return this.stats.get(identifier) ?? 0;
    }
    setStat(identifier, value, storeNow = false) {
      if (!this.isReady() || !this.knownStatIds.has(identifier)) return false;
      if (this.stats.get(identifier) !== value) {
        this.stats.set(identifier, value);
        this.dirtyStats.add(identifier);
        this.throttledPersist();
      }
      if (storeNow) this.requestPersistFlush();
      return true;
    }
    // ================
    // Achievements
    // ================
    getAchievement(identifier) {
      if (!this.isReady() || !this.knownAchievementIds.has(identifier))
        return false;
      return this.unlockedAchievements.has(identifier);
    }
    setAchievement(identifier, storeNow = false) {
      if (!this.isReady() || !this.knownAchievementIds.has(identifier))
        return false;
      if (!this.unlockedAchievements.has(identifier)) {
        this.unlockedAchievements.add(identifier);
        this.dirtyAchievements.add(identifier);
        this.throttledPersist();
      }
      if (storeNow) this.requestPersistFlush();
      return true;
    }
    /** @destructive - Returns the pending stats and achievements and resets the dirty collections */
    getPendingData() {
      if (this.dirtyStats.size === 0 && this.dirtyAchievements.size === 0) {
        return null;
      }
      const stats = [...this.dirtyStats].map((id) => ({
        identifier: id,
        value: this.stats.get(id)
      }));
      const achievements = [...this.dirtyAchievements];
      this.dirtyStats.clear();
      this.dirtyAchievements.clear();
      return { stats, achievements };
    }
  };
  var UGCManager = class extends WavedashManager {
    constructor(sdk) {
      super(sdk);
    }
    async createUGCItem(ugcType, title, description, visibility, filePath) {
      const { ugcId, uploadUrl } = await this.sdk.convexClient.mutation(
        api.sdk.userGeneratedContent.createUGCItem,
        {
          ugcType,
          title,
          description,
          visibility,
          createPresignedUploadUrl: !!filePath
        }
      );
      if (filePath && !uploadUrl) {
        throw new Error(
          `Failed to create a presigned upload URL for UGC item: ${filePath}`
        );
      } else if (filePath && uploadUrl) {
        const success = await this.sdk.fileSystemManager.upload(
          uploadUrl,
          filePath
        );
        if (!success) {
          throw new Error(`Failed to upload UGC item: ${filePath}`);
        }
      }
      return ugcId;
    }
    async updateUGCItem(ugcId, updates = {}) {
      const { title, description, visibility, filePath } = updates;
      const { uploadUrl } = await this.sdk.convexClient.mutation(
        api.sdk.userGeneratedContent.updateUGCItem,
        {
          ugcId,
          title,
          description,
          visibility,
          createPresignedUploadUrl: !!filePath
        }
      );
      if (filePath && !uploadUrl) {
        throw new Error(
          `Failed to create a presigned upload URL for UGC item: ${filePath}`
        );
      } else if (filePath && uploadUrl) {
        const success = await this.sdk.fileSystemManager.upload(
          uploadUrl,
          filePath
        );
        if (!success) {
          throw new Error(`Failed to upload UGC item: ${filePath}`);
        }
      }
      return ugcId;
    }
    async deleteUGCItem(ugcId) {
      await this.sdk.convexClient.mutation(
        api.sdk.userGeneratedContent.deleteUGCItem,
        { ugcId }
      );
      return ugcId;
    }
    async downloadUGCItem(ugcId, filePath) {
      const downloadUrl = await this.sdk.convexClient.query(
        api.sdk.userGeneratedContent.getUGCItemDownloadUrl,
        { ugcId }
      );
      try {
        await this.sdk.fileSystemManager.download(downloadUrl, filePath);
      } catch (error2) {
        const msg = error2 instanceof Error ? error2.message : String(error2);
        throw new Error(`Failed to download UGC item ${ugcId}: ${msg}`);
      }
      return ugcId;
    }
    async listUGCItems(args = {}) {
      const { createdBy, ugcType, titleSearch, numItems, continueCursor } = args;
      const filters = createdBy !== void 0 || ugcType !== void 0 || titleSearch !== void 0 ? { createdBy, ugcType, titleSearch } : void 0;
      return await this.sdk.convexClient.query(
        api.sdk.userGeneratedContent.listUGCItems,
        {
          filters,
          numItems,
          continueCursor
        }
      );
    }
  };
  function takeFocus() {
    if (typeof document === "undefined") return;
    const gameFocusTargets = document.getElementsByClassName("game-focus-target");
    if (gameFocusTargets.length > 0) {
      gameFocusTargets[0].focus({ preventScroll: true });
      return;
    }
    const focusableElement = document.querySelector(
      "canvas, input, button, [tabindex]:not([tabindex='-1'])"
    );
    focusableElement?.focus({ preventScroll: true });
  }
  var RESPONSE_TIMEOUT_MS = 15e3;
  var IFrameMessenger = class {
    constructor() {
      this.handleMessage = (event) => {
        if (event.origin !== getParentOrigin()) {
          if (event.source !== window) {
            console.warn(`Ignored message from untrusted origin: ${event.origin}`);
          }
          return;
        }
        if (event.data?.requestId) {
          const pending = this.pendingRequests.get(event.data.requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(event.data.requestId);
            pending.resolve(event.data.data);
          }
          return;
        }
        const messageType = event.data?.type;
        if (!messageType) return;
        const set2 = this.listeners.get(messageType);
        if (!set2) return;
        for (const listener of set2) listener(event.data);
      };
      this.pendingRequests = /* @__PURE__ */ new Map();
      this.requestIdCounter = 0;
      this.listeners = /* @__PURE__ */ new Map();
      if (typeof window !== "undefined") {
        window.addEventListener("message", this.handleMessage);
      }
    }
    /**
     * Register a handler for a one-way (no requestId) push from the parent —
     * e.g. FULLSCREEN_CHANGED or TAKE_FOCUS. Multiple handlers per type are
     * supported; `data` is typed from IFramePushMap.
     */
    addEventListener(type, listener) {
      let set2 = this.listeners.get(type);
      if (!set2) {
        set2 = /* @__PURE__ */ new Set();
        this.listeners.set(type, set2);
      }
      set2.add(listener);
    }
    removeEventListener(type, listener) {
      this.listeners.get(type)?.delete(listener);
    }
    postToParent(requestType, data) {
      const parentOrigin = getParentOrigin();
      if (typeof window === "undefined" || !parentOrigin) return false;
      window.parent.postMessage({ type: requestType, ...data }, parentOrigin);
      return true;
    }
    async requestFromParent(requestType, data, timeoutMs = RESPONSE_TIMEOUT_MS) {
      return new Promise((resolve, reject) => {
        const parentOrigin = getParentOrigin();
        if (typeof window === "undefined" || !parentOrigin) {
          reject(new Error("Parent origin not found"));
          return;
        }
        const requestId = `${requestType}_${++this.requestIdCounter}_${Date.now()}`;
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(requestId);
          reject(
            new Error(`${requestType} request timed out after ${timeoutMs}ms`)
          );
        }, timeoutMs);
        this.pendingRequests.set(requestId, {
          resolve,
          reject,
          timeout
        });
        window.parent.postMessage(
          { type: requestType, requestId, ...data },
          parentOrigin
        );
      });
    }
  };
  var wavedashEventNames = new Set(Object.values(WavedashEvents));
  var reportedEvents = /* @__PURE__ */ new Set();
  function trackSdkEventListener(sdk, eventName) {
    if (!wavedashEventNames.has(eventName) || reportedEvents.has(eventName)) {
      return;
    }
    reportedEvents.add(eventName);
    trackSdkCall(sdk, `on${eventName}`);
  }
  function trackSdkCall(sdk, functionName2) {
    try {
      sdk.iframeMessenger.postToParent(IFRAME_MESSAGE_TYPE.SDK_FUNCTION_CALLED, {
        functionName: functionName2
      });
    } catch {
      return;
    }
  }
  function createTrackedSdk(sdk) {
    const prototype = Object.getPrototypeOf(sdk);
    for (const [name, descriptor] of Object.entries(
      Object.getOwnPropertyDescriptors(prototype)
    )) {
      if (name === "constructor" || name.startsWith("_")) continue;
      if (typeof descriptor.value !== "function") continue;
      const original = descriptor.value.bind(sdk);
      const install = (value) => {
        Object.defineProperty(sdk, name, {
          configurable: descriptor.configurable,
          enumerable: descriptor.enumerable,
          writable: true,
          value
        });
      };
      Object.defineProperty(sdk, name, {
        configurable: true,
        enumerable: descriptor.enumerable,
        get() {
          install(original);
          trackSdkCall(sdk, name);
          return original;
        },
        set: install
      });
    }
    return sdk;
  }
  var SwMessenger = class {
    constructor() {
      this.handleMessage = (event) => {
        const data = event.data;
        const type = data?.type;
        if (!type) return;
        const set2 = this.listeners.get(type);
        if (!set2 || set2.size === 0) return;
        const port = event.ports?.[0];
        const reply = (message) => {
          if (port) {
            try {
              port.postMessage(message);
            } catch (err) {
              logger.warn("Failed to reply to SW via port", err);
            }
          }
          this.postToServiceWorker(message);
        };
        for (const listener of set2) listener(data?.payload, reply);
      };
      this.listeners = /* @__PURE__ */ new Map();
      if (typeof navigator !== "undefined" && navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener("message", this.handleMessage);
      }
    }
    /**
     * Register a handler for an incoming message type from the SW. The handler
     * receives the message payload and a `reply` function that routes the
     * response back via the transferred MessagePort when present, falling back
     * to a controller postMessage otherwise.
     */
    addEventListener(type, listener) {
      let set2 = this.listeners.get(type);
      if (!set2) {
        set2 = /* @__PURE__ */ new Set();
        this.listeners.set(type, set2);
      }
      set2.add(listener);
    }
    removeEventListener(type, listener) {
      this.listeners.get(type)?.delete(listener);
    }
    /**
     * Fire-and-forget message to the active service worker controller. No-op
     * when no SW is controlling the page (first load before activation, or
     * environments without SW support).
     */
    postToServiceWorker(message) {
      if (typeof navigator === "undefined" || !navigator.serviceWorker) {
        return false;
      }
      try {
        navigator.serviceWorker.controller?.postMessage(message);
        return true;
      } catch (err) {
        logger.warn("Failed to post message to service worker", err);
        return false;
      }
    }
  };
  var CONVEX_ID_REGEX = /^[0-9a-z]{31,37}$/;
  var vString = (value, path) => {
    if (typeof value !== "string") {
      throw new Error(`${path}: expected string, got ${describeValue(value)}`);
    }
    return value;
  };
  var vNumber = (value, path) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(
        `${path}: expected finite number, got ${describeValue(value)}`
      );
    }
    return value;
  };
  var vBoolean = (value, path) => {
    if (typeof value !== "boolean") {
      throw new Error(`${path}: expected boolean, got ${describeValue(value)}`);
    }
    return value;
  };
  var vNull = (value, path) => {
    if (value !== null) {
      throw new Error(`${path}: expected null, got ${describeValue(value)}`);
    }
    return null;
  };
  var vUint8Array = (value, path) => {
    if (!(value instanceof Uint8Array)) {
      throw new Error(
        `${path}: expected Uint8Array, got ${describeValue(value)}`
      );
    }
    return value;
  };
  var vRecord = (value, path) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(
        `${path}: expected plain object, got ${describeValue(value)}`
      );
    }
    for (const [key, val] of Object.entries(value)) {
      if (typeof val === "object" && val !== null) {
        throw new Error(
          `${path}: expected flat record with no nested objects, but key "${key}" contains ${describeValue(val)}`
        );
      }
    }
    return value;
  };
  var vMetadataRecord = vRecordOf(
    vUnion(vString, vNumber, vBoolean)
  );
  function vId(typeName) {
    return (value, path) => {
      if (typeof value !== "string" || !CONVEX_ID_REGEX.test(value)) {
        throw new Error(
          `${path}: expected ${typeName} (base32 string, 31-37 chars), got ${describeValue(value)}`
        );
      }
      return value;
    };
  }
  function vEnum(enumObject, enumName) {
    const validValues = Object.values(enumObject);
    return (value, path) => {
      if (!validValues.includes(value)) {
        const labels = Object.entries(enumObject).map(([key, val]) => `${JSON.stringify(val)} (${key})`).join(", ");
        const label = enumName ? `${enumName} ` : "";
        throw new Error(
          `${path}: invalid ${label}value ${describeValue(value)}. Expected one of: ${labels}`
        );
      }
      return value;
    };
  }
  function vOptional(inner) {
    return (value, path) => {
      if (value === void 0) return void 0;
      return inner(value, path);
    };
  }
  function vUnion(...variants) {
    return (value, path) => {
      for (const variant of variants) {
        try {
          return variant(value, path);
        } catch {
        }
      }
      throw new Error(`${path}: no variant matched, got ${describeValue(value)}`);
    };
  }
  function vRecordOf(inner) {
    return (value, path) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(
          `${path}: expected plain object, got ${describeValue(value)}`
        );
      }
      for (const [key, val] of Object.entries(value)) {
        inner(val, `${path}.${key}`);
      }
      return value;
    };
  }
  function vObject(shape) {
    return (value, path) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(
          `${path}: expected plain object, got ${describeValue(value)}`
        );
      }
      const obj = value;
      for (const key of Object.keys(obj)) {
        if (!(key in shape)) {
          throw new Error(`${path}: unrecognized property "${key}"`);
        }
      }
      for (const key of Object.keys(shape)) {
        shape[key](obj[key], `${path}.${key}`);
      }
      return obj;
    };
  }
  function validateArgs(methodName, specs, values) {
    const shape = {};
    const obj = {};
    for (let i2 = 0; i2 < specs.length; i2++) {
      const [argName, validator] = specs[i2];
      shape[argName] = validator;
      obj[argName] = values[i2];
    }
    vObject(shape)(obj, methodName);
  }
  function describeValue(value) {
    if (value === void 0) return "undefined";
    if (value === null) return "null";
    if (value instanceof Uint8Array) {
      return `Uint8Array(byteLength=${value.byteLength})`;
    }
    if (Array.isArray(value)) return `array(length=${value.length})`;
    const type = typeof value;
    if (type === "string" || type === "number" || type === "boolean") {
      return `${type} ${JSON.stringify(value)}`;
    }
    return type;
  }
  var iframeMessenger = new IFrameMessenger();
  var WavedashSDK = class extends EventTarget {
    constructor(sdkConfig) {
      super();
      this._initialized = false;
      this._eventsReady = false;
      this.destroyed = false;
      this.warnedEntitlementsGranted = false;
      this.gameFinishedLoading = false;
      this.gameStartedLoading = false;
      this.Events = WavedashEvents;
      this.LobbyVisibility = LOBBY_VISIBILITY;
      this.LeaderboardSortOrder = LEADERBOARD_SORT_ORDER;
      this.LeaderboardDisplayType = LEADERBOARD_DISPLAY_TYPE;
      this.UGCType = UGC_TYPE;
      this.UGCVisibility = UGC_VISIBILITY;
      this.AvatarSize = AvatarSize;
      this.LobbyKickedReason = LobbyKickedReason;
      this.LobbyUserChangeType = LobbyUserChangeType;
      this.P2PPacketDropReason = P2PPacketDropReason;
      this.PurchaseType = PAID_CONTENT_TYPE;
      this.FulfillPurchaseStatus = FULFILL_PURCHASE_STATUS;
      this.config = null;
      this.engineCallbackReceiver = "WavedashCallbackReceiver";
      this.engineInstance = null;
      this.setupWarningTimeout = null;
      this.listenerWrappers = /* @__PURE__ */ new Map();
      this.convexClient = new ConvexClient(sdkConfig.convexCloudUrl, {
        expectAuth: true
      });
      this.gameCloudId = sdkConfig.gameCloudId;
      this.iframeMessenger = iframeMessenger;
      this.authManager = new AuthManager(this);
      this.wavedashUser = sdkConfig.wavedashUser;
      this.ugcHost = sdkConfig.ugcHost;
      this.uploadsHost = sdkConfig.uploadsHost;
      this.swMessenger = new SwMessenger();
      this.launchParamManager = new LaunchParamManager(
        this,
        sdkConfig.launchParams
      );
      this.p2pManager = new P2PManager(this);
      this.lobbyManager = new LobbyManager(this);
      this.statsManager = new StatsManager(this);
      this.heartbeatManager = new HeartbeatManager(this);
      this.fileSystemManager = new FileSystemManager(this);
      this.ugcManager = new UGCManager(this);
      this.leaderboardManager = new LeaderboardManager(this);
      this.friendsManager = new FriendsManager(this);
      this.gameEventManager = new GameEventManager(this);
      this.fullscreenManager = new FullscreenManager(this);
      this.audioManager = new AudioManager(this, sdkConfig.initialVolume);
      this.paidContentManager = new PaidContentManager(this);
      this.externalLinkManager = new ExternalLinkManager(this);
      this.managers = [
        this.authManager,
        this.launchParamManager,
        this.p2pManager,
        this.lobbyManager,
        this.statsManager,
        this.heartbeatManager,
        this.fileSystemManager,
        this.ugcManager,
        this.leaderboardManager,
        this.friendsManager,
        this.gameEventManager,
        this.fullscreenManager,
        this.audioManager,
        this.paidContentManager,
        this.externalLinkManager
      ];
      this.friendsManager.cacheUsers([
        {
          userId: this.wavedashUser.id,
          username: this.wavedashUser.username,
          avatarUrl: this.wavedashUser.avatarUrl
        }
      ]);
      this._setupSessionEndListeners();
      this._setupSwCredsListener();
      this.iframeMessenger.addEventListener(
        IFRAME_MESSAGE_TYPE.TAKE_FOCUS,
        takeFocus
      );
      this.setupWarningTimeout = setTimeout(() => {
        this.setupWarningTimeout = null;
        logger.warn(
          "Wavedash.init(), Wavedash.loadComplete(), or Wavedash.updateLoadProgressZeroToOne() not called yet"
        );
      }, 1e4);
    }
    get initialized() {
      return this._initialized;
    }
    get eventsReady() {
      return this._eventsReady;
    }
    _clearSetupWarning() {
      if (this.setupWarningTimeout !== null) {
        clearTimeout(this.setupWarningTimeout);
        this.setupWarningTimeout = null;
      }
    }
    // =============
    // Setup methods
    // =============
    init(config) {
      this.loadComplete();
      if (this._initialized) {
        logger.warn("init called twice! Already initialized, skipping init");
        return false;
      }
      if (typeof config === "string") {
        try {
          config = JSON.parse(config);
        } catch (error2) {
          logger.error("Initialized with invalid config:", error2);
          return false;
        }
      }
      this.config = config ?? {};
      this._initialized = true;
      logger.setLogLevel(this.config.debug ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
      this.p2pManager.init(this.config.p2p);
      logger.debug("Initialized with config:", this.config);
      if (!this.config.deferEvents) {
        this.readyForEvents();
      }
      return true;
    }
    /**
     * Signal that the game is ready to receive events (LobbyJoined, LobbyMessage, etc).
     * Called automatically by init() unless deferEvents: true is passed in the config.
     * If deferEvents is true, call this manually after your pre-game setup is complete.
     */
    readyForEvents() {
      if (this._eventsReady) return;
      this._ensureInit();
      this._eventsReady = true;
      this.gameEventManager.flushEventQueue();
    }
    /**
     * Subscribe to a Wavedash event with a payload-typed listener.
     * Returns an unsubscribe function.
     *
     *   const unsubscribeLobbyJoined = Wavedash.on(Wavedash.Events.LOBBY_JOINED, (payload) => {
     *     // payload: LobbyJoinedPayload
     *   });
     *   unsubscribeLobbyJoined(); // later
     */
    on(event, listener) {
      const wrapped = (e) => {
        listener(e.detail);
      };
      let perEvent = this.listenerWrappers.get(event);
      if (!perEvent) {
        perEvent = /* @__PURE__ */ new Map();
        this.listenerWrappers.set(event, perEvent);
      }
      const prev = perEvent.get(listener);
      if (prev) this.removeEventListener(event, prev);
      perEvent.set(listener, wrapped);
      this.addEventListener(event, wrapped);
      return () => this.off(event, listener);
    }
    /**
     * Remove a listener previously registered with {@link on}.
     */
    off(event, listener) {
      const perEvent = this.listenerWrappers.get(event);
      const wrapped = perEvent?.get(listener);
      if (!perEvent || !wrapped) return;
      this.removeEventListener(event, wrapped);
      perEvent.delete(listener);
      if (perEvent.size === 0) this.listenerWrappers.delete(event);
    }
    addEventListener(type, listener, options) {
      if (listener) trackSdkEventListener(this, type);
      if (listener && type === WavedashEvents.ENTITLEMENTS_GRANTED && !this.warnedEntitlementsGranted) {
        this.warnedEntitlementsGranted = true;
        console.warn(
          "The EntitlementsGranted event is deprecated. Subscribe to the PurchaseCompleted event instead."
        );
      }
      super.addEventListener(type, listener, options);
    }
    removeEventListener(type, listener, options) {
      super.removeEventListener(type, listener, options);
    }
    // ==================
    // Entrypoint Helpers
    // ==================
    loadScript(src) {
      validateArgs("loadScript", [["src", vString]], [src]);
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.crossOrigin = "anonymous";
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load script ${src}`));
        document.head.appendChild(script);
      });
    }
    updateLoadProgressZeroToOne(progress) {
      validateArgs(
        "updateLoadProgressZeroToOne",
        [["progress", vNumber]],
        [progress]
      );
      if (!this.gameStartedLoading) {
        this.gameStartedLoading = true;
        logger.log("loadStarted");
      }
      this._clearSetupWarning();
      iframeMessenger.postToParent(IFRAME_MESSAGE_TYPE.PROGRESS_UPDATE, {
        progress
      });
    }
    loadComplete() {
      this._clearSetupWarning();
      if (this.gameFinishedLoading) return;
      this.gameFinishedLoading = true;
      logger.log("loadComplete");
      this.heartbeatManager.start();
      iframeMessenger.postToParent(IFRAME_MESSAGE_TYPE.LOADING_COMPLETE, {});
    }
    get gameLoaded() {
      return this.gameFinishedLoading;
    }
    // ==========
    // Fullscreen
    // ==========
    /**
     * Whether the game is currently presented in fullscreen. Mirrored from the
     * Wavedash host page, which owns the real fullscreen target.
     */
    isFullscreen() {
      return this.fullscreenManager.isFullscreen();
    }
    /**
     * Ask the host page to enter (true) or exit (false) fullscreen. Entering
     * must happen inside a user gesture handler (click / keydown / pointerdown)
     * for the browser to permit it.
     */
    async requestFullscreen(fullscreen) {
      return this.fullscreenManager.requestFullscreen(fullscreen);
    }
    /**
     * Toggle fullscreen. Like `requestFullscreen(true)`, this must run inside
     * a user gesture handler when entering fullscreen.
     */
    async toggleFullscreen() {
      return this.fullscreenManager.toggleFullscreen();
    }
    // ==============
    // External Links
    // ==============
    /**
     * Hand an external URL to the player: it's copied to their clipboard and
     * Wavedash shows an in-game toast, rather than navigating them out of the
     * game. Must be called inside a user gesture handler (click / keydown /
     * pointerdown).
     */
    async copyLink(url) {
      validateArgs("copyLink", [["url", vString]], [url]);
      return this.externalLinkManager.copyLink(url);
    }
    // ============
    // User methods
    // ============
    getUser() {
      return this._formatResponse({
        ...this.wavedashUser,
        avatarUrl: getAvatarUrl(this.wavedashUser.avatarUrl, this.uploadsHost)
      });
    }
    getUsername(userId) {
      if (userId === void 0) {
        return this.wavedashUser.username;
      }
      validateArgs("getUsername", [["userId", vId("UserId")]], [userId]);
      return this.friendsManager.getUsername(userId);
    }
    getUserId() {
      return this.wavedashUser.id;
    }
    /**
     * Get the current user's gameplay JWT, fetching it if not already cached.
     * This should be used to authenticate requests to your game's own backend,
     * if you have one.
     * @returns The user's JWT signed by the Wavedash backend
     */
    async getUserJwt() {
      logger.debug("getUserJwt");
      try {
        const data = await this.ensureGameplayJwt();
        return this._formatResponse({ success: true, data });
      } catch (error2) {
        const message = getErrorMessage(error2);
        logger.error("getUserJwt", message);
        return this._formatResponse({ success: false, data: null, message });
      }
    }
    /**
     * Get the key: value mapping of all URL query params present when the game was launched
     * lobby - The lobby ID to join if the user launched with the intention to join a lobby
     * @returns Dictionary of the URL query params that were present when the game was launched
     */
    getLaunchParams() {
      return this._formatResponse(this.launchParamManager.get());
    }
    // ============
    // Friends
    // ============
    async listFriends() {
      return this._apiCall(this.friendsManager, "listFriends", []);
    }
    /**
     * Get avatar URL for a cached user with size transformation.
     * Users are cached when seen via listFriends() or lobby membership.
     * @param userId - The user ID to get the avatar URL for
     * @param size - Size in pixels: a Wavedash.AvatarSize preset (SMALL=64, MEDIUM=128, LARGE=256) or a custom value. Defaults to MEDIUM.
     * @returns CDN URL with size transformation, or null if user not cached or has no avatar
     */
    getUserAvatarUrl(userId, size = this.AvatarSize.MEDIUM) {
      return this._apiCallSync(
        this.friendsManager,
        "getUserAvatarUrl",
        [
          ["userId", vId("UserId")],
          ["size", vNumber]
        ],
        userId,
        size
      );
    }
    // ============
    // Leaderboards
    // ============
    async getLeaderboard(name) {
      return this._apiCall(
        this.leaderboardManager,
        "getLeaderboard",
        [["name", vString]],
        name
      );
    }
    async getOrCreateLeaderboard(name, sortOrder, displayType) {
      return this._apiCall(
        this.leaderboardManager,
        "getOrCreateLeaderboard",
        [
          ["name", vString],
          ["sortOrder", vEnum(LEADERBOARD_SORT_ORDER, "LeaderboardSortOrder")],
          [
            "displayType",
            vEnum(LEADERBOARD_DISPLAY_TYPE, "LeaderboardDisplayType")
          ]
        ],
        name,
        sortOrder,
        displayType
      );
    }
    // Synchronously get leaderboard entry count from cache
    getLeaderboardEntryCount(leaderboardId) {
      return this._apiCallSync(
        this.leaderboardManager,
        "getLeaderboardEntryCount",
        [["leaderboardId", vId("LeaderboardId")]],
        leaderboardId
      );
    }
    // This is called get my "entries" but under the hood we enforce one entry per user
    // The engine SDK expects a list of entries, so we return a list with 0 or 1 entries
    async getMyLeaderboardEntries(leaderboardId) {
      return this._apiCall(
        this.leaderboardManager,
        "getMyLeaderboardEntries",
        [["leaderboardId", vId("LeaderboardId")]],
        leaderboardId
      );
    }
    async listLeaderboardEntriesAroundUser(leaderboardId, countAhead, countBehind, friendsOnly = false) {
      return this._apiCall(
        this.leaderboardManager,
        "listLeaderboardEntriesAroundUser",
        [
          ["leaderboardId", vId("LeaderboardId")],
          ["countAhead", vNumber],
          ["countBehind", vNumber],
          ["friendsOnly", vBoolean]
        ],
        leaderboardId,
        countAhead,
        countBehind,
        friendsOnly
      );
    }
    async listLeaderboardEntries(leaderboardId, offset, limit, friendsOnly = false) {
      return this._apiCall(
        this.leaderboardManager,
        "listLeaderboardEntries",
        [
          ["leaderboardId", vId("LeaderboardId")],
          ["offset", vNumber],
          ["limit", vNumber],
          ["friendsOnly", vBoolean]
        ],
        leaderboardId,
        offset,
        limit,
        friendsOnly
      );
    }
    async uploadLeaderboardScore(leaderboardId, score, keepBest, ugcId, metadata) {
      if (typeof metadata === "string") {
        const raw = metadata;
        try {
          metadata = JSON.parse(raw);
        } catch (error2) {
          const message = `uploadLeaderboardScore: invalid JSON: ${raw}`;
          logger.error(message, error2);
          return this._formatResponse({
            success: false,
            data: null,
            message
          });
        }
      }
      return this._apiCall(
        this.leaderboardManager,
        "uploadLeaderboardScore",
        [
          ["leaderboardId", vId("LeaderboardId")],
          ["score", vNumber],
          ["keepBest", vBoolean],
          ["ugcId", vOptional(vId("UGCId"))],
          ["metadata", vOptional(vMetadataRecord)]
        ],
        leaderboardId,
        score,
        keepBest,
        ugcId ?? void 0,
        metadata ?? void 0
      );
    }
    // ======================
    // USER GENERATED CONTENT
    // ======================
    /**
     * Creates a new UGC item and uploads the file to the server if a filePath is provided
     * @param ugcType
     * @param title
     * @param description
     * @param visibility
     * @param filePath - optional IndexedDB key file path to upload to the server. If not provided, the UGC item will be created but no file will be uploaded.
     * @returns ugcId
     */
    async createUGCItem(ugcType, title, description, visibility, filePath) {
      return this._apiCall(
        this.ugcManager,
        "createUGCItem",
        [
          ["ugcType", vEnum(UGC_TYPE, "UGCType")],
          ["title", vOptional(vString)],
          ["description", vOptional(vString)],
          ["visibility", vOptional(vEnum(UGC_VISIBILITY, "UGCVisibility"))],
          ["filePath", vOptional(vString)]
        ],
        ugcType,
        title,
        description,
        visibility,
        filePath ?? void 0
      );
    }
    /**
     * Updates a UGC item and uploads the file to the server if a filePath is provided
     * @param ugcId - The ID of the UGC item to update
     * @param updates - Object containing the fields to update. May also be passed
     *   as a JSON string by engine bridges (Godot) that can't marshal a dict.
     * @returns ugcId
     */
    async updateUGCItem(ugcId, updates = {}) {
      if (typeof updates === "string") {
        const raw = updates;
        try {
          updates = JSON.parse(raw);
        } catch (error2) {
          const message = `updateUGCItem: invalid JSON: ${raw}`;
          logger.error(message, error2);
          return this._formatResponse({
            success: false,
            data: null,
            message
          });
        }
      }
      return this._apiCall(
        this.ugcManager,
        "updateUGCItem",
        [
          ["ugcId", vId("UGCId")],
          [
            "updates",
            vOptional(
              vObject({
                title: vOptional(vString),
                description: vOptional(vString),
                visibility: vOptional(vEnum(UGC_VISIBILITY, "UGCVisibility")),
                filePath: vOptional(vString)
              })
            )
          ]
        ],
        ugcId,
        updates
      );
    }
    /**
     * Delete a UGC item: removes the row, the R2 object, and frees up the
     * user's storage quota by the size of the deleted upload.
     */
    async deleteUGCItem(ugcId) {
      return this._apiCall(
        this.ugcManager,
        "deleteUGCItem",
        [["ugcId", vId("UGCId")]],
        ugcId
      );
    }
    async downloadUGCItem(ugcId, filePath) {
      return this._apiCall(
        this.ugcManager,
        "downloadUGCItem",
        [
          ["ugcId", vId("UGCId")],
          ["filePath", vString]
        ],
        ugcId,
        filePath
      );
    }
    async listUGCItems(args = {}) {
      if (typeof args === "string") {
        const raw = args;
        try {
          args = JSON.parse(raw);
        } catch (error2) {
          const message = `listUGCItems: invalid JSON: ${raw}`;
          logger.error(message, error2);
          return this._formatResponse({
            success: false,
            data: null,
            message
          });
        }
      }
      return this._apiCall(
        this.ugcManager,
        "listUGCItems",
        [
          [
            "args",
            vOptional((value, path) => {
              const obj = vObject({
                createdBy: vOptional(vId("UserId")),
                ugcType: vOptional(vEnum(UGC_TYPE, "UGCType")),
                titleSearch: vOptional(vString),
                numItems: vOptional(vNumber),
                continueCursor: vOptional(vString)
              })(value, path);
              if (obj.continueCursor !== void 0 && (obj.createdBy !== void 0 || obj.ugcType !== void 0 || obj.titleSearch !== void 0 || obj.numItems !== void 0)) {
                throw new Error(
                  `${path}: continueCursor should be the only argument if present`
                );
              }
              return obj;
            })
          ]
        ],
        args
      );
    }
    // ================================
    // Save state / Remote File Storage
    // ================================
    /**
     * Deletes a remote file from storage
     * @param filePath - The path of the remote file to delete
     * @returns The path of the remote file that was deleted
     */
    async deleteRemoteFile(filePath) {
      return this._apiCall(
        this.fileSystemManager,
        "deleteRemoteFile",
        [["filePath", vString]],
        filePath
      );
    }
    /**
     * Downloads a remote file to a local location.
     * Returns success=false (with the server status in `message`) if the file
     * doesn't exist or any other error occurs. See also: {@link remoteFileExists}
     * @param filePath - The path of the remote file to download
     * @returns The path of the local file that the remote file was downloaded to
     */
    async downloadRemoteFile(filePath) {
      return this._apiCall(
        this.fileSystemManager,
        "downloadRemoteFile",
        [["filePath", vString]],
        filePath
      );
    }
    /**
     * Checks whether a remote file exists. Sends a lightweight HEAD request to check for existence.
     * @param filePath - The path of the remote file to check
     * @returns true if the remote file exists, false if it does not.
     */
    async remoteFileExists(filePath) {
      return this._apiCall(
        this.fileSystemManager,
        "remoteFileExists",
        [["filePath", vString]],
        filePath
      );
    }
    /**
     * Uploads a local file to remote storage
     * @param filePath - The path of the local file to upload
     * @returns The path of the remote file that the local file was uploaded to
     */
    async uploadRemoteFile(filePath) {
      return this._apiCall(
        this.fileSystemManager,
        "uploadRemoteFile",
        [["filePath", vString]],
        filePath
      );
    }
    /**
     * Lists a remote directory
     * @param path - The path of the remote directory to list
     * @returns A list of metadata for each file in the remote directory
     */
    async listRemoteDirectory(path) {
      return this._apiCall(
        this.fileSystemManager,
        "listRemoteDirectory",
        [["path", vString]],
        path
      );
    }
    /**
     * Downloads a remote directory to a local location
     * @param path - The path of the remote directory to download
     * @returns The path of the local directory that the remote directory was downloaded to
     */
    async downloadRemoteDirectory(path) {
      return this._apiCall(
        this.fileSystemManager,
        "downloadRemoteDirectory",
        [["path", vString]],
        path
      );
    }
    /**
     * Persists data to local file storage (IndexedDB).
     * For use in pure JS games.
     * Games built from engines should use their engine's builtin File API to read and write files.
     * @param filePath - The path of the local file to write
     * @param data - The data to write to the local file (byte array)
     * @returns true if the file was written successfully
     */
    async writeLocalFile(filePath, data) {
      validateArgs(
        "writeLocalFile",
        [
          ["filePath", vString],
          ["data", vUint8Array]
        ],
        [filePath, data]
      );
      const result = await this.fileSystemManager.writeLocalFile(filePath, data);
      return result;
    }
    /**
     * Reads data from local file storage (IndexedDB).
     * For use in pure JS games.
     * Games built from engines should use their engine's builtin File API to read and write files.
     * @param filePath - The path of the local file to read
     * @returns The data read from the local file (byte array)
     */
    async readLocalFile(filePath) {
      validateArgs("readLocalFile", [["filePath", vString]], [filePath]);
      const result = await this.fileSystemManager.readLocalFile(filePath);
      return result;
    }
    // ============
    // Achievements + Stats
    // ============
    getAchievement(identifier) {
      return this._apiCallSync(
        this.statsManager,
        "getAchievement",
        [["identifier", vString]],
        identifier
      );
    }
    getStat(identifier) {
      return this._apiCallSync(
        this.statsManager,
        "getStat",
        [["identifier", vString]],
        identifier
      );
    }
    setAchievement(identifier, storeNow = false) {
      return this._apiCallSync(
        this.statsManager,
        "setAchievement",
        [
          ["identifier", vString],
          ["storeNow", vBoolean]
        ],
        identifier,
        storeNow
      );
    }
    setStat(identifier, value, storeNow = false) {
      return this._apiCallSync(
        this.statsManager,
        "setStat",
        [
          ["identifier", vString],
          ["value", vNumber],
          ["storeNow", vBoolean]
        ],
        identifier,
        value,
        storeNow
      );
    }
    async requestStats() {
      return this._apiCall(this.statsManager, "requestStats", []);
    }
    storeStats() {
      return this._apiCallSync(this.statsManager, "storeStats", []);
    }
    // ============
    // P2P Networking
    // ============
    /**
     * Get the maximum payload size in bytes for a single P2P message.
     * This is derived from the configured messageSize minus protocol overhead.
     */
    getP2PMaxPayloadSize() {
      this._ensureInit();
      return this._apiCallSync(this.p2pManager, "getMaxPayloadSize", []);
    }
    /**
     * Get the configured max incoming messages per channel queue.
     */
    getP2PMaxIncomingMessages() {
      this._ensureInit();
      return this._apiCallSync(this.p2pManager, "getMaxIncomingMessages", []);
    }
    /**
     * Get a pre-allocated scratch buffer for outgoing messages
     * @returns A Uint8Array buffer your game can write the binary payload to before calling sendP2PMessage
     */
    getP2POutgoingMessageBuffer() {
      this._ensureInit();
      return this._apiCallSync(this.p2pManager, "getOutgoingMessageBuffer", []);
    }
    /**
     * Send a message through P2P to a specific peer using their userId
     * @param toUserId - Peer userId to send to (undefined = broadcast)
     * @param appChannel - Optional channel for message routing. All messages still use the same P2P connection under the hood.
     * @param reliable - Send reliably, meaning guaranteed delivery and ordering, but slower (default: true)
     * @param payload - The payload to send (byte array)
     * @param payloadSize - How many bytes from the payload to send. Defaults to payload.length (the entire payload)
     * @returns true if the message was sent out successfully
     */
    sendP2PMessage(toUserId, appChannel = 0, reliable = true, payload, payloadSize = payload.length) {
      if (toUserId && !this.p2pManager.isPeerReady(toUserId)) {
        return false;
      } else if (!toUserId && !this.p2pManager.isBroadcastReady(reliable)) {
        return false;
      }
      return this.p2pManager.sendP2PMessage(
        toUserId,
        appChannel,
        reliable,
        payload,
        payloadSize
      );
    }
    /**
     * Send the same payload to all peers in the lobby
     * @param appChannel - Optional app-level channel for message routing. All messages still use the same P2P connection under the hood.
     * @param reliable - Send reliably, meaning guaranteed delivery and ordering, but slower (default: true)
     * @param payload - The payload to send (byte array)
     * @param payloadSize - How many bytes from the payload to send. Defaults to payload.length (the entire payload)
     * @returns true if the message was sent out successfully
     */
    broadcastP2PMessage(appChannel = 0, reliable = true, payload, payloadSize = payload.length) {
      if (!this.p2pManager.isBroadcastReady(reliable)) {
        return false;
      }
      return this.p2pManager.sendP2PMessage(
        void 0,
        appChannel,
        reliable,
        payload,
        payloadSize
      );
    }
    /**
     * Read one decoded P2P message from a specific channel.
     * Engine builds (Unity/Godot) should use drainP2PChannelToBuffer for the
     * hot path — it's batched and returns raw bytes without decode overhead.
     * @param appChannel - The channel to read from
     * @returns Decoded P2PMessage, or null if the channel has no pending messages.
     */
    readP2PMessageFromChannel(appChannel) {
      return this.p2pManager.readMessageFromChannel(appChannel);
    }
    /**
     * Drain all messages from a P2P channel into a buffer
     * Data will be presented in a tightly packed format: [size:4 bytes][msg:N bytes][size:4 bytes][msg:N bytes]...
     * JS games can just use readP2PMessageFromChannel to get decoded P2PMessages
     * Game engines should use drainP2PChannelToBuffer for better performance
     * @param appChannel - The channel to drain
     * @param buffer - The buffer to drain the messages into.
     *  If provided, the buffer will be filled until full, any remaining messages will be left in the queue.
     *  If not provided, a new buffer with all messages will be created and returned.
     * @returns A Uint8Array containing each message in a tightly packed format: [size:4 bytes][msg:N bytes][size:4 bytes][msg:N bytes]...
     */
    drainP2PChannelToBuffer(appChannel, buffer) {
      return this.p2pManager.drainChannelToBuffer(appChannel, buffer);
    }
    // ============
    // Game Lobbies
    // ============
    /**
     * Create a new lobby and join it as the host.
     * @param visibility - The visibility of the lobby
     * @param maxPlayers - Optional maximum number of players
     * @returns A WavedashResponse with the created lobbyId.
     *          Full lobby context is provided via the LobbyJoined event.
     * @emits LobbyJoined event on success with full lobby context
     */
    async createLobby(visibility, maxPlayers) {
      return this._apiCall(
        this.lobbyManager,
        "createLobby",
        [
          ["visibility", vEnum(LOBBY_VISIBILITY, "LobbyVisibility")],
          ["maxPlayers", vOptional(vNumber)]
        ],
        visibility,
        maxPlayers ?? void 0
      );
    }
    /**
     * Join an existing lobby.
     * @param lobbyId - The ID of the lobby to join
     * @returns A WavedashResponse with success/failure.
     *          Full lobby context is provided via the LobbyJoined event.
     * @emits LobbyJoined event on success with full lobby context
     */
    async joinLobby(lobbyId) {
      return this._apiCall(
        this.lobbyManager,
        "joinLobby",
        [["lobbyId", vId("LobbyId")]],
        lobbyId
      );
    }
    async listAvailableLobbies(friendsOnly = false) {
      return this._apiCall(
        this.lobbyManager,
        "listAvailableLobbies",
        [["friendsOnly", vBoolean]],
        friendsOnly
      );
    }
    async getLobby(lobbyId) {
      return this._apiCall(
        this.lobbyManager,
        "getLobby",
        [["lobbyId", vId("LobbyId")]],
        lobbyId
      );
    }
    getLobbyUsers(lobbyId) {
      return this._apiCallSync(
        this.lobbyManager,
        "getLobbyUsers",
        [["lobbyId", vId("LobbyId")]],
        lobbyId
      );
    }
    getNumLobbyUsers(lobbyId) {
      return this._apiCallSync(
        this.lobbyManager,
        "getNumLobbyUsers",
        [["lobbyId", vId("LobbyId")]],
        lobbyId
      );
    }
    getLobbyHostId(lobbyId) {
      return this._apiCallSync(
        this.lobbyManager,
        "getHostId",
        [["lobbyId", vId("LobbyId")]],
        lobbyId
      );
    }
    getLobbyData(lobbyId, key) {
      return this._apiCallSync(
        this.lobbyManager,
        "getLobbyData",
        [
          ["lobbyId", vId("LobbyId")],
          ["key", vString]
        ],
        lobbyId,
        key
      );
    }
    setLobbyData(lobbyId, key, value) {
      return this._apiCallSync(
        this.lobbyManager,
        "setLobbyData",
        [
          ["lobbyId", vId("LobbyId")],
          ["key", vString],
          ["value", vUnion(vString, vNumber, vBoolean, vNull)]
        ],
        lobbyId,
        key,
        value
      );
    }
    deleteLobbyData(lobbyId, key) {
      return this._apiCallSync(
        this.lobbyManager,
        "deleteLobbyData",
        [
          ["lobbyId", vId("LobbyId")],
          ["key", vString]
        ],
        lobbyId,
        key
      );
    }
    async leaveLobby(lobbyId) {
      return this._apiCall(
        this.lobbyManager,
        "leaveLobby",
        [["lobbyId", vId("LobbyId")]],
        lobbyId
      );
    }
    // Fire and forget, returns true if the message was sent out successfully
    // Game can listen for the LobbyMessage event to get the message that was posted
    sendLobbyMessage(lobbyId, message) {
      return this._apiCallSync(
        this.lobbyManager,
        "sendLobbyMessage",
        [
          ["lobbyId", vId("LobbyId")],
          ["message", vString]
        ],
        lobbyId,
        message
      );
    }
    async inviteUserToLobby(lobbyId, userId) {
      return this._apiCall(
        this.lobbyManager,
        "inviteUserToLobby",
        [
          ["lobbyId", vId("LobbyId")],
          ["userId", vId("UserId")]
        ],
        lobbyId,
        userId
      );
    }
    async getLobbyInviteLink(copyToClipboard = false) {
      return this._apiCall(
        this.lobbyManager,
        "getLobbyInviteLink",
        [["copyToClipboard", vBoolean]],
        copyToClipboard
      );
    }
    // ============
    // Paid content
    // ============
    /**
     * Returns true if the player owns the given paid content for this game.
     * Reads the `entitlements` claim from the gameplay JWT — this is a UX hint, not a
     * security check. The builds server re-verifies the JWT signature and gates
     * paid asset bytes on every request, so a tampered client return value
     * doesn't actually unlock anything. Pair with triggerPaywall() to drive
     * in-game UI.
     */
    async isEntitled(contentIdentifier) {
      return this._apiCall(
        this.paidContentManager,
        "isEntitled",
        [["contentIdentifier", vString]],
        contentIdentifier
      );
    }
    // Kept for backwards compatibility
    async isEntitled_EXPERIMENTAL(contentIdentifier) {
      return this.isEntitled(contentIdentifier);
    }
    /**
     * Returns the full list of paid-content identifiers the player owns for this game.
     * Reads the `entitlements` claim from the gameplay JWT — this is a UX hint,
     * not a security check (see {@link isEntitled}). Useful
     * for access gating multiple items at once without a call per content identifier.
     */
    async getEntitlements() {
      return this._apiCall(this.paidContentManager, "getEntitlements", []);
    }
    // Kept for backwards compatibility
    async getEntitlements_EXPERIMENTAL() {
      return this.getEntitlements();
    }
    /**
     * Trigger the Wavedash-rendered paywall flow for the given content. Resolves
     * immediately with data `true` if the player already owns it; otherwise
     * opens the modal and resolves with whether the user completed the purchase.
     * After a successful purchase the JWT is refreshed automatically so a
     * subsequent resource fetch is authenticated with the new purchase, and isEntitled
     * will return true if the purchase was successful. For a consumable, grant it
     * from the PurchaseCompleted event rather than from this result.
     */
    async triggerPaywall(contentIdentifier) {
      return this._apiCall(
        this.paidContentManager,
        "triggerPaywall",
        [["contentIdentifier", vString]],
        contentIdentifier
      );
    }
    // Kept for backwards compatibility
    async triggerPaywall_EXPERIMENTAL(contentIdentifier) {
      return this.triggerPaywall(contentIdentifier);
    }
    /**
     * Consumable purchases the game hasn't fulfilled, oldest first. These already
     * arrive as PurchaseCompleted events at launch (register the listener before
     * init(), or pass deferEvents), but each purchase fires once per session: use
     * this to retry one whose fulfillPurchase call failed.
     */
    async getUnfulfilledPurchases() {
      return this._apiCall(
        this.paidContentManager,
        "getUnfulfilledPurchases",
        []
      );
    }
    /**
     * Mark a consumable purchase fulfilled once the grant is saved, so it stops
     * being redelivered. A game's backend can do the same with
     * POST /api/purchases/{purchaseId}/fulfill and the webhook's JWT; both are
     * idempotent, so calling either or both is safe. Resolves with `status`:
     * FULFILLED, ALREADY_FULFILLED (also success), or NOT_FOUND (unknown or
     * refunded: don't grant it).
     */
    async fulfillPurchase(purchaseId) {
      return this._apiCall(
        this.paidContentManager,
        "fulfillPurchase",
        [["purchaseId", vId("PurchaseId")]],
        purchaseId
      );
    }
    // ==============================
    // User Presence
    // ==============================
    /**
     * Updates rich user presence so friends can see what the player is doing in game.
     * Supported keys:
     *   `status`  — one-line activity shown as the primary line (e.g. "Traveling in a group")
     *   `details` — secondary context shown beneath the status (e.g. current zone or mode)
     *
     * Pass an empty dictionary to clear all presence fields.
     * @param data Presence fields to update.
     * @returns true if the presence was updated successfully
     */
    async updateUserPresence(data) {
      if (typeof data === "string") {
        const raw = data;
        try {
          data = JSON.parse(raw);
        } catch (error2) {
          const message = `updateUserPresence: invalid JSON: ${raw}`;
          logger.error(message, error2);
          return this._formatResponse({
            success: false,
            data: null,
            message
          });
        }
      }
      return this._apiCall(
        this.heartbeatManager,
        "updateUserPresence",
        [["data", vRecord]],
        data
      );
    }
    // =====================
    // Deprecated no-op APIs
    // =====================
    isMuted() {
      console.warn("Wavedash.isMuted() is deprecated and is now a no-op");
      return false;
    }
    async requestMute(_muted) {
      console.warn("Wavedash.requestMute() is deprecated and is now a no-op");
      return false;
    }
    async toggleMute() {
      console.warn("Wavedash.toggleMute() is deprecated and is now a no-op");
      return false;
    }
    toggleOverlay() {
      console.warn("Wavedash.toggleOverlay() is deprecated and is now a no-op");
    }
    // ================
    // Internal Helpers
    // ================
    _isGodot() {
      return this.engineInstance !== null && this.engineInstance.type === GAME_ENGINE.GODOT;
    }
    // Godot receives JSON strings for plain objects/arrays; typed as T for JS consumers
    _formatResponse(data) {
      if (this._isGodot() && data !== null && (Array.isArray(data) || Object.getPrototypeOf(data) === Object.prototype)) {
        return JSON.stringify(data);
      }
      return data;
    }
    // Throws if init() hasn't been called. Only used by readyForEvents() and
    // the getP2P* getters (limits and outgoing buffer), which depend on the
    // config applied in init().
    _ensureInit() {
      if (!this._initialized) {
        logger.error("SDK not initialized. Call Wavedash.init first.");
        throw new Error("SDK not initialized");
      }
    }
    async _apiCall(manager, method, argSpecs, ...args) {
      logger.debug(method, ...args);
      try {
        validateArgs(method, argSpecs, args);
        const data = await manager[method](...args);
        return this._formatResponse({ success: true, data });
      } catch (error2) {
        const message = getErrorMessage(error2);
        logger.error(method, message);
        return this._formatResponse({ success: false, data: null, message });
      }
    }
    _apiCallSync(target, method, argSpecs, ...args) {
      logger.debug(method, ...args);
      try {
        validateArgs(method, argSpecs, args);
      } catch (error2) {
        const message = error2 instanceof Error ? error2.message : String(error2);
        logger.error(method, message);
        throw error2;
      }
      return this._formatResponse(target[method](...args));
    }
    /**
     * Set or update the engine instance (Unity or Godot).
     * This method is additive - it merges properties into any existing instance.
     * Can be called multiple times in any order (e.g., JSLib sets FS first, runner sets the unityInstance later).
     * @param engineInstance - The engine instance or partial attributes to merge.
     * @internal
     */
    setEngineInstance(engineInstance) {
      if (this.engineInstance) {
        Object.assign(this.engineInstance, engineInstance);
      } else {
        this.engineInstance = engineInstance;
      }
    }
    async ensureGameplayJwt(forceRefresh = false) {
      return this.authManager.getToken(forceRefresh);
    }
    /**
     * Tear down every manager. Called on the parent's `END_SESSION` signal
     */
    _destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      for (const manager of this.managers) {
        manager.destroy();
      }
    }
    _setupSessionEndListeners() {
      iframeMessenger.addEventListener(
        IFRAME_MESSAGE_TYPE.END_SESSION,
        () => this._destroy()
      );
    }
    /**
     * Respond to the service worker's creds request with the SDK's
     * current gameplay JWT. The SW asks when it wakes from termination with no
     * in-memory or IDB credentials (e.g. Safari ITP storage decay) — we're the
     * fastest live source. JWT only; sessionToken is owned by the SW + cookies.
     */
    _setupSwCredsListener() {
      this.swMessenger.addEventListener(
        SERVICE_WORKER_MESSAGE_TYPE.EMBED_CREDS_REQUEST,
        async (_payload, reply) => {
          let jwt;
          try {
            jwt = await this.ensureGameplayJwt();
          } catch (err) {
            logger.warn("Failed to resolve JWT for creds-request", err);
            return;
          }
          reply({
            type: SERVICE_WORKER_MESSAGE_TYPE.EMBED_CREDS_RESPONSE,
            payload: { gameplayJwt: jwt }
          });
        }
      );
    }
  };
  function setupWavedashSDK() {
    const existing = window.Wavedash;
    if (existing) return existing;
    const raw = new URLSearchParams(window.location.search).get(UrlParams.SdkConfig) ?? window.__wavedashSdkConfig;
    if (!raw) {
      throw new Error(
        `Wavedash SDK: missing ?${UrlParams.SdkConfig}= query param (or __wavedashSdkConfig global) on the page.`
      );
    }
    let sdkConfig;
    try {
      sdkConfig = JSON.parse(raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Wavedash SDK: failed to parse ?${UrlParams.SdkConfig}= as JSON: ${message}`
      );
    }
    setParentOrigin(sdkConfig.parentOrigin);
    const sdk = createTrackedSdk(new WavedashSDK(sdkConfig));
    window.Wavedash = sdk;
    window.WavedashJS = sdk;
    return sdk;
  }
  if (typeof window !== "undefined") {
    Worker = /* @__PURE__ */ ((BaseWorker) => class extends BaseWorker {
      constructor(scriptURL, options) {
        const url = String(scriptURL);
        let isRemoteHttp = false;
        try {
          const parsed = new URL(url, location.href);
          isRemoteHttp = (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.origin !== location.origin;
        } catch {
        }
        super(
          isRemoteHttp ? URL.createObjectURL(
            new Blob(
              [
                `importScripts=((i)=>(...a)=>i(...a.map((u)=>''+new URL(u,"${url}"))))(importScripts);importScripts("${url}")`
              ],
              { type: "text/javascript" }
            )
          ) : scriptURL,
          options
        );
      }
    })(Worker);
  }
  const DEV = false;
  var is_array = Array.isArray;
  var index_of = Array.prototype.indexOf;
  var array_from = Array.from;
  var define_property = Object.defineProperty;
  var get_descriptor = Object.getOwnPropertyDescriptor;
  var get_descriptors = Object.getOwnPropertyDescriptors;
  var object_prototype = Object.prototype;
  var array_prototype = Array.prototype;
  var get_prototype_of = Object.getPrototypeOf;
  var is_extensible = Object.isExtensible;
  function run_all(arr) {
    for (var i2 = 0; i2 < arr.length; i2++) {
      arr[i2]();
    }
  }
  function deferred() {
    var resolve;
    var reject;
    var promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }
  const DERIVED = 1 << 1;
  const EFFECT = 1 << 2;
  const RENDER_EFFECT = 1 << 3;
  const BLOCK_EFFECT = 1 << 4;
  const BRANCH_EFFECT = 1 << 5;
  const ROOT_EFFECT = 1 << 6;
  const BOUNDARY_EFFECT = 1 << 7;
  const CONNECTED = 1 << 9;
  const CLEAN = 1 << 10;
  const DIRTY = 1 << 11;
  const MAYBE_DIRTY = 1 << 12;
  const INERT = 1 << 13;
  const DESTROYED = 1 << 14;
  const EFFECT_RAN = 1 << 15;
  const EFFECT_TRANSPARENT = 1 << 16;
  const EAGER_EFFECT = 1 << 17;
  const HEAD_EFFECT = 1 << 18;
  const EFFECT_PRESERVED = 1 << 19;
  const USER_EFFECT = 1 << 20;
  const WAS_MARKED = 1 << 15;
  const REACTION_IS_UPDATING = 1 << 21;
  const ASYNC = 1 << 22;
  const ERROR_VALUE = 1 << 23;
  const STATE_SYMBOL = /* @__PURE__ */ Symbol("$state");
  const LOADING_ATTR_SYMBOL = /* @__PURE__ */ Symbol("");
  const STALE_REACTION = new class StaleReactionError extends Error {
    name = "StaleReactionError";
    message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
  }();
  function lifecycle_outside_component(name) {
    {
      throw new Error(`https://svelte.dev/e/lifecycle_outside_component`);
    }
  }
  function async_derived_orphan() {
    {
      throw new Error(`https://svelte.dev/e/async_derived_orphan`);
    }
  }
  function effect_in_teardown(rune) {
    {
      throw new Error(`https://svelte.dev/e/effect_in_teardown`);
    }
  }
  function effect_in_unowned_derived() {
    {
      throw new Error(`https://svelte.dev/e/effect_in_unowned_derived`);
    }
  }
  function effect_orphan(rune) {
    {
      throw new Error(`https://svelte.dev/e/effect_orphan`);
    }
  }
  function effect_update_depth_exceeded() {
    {
      throw new Error(`https://svelte.dev/e/effect_update_depth_exceeded`);
    }
  }
  function state_descriptors_fixed() {
    {
      throw new Error(`https://svelte.dev/e/state_descriptors_fixed`);
    }
  }
  function state_prototype_fixed() {
    {
      throw new Error(`https://svelte.dev/e/state_prototype_fixed`);
    }
  }
  function state_unsafe_mutation() {
    {
      throw new Error(`https://svelte.dev/e/state_unsafe_mutation`);
    }
  }
  function svelte_boundary_reset_onerror() {
    {
      throw new Error(`https://svelte.dev/e/svelte_boundary_reset_onerror`);
    }
  }
  const TEMPLATE_FRAGMENT = 1;
  const TEMPLATE_USE_IMPORT_NODE = 1 << 1;
  const UNINITIALIZED = /* @__PURE__ */ Symbol();
  const NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";
  const ATTACHMENT_KEY = "@attach";
  function select_multiple_invalid_value() {
    {
      console.warn(`https://svelte.dev/e/select_multiple_invalid_value`);
    }
  }
  function svelte_boundary_reset_noop() {
    {
      console.warn(`https://svelte.dev/e/svelte_boundary_reset_noop`);
    }
  }
  function equals(value) {
    return value === this.v;
  }
  let tracing_mode_flag = false;
  let component_context = null;
  function set_component_context(context) {
    component_context = context;
  }
  function getContext(key) {
    const context_map = get_or_init_context_map();
    const result = (
      /** @type {T} */
      context_map.get(key)
    );
    return result;
  }
  function hasContext(key) {
    const context_map = get_or_init_context_map();
    return context_map.has(key);
  }
  function push(props, runes = false, fn) {
    component_context = {
      p: component_context,
      i: false,
      c: null,
      e: null,
      s: props,
      x: null,
      l: null
    };
  }
  function pop(component) {
    var context = (
      /** @type {ComponentContext} */
      component_context
    );
    var effects = context.e;
    if (effects !== null) {
      context.e = null;
      for (var fn of effects) {
        create_user_effect(fn);
      }
    }
    context.i = true;
    component_context = context.p;
    return (
      /** @type {T} */
      {}
    );
  }
  function is_runes() {
    return true;
  }
  function get_or_init_context_map(name) {
    if (component_context === null) {
      lifecycle_outside_component();
    }
    return component_context.c ??= new Map(get_parent_context(component_context) || void 0);
  }
  function get_parent_context(component_context2) {
    let parent2 = component_context2.p;
    while (parent2 !== null) {
      const context_map = parent2.c;
      if (context_map !== null) {
        return context_map;
      }
      parent2 = parent2.p;
    }
    return null;
  }
  let micro_tasks = [];
  function run_micro_tasks() {
    var tasks = micro_tasks;
    micro_tasks = [];
    run_all(tasks);
  }
  function queue_micro_task(fn) {
    if (micro_tasks.length === 0 && true) {
      var tasks = micro_tasks;
      queueMicrotask(() => {
        if (tasks === micro_tasks) run_micro_tasks();
      });
    }
    micro_tasks.push(fn);
  }
  function handle_error(error2) {
    var effect2 = active_effect;
    if (effect2 === null) {
      active_reaction.f |= ERROR_VALUE;
      return error2;
    }
    if ((effect2.f & EFFECT_RAN) === 0) {
      if ((effect2.f & BOUNDARY_EFFECT) === 0) {
        throw error2;
      }
      effect2.b.error(error2);
    } else {
      invoke_error_boundary(error2, effect2);
    }
  }
  function invoke_error_boundary(error2, effect2) {
    while (effect2 !== null) {
      if ((effect2.f & BOUNDARY_EFFECT) !== 0) {
        try {
          effect2.b.error(error2);
          return;
        } catch (e) {
          error2 = e;
        }
      }
      effect2 = effect2.parent;
    }
    throw error2;
  }
  const batches = /* @__PURE__ */ new Set();
  let current_batch = null;
  let batch_values = null;
  let queued_root_effects = [];
  let last_scheduled_effect = null;
  let is_flushing = false;
  class Batch {
    committed = false;
    /**
     * The current values of any sources that are updated in this batch
     * They keys of this map are identical to `this.#previous`
     * @type {Map<Source, any>}
     */
    current = /* @__PURE__ */ new Map();
    /**
     * The values of any sources that are updated in this batch _before_ those updates took place.
     * They keys of this map are identical to `this.#current`
     * @type {Map<Source, any>}
     */
    previous = /* @__PURE__ */ new Map();
    /**
     * When the batch is committed (and the DOM is updated), we need to remove old branches
     * and append new ones by calling the functions added inside (if/each/key/etc) blocks
     * @type {Set<() => void>}
     */
    #commit_callbacks = /* @__PURE__ */ new Set();
    /**
     * If a fork is discarded, we need to destroy any effects that are no longer needed
     * @type {Set<(batch: Batch) => void>}
     */
    #discard_callbacks = /* @__PURE__ */ new Set();
    /**
     * The number of async effects that are currently in flight
     */
    #pending = 0;
    /**
     * The number of async effects that are currently in flight, _not_ inside a pending boundary
     */
    #blocking_pending = 0;
    /**
     * A deferred that resolves when the batch is committed, used with `settled()`
     * TODO replace with Promise.withResolvers once supported widely enough
     * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
     */
    #deferred = null;
    /**
     * Deferred effects (which run after async work has completed) that are DIRTY
     * @type {Effect[]}
     */
    #dirty_effects = [];
    /**
     * Deferred effects that are MAYBE_DIRTY
     * @type {Effect[]}
     */
    #maybe_dirty_effects = [];
    /**
     * A set of branches that still exist, but will be destroyed when this batch
     * is committed — we skip over these during `process`
     * @type {Set<Effect>}
     */
    skipped_effects = /* @__PURE__ */ new Set();
    is_fork = false;
    is_deferred() {
      return this.is_fork || this.#blocking_pending > 0;
    }
    /**
     *
     * @param {Effect[]} root_effects
     */
    process(root_effects) {
      queued_root_effects = [];
      this.apply();
      var target = {
        parent: null,
        effect: null,
        effects: [],
        render_effects: [],
        block_effects: []
      };
      for (const root2 of root_effects) {
        this.#traverse_effect_tree(root2, target);
      }
      if (!this.is_fork) {
        this.#resolve();
      }
      if (this.is_deferred()) {
        this.#defer_effects(target.effects);
        this.#defer_effects(target.render_effects);
        this.#defer_effects(target.block_effects);
      } else {
        current_batch = null;
        flush_queued_effects(target.render_effects);
        flush_queued_effects(target.effects);
        this.#deferred?.resolve();
      }
      batch_values = null;
    }
    /**
     * Traverse the effect tree, executing effects or stashing
     * them for later execution as appropriate
     * @param {Effect} root
     * @param {EffectTarget} target
     */
    #traverse_effect_tree(root2, target) {
      root2.f ^= CLEAN;
      var effect2 = root2.first;
      while (effect2 !== null) {
        var flags2 = effect2.f;
        var is_branch = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) !== 0;
        var is_skippable_branch = is_branch && (flags2 & CLEAN) !== 0;
        var skip = is_skippable_branch || (flags2 & INERT) !== 0 || this.skipped_effects.has(effect2);
        if ((effect2.f & BOUNDARY_EFFECT) !== 0 && effect2.b?.is_pending()) {
          target = {
            parent: target,
            effect: effect2,
            effects: [],
            render_effects: [],
            block_effects: []
          };
        }
        if (!skip && effect2.fn !== null) {
          if (is_branch) {
            effect2.f ^= CLEAN;
          } else if ((flags2 & EFFECT) !== 0) {
            target.effects.push(effect2);
          } else if (is_dirty(effect2)) {
            if ((effect2.f & BLOCK_EFFECT) !== 0) target.block_effects.push(effect2);
            update_effect(effect2);
          }
          var child2 = effect2.first;
          if (child2 !== null) {
            effect2 = child2;
            continue;
          }
        }
        var parent2 = effect2.parent;
        effect2 = effect2.next;
        while (effect2 === null && parent2 !== null) {
          if (parent2 === target.effect) {
            this.#defer_effects(target.effects);
            this.#defer_effects(target.render_effects);
            this.#defer_effects(target.block_effects);
            target = /** @type {EffectTarget} */
            target.parent;
          }
          effect2 = parent2.next;
          parent2 = parent2.parent;
        }
      }
    }
    /**
     * @param {Effect[]} effects
     */
    #defer_effects(effects) {
      for (const e of effects) {
        const target = (e.f & DIRTY) !== 0 ? this.#dirty_effects : this.#maybe_dirty_effects;
        target.push(e);
        this.#clear_marked(e.deps);
        set_signal_status(e, CLEAN);
      }
    }
    /**
     * @param {Value[] | null} deps
     */
    #clear_marked(deps) {
      if (deps === null) return;
      for (const dep of deps) {
        if ((dep.f & DERIVED) === 0 || (dep.f & WAS_MARKED) === 0) {
          continue;
        }
        dep.f ^= WAS_MARKED;
        this.#clear_marked(
          /** @type {Derived} */
          dep.deps
        );
      }
    }
    /**
     * Associate a change to a given source with the current
     * batch, noting its previous and current values
     * @param {Source} source
     * @param {any} value
     */
    capture(source2, value) {
      if (!this.previous.has(source2)) {
        this.previous.set(source2, value);
      }
      if ((source2.f & ERROR_VALUE) === 0) {
        this.current.set(source2, source2.v);
        batch_values?.set(source2, source2.v);
      }
    }
    activate() {
      current_batch = this;
      this.apply();
    }
    deactivate() {
      if (current_batch !== this) return;
      current_batch = null;
      batch_values = null;
    }
    flush() {
      this.activate();
      if (queued_root_effects.length > 0) {
        flush_effects();
        if (current_batch !== null && current_batch !== this) {
          return;
        }
      } else if (this.#pending === 0) {
        this.process([]);
      }
      this.deactivate();
    }
    discard() {
      for (const fn of this.#discard_callbacks) fn(this);
      this.#discard_callbacks.clear();
    }
    #resolve() {
      if (this.#blocking_pending === 0) {
        for (const fn of this.#commit_callbacks) fn();
        this.#commit_callbacks.clear();
      }
      if (this.#pending === 0) {
        this.#commit();
      }
    }
    #commit() {
      if (batches.size > 1) {
        this.previous.clear();
        var previous_batch_values = batch_values;
        var is_earlier = true;
        var dummy_target = {
          parent: null,
          effect: null,
          effects: [],
          render_effects: [],
          block_effects: []
        };
        for (const batch of batches) {
          if (batch === this) {
            is_earlier = false;
            continue;
          }
          const sources = [];
          for (const [source2, value] of this.current) {
            if (batch.current.has(source2)) {
              if (is_earlier && value !== batch.current.get(source2)) {
                batch.current.set(source2, value);
              } else {
                continue;
              }
            }
            sources.push(source2);
          }
          if (sources.length === 0) {
            continue;
          }
          const others = [...batch.current.keys()].filter((s) => !this.current.has(s));
          if (others.length > 0) {
            var prev_queued_root_effects = queued_root_effects;
            queued_root_effects = [];
            const marked = /* @__PURE__ */ new Set();
            const checked = /* @__PURE__ */ new Map();
            for (const source2 of sources) {
              mark_effects(source2, others, marked, checked);
            }
            if (queued_root_effects.length > 0) {
              current_batch = batch;
              batch.apply();
              for (const root2 of queued_root_effects) {
                batch.#traverse_effect_tree(root2, dummy_target);
              }
              batch.deactivate();
            }
            queued_root_effects = prev_queued_root_effects;
          }
        }
        current_batch = null;
        batch_values = previous_batch_values;
      }
      this.committed = true;
      batches.delete(this);
    }
    /**
     *
     * @param {boolean} blocking
     */
    increment(blocking) {
      this.#pending += 1;
      if (blocking) this.#blocking_pending += 1;
    }
    /**
     *
     * @param {boolean} blocking
     */
    decrement(blocking) {
      this.#pending -= 1;
      if (blocking) this.#blocking_pending -= 1;
      this.revive();
    }
    revive() {
      for (const e of this.#dirty_effects) {
        set_signal_status(e, DIRTY);
        schedule_effect(e);
      }
      for (const e of this.#maybe_dirty_effects) {
        set_signal_status(e, MAYBE_DIRTY);
        schedule_effect(e);
      }
      this.#dirty_effects = [];
      this.#maybe_dirty_effects = [];
      this.flush();
    }
    /** @param {() => void} fn */
    oncommit(fn) {
      this.#commit_callbacks.add(fn);
    }
    /** @param {(batch: Batch) => void} fn */
    ondiscard(fn) {
      this.#discard_callbacks.add(fn);
    }
    settled() {
      return (this.#deferred ??= deferred()).promise;
    }
    static ensure() {
      if (current_batch === null) {
        const batch = current_batch = new Batch();
        batches.add(current_batch);
        {
          Batch.enqueue(() => {
            if (current_batch !== batch) {
              return;
            }
            batch.flush();
          });
        }
      }
      return current_batch;
    }
    /** @param {() => void} task */
    static enqueue(task) {
      queue_micro_task(task);
    }
    apply() {
      return;
    }
  }
  function flush_effects() {
    var was_updating_effect = is_updating_effect;
    is_flushing = true;
    var source_stacks = null;
    try {
      var flush_count = 0;
      set_is_updating_effect(true);
      while (queued_root_effects.length > 0) {
        var batch = Batch.ensure();
        if (flush_count++ > 1e3) {
          var updates, entry;
          if (DEV) ;
          infinite_loop_guard();
        }
        batch.process(queued_root_effects);
        old_values.clear();
        if (DEV) ;
      }
    } finally {
      is_flushing = false;
      set_is_updating_effect(was_updating_effect);
      last_scheduled_effect = null;
    }
  }
  function infinite_loop_guard() {
    try {
      effect_update_depth_exceeded();
    } catch (error2) {
      invoke_error_boundary(error2, last_scheduled_effect);
    }
  }
  let eager_block_effects = null;
  function flush_queued_effects(effects) {
    var length = effects.length;
    if (length === 0) return;
    var i2 = 0;
    while (i2 < length) {
      var effect2 = effects[i2++];
      if ((effect2.f & (DESTROYED | INERT)) === 0 && is_dirty(effect2)) {
        eager_block_effects = /* @__PURE__ */ new Set();
        update_effect(effect2);
        if (effect2.deps === null && effect2.first === null && effect2.nodes_start === null) {
          if (effect2.teardown === null && effect2.ac === null) {
            unlink_effect(effect2);
          } else {
            effect2.fn = null;
          }
        }
        if (eager_block_effects?.size > 0) {
          old_values.clear();
          for (const e of eager_block_effects) {
            if ((e.f & (DESTROYED | INERT)) !== 0) continue;
            const ordered_effects = [e];
            let ancestor = e.parent;
            while (ancestor !== null) {
              if (eager_block_effects.has(ancestor)) {
                eager_block_effects.delete(ancestor);
                ordered_effects.push(ancestor);
              }
              ancestor = ancestor.parent;
            }
            for (let j = ordered_effects.length - 1; j >= 0; j--) {
              const e2 = ordered_effects[j];
              if ((e2.f & (DESTROYED | INERT)) !== 0) continue;
              update_effect(e2);
            }
          }
          eager_block_effects.clear();
        }
      }
    }
    eager_block_effects = null;
  }
  function mark_effects(value, sources, marked, checked) {
    if (marked.has(value)) return;
    marked.add(value);
    if (value.reactions !== null) {
      for (const reaction of value.reactions) {
        const flags2 = reaction.f;
        if ((flags2 & DERIVED) !== 0) {
          mark_effects(
            /** @type {Derived} */
            reaction,
            sources,
            marked,
            checked
          );
        } else if ((flags2 & (ASYNC | BLOCK_EFFECT)) !== 0 && (flags2 & DIRTY) === 0 && // we may have scheduled this one already
        depends_on(reaction, sources, checked)) {
          set_signal_status(reaction, DIRTY);
          schedule_effect(
            /** @type {Effect} */
            reaction
          );
        }
      }
    }
  }
  function depends_on(reaction, sources, checked) {
    const depends = checked.get(reaction);
    if (depends !== void 0) return depends;
    if (reaction.deps !== null) {
      for (const dep of reaction.deps) {
        if (sources.includes(dep)) {
          return true;
        }
        if ((dep.f & DERIVED) !== 0 && depends_on(
          /** @type {Derived} */
          dep,
          sources,
          checked
        )) {
          checked.set(
            /** @type {Derived} */
            dep,
            true
          );
          return true;
        }
      }
    }
    checked.set(reaction, false);
    return false;
  }
  function schedule_effect(signal) {
    var effect2 = last_scheduled_effect = signal;
    while (effect2.parent !== null) {
      effect2 = effect2.parent;
      var flags2 = effect2.f;
      if (is_flushing && effect2 === active_effect && (flags2 & BLOCK_EFFECT) !== 0 && (flags2 & HEAD_EFFECT) === 0) {
        return;
      }
      if ((flags2 & (ROOT_EFFECT | BRANCH_EFFECT)) !== 0) {
        if ((flags2 & CLEAN) === 0) return;
        effect2.f ^= CLEAN;
      }
    }
    queued_root_effects.push(effect2);
  }
  function createSubscriber(start) {
    let subscribers = 0;
    let version2 = source(0);
    let stop;
    return () => {
      if (effect_tracking()) {
        get(version2);
        render_effect(() => {
          if (subscribers === 0) {
            stop = untrack(() => start(() => increment(version2)));
          }
          subscribers += 1;
          return () => {
            queue_micro_task(() => {
              subscribers -= 1;
              if (subscribers === 0) {
                stop?.();
                stop = void 0;
                increment(version2);
              }
            });
          };
        });
      }
    };
  }
  var flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED | BOUNDARY_EFFECT;
  function boundary(node, props, children) {
    new Boundary(node, props, children);
  }
  class Boundary {
    /** @type {Boundary | null} */
    parent;
    #pending = false;
    /** @type {TemplateNode} */
    #anchor;
    /** @type {TemplateNode | null} */
    #hydrate_open = null;
    /** @type {BoundaryProps} */
    #props;
    /** @type {((anchor: Node) => void)} */
    #children;
    /** @type {Effect} */
    #effect;
    /** @type {Effect | null} */
    #main_effect = null;
    /** @type {Effect | null} */
    #pending_effect = null;
    /** @type {Effect | null} */
    #failed_effect = null;
    /** @type {DocumentFragment | null} */
    #offscreen_fragment = null;
    /** @type {TemplateNode | null} */
    #pending_anchor = null;
    #local_pending_count = 0;
    #pending_count = 0;
    #is_creating_fallback = false;
    /**
     * A source containing the number of pending async deriveds/expressions.
     * Only created if `$effect.pending()` is used inside the boundary,
     * otherwise updating the source results in needless `Batch.ensure()`
     * calls followed by no-op flushes
     * @type {Source<number> | null}
     */
    #effect_pending = null;
    #effect_pending_subscriber = createSubscriber(() => {
      this.#effect_pending = source(this.#local_pending_count);
      return () => {
        this.#effect_pending = null;
      };
    });
    /**
     * @param {TemplateNode} node
     * @param {BoundaryProps} props
     * @param {((anchor: Node) => void)} children
     */
    constructor(node, props, children) {
      this.#anchor = node;
      this.#props = props;
      this.#children = children;
      this.parent = /** @type {Effect} */
      active_effect.b;
      this.#pending = !!this.#props.pending;
      this.#effect = block(() => {
        active_effect.b = this;
        {
          var anchor = this.#get_anchor();
          try {
            this.#main_effect = branch(() => children(anchor));
          } catch (error2) {
            this.error(error2);
          }
          if (this.#pending_count > 0) {
            this.#show_pending_snippet();
          } else {
            this.#pending = false;
          }
        }
        return () => {
          this.#pending_anchor?.remove();
        };
      }, flags);
    }
    #hydrate_resolved_content() {
      try {
        this.#main_effect = branch(() => this.#children(this.#anchor));
      } catch (error2) {
        this.error(error2);
      }
      this.#pending = false;
    }
    #hydrate_pending_content() {
      const pending = this.#props.pending;
      if (!pending) {
        return;
      }
      this.#pending_effect = branch(() => pending(this.#anchor));
      Batch.enqueue(() => {
        var anchor = this.#get_anchor();
        this.#main_effect = this.#run(() => {
          Batch.ensure();
          return branch(() => this.#children(anchor));
        });
        if (this.#pending_count > 0) {
          this.#show_pending_snippet();
        } else {
          pause_effect(
            /** @type {Effect} */
            this.#pending_effect,
            () => {
              this.#pending_effect = null;
            }
          );
          this.#pending = false;
        }
      });
    }
    #get_anchor() {
      var anchor = this.#anchor;
      if (this.#pending) {
        this.#pending_anchor = create_text();
        this.#anchor.before(this.#pending_anchor);
        anchor = this.#pending_anchor;
      }
      return anchor;
    }
    /**
     * Returns `true` if the effect exists inside a boundary whose pending snippet is shown
     * @returns {boolean}
     */
    is_pending() {
      return this.#pending || !!this.parent && this.parent.is_pending();
    }
    has_pending_snippet() {
      return !!this.#props.pending;
    }
    /**
     * @param {() => Effect | null} fn
     */
    #run(fn) {
      var previous_effect = active_effect;
      var previous_reaction = active_reaction;
      var previous_ctx = component_context;
      set_active_effect(this.#effect);
      set_active_reaction(this.#effect);
      set_component_context(this.#effect.ctx);
      try {
        return fn();
      } catch (e) {
        handle_error(e);
        return null;
      } finally {
        set_active_effect(previous_effect);
        set_active_reaction(previous_reaction);
        set_component_context(previous_ctx);
      }
    }
    #show_pending_snippet() {
      const pending = (
        /** @type {(anchor: Node) => void} */
        this.#props.pending
      );
      if (this.#main_effect !== null) {
        this.#offscreen_fragment = document.createDocumentFragment();
        this.#offscreen_fragment.append(
          /** @type {TemplateNode} */
          this.#pending_anchor
        );
        move_effect(this.#main_effect, this.#offscreen_fragment);
      }
      if (this.#pending_effect === null) {
        this.#pending_effect = branch(() => pending(this.#anchor));
      }
    }
    /**
     * Updates the pending count associated with the currently visible pending snippet,
     * if any, such that we can replace the snippet with content once work is done
     * @param {1 | -1} d
     */
    #update_pending_count(d) {
      if (!this.has_pending_snippet()) {
        if (this.parent) {
          this.parent.#update_pending_count(d);
        }
        return;
      }
      this.#pending_count += d;
      if (this.#pending_count === 0) {
        this.#pending = false;
        if (this.#pending_effect) {
          pause_effect(this.#pending_effect, () => {
            this.#pending_effect = null;
          });
        }
        if (this.#offscreen_fragment) {
          this.#anchor.before(this.#offscreen_fragment);
          this.#offscreen_fragment = null;
        }
      }
    }
    /**
     * Update the source that powers `$effect.pending()` inside this boundary,
     * and controls when the current `pending` snippet (if any) is removed.
     * Do not call from inside the class
     * @param {1 | -1} d
     */
    update_pending_count(d) {
      this.#update_pending_count(d);
      this.#local_pending_count += d;
      if (this.#effect_pending) {
        internal_set(this.#effect_pending, this.#local_pending_count);
      }
    }
    get_effect_pending() {
      this.#effect_pending_subscriber();
      return get(
        /** @type {Source<number>} */
        this.#effect_pending
      );
    }
    /** @param {unknown} error */
    error(error2) {
      var onerror = this.#props.onerror;
      let failed = this.#props.failed;
      if (this.#is_creating_fallback || !onerror && !failed) {
        throw error2;
      }
      if (this.#main_effect) {
        destroy_effect(this.#main_effect);
        this.#main_effect = null;
      }
      if (this.#pending_effect) {
        destroy_effect(this.#pending_effect);
        this.#pending_effect = null;
      }
      if (this.#failed_effect) {
        destroy_effect(this.#failed_effect);
        this.#failed_effect = null;
      }
      var did_reset = false;
      var calling_on_error = false;
      const reset = () => {
        if (did_reset) {
          svelte_boundary_reset_noop();
          return;
        }
        did_reset = true;
        if (calling_on_error) {
          svelte_boundary_reset_onerror();
        }
        Batch.ensure();
        this.#local_pending_count = 0;
        if (this.#failed_effect !== null) {
          pause_effect(this.#failed_effect, () => {
            this.#failed_effect = null;
          });
        }
        this.#pending = this.has_pending_snippet();
        this.#main_effect = this.#run(() => {
          this.#is_creating_fallback = false;
          return branch(() => this.#children(this.#anchor));
        });
        if (this.#pending_count > 0) {
          this.#show_pending_snippet();
        } else {
          this.#pending = false;
        }
      };
      var previous_reaction = active_reaction;
      try {
        set_active_reaction(null);
        calling_on_error = true;
        onerror?.(error2, reset);
        calling_on_error = false;
      } catch (error3) {
        invoke_error_boundary(error3, this.#effect && this.#effect.parent);
      } finally {
        set_active_reaction(previous_reaction);
      }
      if (failed) {
        queue_micro_task(() => {
          this.#failed_effect = this.#run(() => {
            Batch.ensure();
            this.#is_creating_fallback = true;
            try {
              return branch(() => {
                failed(
                  this.#anchor,
                  () => error2,
                  () => reset
                );
              });
            } catch (error3) {
              invoke_error_boundary(
                error3,
                /** @type {Effect} */
                this.#effect.parent
              );
              return null;
            } finally {
              this.#is_creating_fallback = false;
            }
          });
        });
      }
    }
  }
  function flatten(blockers, sync, async, fn) {
    const d = derived;
    if (async.length === 0 && blockers.length === 0) {
      fn(sync.map(d));
      return;
    }
    var batch = current_batch;
    var parent2 = (
      /** @type {Effect} */
      active_effect
    );
    var restore = capture();
    function run() {
      Promise.all(async.map((expression) => /* @__PURE__ */ async_derived(expression))).then((result) => {
        restore();
        try {
          fn([...sync.map(d), ...result]);
        } catch (error2) {
          if ((parent2.f & DESTROYED) === 0) {
            invoke_error_boundary(error2, parent2);
          }
        }
        batch?.deactivate();
        unset_context();
      }).catch((error2) => {
        invoke_error_boundary(error2, parent2);
      });
    }
    if (blockers.length > 0) {
      Promise.all(blockers).then(() => {
        restore();
        try {
          return run();
        } finally {
          batch?.deactivate();
          unset_context();
        }
      });
    } else {
      run();
    }
  }
  function capture() {
    var previous_effect = active_effect;
    var previous_reaction = active_reaction;
    var previous_component_context = component_context;
    var previous_batch = current_batch;
    return function restore(activate_batch = true) {
      set_active_effect(previous_effect);
      set_active_reaction(previous_reaction);
      set_component_context(previous_component_context);
      if (activate_batch) previous_batch?.activate();
    };
  }
  function unset_context() {
    set_active_effect(null);
    set_active_reaction(null);
    set_component_context(null);
  }
  // @__NO_SIDE_EFFECTS__
  function derived(fn) {
    var flags2 = DERIVED | DIRTY;
    var parent_derived = active_reaction !== null && (active_reaction.f & DERIVED) !== 0 ? (
      /** @type {Derived} */
      active_reaction
    ) : null;
    if (active_effect !== null) {
      active_effect.f |= EFFECT_PRESERVED;
    }
    const signal = {
      ctx: component_context,
      deps: null,
      effects: null,
      equals,
      f: flags2,
      fn,
      reactions: null,
      rv: 0,
      v: (
        /** @type {V} */
        UNINITIALIZED
      ),
      wv: 0,
      parent: parent_derived ?? active_effect,
      ac: null
    };
    return signal;
  }
  // @__NO_SIDE_EFFECTS__
  function async_derived(fn, location2) {
    let parent2 = (
      /** @type {Effect | null} */
      active_effect
    );
    if (parent2 === null) {
      async_derived_orphan();
    }
    var boundary2 = (
      /** @type {Boundary} */
      parent2.b
    );
    var promise = (
      /** @type {Promise<V>} */
      /** @type {unknown} */
      void 0
    );
    var signal = source(
      /** @type {V} */
      UNINITIALIZED
    );
    var should_suspend = !active_reaction;
    var deferreds = /* @__PURE__ */ new Map();
    async_effect(() => {
      var d = deferred();
      promise = d.promise;
      try {
        Promise.resolve(fn()).then(d.resolve, d.reject).then(() => {
          if (batch === current_batch && batch.committed) {
            batch.deactivate();
          }
          unset_context();
        });
      } catch (error2) {
        d.reject(error2);
        unset_context();
      }
      var batch = (
        /** @type {Batch} */
        current_batch
      );
      if (should_suspend) {
        var blocking = !boundary2.is_pending();
        boundary2.update_pending_count(1);
        batch.increment(blocking);
        deferreds.get(batch)?.reject(STALE_REACTION);
        deferreds.delete(batch);
        deferreds.set(batch, d);
      }
      const handler = (value, error2 = void 0) => {
        batch.activate();
        if (error2) {
          if (error2 !== STALE_REACTION) {
            signal.f |= ERROR_VALUE;
            internal_set(signal, error2);
          }
        } else {
          if ((signal.f & ERROR_VALUE) !== 0) {
            signal.f ^= ERROR_VALUE;
          }
          internal_set(signal, value);
          for (const [b, d2] of deferreds) {
            deferreds.delete(b);
            if (b === batch) break;
            d2.reject(STALE_REACTION);
          }
        }
        if (should_suspend) {
          boundary2.update_pending_count(-1);
          batch.decrement(blocking);
        }
      };
      d.promise.then(handler, (e) => handler(null, e || "unknown"));
    });
    teardown(() => {
      for (const d of deferreds.values()) {
        d.reject(STALE_REACTION);
      }
    });
    return new Promise((fulfil) => {
      function next(p) {
        function go() {
          if (p === promise) {
            fulfil(signal);
          } else {
            next(promise);
          }
        }
        p.then(go, go);
      }
      next(promise);
    });
  }
  // @__NO_SIDE_EFFECTS__
  function user_derived(fn) {
    const d = /* @__PURE__ */ derived(fn);
    push_reaction_value(d);
    return d;
  }
  function destroy_derived_effects(derived2) {
    var effects = derived2.effects;
    if (effects !== null) {
      derived2.effects = null;
      for (var i2 = 0; i2 < effects.length; i2 += 1) {
        destroy_effect(
          /** @type {Effect} */
          effects[i2]
        );
      }
    }
  }
  function get_derived_parent_effect(derived2) {
    var parent2 = derived2.parent;
    while (parent2 !== null) {
      if ((parent2.f & DERIVED) === 0) {
        return (parent2.f & DESTROYED) === 0 ? (
          /** @type {Effect} */
          parent2
        ) : null;
      }
      parent2 = parent2.parent;
    }
    return null;
  }
  function execute_derived(derived2) {
    var value;
    var prev_active_effect = active_effect;
    set_active_effect(get_derived_parent_effect(derived2));
    {
      try {
        derived2.f &= ~WAS_MARKED;
        destroy_derived_effects(derived2);
        value = update_reaction(derived2);
      } finally {
        set_active_effect(prev_active_effect);
      }
    }
    return value;
  }
  function update_derived(derived2) {
    var value = execute_derived(derived2);
    if (!derived2.equals(value)) {
      derived2.v = value;
      derived2.wv = increment_write_version();
    }
    if (is_destroying_effect) {
      return;
    }
    if (batch_values !== null) {
      if (effect_tracking()) {
        batch_values.set(derived2, derived2.v);
      }
    } else {
      var status = (derived2.f & CONNECTED) === 0 ? MAYBE_DIRTY : CLEAN;
      set_signal_status(derived2, status);
    }
  }
  let eager_effects = /* @__PURE__ */ new Set();
  const old_values = /* @__PURE__ */ new Map();
  let eager_effects_deferred = false;
  function source(v, stack) {
    var signal = {
      f: 0,
      // TODO ideally we could skip this altogether, but it causes type errors
      v,
      reactions: null,
      equals,
      rv: 0,
      wv: 0
    };
    return signal;
  }
  // @__NO_SIDE_EFFECTS__
  function state(v, stack) {
    const s = source(v);
    push_reaction_value(s);
    return s;
  }
  function set(source2, value, should_proxy = false) {
    if (active_reaction !== null && // since we are untracking the function inside `$inspect.with` we need to add this check
    // to ensure we error if state is set inside an inspect effect
    (!untracking || (active_reaction.f & EAGER_EFFECT) !== 0) && is_runes() && (active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | EAGER_EFFECT)) !== 0 && !current_sources?.includes(source2)) {
      state_unsafe_mutation();
    }
    let new_value = should_proxy ? proxy(value) : value;
    return internal_set(source2, new_value);
  }
  function internal_set(source2, value) {
    if (!source2.equals(value)) {
      var old_value = source2.v;
      if (is_destroying_effect) {
        old_values.set(source2, value);
      } else {
        old_values.set(source2, old_value);
      }
      source2.v = value;
      var batch = Batch.ensure();
      batch.capture(source2, old_value);
      if ((source2.f & DERIVED) !== 0) {
        if ((source2.f & DIRTY) !== 0) {
          execute_derived(
            /** @type {Derived} */
            source2
          );
        }
        set_signal_status(source2, (source2.f & CONNECTED) !== 0 ? CLEAN : MAYBE_DIRTY);
      }
      source2.wv = increment_write_version();
      mark_reactions(source2, DIRTY);
      if (active_effect !== null && (active_effect.f & CLEAN) !== 0 && (active_effect.f & (BRANCH_EFFECT | ROOT_EFFECT)) === 0) {
        if (untracked_writes === null) {
          set_untracked_writes([source2]);
        } else {
          untracked_writes.push(source2);
        }
      }
      if (!batch.is_fork && eager_effects.size > 0 && !eager_effects_deferred) {
        flush_eager_effects();
      }
    }
    return value;
  }
  function flush_eager_effects() {
    eager_effects_deferred = false;
    var prev_is_updating_effect = is_updating_effect;
    set_is_updating_effect(true);
    const inspects = Array.from(eager_effects);
    try {
      for (const effect2 of inspects) {
        if ((effect2.f & CLEAN) !== 0) {
          set_signal_status(effect2, MAYBE_DIRTY);
        }
        if (is_dirty(effect2)) {
          update_effect(effect2);
        }
      }
    } finally {
      set_is_updating_effect(prev_is_updating_effect);
    }
    eager_effects.clear();
  }
  function increment(source2) {
    set(source2, source2.v + 1);
  }
  function mark_reactions(signal, status) {
    var reactions = signal.reactions;
    if (reactions === null) return;
    var length = reactions.length;
    for (var i2 = 0; i2 < length; i2++) {
      var reaction = reactions[i2];
      var flags2 = reaction.f;
      var not_dirty = (flags2 & DIRTY) === 0;
      if (not_dirty) {
        set_signal_status(reaction, status);
      }
      if ((flags2 & DERIVED) !== 0) {
        var derived2 = (
          /** @type {Derived} */
          reaction
        );
        batch_values?.delete(derived2);
        if ((flags2 & WAS_MARKED) === 0) {
          if (flags2 & CONNECTED) {
            reaction.f |= WAS_MARKED;
          }
          mark_reactions(derived2, MAYBE_DIRTY);
        }
      } else if (not_dirty) {
        if ((flags2 & BLOCK_EFFECT) !== 0) {
          if (eager_block_effects !== null) {
            eager_block_effects.add(
              /** @type {Effect} */
              reaction
            );
          }
        }
        schedule_effect(
          /** @type {Effect} */
          reaction
        );
      }
    }
  }
  function proxy(value) {
    if (typeof value !== "object" || value === null || STATE_SYMBOL in value) {
      return value;
    }
    const prototype = get_prototype_of(value);
    if (prototype !== object_prototype && prototype !== array_prototype) {
      return value;
    }
    var sources = /* @__PURE__ */ new Map();
    var is_proxied_array = is_array(value);
    var version2 = /* @__PURE__ */ state(0);
    var parent_version = update_version;
    var with_parent = (fn) => {
      if (update_version === parent_version) {
        return fn();
      }
      var reaction = active_reaction;
      var version3 = update_version;
      set_active_reaction(null);
      set_update_version(parent_version);
      var result = fn();
      set_active_reaction(reaction);
      set_update_version(version3);
      return result;
    };
    if (is_proxied_array) {
      sources.set("length", /* @__PURE__ */ state(
        /** @type {any[]} */
        value.length
      ));
    }
    return new Proxy(
      /** @type {any} */
      value,
      {
        defineProperty(_, prop, descriptor) {
          if (!("value" in descriptor) || descriptor.configurable === false || descriptor.enumerable === false || descriptor.writable === false) {
            state_descriptors_fixed();
          }
          var s = sources.get(prop);
          if (s === void 0) {
            s = with_parent(() => {
              var s2 = /* @__PURE__ */ state(descriptor.value);
              sources.set(prop, s2);
              return s2;
            });
          } else {
            set(s, descriptor.value, true);
          }
          return true;
        },
        deleteProperty(target, prop) {
          var s = sources.get(prop);
          if (s === void 0) {
            if (prop in target) {
              const s2 = with_parent(() => /* @__PURE__ */ state(UNINITIALIZED));
              sources.set(prop, s2);
              increment(version2);
            }
          } else {
            set(s, UNINITIALIZED);
            increment(version2);
          }
          return true;
        },
        get(target, prop, receiver) {
          if (prop === STATE_SYMBOL) {
            return value;
          }
          var s = sources.get(prop);
          var exists = prop in target;
          if (s === void 0 && (!exists || get_descriptor(target, prop)?.writable)) {
            s = with_parent(() => {
              var p = proxy(exists ? target[prop] : UNINITIALIZED);
              var s2 = /* @__PURE__ */ state(p);
              return s2;
            });
            sources.set(prop, s);
          }
          if (s !== void 0) {
            var v = get(s);
            return v === UNINITIALIZED ? void 0 : v;
          }
          return Reflect.get(target, prop, receiver);
        },
        getOwnPropertyDescriptor(target, prop) {
          var descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
          if (descriptor && "value" in descriptor) {
            var s = sources.get(prop);
            if (s) descriptor.value = get(s);
          } else if (descriptor === void 0) {
            var source2 = sources.get(prop);
            var value2 = source2?.v;
            if (source2 !== void 0 && value2 !== UNINITIALIZED) {
              return {
                enumerable: true,
                configurable: true,
                value: value2,
                writable: true
              };
            }
          }
          return descriptor;
        },
        has(target, prop) {
          if (prop === STATE_SYMBOL) {
            return true;
          }
          var s = sources.get(prop);
          var has = s !== void 0 && s.v !== UNINITIALIZED || Reflect.has(target, prop);
          if (s !== void 0 || active_effect !== null && (!has || get_descriptor(target, prop)?.writable)) {
            if (s === void 0) {
              s = with_parent(() => {
                var p = has ? proxy(target[prop]) : UNINITIALIZED;
                var s2 = /* @__PURE__ */ state(p);
                return s2;
              });
              sources.set(prop, s);
            }
            var value2 = get(s);
            if (value2 === UNINITIALIZED) {
              return false;
            }
          }
          return has;
        },
        set(target, prop, value2, receiver) {
          var s = sources.get(prop);
          var has = prop in target;
          if (is_proxied_array && prop === "length") {
            for (var i2 = value2; i2 < /** @type {Source<number>} */
            s.v; i2 += 1) {
              var other_s = sources.get(i2 + "");
              if (other_s !== void 0) {
                set(other_s, UNINITIALIZED);
              } else if (i2 in target) {
                other_s = with_parent(() => /* @__PURE__ */ state(UNINITIALIZED));
                sources.set(i2 + "", other_s);
              }
            }
          }
          if (s === void 0) {
            if (!has || get_descriptor(target, prop)?.writable) {
              s = with_parent(() => /* @__PURE__ */ state(void 0));
              set(s, proxy(value2));
              sources.set(prop, s);
            }
          } else {
            has = s.v !== UNINITIALIZED;
            var p = with_parent(() => proxy(value2));
            set(s, p);
          }
          var descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
          if (descriptor?.set) {
            descriptor.set.call(receiver, value2);
          }
          if (!has) {
            if (is_proxied_array && typeof prop === "string") {
              var ls = (
                /** @type {Source<number>} */
                sources.get("length")
              );
              var n = Number(prop);
              if (Number.isInteger(n) && n >= ls.v) {
                set(ls, n + 1);
              }
            }
            increment(version2);
          }
          return true;
        },
        ownKeys(target) {
          get(version2);
          var own_keys = Reflect.ownKeys(target).filter((key2) => {
            var source3 = sources.get(key2);
            return source3 === void 0 || source3.v !== UNINITIALIZED;
          });
          for (var [key, source2] of sources) {
            if (source2.v !== UNINITIALIZED && !(key in target)) {
              own_keys.push(key);
            }
          }
          return own_keys;
        },
        setPrototypeOf() {
          state_prototype_fixed();
        }
      }
    );
  }
  function get_proxied_value(value) {
    try {
      if (value !== null && typeof value === "object" && STATE_SYMBOL in value) {
        return value[STATE_SYMBOL];
      }
    } catch {
    }
    return value;
  }
  function is(a, b) {
    return Object.is(get_proxied_value(a), get_proxied_value(b));
  }
  var $window;
  var is_firefox;
  var first_child_getter;
  var next_sibling_getter;
  function init_operations() {
    if ($window !== void 0) {
      return;
    }
    $window = window;
    is_firefox = /Firefox/.test(navigator.userAgent);
    var element_prototype = Element.prototype;
    var node_prototype = Node.prototype;
    var text_prototype = Text.prototype;
    first_child_getter = get_descriptor(node_prototype, "firstChild").get;
    next_sibling_getter = get_descriptor(node_prototype, "nextSibling").get;
    if (is_extensible(element_prototype)) {
      element_prototype.__click = void 0;
      element_prototype.__className = void 0;
      element_prototype.__attributes = null;
      element_prototype.__style = void 0;
      element_prototype.__e = void 0;
    }
    if (is_extensible(text_prototype)) {
      text_prototype.__t = void 0;
    }
  }
  function create_text(value = "") {
    return document.createTextNode(value);
  }
  // @__NO_SIDE_EFFECTS__
  function get_first_child(node) {
    return first_child_getter.call(node);
  }
  // @__NO_SIDE_EFFECTS__
  function get_next_sibling(node) {
    return next_sibling_getter.call(node);
  }
  function child(node, is_text) {
    {
      return /* @__PURE__ */ get_first_child(node);
    }
  }
  function first_child(fragment, is_text = false) {
    {
      var first = (
        /** @type {DocumentFragment} */
        /* @__PURE__ */ get_first_child(
          /** @type {Node} */
          fragment
        )
      );
      if (first instanceof Comment && first.data === "") return /* @__PURE__ */ get_next_sibling(first);
      return first;
    }
  }
  function sibling(node, count = 1, is_text = false) {
    let next_sibling = node;
    while (count--) {
      next_sibling = /** @type {TemplateNode} */
      /* @__PURE__ */ get_next_sibling(next_sibling);
    }
    {
      return next_sibling;
    }
  }
  function should_defer_append() {
    return false;
  }
  function autofocus(dom, value) {
    if (value) {
      const body = document.body;
      dom.autofocus = true;
      queue_micro_task(() => {
        if (document.activeElement === body) {
          dom.focus();
        }
      });
    }
  }
  function without_reactive_context(fn) {
    var previous_reaction = active_reaction;
    var previous_effect = active_effect;
    set_active_reaction(null);
    set_active_effect(null);
    try {
      return fn();
    } finally {
      set_active_reaction(previous_reaction);
      set_active_effect(previous_effect);
    }
  }
  function validate_effect(rune) {
    if (active_effect === null) {
      if (active_reaction === null) {
        effect_orphan();
      }
      effect_in_unowned_derived();
    }
    if (is_destroying_effect) {
      effect_in_teardown();
    }
  }
  function push_effect(effect2, parent_effect) {
    var parent_last = parent_effect.last;
    if (parent_last === null) {
      parent_effect.last = parent_effect.first = effect2;
    } else {
      parent_last.next = effect2;
      effect2.prev = parent_last;
      parent_effect.last = effect2;
    }
  }
  function create_effect(type, fn, sync) {
    var parent2 = active_effect;
    if (parent2 !== null && (parent2.f & INERT) !== 0) {
      type |= INERT;
    }
    var effect2 = {
      ctx: component_context,
      deps: null,
      nodes_start: null,
      nodes_end: null,
      f: type | DIRTY | CONNECTED,
      first: null,
      fn,
      last: null,
      next: null,
      parent: parent2,
      b: parent2 && parent2.b,
      prev: null,
      teardown: null,
      transitions: null,
      wv: 0,
      ac: null
    };
    if (sync) {
      try {
        update_effect(effect2);
        effect2.f |= EFFECT_RAN;
      } catch (e2) {
        destroy_effect(effect2);
        throw e2;
      }
    } else if (fn !== null) {
      schedule_effect(effect2);
    }
    var e = effect2;
    if (sync && e.deps === null && e.teardown === null && e.nodes_start === null && e.first === e.last && // either `null`, or a singular child
    (e.f & EFFECT_PRESERVED) === 0) {
      e = e.first;
      if ((type & BLOCK_EFFECT) !== 0 && (type & EFFECT_TRANSPARENT) !== 0 && e !== null) {
        e.f |= EFFECT_TRANSPARENT;
      }
    }
    if (e !== null) {
      e.parent = parent2;
      if (parent2 !== null) {
        push_effect(e, parent2);
      }
      if (active_reaction !== null && (active_reaction.f & DERIVED) !== 0 && (type & ROOT_EFFECT) === 0) {
        var derived2 = (
          /** @type {Derived} */
          active_reaction
        );
        (derived2.effects ??= []).push(e);
      }
    }
    return effect2;
  }
  function effect_tracking() {
    return active_reaction !== null && !untracking;
  }
  function teardown(fn) {
    const effect2 = create_effect(RENDER_EFFECT, null, false);
    set_signal_status(effect2, CLEAN);
    effect2.teardown = fn;
    return effect2;
  }
  function user_effect(fn) {
    validate_effect();
    var flags2 = (
      /** @type {Effect} */
      active_effect.f
    );
    var defer = !active_reaction && (flags2 & BRANCH_EFFECT) !== 0 && (flags2 & EFFECT_RAN) === 0;
    if (defer) {
      var context = (
        /** @type {ComponentContext} */
        component_context
      );
      (context.e ??= []).push(fn);
    } else {
      return create_user_effect(fn);
    }
  }
  function create_user_effect(fn) {
    return create_effect(EFFECT | USER_EFFECT, fn, false);
  }
  function component_root(fn) {
    Batch.ensure();
    const effect2 = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn, true);
    return (options = {}) => {
      return new Promise((fulfil) => {
        if (options.outro) {
          pause_effect(effect2, () => {
            destroy_effect(effect2);
            fulfil(void 0);
          });
        } else {
          destroy_effect(effect2);
          fulfil(void 0);
        }
      });
    };
  }
  function effect(fn) {
    return create_effect(EFFECT, fn, false);
  }
  function async_effect(fn) {
    return create_effect(ASYNC | EFFECT_PRESERVED, fn, true);
  }
  function render_effect(fn, flags2 = 0) {
    return create_effect(RENDER_EFFECT | flags2, fn, true);
  }
  function block(fn, flags2 = 0) {
    var effect2 = create_effect(BLOCK_EFFECT | flags2, fn, true);
    return effect2;
  }
  function branch(fn) {
    return create_effect(BRANCH_EFFECT | EFFECT_PRESERVED, fn, true);
  }
  function execute_effect_teardown(effect2) {
    var teardown2 = effect2.teardown;
    if (teardown2 !== null) {
      const previously_destroying_effect = is_destroying_effect;
      const previous_reaction = active_reaction;
      set_is_destroying_effect(true);
      set_active_reaction(null);
      try {
        teardown2.call(null);
      } finally {
        set_is_destroying_effect(previously_destroying_effect);
        set_active_reaction(previous_reaction);
      }
    }
  }
  function destroy_effect_children(signal, remove_dom = false) {
    var effect2 = signal.first;
    signal.first = signal.last = null;
    while (effect2 !== null) {
      const controller = effect2.ac;
      if (controller !== null) {
        without_reactive_context(() => {
          controller.abort(STALE_REACTION);
        });
      }
      var next = effect2.next;
      if ((effect2.f & ROOT_EFFECT) !== 0) {
        effect2.parent = null;
      } else {
        destroy_effect(effect2, remove_dom);
      }
      effect2 = next;
    }
  }
  function destroy_block_effect_children(signal) {
    var effect2 = signal.first;
    while (effect2 !== null) {
      var next = effect2.next;
      if ((effect2.f & BRANCH_EFFECT) === 0) {
        destroy_effect(effect2);
      }
      effect2 = next;
    }
  }
  function destroy_effect(effect2, remove_dom = true) {
    var removed = false;
    if ((remove_dom || (effect2.f & HEAD_EFFECT) !== 0) && effect2.nodes_start !== null && effect2.nodes_end !== null) {
      remove_effect_dom(
        effect2.nodes_start,
        /** @type {TemplateNode} */
        effect2.nodes_end
      );
      removed = true;
    }
    destroy_effect_children(effect2, remove_dom && !removed);
    remove_reactions(effect2, 0);
    set_signal_status(effect2, DESTROYED);
    var transitions = effect2.transitions;
    if (transitions !== null) {
      for (const transition of transitions) {
        transition.stop();
      }
    }
    execute_effect_teardown(effect2);
    var parent2 = effect2.parent;
    if (parent2 !== null && parent2.first !== null) {
      unlink_effect(effect2);
    }
    effect2.next = effect2.prev = effect2.teardown = effect2.ctx = effect2.deps = effect2.fn = effect2.nodes_start = effect2.nodes_end = effect2.ac = null;
  }
  function remove_effect_dom(node, end) {
    while (node !== null) {
      var next = node === end ? null : (
        /** @type {TemplateNode} */
        /* @__PURE__ */ get_next_sibling(node)
      );
      node.remove();
      node = next;
    }
  }
  function unlink_effect(effect2) {
    var parent2 = effect2.parent;
    var prev = effect2.prev;
    var next = effect2.next;
    if (prev !== null) prev.next = next;
    if (next !== null) next.prev = prev;
    if (parent2 !== null) {
      if (parent2.first === effect2) parent2.first = next;
      if (parent2.last === effect2) parent2.last = prev;
    }
  }
  function pause_effect(effect2, callback, destroy = true) {
    var transitions = [];
    pause_children(effect2, transitions, true);
    run_out_transitions(transitions, () => {
      if (destroy) destroy_effect(effect2);
      if (callback) callback();
    });
  }
  function run_out_transitions(transitions, fn) {
    var remaining = transitions.length;
    if (remaining > 0) {
      var check = () => --remaining || fn();
      for (var transition of transitions) {
        transition.out(check);
      }
    } else {
      fn();
    }
  }
  function pause_children(effect2, transitions, local) {
    if ((effect2.f & INERT) !== 0) return;
    effect2.f ^= INERT;
    if (effect2.transitions !== null) {
      for (const transition of effect2.transitions) {
        if (transition.is_global || local) {
          transitions.push(transition);
        }
      }
    }
    var child2 = effect2.first;
    while (child2 !== null) {
      var sibling2 = child2.next;
      var transparent = (child2.f & EFFECT_TRANSPARENT) !== 0 || // If this is a branch effect without a block effect parent,
      // it means the parent block effect was pruned. In that case,
      // transparency information was transferred to the branch effect.
      (child2.f & BRANCH_EFFECT) !== 0 && (effect2.f & BLOCK_EFFECT) !== 0;
      pause_children(child2, transitions, transparent ? local : false);
      child2 = sibling2;
    }
  }
  function resume_effect(effect2) {
    resume_children(effect2, true);
  }
  function resume_children(effect2, local) {
    if ((effect2.f & INERT) === 0) return;
    effect2.f ^= INERT;
    if ((effect2.f & CLEAN) === 0) {
      set_signal_status(effect2, DIRTY);
      schedule_effect(effect2);
    }
    var child2 = effect2.first;
    while (child2 !== null) {
      var sibling2 = child2.next;
      var transparent = (child2.f & EFFECT_TRANSPARENT) !== 0 || (child2.f & BRANCH_EFFECT) !== 0;
      resume_children(child2, transparent ? local : false);
      child2 = sibling2;
    }
    if (effect2.transitions !== null) {
      for (const transition of effect2.transitions) {
        if (transition.is_global || local) {
          transition.in();
        }
      }
    }
  }
  function move_effect(effect2, fragment) {
    var node = effect2.nodes_start;
    var end = effect2.nodes_end;
    while (node !== null) {
      var next = node === end ? null : (
        /** @type {TemplateNode} */
        /* @__PURE__ */ get_next_sibling(node)
      );
      fragment.append(node);
      node = next;
    }
  }
  let is_updating_effect = false;
  function set_is_updating_effect(value) {
    is_updating_effect = value;
  }
  let is_destroying_effect = false;
  function set_is_destroying_effect(value) {
    is_destroying_effect = value;
  }
  let active_reaction = null;
  let untracking = false;
  function set_active_reaction(reaction) {
    active_reaction = reaction;
  }
  let active_effect = null;
  function set_active_effect(effect2) {
    active_effect = effect2;
  }
  let current_sources = null;
  function push_reaction_value(value) {
    if (active_reaction !== null && true) {
      if (current_sources === null) {
        current_sources = [value];
      } else {
        current_sources.push(value);
      }
    }
  }
  let new_deps = null;
  let skipped_deps = 0;
  let untracked_writes = null;
  function set_untracked_writes(value) {
    untracked_writes = value;
  }
  let write_version = 1;
  let read_version = 0;
  let update_version = read_version;
  function set_update_version(value) {
    update_version = value;
  }
  function increment_write_version() {
    return ++write_version;
  }
  function is_dirty(reaction) {
    var flags2 = reaction.f;
    if ((flags2 & DIRTY) !== 0) {
      return true;
    }
    if (flags2 & DERIVED) {
      reaction.f &= ~WAS_MARKED;
    }
    if ((flags2 & MAYBE_DIRTY) !== 0) {
      var dependencies = reaction.deps;
      if (dependencies !== null) {
        var length = dependencies.length;
        for (var i2 = 0; i2 < length; i2++) {
          var dependency = dependencies[i2];
          if (is_dirty(
            /** @type {Derived} */
            dependency
          )) {
            update_derived(
              /** @type {Derived} */
              dependency
            );
          }
          if (dependency.wv > reaction.wv) {
            return true;
          }
        }
      }
      if ((flags2 & CONNECTED) !== 0 && // During time traveling we don't want to reset the status so that
      // traversal of the graph in the other batches still happens
      batch_values === null) {
        set_signal_status(reaction, CLEAN);
      }
    }
    return false;
  }
  function schedule_possible_effect_self_invalidation(signal, effect2, root2 = true) {
    var reactions = signal.reactions;
    if (reactions === null) return;
    if (current_sources?.includes(signal)) {
      return;
    }
    for (var i2 = 0; i2 < reactions.length; i2++) {
      var reaction = reactions[i2];
      if ((reaction.f & DERIVED) !== 0) {
        schedule_possible_effect_self_invalidation(
          /** @type {Derived} */
          reaction,
          effect2,
          false
        );
      } else if (effect2 === reaction) {
        if (root2) {
          set_signal_status(reaction, DIRTY);
        } else if ((reaction.f & CLEAN) !== 0) {
          set_signal_status(reaction, MAYBE_DIRTY);
        }
        schedule_effect(
          /** @type {Effect} */
          reaction
        );
      }
    }
  }
  function update_reaction(reaction) {
    var previous_deps = new_deps;
    var previous_skipped_deps = skipped_deps;
    var previous_untracked_writes = untracked_writes;
    var previous_reaction = active_reaction;
    var previous_sources = current_sources;
    var previous_component_context = component_context;
    var previous_untracking = untracking;
    var previous_update_version = update_version;
    var flags2 = reaction.f;
    new_deps = /** @type {null | Value[]} */
    null;
    skipped_deps = 0;
    untracked_writes = null;
    active_reaction = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) === 0 ? reaction : null;
    current_sources = null;
    set_component_context(reaction.ctx);
    untracking = false;
    update_version = ++read_version;
    if (reaction.ac !== null) {
      without_reactive_context(() => {
        reaction.ac.abort(STALE_REACTION);
      });
      reaction.ac = null;
    }
    try {
      reaction.f |= REACTION_IS_UPDATING;
      var fn = (
        /** @type {Function} */
        reaction.fn
      );
      var result = fn();
      var deps = reaction.deps;
      if (new_deps !== null) {
        var i2;
        remove_reactions(reaction, skipped_deps);
        if (deps !== null && skipped_deps > 0) {
          deps.length = skipped_deps + new_deps.length;
          for (i2 = 0; i2 < new_deps.length; i2++) {
            deps[skipped_deps + i2] = new_deps[i2];
          }
        } else {
          reaction.deps = deps = new_deps;
        }
        if (is_updating_effect && effect_tracking() && (reaction.f & CONNECTED) !== 0) {
          for (i2 = skipped_deps; i2 < deps.length; i2++) {
            (deps[i2].reactions ??= []).push(reaction);
          }
        }
      } else if (deps !== null && skipped_deps < deps.length) {
        remove_reactions(reaction, skipped_deps);
        deps.length = skipped_deps;
      }
      if (is_runes() && untracked_writes !== null && !untracking && deps !== null && (reaction.f & (DERIVED | MAYBE_DIRTY | DIRTY)) === 0) {
        for (i2 = 0; i2 < /** @type {Source[]} */
        untracked_writes.length; i2++) {
          schedule_possible_effect_self_invalidation(
            untracked_writes[i2],
            /** @type {Effect} */
            reaction
          );
        }
      }
      if (previous_reaction !== null && previous_reaction !== reaction) {
        read_version++;
        if (untracked_writes !== null) {
          if (previous_untracked_writes === null) {
            previous_untracked_writes = untracked_writes;
          } else {
            previous_untracked_writes.push(.../** @type {Source[]} */
            untracked_writes);
          }
        }
      }
      if ((reaction.f & ERROR_VALUE) !== 0) {
        reaction.f ^= ERROR_VALUE;
      }
      return result;
    } catch (error2) {
      return handle_error(error2);
    } finally {
      reaction.f ^= REACTION_IS_UPDATING;
      new_deps = previous_deps;
      skipped_deps = previous_skipped_deps;
      untracked_writes = previous_untracked_writes;
      active_reaction = previous_reaction;
      current_sources = previous_sources;
      set_component_context(previous_component_context);
      untracking = previous_untracking;
      update_version = previous_update_version;
    }
  }
  function remove_reaction(signal, dependency) {
    let reactions = dependency.reactions;
    if (reactions !== null) {
      var index = index_of.call(reactions, signal);
      if (index !== -1) {
        var new_length = reactions.length - 1;
        if (new_length === 0) {
          reactions = dependency.reactions = null;
        } else {
          reactions[index] = reactions[new_length];
          reactions.pop();
        }
      }
    }
    if (reactions === null && (dependency.f & DERIVED) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
    // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
    // allows us to skip the expensive work of disconnecting and immediately reconnecting it
    (new_deps === null || !new_deps.includes(dependency))) {
      set_signal_status(dependency, MAYBE_DIRTY);
      if ((dependency.f & CONNECTED) !== 0) {
        dependency.f ^= CONNECTED;
        dependency.f &= ~WAS_MARKED;
      }
      destroy_derived_effects(
        /** @type {Derived} **/
        dependency
      );
      remove_reactions(
        /** @type {Derived} **/
        dependency,
        0
      );
    }
  }
  function remove_reactions(signal, start_index) {
    var dependencies = signal.deps;
    if (dependencies === null) return;
    for (var i2 = start_index; i2 < dependencies.length; i2++) {
      remove_reaction(signal, dependencies[i2]);
    }
  }
  function update_effect(effect2) {
    var flags2 = effect2.f;
    if ((flags2 & DESTROYED) !== 0) {
      return;
    }
    set_signal_status(effect2, CLEAN);
    var previous_effect = active_effect;
    var was_updating_effect = is_updating_effect;
    active_effect = effect2;
    is_updating_effect = true;
    try {
      if ((flags2 & BLOCK_EFFECT) !== 0) {
        destroy_block_effect_children(effect2);
      } else {
        destroy_effect_children(effect2);
      }
      execute_effect_teardown(effect2);
      var teardown2 = update_reaction(effect2);
      effect2.teardown = typeof teardown2 === "function" ? teardown2 : null;
      effect2.wv = write_version;
      var dep;
      if (DEV && tracing_mode_flag && (effect2.f & DIRTY) !== 0 && effect2.deps !== null) ;
    } finally {
      is_updating_effect = was_updating_effect;
      active_effect = previous_effect;
    }
  }
  function get(signal) {
    var flags2 = signal.f;
    var is_derived = (flags2 & DERIVED) !== 0;
    if (active_reaction !== null && !untracking) {
      var destroyed = active_effect !== null && (active_effect.f & DESTROYED) !== 0;
      if (!destroyed && !current_sources?.includes(signal)) {
        var deps = active_reaction.deps;
        if ((active_reaction.f & REACTION_IS_UPDATING) !== 0) {
          if (signal.rv < read_version) {
            signal.rv = read_version;
            if (new_deps === null && deps !== null && deps[skipped_deps] === signal) {
              skipped_deps++;
            } else if (new_deps === null) {
              new_deps = [signal];
            } else if (!new_deps.includes(signal)) {
              new_deps.push(signal);
            }
          }
        } else {
          (active_reaction.deps ??= []).push(signal);
          var reactions = signal.reactions;
          if (reactions === null) {
            signal.reactions = [active_reaction];
          } else if (!reactions.includes(active_reaction)) {
            reactions.push(active_reaction);
          }
        }
      }
    }
    if (is_destroying_effect) {
      if (old_values.has(signal)) {
        return old_values.get(signal);
      }
      if (is_derived) {
        var derived2 = (
          /** @type {Derived} */
          signal
        );
        var value = derived2.v;
        if ((derived2.f & CLEAN) === 0 && derived2.reactions !== null || depends_on_old_values(derived2)) {
          value = execute_derived(derived2);
        }
        old_values.set(derived2, value);
        return value;
      }
    } else if (is_derived) {
      derived2 = /** @type {Derived} */
      signal;
      if (batch_values?.has(derived2)) {
        return batch_values.get(derived2);
      }
      if (is_dirty(derived2)) {
        update_derived(derived2);
      }
      if (is_updating_effect && effect_tracking() && (derived2.f & CONNECTED) === 0) {
        reconnect(derived2);
      }
    } else if (batch_values?.has(signal)) {
      return batch_values.get(signal);
    }
    if ((signal.f & ERROR_VALUE) !== 0) {
      throw signal.v;
    }
    return signal.v;
  }
  function reconnect(derived2) {
    if (derived2.deps === null) return;
    derived2.f ^= CONNECTED;
    for (const dep of derived2.deps) {
      (dep.reactions ??= []).push(derived2);
      if ((dep.f & DERIVED) !== 0 && (dep.f & CONNECTED) === 0) {
        reconnect(
          /** @type {Derived} */
          dep
        );
      }
    }
  }
  function depends_on_old_values(derived2) {
    if (derived2.v === UNINITIALIZED) return true;
    if (derived2.deps === null) return false;
    for (const dep of derived2.deps) {
      if (old_values.has(dep)) {
        return true;
      }
      if ((dep.f & DERIVED) !== 0 && depends_on_old_values(
        /** @type {Derived} */
        dep
      )) {
        return true;
      }
    }
    return false;
  }
  function untrack(fn) {
    var previous_untracking = untracking;
    try {
      untracking = true;
      return fn();
    } finally {
      untracking = previous_untracking;
    }
  }
  const STATUS_MASK = -7169;
  function set_signal_status(signal, status) {
    signal.f = signal.f & STATUS_MASK | status;
  }
  function is_capture_event(name) {
    return name.endsWith("capture") && name !== "gotpointercapture" && name !== "lostpointercapture";
  }
  const DELEGATED_EVENTS = [
    "beforeinput",
    "click",
    "change",
    "dblclick",
    "contextmenu",
    "focusin",
    "focusout",
    "input",
    "keydown",
    "keyup",
    "mousedown",
    "mousemove",
    "mouseout",
    "mouseover",
    "mouseup",
    "pointerdown",
    "pointermove",
    "pointerout",
    "pointerover",
    "pointerup",
    "touchend",
    "touchmove",
    "touchstart"
  ];
  function can_delegate_event(event_name) {
    return DELEGATED_EVENTS.includes(event_name);
  }
  const ATTRIBUTE_ALIASES = {
    // no `class: 'className'` because we handle that separately
    formnovalidate: "formNoValidate",
    ismap: "isMap",
    nomodule: "noModule",
    playsinline: "playsInline",
    readonly: "readOnly",
    defaultvalue: "defaultValue",
    defaultchecked: "defaultChecked",
    srcobject: "srcObject",
    novalidate: "noValidate",
    allowfullscreen: "allowFullscreen",
    disablepictureinpicture: "disablePictureInPicture",
    disableremoteplayback: "disableRemotePlayback"
  };
  function normalize_attribute(name) {
    name = name.toLowerCase();
    return ATTRIBUTE_ALIASES[name] ?? name;
  }
  const PASSIVE_EVENTS = ["touchstart", "touchmove"];
  function is_passive_event(name) {
    return PASSIVE_EVENTS.includes(name);
  }
  const all_registered_events = /* @__PURE__ */ new Set();
  const root_event_handles = /* @__PURE__ */ new Set();
  function create_event(event_name, dom, handler, options = {}) {
    function target_handler(event) {
      if (!options.capture) {
        handle_event_propagation.call(dom, event);
      }
      if (!event.cancelBubble) {
        return without_reactive_context(() => {
          return handler?.call(this, event);
        });
      }
    }
    if (event_name.startsWith("pointer") || event_name.startsWith("touch") || event_name === "wheel") {
      queue_micro_task(() => {
        dom.addEventListener(event_name, target_handler, options);
      });
    } else {
      dom.addEventListener(event_name, target_handler, options);
    }
    return target_handler;
  }
  function delegate(events) {
    for (var i2 = 0; i2 < events.length; i2++) {
      all_registered_events.add(events[i2]);
    }
    for (var fn of root_event_handles) {
      fn(events);
    }
  }
  let last_propagated_event = null;
  function handle_event_propagation(event) {
    var handler_element = this;
    var owner_document = (
      /** @type {Node} */
      handler_element.ownerDocument
    );
    var event_name = event.type;
    var path = event.composedPath?.() || [];
    var current_target = (
      /** @type {null | Element} */
      path[0] || event.target
    );
    last_propagated_event = event;
    var path_idx = 0;
    var handled_at = last_propagated_event === event && event.__root;
    if (handled_at) {
      var at_idx = path.indexOf(handled_at);
      if (at_idx !== -1 && (handler_element === document || handler_element === /** @type {any} */
      window)) {
        event.__root = handler_element;
        return;
      }
      var handler_idx = path.indexOf(handler_element);
      if (handler_idx === -1) {
        return;
      }
      if (at_idx <= handler_idx) {
        path_idx = at_idx;
      }
    }
    current_target = /** @type {Element} */
    path[path_idx] || event.target;
    if (current_target === handler_element) return;
    define_property(event, "currentTarget", {
      configurable: true,
      get() {
        return current_target || owner_document;
      }
    });
    var previous_reaction = active_reaction;
    var previous_effect = active_effect;
    set_active_reaction(null);
    set_active_effect(null);
    try {
      var throw_error;
      var other_errors = [];
      while (current_target !== null) {
        var parent_element = current_target.assignedSlot || current_target.parentNode || /** @type {any} */
        current_target.host || null;
        try {
          var delegated = current_target["__" + event_name];
          if (delegated != null && (!/** @type {any} */
          current_target.disabled || // DOM could've been updated already by the time this is reached, so we check this as well
          // -> the target could not have been disabled because it emits the event in the first place
          event.target === current_target)) {
            delegated.call(current_target, event);
          }
        } catch (error2) {
          if (throw_error) {
            other_errors.push(error2);
          } else {
            throw_error = error2;
          }
        }
        if (event.cancelBubble || parent_element === handler_element || parent_element === null) {
          break;
        }
        current_target = parent_element;
      }
      if (throw_error) {
        for (let error2 of other_errors) {
          queueMicrotask(() => {
            throw error2;
          });
        }
        throw throw_error;
      }
    } finally {
      event.__root = handler_element;
      delete event.currentTarget;
      set_active_reaction(previous_reaction);
      set_active_effect(previous_effect);
    }
  }
  function create_fragment_from_html(html) {
    var elem = document.createElement("template");
    elem.innerHTML = html.replaceAll("<!>", "<!---->");
    return elem.content;
  }
  function assign_nodes(start, end) {
    var effect2 = (
      /** @type {Effect} */
      active_effect
    );
    if (effect2.nodes_start === null) {
      effect2.nodes_start = start;
      effect2.nodes_end = end;
    }
  }
  // @__NO_SIDE_EFFECTS__
  function from_html(content, flags2) {
    var use_import_node = (flags2 & TEMPLATE_USE_IMPORT_NODE) !== 0;
    var node;
    var has_start = !content.startsWith("<!>");
    return () => {
      if (node === void 0) {
        node = create_fragment_from_html(has_start ? content : "<!>" + content);
        node = /** @type {Node} */
        /* @__PURE__ */ get_first_child(node);
      }
      var clone = (
        /** @type {TemplateNode} */
        use_import_node || is_firefox ? document.importNode(node, true) : node.cloneNode(true)
      );
      {
        assign_nodes(clone, clone);
      }
      return clone;
    };
  }
  // @__NO_SIDE_EFFECTS__
  function from_namespace(content, flags2, ns = "svg") {
    var has_start = !content.startsWith("<!>");
    var is_fragment = (flags2 & TEMPLATE_FRAGMENT) !== 0;
    var wrapped = `<${ns}>${has_start ? content : "<!>" + content}</${ns}>`;
    var node;
    return () => {
      if (!node) {
        var fragment = (
          /** @type {DocumentFragment} */
          create_fragment_from_html(wrapped)
        );
        var root2 = (
          /** @type {Element} */
          /* @__PURE__ */ get_first_child(fragment)
        );
        if (is_fragment) {
          node = document.createDocumentFragment();
          while (/* @__PURE__ */ get_first_child(root2)) {
            node.appendChild(
              /** @type {Node} */
              /* @__PURE__ */ get_first_child(root2)
            );
          }
        } else {
          node = /** @type {Element} */
          /* @__PURE__ */ get_first_child(root2);
        }
      }
      var clone = (
        /** @type {TemplateNode} */
        node.cloneNode(true)
      );
      if (is_fragment) {
        var start = (
          /** @type {TemplateNode} */
          /* @__PURE__ */ get_first_child(clone)
        );
        var end = (
          /** @type {TemplateNode} */
          clone.lastChild
        );
        assign_nodes(start, end);
      } else {
        assign_nodes(clone, clone);
      }
      return clone;
    };
  }
  // @__NO_SIDE_EFFECTS__
  function from_svg(content, flags2) {
    return /* @__PURE__ */ from_namespace(content, flags2, "svg");
  }
  function text(value = "") {
    {
      var t = create_text(value + "");
      assign_nodes(t, t);
      return t;
    }
  }
  function comment() {
    var frag = document.createDocumentFragment();
    var start = document.createComment("");
    var anchor = create_text();
    frag.append(start, anchor);
    assign_nodes(start, anchor);
    return frag;
  }
  function append(anchor, dom) {
    if (anchor === null) {
      return;
    }
    anchor.before(
      /** @type {Node} */
      dom
    );
  }
  function mount(component, options) {
    return _mount(component, options);
  }
  const document_listeners = /* @__PURE__ */ new Map();
  function _mount(Component, { target, anchor, props = {}, events, context, intro = true }) {
    init_operations();
    var registered_events = /* @__PURE__ */ new Set();
    var event_handle = (events2) => {
      for (var i2 = 0; i2 < events2.length; i2++) {
        var event_name = events2[i2];
        if (registered_events.has(event_name)) continue;
        registered_events.add(event_name);
        var passive = is_passive_event(event_name);
        target.addEventListener(event_name, handle_event_propagation, { passive });
        var n = document_listeners.get(event_name);
        if (n === void 0) {
          document.addEventListener(event_name, handle_event_propagation, { passive });
          document_listeners.set(event_name, 1);
        } else {
          document_listeners.set(event_name, n + 1);
        }
      }
    };
    event_handle(array_from(all_registered_events));
    root_event_handles.add(event_handle);
    var component = void 0;
    var unmount = component_root(() => {
      var anchor_node = anchor ?? target.appendChild(create_text());
      boundary(
        /** @type {TemplateNode} */
        anchor_node,
        {
          pending: () => {
          }
        },
        (anchor_node2) => {
          if (context) {
            push({});
            var ctx = (
              /** @type {ComponentContext} */
              component_context
            );
            ctx.c = context;
          }
          if (events) {
            props.$$events = events;
          }
          component = Component(anchor_node2, props) || {};
          if (context) {
            pop();
          }
        }
      );
      return () => {
        for (var event_name of registered_events) {
          target.removeEventListener(event_name, handle_event_propagation);
          var n = (
            /** @type {number} */
            document_listeners.get(event_name)
          );
          if (--n === 0) {
            document.removeEventListener(event_name, handle_event_propagation);
            document_listeners.delete(event_name);
          } else {
            document_listeners.set(event_name, n);
          }
        }
        root_event_handles.delete(event_handle);
        if (anchor_node !== anchor) {
          anchor_node.parentNode?.removeChild(anchor_node);
        }
      };
    });
    mounted_components.set(component, unmount);
    return component;
  }
  let mounted_components = /* @__PURE__ */ new WeakMap();
  class BranchManager {
    /** @type {TemplateNode} */
    anchor;
    /** @type {Map<Batch, Key>} */
    #batches = /* @__PURE__ */ new Map();
    /**
     * Map of keys to effects that are currently rendered in the DOM.
     * These effects are visible and actively part of the document tree.
     * Example:
     * ```
     * {#if condition}
     * 	foo
     * {:else}
     * 	bar
     * {/if}
     * ```
     * Can result in the entries `true->Effect` and `false->Effect`
     * @type {Map<Key, Effect>}
     */
    #onscreen = /* @__PURE__ */ new Map();
    /**
     * Similar to #onscreen with respect to the keys, but contains branches that are not yet
     * in the DOM, because their insertion is deferred.
     * @type {Map<Key, Branch>}
     */
    #offscreen = /* @__PURE__ */ new Map();
    /**
     * Keys of effects that are currently outroing
     * @type {Set<Key>}
     */
    #outroing = /* @__PURE__ */ new Set();
    /**
     * Whether to pause (i.e. outro) on change, or destroy immediately.
     * This is necessary for `<svelte:element>`
     */
    #transition = true;
    /**
     * @param {TemplateNode} anchor
     * @param {boolean} transition
     */
    constructor(anchor, transition = true) {
      this.anchor = anchor;
      this.#transition = transition;
    }
    #commit = () => {
      var batch = (
        /** @type {Batch} */
        current_batch
      );
      if (!this.#batches.has(batch)) return;
      var key = (
        /** @type {Key} */
        this.#batches.get(batch)
      );
      var onscreen = this.#onscreen.get(key);
      if (onscreen) {
        resume_effect(onscreen);
        this.#outroing.delete(key);
      } else {
        var offscreen = this.#offscreen.get(key);
        if (offscreen) {
          this.#onscreen.set(key, offscreen.effect);
          this.#offscreen.delete(key);
          offscreen.fragment.lastChild.remove();
          this.anchor.before(offscreen.fragment);
          onscreen = offscreen.effect;
        }
      }
      for (const [b, k] of this.#batches) {
        this.#batches.delete(b);
        if (b === batch) {
          break;
        }
        const offscreen2 = this.#offscreen.get(k);
        if (offscreen2) {
          destroy_effect(offscreen2.effect);
          this.#offscreen.delete(k);
        }
      }
      for (const [k, effect2] of this.#onscreen) {
        if (k === key || this.#outroing.has(k)) continue;
        const on_destroy = () => {
          const keys = Array.from(this.#batches.values());
          if (keys.includes(k)) {
            var fragment = document.createDocumentFragment();
            move_effect(effect2, fragment);
            fragment.append(create_text());
            this.#offscreen.set(k, { effect: effect2, fragment });
          } else {
            destroy_effect(effect2);
          }
          this.#outroing.delete(k);
          this.#onscreen.delete(k);
        };
        if (this.#transition || !onscreen) {
          this.#outroing.add(k);
          pause_effect(effect2, on_destroy, false);
        } else {
          on_destroy();
        }
      }
    };
    /**
     * @param {Batch} batch
     */
    #discard = (batch) => {
      this.#batches.delete(batch);
      const keys = Array.from(this.#batches.values());
      for (const [k, branch2] of this.#offscreen) {
        if (!keys.includes(k)) {
          destroy_effect(branch2.effect);
          this.#offscreen.delete(k);
        }
      }
    };
    /**
     *
     * @param {any} key
     * @param {null | ((target: TemplateNode) => void)} fn
     */
    ensure(key, fn) {
      var batch = (
        /** @type {Batch} */
        current_batch
      );
      var defer = should_defer_append();
      if (fn && !this.#onscreen.has(key) && !this.#offscreen.has(key)) {
        if (defer) {
          var fragment = document.createDocumentFragment();
          var target = create_text();
          fragment.append(target);
          this.#offscreen.set(key, {
            effect: branch(() => fn(target)),
            fragment
          });
        } else {
          this.#onscreen.set(
            key,
            branch(() => fn(this.anchor))
          );
        }
      }
      this.#batches.set(batch, key);
      if (defer) {
        for (const [k, effect2] of this.#onscreen) {
          if (k === key) {
            batch.skipped_effects.delete(effect2);
          } else {
            batch.skipped_effects.add(effect2);
          }
        }
        for (const [k, branch2] of this.#offscreen) {
          if (k === key) {
            batch.skipped_effects.delete(branch2.effect);
          } else {
            batch.skipped_effects.add(branch2.effect);
          }
        }
        batch.oncommit(this.#commit);
        batch.ondiscard(this.#discard);
      } else {
        this.#commit();
      }
    }
  }
  function if_block(node, fn, elseif = false) {
    var branches = new BranchManager(node);
    var flags2 = elseif ? EFFECT_TRANSPARENT : 0;
    function update_branch(condition, fn2) {
      branches.ensure(condition, fn2);
    }
    block(() => {
      var has_branch = false;
      fn((fn2, flag = true) => {
        has_branch = true;
        update_branch(flag, fn2);
      });
      if (!has_branch) {
        update_branch(false, null);
      }
    }, flags2);
  }
  function snippet(node, get_snippet, ...args) {
    var branches = new BranchManager(node);
    block(() => {
      const snippet2 = get_snippet() ?? null;
      branches.ensure(snippet2, snippet2 && ((anchor) => snippet2(anchor, ...args)));
    }, EFFECT_TRANSPARENT);
  }
  function attach(node, get_fn) {
    var fn = void 0;
    var e;
    block(() => {
      if (fn !== (fn = get_fn())) {
        if (e) {
          destroy_effect(e);
          e = null;
        }
        if (fn) {
          e = branch(() => {
            effect(() => (
              /** @type {(node: Element) => void} */
              fn(node)
            ));
          });
        }
      }
    });
  }
  function r(e) {
    var t, f, n = "";
    if ("string" == typeof e || "number" == typeof e) n += e;
    else if ("object" == typeof e) if (Array.isArray(e)) {
      var o = e.length;
      for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
    } else for (f in e) e[f] && (n && (n += " "), n += f);
    return n;
  }
  function clsx$1() {
    for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
    return n;
  }
  function clsx(value) {
    if (typeof value === "object") {
      return clsx$1(value);
    } else {
      return value ?? "";
    }
  }
  const whitespace = [..." 	\n\r\f \v\uFEFF"];
  function to_class(value, hash, directives) {
    var classname = value == null ? "" : "" + value;
    if (directives) {
      for (var key in directives) {
        if (directives[key]) {
          classname = classname ? classname + " " + key : key;
        } else if (classname.length) {
          var len2 = key.length;
          var a = 0;
          while ((a = classname.indexOf(key, a)) >= 0) {
            var b = a + len2;
            if ((a === 0 || whitespace.includes(classname[a - 1])) && (b === classname.length || whitespace.includes(classname[b]))) {
              classname = (a === 0 ? "" : classname.substring(0, a)) + classname.substring(b + 1);
            } else {
              a = b;
            }
          }
        }
      }
    }
    return classname === "" ? null : classname;
  }
  function append_styles(styles, important = false) {
    var separator = important ? " !important;" : ";";
    var css = "";
    for (var key in styles) {
      var value = styles[key];
      if (value != null && value !== "") {
        css += " " + key + ": " + value + separator;
      }
    }
    return css;
  }
  function to_css_name(name) {
    if (name[0] !== "-" || name[1] !== "-") {
      return name.toLowerCase();
    }
    return name;
  }
  function to_style(value, styles) {
    if (styles) {
      var new_style = "";
      var normal_styles;
      var important_styles;
      if (Array.isArray(styles)) {
        normal_styles = styles[0];
        important_styles = styles[1];
      } else {
        normal_styles = styles;
      }
      if (value) {
        value = String(value).replaceAll(/\s*\/\*.*?\*\/\s*/g, "").trim();
        var in_str = false;
        var in_apo = 0;
        var in_comment = false;
        var reserved_names = [];
        if (normal_styles) {
          reserved_names.push(...Object.keys(normal_styles).map(to_css_name));
        }
        if (important_styles) {
          reserved_names.push(...Object.keys(important_styles).map(to_css_name));
        }
        var start_index = 0;
        var name_index = -1;
        const len2 = value.length;
        for (var i2 = 0; i2 < len2; i2++) {
          var c = value[i2];
          if (in_comment) {
            if (c === "/" && value[i2 - 1] === "*") {
              in_comment = false;
            }
          } else if (in_str) {
            if (in_str === c) {
              in_str = false;
            }
          } else if (c === "/" && value[i2 + 1] === "*") {
            in_comment = true;
          } else if (c === '"' || c === "'") {
            in_str = c;
          } else if (c === "(") {
            in_apo++;
          } else if (c === ")") {
            in_apo--;
          }
          if (!in_comment && in_str === false && in_apo === 0) {
            if (c === ":" && name_index === -1) {
              name_index = i2;
            } else if (c === ";" || i2 === len2 - 1) {
              if (name_index !== -1) {
                var name = to_css_name(value.substring(start_index, name_index).trim());
                if (!reserved_names.includes(name)) {
                  if (c !== ";") {
                    i2++;
                  }
                  var property = value.substring(start_index, i2).trim();
                  new_style += " " + property + ";";
                }
              }
              start_index = i2 + 1;
              name_index = -1;
            }
          }
        }
      }
      if (normal_styles) {
        new_style += append_styles(normal_styles);
      }
      if (important_styles) {
        new_style += append_styles(important_styles, true);
      }
      new_style = new_style.trim();
      return new_style === "" ? null : new_style;
    }
    return value == null ? null : String(value);
  }
  function set_class(dom, is_html, value, hash, prev_classes, next_classes) {
    var prev = dom.__className;
    if (prev !== value || prev === void 0) {
      var next_class_name = to_class(value, hash, next_classes);
      {
        if (next_class_name == null) {
          dom.removeAttribute("class");
        } else if (is_html) {
          dom.className = next_class_name;
        } else {
          dom.setAttribute("class", next_class_name);
        }
      }
      dom.__className = value;
    } else if (next_classes && prev_classes !== next_classes) {
      for (var key in next_classes) {
        var is_present = !!next_classes[key];
        if (prev_classes == null || is_present !== !!prev_classes[key]) {
          dom.classList.toggle(key, is_present);
        }
      }
    }
    return next_classes;
  }
  function update_styles(dom, prev = {}, next, priority) {
    for (var key in next) {
      var value = next[key];
      if (prev[key] !== value) {
        if (next[key] == null) {
          dom.style.removeProperty(key);
        } else {
          dom.style.setProperty(key, value, priority);
        }
      }
    }
  }
  function set_style(dom, value, prev_styles, next_styles) {
    var prev = dom.__style;
    if (prev !== value) {
      var next_style_attr = to_style(value, next_styles);
      {
        if (next_style_attr == null) {
          dom.removeAttribute("style");
        } else {
          dom.style.cssText = next_style_attr;
        }
      }
      dom.__style = value;
    } else if (next_styles) {
      if (Array.isArray(next_styles)) {
        update_styles(dom, prev_styles?.[0], next_styles[0]);
        update_styles(dom, prev_styles?.[1], next_styles[1], "important");
      } else {
        update_styles(dom, prev_styles, next_styles);
      }
    }
    return next_styles;
  }
  function select_option(select, value, mounting = false) {
    if (select.multiple) {
      if (value == void 0) {
        return;
      }
      if (!is_array(value)) {
        return select_multiple_invalid_value();
      }
      for (var option of select.options) {
        option.selected = value.includes(get_option_value(option));
      }
      return;
    }
    for (option of select.options) {
      var option_value = get_option_value(option);
      if (is(option_value, value)) {
        option.selected = true;
        return;
      }
    }
    if (!mounting || value !== void 0) {
      select.selectedIndex = -1;
    }
  }
  function init_select(select) {
    var observer = new MutationObserver(() => {
      select_option(select, select.__value);
    });
    observer.observe(select, {
      // Listen to option element changes
      childList: true,
      subtree: true,
      // because of <optgroup>
      // Listen to option element value attribute changes
      // (doesn't get notified of select value changes,
      // because that property is not reflected as an attribute)
      attributes: true,
      attributeFilter: ["value"]
    });
    teardown(() => {
      observer.disconnect();
    });
  }
  function get_option_value(option) {
    if ("__value" in option) {
      return option.__value;
    } else {
      return option.value;
    }
  }
  const CLASS = /* @__PURE__ */ Symbol("class");
  const STYLE = /* @__PURE__ */ Symbol("style");
  const IS_CUSTOM_ELEMENT = /* @__PURE__ */ Symbol("is custom element");
  const IS_HTML = /* @__PURE__ */ Symbol("is html");
  function set_selected(element, selected) {
    if (selected) {
      if (!element.hasAttribute("selected")) {
        element.setAttribute("selected", "");
      }
    } else {
      element.removeAttribute("selected");
    }
  }
  function set_attribute(element, attribute, value, skip_warning) {
    var attributes = get_attributes(element);
    if (attributes[attribute] === (attributes[attribute] = value)) return;
    if (attribute === "loading") {
      element[LOADING_ATTR_SYMBOL] = value;
    }
    if (value == null) {
      element.removeAttribute(attribute);
    } else if (typeof value !== "string" && get_setters(element).includes(attribute)) {
      element[attribute] = value;
    } else {
      element.setAttribute(attribute, value);
    }
  }
  function set_attributes(element, prev, next, css_hash, should_remove_defaults = false, skip_warning = false) {
    var attributes = get_attributes(element);
    var is_custom_element = attributes[IS_CUSTOM_ELEMENT];
    var preserve_attribute_case = !attributes[IS_HTML];
    var current = prev || {};
    var is_option_element = element.tagName === "OPTION";
    for (var key in prev) {
      if (!(key in next)) {
        next[key] = null;
      }
    }
    if (next.class) {
      next.class = clsx(next.class);
    } else if (next[CLASS]) {
      next.class = null;
    }
    if (next[STYLE]) {
      next.style ??= null;
    }
    var setters = get_setters(element);
    for (const key2 in next) {
      let value = next[key2];
      if (is_option_element && key2 === "value" && value == null) {
        element.value = element.__value = "";
        current[key2] = value;
        continue;
      }
      if (key2 === "class") {
        var is_html = element.namespaceURI === "http://www.w3.org/1999/xhtml";
        set_class(element, is_html, value, css_hash, prev?.[CLASS], next[CLASS]);
        current[key2] = value;
        current[CLASS] = next[CLASS];
        continue;
      }
      if (key2 === "style") {
        set_style(element, value, prev?.[STYLE], next[STYLE]);
        current[key2] = value;
        current[STYLE] = next[STYLE];
        continue;
      }
      var prev_value = current[key2];
      if (value === prev_value && !(value === void 0 && element.hasAttribute(key2))) {
        continue;
      }
      current[key2] = value;
      var prefix = key2[0] + key2[1];
      if (prefix === "$$") continue;
      if (prefix === "on") {
        const opts = {};
        const event_handle_key = "$$" + key2;
        let event_name = key2.slice(2);
        var delegated = can_delegate_event(event_name);
        if (is_capture_event(event_name)) {
          event_name = event_name.slice(0, -7);
          opts.capture = true;
        }
        if (!delegated && prev_value) {
          if (value != null) continue;
          element.removeEventListener(event_name, current[event_handle_key], opts);
          current[event_handle_key] = null;
        }
        if (value != null) {
          if (!delegated) {
            let handle = function(evt) {
              current[key2].call(this, evt);
            };
            current[event_handle_key] = create_event(event_name, element, handle, opts);
          } else {
            element[`__${event_name}`] = value;
            delegate([event_name]);
          }
        } else if (delegated) {
          element[`__${event_name}`] = void 0;
        }
      } else if (key2 === "style") {
        set_attribute(element, key2, value);
      } else if (key2 === "autofocus") {
        autofocus(
          /** @type {HTMLElement} */
          element,
          Boolean(value)
        );
      } else if (!is_custom_element && (key2 === "__value" || key2 === "value" && value != null)) {
        element.value = element.__value = value;
      } else if (key2 === "selected" && is_option_element) {
        set_selected(
          /** @type {HTMLOptionElement} */
          element,
          value
        );
      } else {
        var name = key2;
        if (!preserve_attribute_case) {
          name = normalize_attribute(name);
        }
        var is_default = name === "defaultValue" || name === "defaultChecked";
        if (value == null && !is_custom_element && !is_default) {
          attributes[key2] = null;
          if (name === "value" || name === "checked") {
            let input = (
              /** @type {HTMLInputElement} */
              element
            );
            const use_default = prev === void 0;
            if (name === "value") {
              let previous = input.defaultValue;
              input.removeAttribute(name);
              input.defaultValue = previous;
              input.value = input.__value = use_default ? previous : null;
            } else {
              let previous = input.defaultChecked;
              input.removeAttribute(name);
              input.defaultChecked = previous;
              input.checked = use_default ? previous : false;
            }
          } else {
            element.removeAttribute(key2);
          }
        } else if (is_default || setters.includes(name) && (is_custom_element || typeof value !== "string")) {
          element[name] = value;
          if (name in attributes) attributes[name] = UNINITIALIZED;
        } else if (typeof value !== "function") {
          set_attribute(element, name, value);
        }
      }
    }
    return current;
  }
  function attribute_effect(element, fn, sync = [], async = [], blockers = [], css_hash, should_remove_defaults = false, skip_warning = false) {
    flatten(blockers, sync, async, (values) => {
      var prev = void 0;
      var effects = {};
      var is_select = element.nodeName === "SELECT";
      var inited = false;
      block(() => {
        var next = fn(...values.map(get));
        var current = set_attributes(
          element,
          prev,
          next,
          css_hash,
          should_remove_defaults,
          skip_warning
        );
        if (inited && is_select && "value" in next) {
          select_option(
            /** @type {HTMLSelectElement} */
            element,
            next.value
          );
        }
        for (let symbol of Object.getOwnPropertySymbols(effects)) {
          if (!next[symbol]) destroy_effect(effects[symbol]);
        }
        for (let symbol of Object.getOwnPropertySymbols(next)) {
          var n = next[symbol];
          if (symbol.description === ATTACHMENT_KEY && (!prev || n !== prev[symbol])) {
            if (effects[symbol]) destroy_effect(effects[symbol]);
            effects[symbol] = branch(() => attach(element, () => n));
          }
          current[symbol] = n;
        }
        prev = current;
      });
      if (is_select) {
        var select = (
          /** @type {HTMLSelectElement} */
          element
        );
        effect(() => {
          select_option(
            select,
            /** @type {Record<string | symbol, any>} */
            prev.value,
            true
          );
          init_select(select);
        });
      }
      inited = true;
    });
  }
  function get_attributes(element) {
    return (
      /** @type {Record<string | symbol, unknown>} **/
      // @ts-expect-error
      element.__attributes ??= {
        [IS_CUSTOM_ELEMENT]: element.nodeName.includes("-"),
        [IS_HTML]: element.namespaceURI === NAMESPACE_HTML
      }
    );
  }
  var setters_cache = /* @__PURE__ */ new Map();
  function get_setters(element) {
    var cache_key = element.getAttribute("is") || element.nodeName;
    var setters = setters_cache.get(cache_key);
    if (setters) return setters;
    setters_cache.set(cache_key, setters = []);
    var descriptors;
    var proto = element;
    var element_proto = Element.prototype;
    while (element_proto !== proto) {
      descriptors = get_descriptors(proto);
      for (var key in descriptors) {
        if (descriptors[key].set) {
          setters.push(key);
        }
      }
      proto = get_prototype_of(proto);
    }
    return setters;
  }
  const rest_props_handler = {
    get(target, key) {
      if (target.exclude.includes(key)) return;
      return target.props[key];
    },
    set(target, key) {
      return false;
    },
    getOwnPropertyDescriptor(target, key) {
      if (target.exclude.includes(key)) return;
      if (key in target.props) {
        return {
          enumerable: true,
          configurable: true,
          value: target.props[key]
        };
      }
    },
    has(target, key) {
      if (target.exclude.includes(key)) return false;
      return key in target.props;
    },
    ownKeys(target) {
      return Reflect.ownKeys(target.props).filter((key) => !target.exclude.includes(key));
    }
  };
  // @__NO_SIDE_EFFECTS__
  function rest_props(props, exclude, name) {
    return new Proxy(
      { props, exclude },
      rest_props_handler
    );
  }
  function onMount(fn) {
    if (component_context === null) {
      lifecycle_outside_component();
    }
    {
      user_effect(() => {
        const cleanup = untrack(fn);
        if (typeof cleanup === "function") return (
          /** @type {() => void} */
          cleanup
        );
      });
    }
  }
  function lockServiceWorker(ourRegistration, scriptUrl) {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    const container = navigator.serviceWorker;
    const nativeRegister = container.register.bind(container);
    ourRegistration.catch(() => {
    });
    patchRealm(window, ourRegistration);
    container.addEventListener("controllerchange", () => {
      console.warn("[wd-sw-watch] controller changed", container.controller?.scriptURL ?? "none");
    });
    setInterval(async () => {
      try {
        const current = await container.getRegistration();
        if (!current) {
          console.warn("[wd-sw-watch] registration missing; restoring");
          const restored = await nativeRegister(scriptUrl, { scope: "/" });
          console.warn("[wd-sw-watch] registration restored", restored.scope);
        } else if (!container.controller && current.active) {
          console.warn("[wd-sw-watch] controller missing; requesting reclaim");
          current.active.postMessage("wavedash:claim-clients");
        }
      } catch (err) {
        console.warn("[wd-sw-watch] recovery failed", err);
      }
    }, 1e3);
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node instanceof HTMLIFrameElement) patchIframe(node, ourRegistration);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  function patchRealm(win, oursPromise) {
    const container = win.navigator.serviceWorker;
    if (!container) return;
    try {
      Object.defineProperty(container, "register", {
        value: () => oursPromise,
        configurable: false
      });
      const { ServiceWorkerRegistration } = win;
      Object.defineProperty(ServiceWorkerRegistration.prototype, "unregister", {
        value: () => Promise.resolve(false),
        configurable: false
      });
    } catch {
    }
  }
  function patchIframe(iframe, oursPromise) {
    const apply = () => {
      const win = iframe.contentWindow;
      if (!win) return;
      try {
        patchRealm(win, oursPromise);
      } catch {
      }
    };
    apply();
    iframe.addEventListener("load", apply);
  }
  const PUBLIC_VERSION = "5";
  if (typeof window !== "undefined") {
    ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add(PUBLIC_VERSION);
  }
  let contextKey = /* @__PURE__ */ Symbol("phosphor-svelte");
  function getIconContext() {
    if (hasContext(contextKey)) {
      return getContext(contextKey);
    }
    return {};
  }
  var root_2 = /* @__PURE__ */ from_svg(`<path d="M140,32V64a12,12,0,0,1-24,0V32a12,12,0,0,1,24,0Zm33.25,62.75a12,12,0,0,0,8.49-3.52L204.37,68.6a12,12,0,0,0-17-17L164.77,74.26a12,12,0,0,0,8.48,20.49ZM224,116H192a12,12,0,0,0,0,24h32a12,12,0,0,0,0-24Zm-42.26,48.77a12,12,0,1,0-17,17l22.63,22.63a12,12,0,0,0,17-17ZM128,180a12,12,0,0,0-12,12v32a12,12,0,0,0,24,0V192A12,12,0,0,0,128,180ZM74.26,164.77,51.63,187.4a12,12,0,0,0,17,17l22.63-22.63a12,12,0,1,0-17-17ZM76,128a12,12,0,0,0-12-12H32a12,12,0,0,0,0,24H64A12,12,0,0,0,76,128ZM68.6,51.63a12,12,0,1,0-17,17L74.26,91.23a12,12,0,0,0,17-17Z"></path>`);
  var root_4 = /* @__PURE__ */ from_svg(`<path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M136,32V64a8,8,0,0,1-16,0V32a8,8,0,0,1,16,0Zm37.25,58.75a8,8,0,0,0,5.66-2.35l22.63-22.62a8,8,0,0,0-11.32-11.32L167.6,77.09a8,8,0,0,0,5.65,13.66ZM224,120H192a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16Zm-45.09,47.6a8,8,0,0,0-11.31,11.31l22.62,22.63a8,8,0,0,0,11.32-11.32ZM128,184a8,8,0,0,0-8,8v32a8,8,0,0,0,16,0V192A8,8,0,0,0,128,184ZM77.09,167.6,54.46,190.22a8,8,0,0,0,11.32,11.32L88.4,178.91A8,8,0,0,0,77.09,167.6ZM72,128a8,8,0,0,0-8-8H32a8,8,0,0,0,0,16H64A8,8,0,0,0,72,128ZM65.78,54.46A8,8,0,0,0,54.46,65.78L77.09,88.4A8,8,0,0,0,88.4,77.09Z"></path>`, 1);
  var root_6 = /* @__PURE__ */ from_svg(`<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm33.94,58.75,17-17a8,8,0,0,1,11.32,11.32l-17,17a8,8,0,0,1-11.31-11.31ZM48,136a8,8,0,0,1,0-16H72a8,8,0,0,1,0,16Zm46.06,37.25-17,17a8,8,0,0,1-11.32-11.32l17-17a8,8,0,0,1,11.31,11.31Zm0-79.19a8,8,0,0,1-11.31,0l-17-17A8,8,0,0,1,77.09,65.77l17,17A8,8,0,0,1,94.06,94.06ZM136,208a8,8,0,0,1-16,0V184a8,8,0,0,1,16,0Zm0-136a8,8,0,0,1-16,0V48a8,8,0,0,1,16,0Zm54.23,118.23a8,8,0,0,1-11.32,0l-17-17a8,8,0,0,1,11.31-11.31l17,17A8,8,0,0,1,190.23,190.23ZM208,136H184a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16Z"></path>`);
  var root_8 = /* @__PURE__ */ from_svg(`<path d="M134,32V64a6,6,0,0,1-12,0V32a6,6,0,0,1,12,0Zm39.25,56.75A6,6,0,0,0,177.5,87l22.62-22.63a6,6,0,0,0-8.48-8.48L169,78.5a6,6,0,0,0,4.24,10.25ZM224,122H192a6,6,0,0,0,0,12h32a6,6,0,0,0,0-12Zm-46.5,47A6,6,0,0,0,169,177.5l22.63,22.62a6,6,0,0,0,8.48-8.48ZM128,186a6,6,0,0,0-6,6v32a6,6,0,0,0,12,0V192A6,6,0,0,0,128,186ZM78.5,169,55.88,191.64a6,6,0,1,0,8.48,8.48L87,177.5A6,6,0,1,0,78.5,169ZM70,128a6,6,0,0,0-6-6H32a6,6,0,0,0,0,12H64A6,6,0,0,0,70,128ZM64.36,55.88a6,6,0,0,0-8.48,8.48L78.5,87A6,6,0,1,0,87,78.5Z"></path>`);
  var root_10 = /* @__PURE__ */ from_svg(`<path d="M136,32V64a8,8,0,0,1-16,0V32a8,8,0,0,1,16,0Zm37.25,58.75a8,8,0,0,0,5.66-2.35l22.63-22.62a8,8,0,0,0-11.32-11.32L167.6,77.09a8,8,0,0,0,5.65,13.66ZM224,120H192a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16Zm-45.09,47.6a8,8,0,0,0-11.31,11.31l22.62,22.63a8,8,0,0,0,11.32-11.32ZM128,184a8,8,0,0,0-8,8v32a8,8,0,0,0,16,0V192A8,8,0,0,0,128,184ZM77.09,167.6,54.46,190.22a8,8,0,0,0,11.32,11.32L88.4,178.91A8,8,0,0,0,77.09,167.6ZM72,128a8,8,0,0,0-8-8H32a8,8,0,0,0,0,16H64A8,8,0,0,0,72,128ZM65.78,54.46A8,8,0,0,0,54.46,65.78L77.09,88.4A8,8,0,0,0,88.4,77.09Z"></path>`);
  var root_12 = /* @__PURE__ */ from_svg(`<path d="M132,32V64a4,4,0,0,1-8,0V32a4,4,0,0,1,8,0Zm41.25,54.75a4,4,0,0,0,2.83-1.18L198.71,63a4,4,0,0,0-5.66-5.66L170.43,79.92a4,4,0,0,0,2.82,6.83ZM224,124H192a4,4,0,0,0,0,8h32a4,4,0,0,0,0-8Zm-47.92,46.43a4,4,0,1,0-5.65,5.65l22.62,22.63a4,4,0,0,0,5.66-5.66ZM128,188a4,4,0,0,0-4,4v32a4,4,0,0,0,8,0V192A4,4,0,0,0,128,188ZM79.92,170.43,57.29,193.05A4,4,0,0,0,63,198.71l22.62-22.63a4,4,0,1,0-5.65-5.65ZM68,128a4,4,0,0,0-4-4H32a4,4,0,0,0,0,8H64A4,4,0,0,0,68,128ZM63,57.29A4,4,0,0,0,57.29,63L79.92,85.57a4,4,0,1,0,5.65-5.65Z"></path>`);
  var root$1 = /* @__PURE__ */ from_svg(`<svg><!><rect width="256" height="256" fill="none"></rect><!></svg>`);
  function Spinner($$anchor, $$props) {
    push($$props, true);
    const ctx = getIconContext();
    let props = /* @__PURE__ */ rest_props($$props, ["$$slots", "$$events", "$$legacy", "children"]);
    let weight = /* @__PURE__ */ user_derived(() => $$props.weight ?? ctx.weight ?? "regular");
    let color = /* @__PURE__ */ user_derived(() => $$props.color ?? ctx.color ?? "currentColor");
    let size = /* @__PURE__ */ user_derived(() => $$props.size ?? ctx.size ?? "1em");
    let mirrored = /* @__PURE__ */ user_derived(() => $$props.mirrored ?? ctx.mirrored ?? false);
    function svgAttr(obj) {
      let { weight: weight2, color: color2, size: size2, mirrored: mirrored2, ...attrs } = obj;
      return attrs;
    }
    var svg = root$1();
    attribute_effect(
      svg,
      ($0, $1) => ({
        xmlns: "http://www.w3.org/2000/svg",
        role: "img",
        width: get(size),
        height: get(size),
        fill: get(color),
        transform: get(mirrored) ? "scale(-1, 1)" : void 0,
        viewBox: "0 0 256 256",
        ...$0,
        ...$1
      }),
      [() => svgAttr(ctx), () => svgAttr(props)]
    );
    var node = child(svg);
    {
      var consequent = ($$anchor2) => {
        var fragment = comment();
        var node_1 = first_child(fragment);
        snippet(node_1, () => $$props.children);
        append($$anchor2, fragment);
      };
      if_block(node, ($$render) => {
        if ($$props.children) $$render(consequent);
      });
    }
    var node_2 = sibling(node, 2);
    {
      var consequent_1 = ($$anchor2) => {
        var path = root_2();
        append($$anchor2, path);
      };
      var alternate_5 = ($$anchor2) => {
        var fragment_1 = comment();
        var node_3 = first_child(fragment_1);
        {
          var consequent_2 = ($$anchor3) => {
            var fragment_2 = root_4();
            append($$anchor3, fragment_2);
          };
          var alternate_4 = ($$anchor3) => {
            var fragment_3 = comment();
            var node_4 = first_child(fragment_3);
            {
              var consequent_3 = ($$anchor4) => {
                var path_1 = root_6();
                append($$anchor4, path_1);
              };
              var alternate_3 = ($$anchor4) => {
                var fragment_4 = comment();
                var node_5 = first_child(fragment_4);
                {
                  var consequent_4 = ($$anchor5) => {
                    var path_2 = root_8();
                    append($$anchor5, path_2);
                  };
                  var alternate_2 = ($$anchor5) => {
                    var fragment_5 = comment();
                    var node_6 = first_child(fragment_5);
                    {
                      var consequent_5 = ($$anchor6) => {
                        var path_3 = root_10();
                        append($$anchor6, path_3);
                      };
                      var alternate_1 = ($$anchor6) => {
                        var fragment_6 = comment();
                        var node_7 = first_child(fragment_6);
                        {
                          var consequent_6 = ($$anchor7) => {
                            var path_4 = root_12();
                            append($$anchor7, path_4);
                          };
                          var alternate = ($$anchor7) => {
                            var text$1 = text();
                            text$1.nodeValue = (console.error('Unsupported icon weight. Choose from "thin", "light", "regular", "bold", "fill", or "duotone".'), "");
                            append($$anchor7, text$1);
                          };
                          if_block(
                            node_7,
                            ($$render) => {
                              if (get(weight) === "thin") $$render(consequent_6);
                              else $$render(alternate, false);
                            },
                            true
                          );
                        }
                        append($$anchor6, fragment_6);
                      };
                      if_block(
                        node_6,
                        ($$render) => {
                          if (get(weight) === "regular") $$render(consequent_5);
                          else $$render(alternate_1, false);
                        },
                        true
                      );
                    }
                    append($$anchor5, fragment_5);
                  };
                  if_block(
                    node_5,
                    ($$render) => {
                      if (get(weight) === "light") $$render(consequent_4);
                      else $$render(alternate_2, false);
                    },
                    true
                  );
                }
                append($$anchor4, fragment_4);
              };
              if_block(
                node_4,
                ($$render) => {
                  if (get(weight) === "fill") $$render(consequent_3);
                  else $$render(alternate_3, false);
                },
                true
              );
            }
            append($$anchor3, fragment_3);
          };
          if_block(
            node_3,
            ($$render) => {
              if (get(weight) === "duotone") $$render(consequent_2);
              else $$render(alternate_4, false);
            },
            true
          );
        }
        append($$anchor2, fragment_1);
      };
      if_block(node_2, ($$render) => {
        if (get(weight) === "bold") $$render(consequent_1);
        else $$render(alternate_5, false);
      });
    }
    append($$anchor, svg);
    pop();
  }
  const EXPLICIT_VERSIONS = {
    [GAME_ENGINE.GODOT]: [],
    [GAME_ENGINE.UNITY]: [],
    [GAME_ENGINE.JSDOS]: ["v8"],
    [GAME_ENGINE.UNREAL]: [],
    [GAME_ENGINE.CUSTOM]: [],
    [GAME_ENGINE.RUFFLE]: [],
    [GAME_ENGINE.RENPY]: []
  };
  const FALLBACK_PATTERNS = {
    [GAME_ENGINE.GODOT]: [
      { pattern: /^3\.0\b/, file: "3.0.x.js" },
      { pattern: /^3\.[12]\b/, file: "3.1.x.js" },
      { pattern: /^3\./, file: "3.x.js" },
      { pattern: /^4\./, file: "4.x.js" }
    ],
    [GAME_ENGINE.UNITY]: [{ pattern: /^6000\./, file: "6000.x.js" }],
    [GAME_ENGINE.JSDOS]: [],
    [GAME_ENGINE.UNREAL]: [],
    [GAME_ENGINE.CUSTOM]: [],
    [GAME_ENGINE.RUFFLE]: [{ pattern: /^0\.2\.0-/, file: "0.2.0-x.js" }],
    [GAME_ENGINE.RENPY]: []
  };
  function resolveEntrypoint(engine2, engineVersion, entrypoint) {
    if (entrypoint !== null) {
      return entrypoint;
    }
    if (engine2 === GAME_ENGINE.CUSTOM) {
      throw new Error("Custom engine requires an entrypoint");
    }
    if (!engineVersion) {
      throw new Error(`No engineVersion provided for ${engine2}`);
    }
    const enginePath = getEnginePath(engine2);
    if (EXPLICIT_VERSIONS[engine2]?.includes(engineVersion)) {
      return `/default-entrypoints/${enginePath}/${engineVersion}.js`;
    }
    const fallback = FALLBACK_PATTERNS[engine2]?.find((p) => p.pattern.test(engineVersion));
    if (fallback) {
      return `/default-entrypoints/${enginePath}/${fallback.file}`;
    }
    throw new Error(`No entrypoint found for ${engine2} version "${engineVersion}"`);
  }
  function getEnginePath(engine2) {
    switch (engine2) {
      case GAME_ENGINE.GODOT:
        return "godot";
      case GAME_ENGINE.UNITY:
        return "unity";
      case GAME_ENGINE.JSDOS:
        return "jsdos";
      case GAME_ENGINE.UNREAL:
        return "unreal";
      case GAME_ENGINE.CUSTOM:
        return "custom";
      case GAME_ENGINE.RUFFLE:
        return "ruffle";
      default:
        throw new Error(`Unknown engine "${engine2}"`);
    }
  }
  async function loadEntrypointFromUrl() {
    const url = new URL(window.location.href);
    const { resolvedEntrypoint, entrypointParams } = parseEntrypointConfig(url);
    await loadEntrypoint(resolvedEntrypoint, entrypointParams);
  }
  function parseEntrypointConfig(url) {
    const engine2 = url.searchParams.get(UrlParams.Engine);
    const engineVersion = url.searchParams.get(UrlParams.EngineVersion);
    const entrypoint = url.searchParams.get(UrlParams.Entrypoint);
    const entrypointParams = parseEntrypointParams(url.searchParams.get(UrlParams.EntrypointParams));
    if (!engine2) {
      throw new Error("Missing required engine parameter");
    }
    if (!engineVersion && engine2 !== GAME_ENGINE.CUSTOM) {
      throw new Error("Missing required engineVersion parameter");
    }
    const resolvedEntrypoint = resolveEntrypoint(engine2, engineVersion, entrypoint);
    return {
      engine: engine2,
      engineVersion,
      resolvedEntrypoint,
      entrypointParams
    };
  }
  async function loadEntrypoint(resolvedEntrypoint, entrypointParams) {
    const globalWindow = window;
    globalWindow.entrypointParams = entrypointParams;
    const wavedash = setupWavedashSDK();
    await wavedash.loadScript(resolvedEntrypoint);
  }
  function parseEntrypointParams(rawValue) {
    if (!rawValue) {
      return {};
    }
    try {
      const parsed = JSON.parse(rawValue);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch (error2) {
      console.warn("Failed to parse entrypoint params", error2);
      return {};
    }
  }
  const CONFIGURE_TIMEOUT_MS = 5e3;
  const NO_SERVICE_WORKER_API = "no-serviceworker-api";
  function registerEmbedServiceWorker(swPath, credentials) {
    const registration = new Promise((resolve) => {
      if (!navigator.serviceWorker) throw new Error(NO_SERVICE_WORKER_API);
      resolve(navigator.serviceWorker.register(swPath, { scope: "/" }));
    });
    const ready = registration.then(async (reg) => {
      const worker = await activeWorker(reg);
      if (!worker) throw new Error("no-active-worker");
      if (credentials) await configure(worker, credentials);
      return reg;
    });
    return { registration, ready };
  }
  function activeWorker(reg) {
    const pending = reg.installing || reg.waiting;
    if (!pending) return Promise.resolve(reg.active);
    return new Promise((resolve, reject) => {
      pending.addEventListener("statechange", () => {
        if (pending.state === "activated") resolve(pending);
        else if (pending.state === "redundant") reject(new Error("sw-install-failed"));
      });
    });
  }
  function configure(worker, credentials) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => {
        channel.port1.close();
        reject(new Error("configure-timeout"));
      }, CONFIGURE_TIMEOUT_MS);
      channel.port1.onmessage = (ev) => {
        if (ev.data?.type !== SERVICE_WORKER_MESSAGE_TYPE.EMBED_CONFIGURE_ACK) return;
        clearTimeout(timer);
        channel.port1.close();
        resolve();
      };
      const message = {
        type: SERVICE_WORKER_MESSAGE_TYPE.EMBED_CONFIGURE,
        payload: { credentials },
        expectAckType: SERVICE_WORKER_MESSAGE_TYPE.EMBED_CONFIGURE_ACK
      };
      worker.postMessage(message, [channel.port2]);
    });
  }
  function waitForController() {
    const container = navigator.serviceWorker;
    if (container.controller) return Promise.resolve();
    return new Promise((resolve) => {
      const onChange = () => {
        if (!container.controller) return;
        container.removeEventListener("controllerchange", onChange);
        resolve();
      };
      container.addEventListener("controllerchange", onChange);
    });
  }
  const ENTRYPOINT_FAILURE_NAME = "WavedashLoadFailedError";
  function formatError(error2) {
    if (error2 instanceof Event && error2.target instanceof HTMLScriptElement) {
      return `Failed to load script ${error2.target.src}`;
    }
    return error2 instanceof Error ? `${error2.name}: ${error2.message}` : String(error2);
  }
  function reportLoadFailure(message, reason) {
    console.warn("[wavedash] load failed:", message);
    window.parent.postMessage(
      {
        type: IFRAME_MESSAGE_TYPE.LOADING_FAILED,
        message,
        crossOriginIsolated: window.crossOriginIsolated,
        ...reason && { reason }
      },
      "*"
    );
  }
  function onUncaughtError(event) {
    if (window.Wavedash?.gameLoaded) return;
    const reason = "reason" in event ? event.reason : event.error ?? event.message;
    if (reason instanceof Error && reason.name === ENTRYPOINT_FAILURE_NAME) {
      reportLoadFailure(formatError(reason.cause ?? reason));
      return;
    }
    if (window.crossOriginIsolated) return;
    const message = formatError(reason);
    if (GAME_ISOLATION_ERROR_PATTERN.test(message)) reportLoadFailure(message);
  }
  function installLoadFailureReporting() {
    window.addEventListener("error", onUncaughtError);
    window.addEventListener("unhandledrejection", onUncaughtError);
  }
  const SW_TAKEOVER_TIMEOUT_MS = 3e4;
  async function ensureAssetAuth(sw2) {
    const token = await fetch("/auth/token", { credentials: "same-origin" }).then(
      (response) => response.ok ? response.text() : ""
    );
    if (token) return true;
    if (!navigator.serviceWorker) {
      reportLoadFailure("Cookies are blocked and this browser has no service worker", "auth");
      return false;
    }
    let stage = "registering";
    sw2.registration.then(
      (reg) => stage = reg.installing || reg.waiting ? "installing" : "configuring",
      () => {
      }
    );
    sw2.ready.then(
      () => stage = "waiting for the worker to claim this page",
      () => {
      }
    );
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`timed out after ${SW_TAKEOVER_TIMEOUT_MS}ms while ${stage}`)),
        SW_TAKEOVER_TIMEOUT_MS
      );
    });
    try {
      await Promise.race([sw2.ready.then(waitForController), timeout]);
      return true;
    } catch (error2) {
      const detail = error2 instanceof Error ? error2.message : String(error2);
      reportLoadFailure(
        `Cookies are blocked and the service worker never took over: ${detail}`,
        "auth"
      );
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
  var root_1 = /* @__PURE__ */ from_html(`<div class="absolute inset-0 flex items-center justify-center z-10"><!></div>`);
  var root = /* @__PURE__ */ from_html(`<div class="size-full text-white/60 relative"><!> <div id="wavedash-target" class="absolute inset-0 h-full z-20"></div></div>`);
  function App($$anchor, $$props) {
    push($$props, true);
    let ready = /* @__PURE__ */ state(false);
    onMount(async () => {
      const url = new URL(window.location.href);
      try {
        if (url.searchParams.has(UrlParams.PlayKey)) {
          if (!await ensureAssetAuth($$props.sw)) return;
          url.searchParams.delete(UrlParams.PlayKey);
          window.location.replace(url.toString());
          return;
        }
        await loadEntrypointFromUrl();
      } catch (error2) {
        reportLoadFailure(formatError(error2));
        throw error2;
      }
      set(ready, true);
    });
    var div = root();
    var node = child(div);
    {
      var consequent = ($$anchor2) => {
        var div_1 = root_1();
        var node_1 = child(div_1);
        Spinner(node_1, { class: "animate-spin text-white", size: 32 });
        append($$anchor2, div_1);
      };
      if_block(node, ($$render) => {
        if (!get(ready)) $$render(consequent);
      });
    }
    append($$anchor, div);
    pop();
  }
  function installRenpyLoader() {
    const Wavedash = window.Wavedash;
    if (!Wavedash) {
      console.warn("renpy 8.x loader: Wavedash not found; loader shim disabled");
      return;
    }
    const PHASES = [
      { prefix: "Downloading engine", weight: 0.4, floor: 0 },
      { prefix: "Downloading game", weight: 0.3, floor: 0 },
      { prefix: "Running", weight: 0.05, floor: 0 },
      { prefix: "Unpacking", weight: 0.05, floor: 0 },
      { prefix: "Loading script", weight: 0.15, floor: 0 }
    ];
    PHASES.reduce((acc, p) => {
      p.floor = acc;
      return acc + p.weight;
    }, 0);
    let phase = PHASES[0];
    const reportProgress = (v) => {
      Wavedash.updateLoadProgressZeroToOne(Math.max(0, Math.min(1, v)));
    };
    window.Module = window.Module || {};
    let _print = null;
    Object.defineProperty(window.Module, "print", {
      configurable: true,
      get: () => _print,
      set: (fn) => {
        _print = (s) => {
          if (fn) fn(s);
          if (typeof s !== "string") return;
          const next = PHASES.find((p) => s.startsWith(p.prefix));
          if (!next || PHASES.indexOf(next) <= PHASES.indexOf(phase)) return;
          phase = next;
          reportProgress(phase.floor);
        };
      }
    });
    let _progress = null;
    Object.defineProperty(window, "progress", {
      configurable: true,
      get: () => _progress,
      set: (fn) => {
        _progress = (done, total) => {
          if (fn) fn(done, total);
          if (!total) return;
          const r2 = Math.max(0, Math.min(1, done / total));
          reportProgress(phase.floor + r2 * phase.weight);
        };
      }
    });
  }
  const WASM_PAGE_BYTES = 65536;
  const IOS_MAX_PREALLOC_PAGES = 32768;
  const CAP_LADDER_PAGES = [24576, 16384, 12288];
  function isIosWebKit() {
    return /iPhone|iPad|iPod/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  }
  function installIosSharedWasmMemoryShim() {
    const result = { installed: false, allocations: [] };
    const search = window.location.search;
    if (search.includes("memshim_off")) return result;
    if (!isIosWebKit() && !search.includes("memshim_force")) return result;
    if (typeof WebAssembly === "undefined") return result;
    const OriginalMemory = WebAssembly.Memory;
    function PatchedMemory(descriptor) {
      if (!descriptor?.shared || descriptor.maximum === void 0 || descriptor.maximum <= descriptor.initial) {
        return new OriginalMemory(descriptor);
      }
      const allocation = {
        requestedInitialPages: descriptor.initial,
        requestedMaximumPages: descriptor.maximum,
        grantedPages: null
      };
      result.allocations.push(allocation);
      const cappedMax = Math.min(descriptor.maximum, IOS_MAX_PREALLOC_PAGES);
      const minRung = CAP_LADDER_PAGES[CAP_LADDER_PAGES.length - 1];
      const candidates = [
        cappedMax,
        ...CAP_LADDER_PAGES,
        // only a large declared initial is worth pinning; a tiny one would
        // leave the game an unusably small fixed heap
        ...descriptor.initial >= minRung ? [descriptor.initial] : []
      ].filter(
        (pages, i2, all) => pages >= descriptor.initial && pages <= cappedMax && all.indexOf(pages) === i2
      ).sort((a, b) => b - a);
      for (const pages of candidates) {
        try {
          const memory = new OriginalMemory({ initial: pages, maximum: pages, shared: true });
          allocation.grantedPages = pages;
          console.info(
            `[wavedash] pre-allocated shared wasm memory: ${pages * WASM_PAGE_BYTES / 1048576}MiB fixed (game declared initial ${descriptor.initial} / max ${descriptor.maximum} pages)`
          );
          return memory;
        } catch {
        }
      }
      console.warn(
        "[wavedash] shared wasm memory pre-allocation refused at every size; falling back to the original growable descriptor"
      );
      return new OriginalMemory(descriptor);
    }
    PatchedMemory.prototype = OriginalMemory.prototype;
    WebAssembly.Memory = PatchedMemory;
    result.installed = true;
    return result;
  }
  const buttonCount = 17;
  const axisCount = 4;
  const keyboardButtons = /* @__PURE__ */ new Map([
    [0, { key: " ", code: "Space", keyCode: 32 }],
    [9, { key: "Enter", code: "Enter", keyCode: 13 }],
    [12, { key: "ArrowUp", code: "ArrowUp", keyCode: 38 }],
    [13, { key: "ArrowDown", code: "ArrowDown", keyCode: 40 }],
    [14, { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 }],
    [15, { key: "ArrowRight", code: "ArrowRight", keyCode: 39 }]
  ]);
  function clamp(value, minimum, maximum) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.min(Math.max(numeric, minimum), maximum) : 0;
  }
  function dispatchKeyboardButton(view, index, pressed) {
    const key = keyboardButtons.get(index);
    if (!key) return;
    const event = new view.KeyboardEvent(pressed ? "keydown" : "keyup", {
      key: key.key,
      code: key.code,
      bubbles: true,
      cancelable: true,
      repeat: false
    });
    Object.defineProperties(event, {
      keyCode: { value: key.keyCode },
      which: { value: key.keyCode }
    });
    (view.document.activeElement ?? view.document.body ?? view.document).dispatchEvent(event);
  }
  function installVirtualGamepad(params2) {
    if (params2.get("virtualGamepad") !== "1") return;
    const runtimeWindow = window;
    if (runtimeWindow.__wavedashVirtualGamepad) return;
    const nativeGetGamepads = navigator.getGamepads?.bind(navigator);
    const gamepad = {
      id: "Wavedash Touch Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)",
      index: 0,
      connected: false,
      mapping: "standard",
      timestamp: performance.now(),
      axes: new Array(axisCount).fill(0),
      buttons: Array.from({ length: buttonCount }, () => ({
        pressed: false,
        touched: false,
        value: 0
      })),
      vibrationActuator: null
    };
    const publicGamepad = gamepad;
    const getNativeGamepads = () => nativeGetGamepads ? Array.from(nativeGetGamepads() ?? []) : [];
    const hasNativeGamepad = () => getNativeGamepads().some((pad) => pad?.connected);
    const emitConnectionEvent = (view, type) => {
      const event = new view.Event(type);
      Object.defineProperty(event, "gamepad", { value: publicGamepad });
      view.dispatchEvent(event);
    };
    const documents = /* @__PURE__ */ new WeakSet();
    let views = [];
    const syncFrames = () => {
      views = [];
      const visit2 = (view) => {
        let frameDocument;
        try {
          frameDocument = view.document;
        } catch (error2) {
          if (error2.name === "SecurityError") return;
          throw error2;
        }
        views.push(view);
        if (!documents.has(frameDocument)) {
          documents.add(frameDocument);
          const getGamepads = view.navigator.getGamepads?.bind(view.navigator);
          Object.defineProperty(view.navigator, "getGamepads", {
            configurable: true,
            value: () => {
              const gamepads = getGamepads ? Array.from(getGamepads() ?? []) : [];
              if (gamepad.connected) gamepads[0] = publicGamepad;
              return gamepads;
            }
          });
          view.addEventListener("gamepadconnected", (event) => {
            if (event.gamepad !== publicGamepad) disconnectVirtualGamepad();
          });
          frameDocument.addEventListener(
            "load",
            (event) => {
              if (event.target.localName === "iframe") syncFrames();
            },
            true
          );
          new view.MutationObserver((mutations) => {
            if (mutations.some(
              (mutation) => [...mutation.addedNodes, ...mutation.removedNodes].some(
                (node) => node.nodeType === 1 && (node.localName === "iframe" || node.querySelector("iframe"))
              )
            ))
              syncFrames();
          }).observe(frameDocument, { childList: true, subtree: true });
          if (gamepad.connected) {
            emitConnectionEvent(view, "gamepadconnected");
            for (let index = 0; index < buttonCount; index += 1) {
              if (gamepad.buttons[index].pressed) dispatchKeyboardButton(view, index, true);
            }
          }
        }
        for (const frame of frameDocument.querySelectorAll("iframe")) {
          if (frame.contentWindow) visit2(frame.contentWindow);
        }
      };
      visit2(window);
    };
    const disconnectVirtualGamepad = () => {
      if (!gamepad.connected) return;
      for (let index = 0; index < axisCount; index += 1) {
        gamepad.axes[index] = 0;
      }
      for (let index = 0; index < buttonCount; index += 1) {
        const target = gamepad.buttons[index];
        const wasPressed = target.pressed;
        target.value = 0;
        target.pressed = false;
        target.touched = false;
        if (wasPressed) {
          for (const view of views) dispatchKeyboardButton(view, index, false);
        }
      }
      gamepad.connected = false;
      gamepad.timestamp = performance.now();
      for (const view of views) emitConnectionEvent(view, "gamepaddisconnected");
    };
    window.addEventListener("message", (event) => {
      if (event.source !== parent) return;
      const data = event.data;
      if (!data || data.type !== "wavedash:gamepad") return;
      if (data.connected === false || hasNativeGamepad()) {
        disconnectVirtualGamepad();
        return;
      }
      const wasConnected = gamepad.connected;
      for (let index = 0; index < axisCount; index += 1) {
        gamepad.axes[index] = clamp(data.axes?.[index], -1, 1);
      }
      for (let index = 0; index < buttonCount; index += 1) {
        const target = gamepad.buttons[index];
        const wasPressed = target.pressed;
        target.value = clamp(data.buttons?.[index], 0, 1);
        target.pressed = target.value > 0.5;
        target.touched = target.value > 0;
        if (target.pressed !== wasPressed) {
          for (const view of views) dispatchKeyboardButton(view, index, target.pressed);
        }
      }
      gamepad.connected = true;
      gamepad.timestamp = performance.now();
      if (!wasConnected) {
        for (const view of views) emitConnectionEvent(view, "gamepadconnected");
      }
    });
    runtimeWindow.__wavedashVirtualGamepad = publicGamepad;
    syncFrames();
  }
  const params = new URLSearchParams(window.location.search);
  if (window.parent !== window) {
    window.parent.postMessage({ type: IFRAME_MESSAGE_TYPE.FRAME_BOOTED }, "*");
  }
  installLoadFailureReporting();
  const game = window.__WAVEDASH_GAME__;
  const engine = params.get(UrlParams.Engine) ?? void 0;
  const gameSlug = params.get(UrlParams.GameSlug) ?? void 0;
  const gameTags = {
    "game.gcid": game.gcid,
    "game.gbid": game.gbid
  };
  if (gameSlug) gameTags["game.slug"] = gameSlug;
  if (engine) gameTags["game.engine"] = engine;
  init({
    dsn: "https://93fecf5bd637bcda3dd68d4d4ca9fadf@o4510067032457216.ingest.us.sentry.io/4510554400555008",
    tracesSampleRate: 0.6,
    environment: "production",
    enabled: true,
    initialScope: { tags: gameTags },
    // Every entrypoint failure throws from the same catch line, so stack grouping would fold WebGL,
    // network and isolation failures into one issue per engine; group by engine and message instead.
    // Linked Errors prepends the `cause` chain, so the captured wrapper is the last value
    beforeSend(event) {
      const exception = event.exception?.values?.at(-1);
      if (exception?.type !== ENTRYPOINT_FAILURE_NAME) return event;
      const message = (exception.value ?? "").replace(/https?:\/\/\S+/g, "<url>").replace(/\d+/g, "#").slice(0, 120);
      event.fingerprint = [ENTRYPOINT_FAILURE_NAME, engine ?? "unknown", message];
      return event;
    }
  });
  function installOptional(name, install) {
    try {
      return install();
    } catch (error2) {
      console.warn(`[wavedash] ${name} failed`, error2);
      captureException(error2, { tags: { "embed.install": name } });
      return void 0;
    }
  }
  const memoryShim = installOptional("ios_memory_shim", installIosSharedWasmMemoryShim);
  setTag("ios_memory_shim", memoryShim?.installed ? "installed" : "off");
  installOptional("virtual_gamepad", () => installVirtualGamepad(params));
  const gameSurfaceStyle = document.createElement("style");
  gameSurfaceStyle.textContent = "html{overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}input,textarea,[contenteditable]{-webkit-user-select:text;user-select:text}";
  document.head.append(gameSurfaceStyle);
  const sw = registerEmbedServiceWorker(
    game.swPath,
    game.gameplayJwt && game.sessionToken ? { gameplayJwt: game.gameplayJwt, sessionToken: game.sessionToken } : void 0
  );
  sw.ready.catch((error2) => {
    const reason = error2 instanceof Error ? error2.message : String(error2);
    console.warn("[wavedash] service worker setup failed", reason);
    setTag("sw", reason === NO_SERVICE_WORKER_API ? "no-api" : "failed");
  });
  installOptional("lock_service_worker", () => lockServiceWorker(sw.registration, game.swPath));
  const appEl = document.querySelector("#app[data-wavedash]");
  if (appEl) {
    mount(App, { target: appEl, props: { sw } });
  } else {
    setupWavedashSDK();
    if (new URLSearchParams(window.location.search).get("engine") === GAME_ENGINE.RENPY) {
      installRenpyLoader();
    }
  }
})();
//# sourceMappingURL=embed.js.map
