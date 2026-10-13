// olbaid 03 — arg0
// Lines 5110-5420 of readable/olbaid.pretty.js (statement-aligned).
const lAudioContext =
  typeof AudioContext !== "undefined"
    ? AudioContext
    : typeof webkitAudioContext !== "undefined"
      ? webkitAudioContext
      : undefined;
function __wasm_bindgen_func_elem_114281(arg0, arg1) {
  wasm.__wasm_bindgen_func_elem_114281(arg0, arg1);
}

function __wasm_bindgen_func_elem_112108(arg0, arg1, arg2) {
  wasm.__wasm_bindgen_func_elem_112108(arg0, arg1, addHeapObject(arg2));
}

function __wasm_bindgen_func_elem_112108_9(arg0, arg1, arg2) {
  wasm.__wasm_bindgen_func_elem_112108_9(arg0, arg1, addHeapObject(arg2));
}

function __wasm_bindgen_func_elem_112108_10(arg0, arg1, arg2) {
  wasm.__wasm_bindgen_func_elem_112108_10(arg0, arg1, addHeapObject(arg2));
}

function __wasm_bindgen_func_elem_112108_11(arg0, arg1, arg2) {
  wasm.__wasm_bindgen_func_elem_112108_11(arg0, arg1, addHeapObject(arg2));
}

function __wasm_bindgen_func_elem_112108_12(arg0, arg1, arg2) {
  wasm.__wasm_bindgen_func_elem_112108_12(arg0, arg1, addHeapObject(arg2));
}

function __wasm_bindgen_func_elem_112108_13(arg0, arg1, arg2) {
  wasm.__wasm_bindgen_func_elem_112108_13(arg0, arg1, addHeapObject(arg2));
}

function __wasm_bindgen_func_elem_112108_14(arg0, arg1, arg2) {
  wasm.__wasm_bindgen_func_elem_112108_14(arg0, arg1, addHeapObject(arg2));
}

function __wasm_bindgen_func_elem_112108_15(arg0, arg1, arg2) {
  wasm.__wasm_bindgen_func_elem_112108_15(arg0, arg1, addHeapObject(arg2));
}

function __wasm_bindgen_func_elem_112108_16(arg0, arg1, arg2) {
  wasm.__wasm_bindgen_func_elem_112108_16(arg0, arg1, addHeapObject(arg2));
}

function __wasm_bindgen_func_elem_114219(arg0, arg1, arg2) {
  wasm.__wasm_bindgen_func_elem_114219(
    arg0,
    arg1,
    isLikeNone(arg2) ? 0 : addHeapObject(arg2),
  );
}

function __wasm_bindgen_func_elem_105762(arg0, arg1, arg2) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    wasm.__wasm_bindgen_func_elem_105762(
      retptr,
      arg0,
      arg1,
      addHeapObject(arg2),
    );
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    if (r1) {
      throw takeObject(r0);
    }
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

function __wasm_bindgen_func_elem_105791(arg0, arg1, arg2, arg3) {
  wasm.__wasm_bindgen_func_elem_105791(
    arg0,
    arg1,
    addHeapObject(arg2),
    addHeapObject(arg3),
  );
}

const __wbindgen_enum_GamepadMappingType = ["", "standard"];

const __wbindgen_enum_GpuAddressMode = [
  "clamp-to-edge",
  "repeat",
  "mirror-repeat",
];

const __wbindgen_enum_GpuBlendFactor = [
  "zero",
  "one",
  "src",
  "one-minus-src",
  "src-alpha",
  "one-minus-src-alpha",
  "dst",
  "one-minus-dst",
  "dst-alpha",
  "one-minus-dst-alpha",
  "src-alpha-saturated",
  "constant",
  "one-minus-constant",
  "src1",
  "one-minus-src1",
  "src1-alpha",
  "one-minus-src1-alpha",
];

const __wbindgen_enum_GpuBlendOperation = [
  "add",
  "subtract",
  "reverse-subtract",
  "min",
  "max",
];

const __wbindgen_enum_GpuBufferBindingType = [
  "uniform",
  "storage",
  "read-only-storage",
];

const __wbindgen_enum_GpuCanvasAlphaMode = ["opaque", "premultiplied"];

const __wbindgen_enum_GpuCompareFunction = [
  "never",
  "less",
  "equal",
  "less-equal",
  "greater",
  "not-equal",
  "greater-equal",
  "always",
];

const __wbindgen_enum_GpuCullMode = ["none", "front", "back"];

const __wbindgen_enum_GpuDeviceLostReason = ["unknown", "destroyed"];

const __wbindgen_enum_GpuErrorFilter = [
  "validation",
  "out-of-memory",
  "internal",
];

const __wbindgen_enum_GpuFilterMode = ["nearest", "linear"];

const __wbindgen_enum_GpuFrontFace = ["ccw", "cw"];

const __wbindgen_enum_GpuIndexFormat = ["uint16", "uint32"];

const __wbindgen_enum_GpuLoadOp = ["load", "clear"];

const __wbindgen_enum_GpuMipmapFilterMode = ["nearest", "linear"];

const __wbindgen_enum_GpuPowerPreference = ["low-power", "high-performance"];

const __wbindgen_enum_GpuPrimitiveTopology = [
  "point-list",
  "line-list",
  "line-strip",
  "triangle-list",
  "triangle-strip",
];

const __wbindgen_enum_GpuSamplerBindingType = [
  "filtering",
  "non-filtering",
  "comparison",
];

const __wbindgen_enum_GpuStencilOperation = [
  "keep",
  "zero",
  "replace",
  "invert",
  "increment-clamp",
  "decrement-clamp",
  "increment-wrap",
  "decrement-wrap",
];

const __wbindgen_enum_GpuStorageTextureAccess = [
  "write-only",
  "read-only",
  "read-write",
];

const __wbindgen_enum_GpuStoreOp = ["store", "discard"];

const __wbindgen_enum_GpuTextureAspect = ["all", "stencil-only", "depth-only"];

const __wbindgen_enum_GpuTextureDimension = ["1d", "2d", "3d"];

const __wbindgen_enum_GpuTextureFormat = [
  "r8unorm",
  "r8snorm",
  "r8uint",
  "r8sint",
  "r16uint",
  "r16sint",
  "r16float",
  "rg8unorm",
  "rg8snorm",
  "rg8uint",
  "rg8sint",
  "r32uint",
  "r32sint",
  "r32float",
  "rg16uint",
  "rg16sint",
  "rg16float",
  "rgba8unorm",
  "rgba8unorm-srgb",
  "rgba8snorm",
  "rgba8uint",
  "rgba8sint",
  "bgra8unorm",
  "bgra8unorm-srgb",
  "rgb9e5ufloat",
  "rgb10a2uint",
  "rgb10a2unorm",
  "rg11b10ufloat",
  "rg32uint",
  "rg32sint",
  "rg32float",
  "rgba16uint",
  "rgba16sint",
  "rgba16float",
  "rgba32uint",
  "rgba32sint",
  "rgba32float",
  "stencil8",
  "depth16unorm",
  "depth24plus",
  "depth24plus-stencil8",
  "depth32float",
  "depth32float-stencil8",
  "bc1-rgba-unorm",
  "bc1-rgba-unorm-srgb",
  "bc2-rgba-unorm",
  "bc2-rgba-unorm-srgb",
  "bc3-rgba-unorm",
  "bc3-rgba-unorm-srgb",
  "bc4-r-unorm",
  "bc4-r-snorm",
  "bc5-rg-unorm",
  "bc5-rg-snorm",
  "bc6h-rgb-ufloat",
  "bc6h-rgb-float",
  "bc7-rgba-unorm",
  "bc7-rgba-unorm-srgb",
  "etc2-rgb8unorm",
  "etc2-rgb8unorm-srgb",
  "etc2-rgb8a1unorm",
  "etc2-rgb8a1unorm-srgb",
  "etc2-rgba8unorm",
  "etc2-rgba8unorm-srgb",
  "eac-r11unorm",
  "eac-r11snorm",
  "eac-rg11unorm",
  "eac-rg11snorm",
  "astc-4x4-unorm",
  "astc-4x4-unorm-srgb",
  "astc-5x4-unorm",
  "astc-5x4-unorm-srgb",
  "astc-5x5-unorm",
  "astc-5x5-unorm-srgb",
  "astc-6x5-unorm",
  "astc-6x5-unorm-srgb",
  "astc-6x6-unorm",
  "astc-6x6-unorm-srgb",
  "astc-8x5-unorm",
  "astc-8x5-unorm-srgb",
  "astc-8x6-unorm",
  "astc-8x6-unorm-srgb",
  "astc-8x8-unorm",
  "astc-8x8-unorm-srgb",
  "astc-10x5-unorm",
  "astc-10x5-unorm-srgb",
  "astc-10x6-unorm",
  "astc-10x6-unorm-srgb",
  "astc-10x8-unorm",
  "astc-10x8-unorm-srgb",
  "astc-10x10-unorm",
  "astc-10x10-unorm-srgb",
  "astc-12x10-unorm",
  "astc-12x10-unorm-srgb",
  "astc-12x12-unorm",
  "astc-12x12-unorm-srgb",
];

const __wbindgen_enum_GpuTextureSampleType = [
  "float",
  "unfilterable-float",
  "depth",
  "sint",
  "uint",
];

const __wbindgen_enum_GpuTextureViewDimension = [
  "1d",
  "2d",
  "2d-array",
  "cube",
  "cube-array",
  "3d",
];

