// olbaid 04 — ptr
// Lines 5421-5767 of readable/olbaid.pretty.js (statement-aligned).
const __wbindgen_enum_GpuVertexFormat = [
  "uint8",
  "uint8x2",
  "uint8x4",
  "sint8",
  "sint8x2",
  "sint8x4",
  "unorm8",
  "unorm8x2",
  "unorm8x4",
  "snorm8",
  "snorm8x2",
  "snorm8x4",
  "uint16",
  "uint16x2",
  "uint16x4",
  "sint16",
  "sint16x2",
  "sint16x4",
  "unorm16",
  "unorm16x2",
  "unorm16x4",
  "snorm16",
  "snorm16x2",
  "snorm16x4",
  "float16",
  "float16x2",
  "float16x4",
  "float32",
  "float32x2",
  "float32x3",
  "float32x4",
  "uint32",
  "uint32x2",
  "uint32x3",
  "uint32x4",
  "sint32",
  "sint32x2",
  "sint32x3",
  "sint32x4",
  "unorm10-10-10-2",
  "unorm8x4-bgra",
];

const __wbindgen_enum_GpuVertexStepMode = ["vertex", "instance"];

const __wbindgen_enum_PremultiplyAlpha = ["none", "premultiply", "default"];

const __wbindgen_enum_ResizeObserverBoxOptions = [
  "border-box",
  "content-box",
  "device-pixel-content-box",
];

const __wbindgen_enum_VisibilityState = ["hidden", "visible"];
const StreamConfigFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_streamconfig_free(ptr, 1));

function addHeapObject(obj) {
  if (heap_next === heap.length) heap.push(heap.length + 1);
  const idx = heap_next;
  heap_next = heap[idx];

  heap[idx] = obj;
  return idx;
}

const CLOSURE_DTORS =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((state) =>
        wasm.__wbindgen_export5(state.a, state.b),
      );

function debugString(val) {
  // primitive types
  const type = typeof val;
  if (type == "number" || type == "boolean" || val == null) {
    return `${val}`;
  }
  if (type == "string") {
    return `"${val}"`;
  }
  if (type == "symbol") {
    const description = val.description;
    if (description == null) {
      return "Symbol";
    } else {
      return `Symbol(${description})`;
    }
  }
  if (type == "function") {
    const name = val.name;
    if (typeof name == "string" && name.length > 0) {
      return `Function(${name})`;
    } else {
      return "Function";
    }
  }
  // objects
  if (Array.isArray(val)) {
    const length = val.length;
    let debug = "[";
    if (length > 0) {
      debug += debugString(val[0]);
    }
    for (let i = 1; i < length; i++) {
      debug += ", " + debugString(val[i]);
    }
    debug += "]";
    return debug;
  }
  // Test for built-in
  const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
  let className;
  if (builtInMatches && builtInMatches.length > 1) {
    className = builtInMatches[1];
  } else {
    // Failed to match the standard '[object ClassName]'
    return toString.call(val);
  }
  if (className == "Object") {
    // we're a user defined class or Object
    // JSON.stringify avoids problems with cycles, and is generally much
    // easier than looping through ownProperties of `val`.
    try {
      return "Object(" + JSON.stringify(val) + ")";
    } catch (_) {
      return "Object";
    }
  }
  // errors
  if (val instanceof Error) {
    return `${val.name}: ${val.message}\n${val.stack}`;
  }
  // TODO we could test for more things here, like `Set`s and `Map`s.
  return className;
}

function dropObject(idx) {
  if (idx < 1028) return;
  heap[idx] = heap_next;
  heap_next = idx;
}

function getArrayF32FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayI16FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getInt16ArrayMemory0().subarray(ptr / 2, ptr / 2 + len);
}

function getArrayI32FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getInt32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayI8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getInt8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

function getArrayU16FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint16ArrayMemory0().subarray(ptr / 2, ptr / 2 + len);
}

function getArrayU32FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

function getClampedArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ClampedArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
  if (
    cachedDataViewMemory0 === null ||
    cachedDataViewMemory0.buffer.detached === true ||
    (cachedDataViewMemory0.buffer.detached === undefined &&
      cachedDataViewMemory0.buffer !== wasm.memory.buffer)
  ) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
  if (
    cachedFloat32ArrayMemory0 === null ||
    cachedFloat32ArrayMemory0.byteLength === 0
  ) {
    cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
  }
  return cachedFloat32ArrayMemory0;
}

let cachedInt16ArrayMemory0 = null;
function getInt16ArrayMemory0() {
  if (
    cachedInt16ArrayMemory0 === null ||
    cachedInt16ArrayMemory0.byteLength === 0
  ) {
    cachedInt16ArrayMemory0 = new Int16Array(wasm.memory.buffer);
  }
  return cachedInt16ArrayMemory0;
}

let cachedInt32ArrayMemory0 = null;
function getInt32ArrayMemory0() {
  if (
    cachedInt32ArrayMemory0 === null ||
    cachedInt32ArrayMemory0.byteLength === 0
  ) {
    cachedInt32ArrayMemory0 = new Int32Array(wasm.memory.buffer);
  }
  return cachedInt32ArrayMemory0;
}

let cachedInt8ArrayMemory0 = null;
function getInt8ArrayMemory0() {
  if (
    cachedInt8ArrayMemory0 === null ||
    cachedInt8ArrayMemory0.byteLength === 0
  ) {
    cachedInt8ArrayMemory0 = new Int8Array(wasm.memory.buffer);
  }
  return cachedInt8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
  return decodeText(ptr >>> 0, len);
}

let cachedUint16ArrayMemory0 = null;
function getUint16ArrayMemory0() {
  if (
    cachedUint16ArrayMemory0 === null ||
    cachedUint16ArrayMemory0.byteLength === 0
  ) {
    cachedUint16ArrayMemory0 = new Uint16Array(wasm.memory.buffer);
  }
  return cachedUint16ArrayMemory0;
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
  if (
    cachedUint32ArrayMemory0 === null ||
    cachedUint32ArrayMemory0.byteLength === 0
  ) {
    cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
  }
  return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
  if (
    cachedUint8ArrayMemory0 === null ||
    cachedUint8ArrayMemory0.byteLength === 0
  ) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

let cachedUint8ClampedArrayMemory0 = null;
function getUint8ClampedArrayMemory0() {
  if (
    cachedUint8ClampedArrayMemory0 === null ||
    cachedUint8ClampedArrayMemory0.byteLength === 0
  ) {
    cachedUint8ClampedArrayMemory0 = new Uint8ClampedArray(wasm.memory.buffer);
  }
  return cachedUint8ClampedArrayMemory0;
}

function getObject(idx) {
  return heap[idx];
}

function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    wasm.__wbindgen_export3(addHeapObject(e));
  }
}

let heap = new Array(1024).fill(undefined);
heap.push(undefined, null, true, false);

let heap_next = heap.length;

function isLikeNone(x) {
  return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, f) {
  const state = { a: arg0, b: arg1, cnt: 1 };
  const real = (...args) => {
    // First up with a closure we increment the internal reference
    // count. This ensures that the Rust closure environment won't
    // be deallocated while we're invoking it.
    state.cnt++;
    const a = state.a;
    state.a = 0;
    try {
      return f(a, state.b, ...args);
    } finally {
      state.a = a;
      real._wbg_cb_unref();
    }
  };
  real._wbg_cb_unref = () => {
    if (--state.cnt === 0) {
      wasm.__wbindgen_export5(state.a, state.b);
      state.a = 0;
      CLOSURE_DTORS.unregister(state);
    }
  };
  CLOSURE_DTORS.register(real, state, state);
  return real;
}

function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}

