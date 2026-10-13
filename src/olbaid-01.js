// olbaid 01 — the
// Lines 1-200 of readable/olbaid.pretty.js (statement-aligned).
import {
  olbaid_store_get,
  olbaid_store_set,
  olbaid_url_param,
  wavedash_achievement,
} from "./snippets/olbaid-abdb8433e54eccc9/inline0.js";
import {
  olbaid_net_friends,
  olbaid_net_host_id,
  olbaid_net_invite,
  olbaid_net_join,
  olbaid_net_poll_event,
  olbaid_net_presence,
  olbaid_net_quick_play,
  olbaid_net_recv,
  olbaid_net_send,
  olbaid_net_set_in_game,
  olbaid_net_set_meta,
  olbaid_net_start,
} from "./snippets/olbaid-abdb8433e54eccc9/web/olbaid_net.js";
import {
  olbaid_save_data,
  olbaid_save_write,
} from "./snippets/olbaid-abdb8433e54eccc9/web/olbaid_save.js";
import * as import1 from "./snippets/olbaid-abdb8433e54eccc9/inline0.js";
import * as import2 from "./snippets/olbaid-abdb8433e54eccc9/inline0.js";
import * as import3 from "./snippets/olbaid-abdb8433e54eccc9/web/olbaid_net.js";
import * as import4 from "./snippets/olbaid-abdb8433e54eccc9/web/olbaid_net.js";
import * as import5 from "./snippets/olbaid-abdb8433e54eccc9/web/olbaid_net.js";
import * as import6 from "./snippets/olbaid-abdb8433e54eccc9/inline0.js";
import * as import7 from "./snippets/olbaid-abdb8433e54eccc9/web/olbaid_save.js";
import * as import8 from "./snippets/olbaid-abdb8433e54eccc9/web/olbaid_save.js";
import * as import9 from "./snippets/olbaid-abdb8433e54eccc9/web/olbaid_save.js";
import * as import10 from "./snippets/olbaid-abdb8433e54eccc9/web/olbaid_net.js";
import * as import11 from "./snippets/olbaid-abdb8433e54eccc9/inline0.js";

/**
 * Format that each sample has. Usually, this corresponds to the sampling
 * depth of the audio source. For example, 16 bit quantized samples can be
 * encoded in `i16` or `u16`. Note that the quantized sampling depth is not
 * directly visible for formats where [`is_float`] is true.
 *
 * Also note that the backend must support the encoding of the quantized
 * samples in the given format, as there is no generic transformation from one
 * format into the other done inside the frontend-library code. You can query
 * the supported formats by using [`supported_input_configs`].
 *
 * A good rule of thumb is to use [`SampleFormat::I16`] as this covers typical
 * music (WAV, MP3) as well as typical audio input devices on most platforms,
 *
 * [`is_float`]: SampleFormat::is_float
 * [`supported_input_configs`]: crate::traits::DeviceTrait::supported_input_configs
 * @enum {0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14}
 */
export const SampleFormat = Object.freeze({
  /**
   * `i8` with a valid range of `i8::MIN..=i8::MAX` with `0` being the origin.
   */
  I8: 0,
  0: "I8",
  /**
   * `i16` with a valid range of `i16::MIN..=i16::MAX` with `0` being the origin.
   */
  I16: 1,
  1: "I16",
  /**
   * `I24` with a valid range of `-(1 << 23)..=((1 << 23) - 1)` with `0` being the origin.
   *
   * This format uses 4 bytes of storage but only 24 bits are significant.
   */
  I24: 2,
  2: "I24",
  /**
   * `i32` with a valid range of `i32::MIN..=i32::MAX` with `0` being the origin.
   */
  I32: 3,
  3: "I32",
  /**
   * `i64` with a valid range of `i64::MIN..=i64::MAX` with `0` being the origin.
   */
  I64: 4,
  4: "I64",
  /**
   * `u8` with a valid range of `u8::MIN..=u8::MAX` with `1 << 7 == 128` being the origin.
   */
  U8: 5,
  5: "U8",
  /**
   * `u16` with a valid range of `u16::MIN..=u16::MAX` with `1 << 15 == 32768` being the origin.
   */
  U16: 6,
  6: "U16",
  /**
   * `U24` with a valid range of `0..=((1 << 24) - 1)` with `1 << 23 == 8388608` being the origin.
   *
   * This format uses 4 bytes of storage but only 24 bits are significant.
   */
  U24: 7,
  7: "U24",
  /**
   * `u32` with a valid range of `u32::MIN..=u32::MAX` with `1 << 31` being the origin.
   */
  U32: 8,
  8: "U32",
  /**
   * `U48` with a valid range of '0..(1 << 48)' with `1 << 47` being the origin
   * `u64` with a valid range of `u64::MIN..=u64::MAX` with `1 << 63` being the origin.
   */
  U64: 9,
  9: "U64",
  /**
   * `f32` with a valid range of `-1.0..=1.0` with `0.0` being the origin.
   */
  F32: 10,
  10: "F32",
  /**
   * `f64` with a valid range of `-1.0..=1.0` with `0.0` being the origin.
   */
  F64: 11,
  11: "F64",
  /**
   * DSD 1-bit stream in u8 container (8 bits = 8 DSD samples) with 0x69 being the silence byte pattern.
   */
  DsdU8: 12,
  12: "DsdU8",
  /**
   * DSD 1-bit stream in u16 container (16 bits = 16 DSD samples) with 0x69 being the silence byte pattern.
   */
  DsdU16: 13,
  13: "DsdU16",
  /**
   * DSD 1-bit stream in u32 container (32 bits = 32 DSD samples) with 0x69 being the silence byte pattern.
   */
  DsdU32: 14,
  14: "DsdU32",
});

/**
 * The set of parameters used to describe how to open a stream.
 *
 * The sample format is omitted in favour of using a sample type.
 *
 * See also [`BufferSize`] for details on buffer size behavior and latency considerations.
 */
export class StreamConfig {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    StreamConfigFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_streamconfig_free(ptr, 0);
  }
  /**
   * @returns {number | undefined}
   */
  get buffer_size() {
    const ret = wasm.__wbg_get_streamconfig_buffer_size(this.__wbg_ptr);
    return ret === Number.MAX_SAFE_INTEGER ? undefined : ret;
  }
  /**
   * @returns {number}
   */
  get channels() {
    const ret = wasm.__wbg_get_streamconfig_channels(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {number}
   */
  get sample_rate() {
    const ret = wasm.__wbg_get_streamconfig_sample_rate(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @param {number | null} [arg0]
   */
  set buffer_size(arg0) {
    wasm.__wbg_set_streamconfig_buffer_size(
      this.__wbg_ptr,
      isLikeNone(arg0) ? Number.MAX_SAFE_INTEGER : arg0 >>> 0,
    );
  }
  /**
   * @param {number} arg0
   */
  set channels(arg0) {
    wasm.__wbg_set_streamconfig_channels(this.__wbg_ptr, arg0);
  }
  /**
   * @param {number} arg0
   */
  set sample_rate(arg0) {
    wasm.__wbg_set_streamconfig_sample_rate(this.__wbg_ptr, arg0);
  }
}
if (Symbol.dispose)
  StreamConfig.prototype[Symbol.dispose] = StreamConfig.prototype.free;
