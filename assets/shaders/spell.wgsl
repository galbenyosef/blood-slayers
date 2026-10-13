// Sorcerer spell effects, all procedural and HDR (values above 1 feed the bloom):
//   0 arcane orb      1 fireball        2 explosion      3 lightning bolt
//   4 frost nova ring 5 frost decal     6 blink vortex   7 streak/trail
// params  = (mode, seed, progress 0..1, extra)
// params2 = (aspect / length, intensity scale, unused, unused)

#import bevy_pbr::{
    forward_io::VertexOutput,
    mesh_view_bindings::globals,
}

@group(#{MATERIAL_BIND_GROUP}) @binding(0) var<uniform> color_a: vec4<f32>;
@group(#{MATERIAL_BIND_GROUP}) @binding(1) var<uniform> color_b: vec4<f32>;
@group(#{MATERIAL_BIND_GROUP}) @binding(2) var<uniform> params: vec4<f32>;
@group(#{MATERIAL_BIND_GROUP}) @binding(3) var<uniform> params2: vec4<f32>;

const PI: f32 = 3.14159265;

fn hash1(x: f32) -> f32 {
    return fract(sin(x * 127.1 + 31.7) * 43758.5453);
}

fn hash2(p: vec2<f32>) -> f32 {
    return fract(sin(dot(p, vec2<f32>(127.1, 311.7))) * 43758.5453123);
}

fn noise2(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
}

fn fbm(p: vec2<f32>) -> f32 {
    var v = 0.0;
    var a = 0.5;
    var q = p;
    for (var i = 0; i < 5; i++) {
        v += a * noise2(q);
        q = q * 2.07 + vec2(1.7, 9.2);
        a *= 0.5;
    }
    return v;
}

// Ridged noise: sharp crests (ice cracks, energy filaments).
fn ridged(p: vec2<f32>) -> f32 {
    var v = 0.0;
    var a = 0.6;
    var q = p;
    for (var i = 0; i < 4; i++) {
        v += a * (1.0 - abs(noise2(q) * 2.0 - 1.0));
        q = q * 2.13 + vec2(5.1, 1.3);
        a *= 0.5;
    }
    return v;
}

// Piecewise-linear 1D noise: jagged, like a lightning path.
fn jag(x: f32, seed: f32) -> f32 {
    let i = floor(x);
    let f = fract(x);
    return mix(hash1(i + seed * 17.0), hash1(i + 1.0 + seed * 17.0), f) * 2.0 - 1.0;
}

fn arcane_orb(uv: vec2<f32>, t: f32, seed: f32) -> vec4<f32> {
    let p = uv * 2.0 - 1.0;
    let r = length(p);
    let a = atan2(p.y, p.x);
    let core = exp(-r * r * 22.0);
    let glow = exp(-r * 3.4);
    let spiral = pow(0.5 + 0.5 * sin(a * 3.0 + r * 14.0 - t * 16.0 + seed * 6.0), 6.0);
    let filaments = ridged(p * 3.5 + vec2(t * 2.3, -t * 1.7) + seed) * smoothstep(1.0, 0.25, r);
    let rgb = color_a.rgb * (core * 5.0 + glow * 0.9) + color_b.rgb * (spiral * smoothstep(0.95, 0.2, r) * 1.6 + filaments * 0.5);
    let alpha = clamp(core + glow * 0.8 + spiral * 0.3, 0.0, 1.0) * smoothstep(1.0, 0.7, r);
    return vec4<f32>(rgb * alpha, alpha);
}

fn fireball(uv: vec2<f32>, t: f32, seed: f32) -> vec4<f32> {
    let p = uv * 2.0 - 1.0;
    let r = length(p);
    let a = atan2(p.y, p.x);
    // Boiling surface plus flame tongues licking outward.
    let boil = fbm(p * 2.6 + vec2(t * 1.9 + seed, -t * 2.7));
    let tongues = fbm(vec2(a * 2.2 + seed, r * 3.0 - t * 5.0));
    let edge = 0.5 + (boil - 0.5) * 0.35 + tongues * 0.28;
    let body = smoothstep(edge, edge - 0.22, r);
    let heat = clamp(1.0 - r / max(edge, 0.05), 0.0, 1.0);
    let white = vec3<f32>(1.0, 0.96, 0.82);
    var c = mix(color_b.rgb, color_a.rgb, smoothstep(0.0, 0.55, heat));
    c = mix(c, white * 2.0, smoothstep(0.55, 0.95, heat));
    let rgb = c * (0.6 + heat * heat * 4.5) * (0.85 + 0.3 * boil);
    let halo = exp(-r * 2.6) * 0.35;
    let alpha = clamp(body + halo, 0.0, 1.0);
    return vec4<f32>(rgb * body + color_a.rgb * halo, alpha);
}

fn explosion(uv: vec2<f32>, t: f32, seed: f32, prog: f32) -> vec4<f32> {
    let p = uv * 2.0 - 1.0;
    let r = length(p);
    let a = atan2(p.y, p.x);
    let e = 1.0 - pow(1.0 - prog, 3.0);
    let rad = mix(0.18, 1.0, e);
    let n = fbm(vec2(a * 2.6 + seed, r * 2.0 - prog * 3.0) + p * 1.5);
    let shell = smoothstep(rad + (n - 0.5) * 0.35, rad - 0.35 + (n - 0.5) * 0.35, r);
    let hot = pow(1.0 - prog, 2.2);
    let heat = clamp(1.0 - r / rad, 0.0, 1.0);
    let white = vec3<f32>(1.0, 0.95, 0.8);
    var c = mix(color_b.rgb * 0.35, color_b.rgb, hot);
    c = mix(c, color_a.rgb, heat * hot);
    c = mix(c, white * 3.0, smoothstep(0.6, 1.0, heat) * hot * hot);
    let ring = smoothstep(0.06, 0.0, abs(r - rad * 1.05)) * hot * 1.5;
    let alpha = clamp(shell * (1.0 - prog * 0.9) + ring, 0.0, 1.0);
    return vec4<f32>(c * shell * (0.4 + 3.5 * hot) * (1.0 - prog * 0.6) + color_a.rgb * ring * 2.0, alpha);
}

fn lightning(uv: vec2<f32>, t: f32, seed: f32, len: f32) -> vec4<f32> {
    let x = uv.x;
    let y = uv.y - 0.5;
    // A new bolt shape ~24 times a second; endpoints stay pinned.
    let flick = floor(t * 24.0) + seed * 13.0;
    let pin = pow(sin(PI * clamp(x, 0.0, 1.0)), 0.6);
    let f = len * 2.5;
    let path = (jag(x * f, flick) * 0.6 + jag(x * f * 2.7, flick + 3.1) * 0.28 + jag(x * f * 7.1, flick + 7.7) * 0.12) * 0.32 * pin;
    let d = abs(y - path);
    let core = exp(-d * d * 1400.0);
    let glow = exp(-d * 9.0) * 0.6;
    // A side branch that wanders off and fades.
    let bx = clamp((x - hash1(flick) * 0.6) * 3.0, 0.0, 1.0);
    let branch_path = path + bx * (jag(x * f * 3.0, flick + 11.0) * 0.25 + 0.12 * sign(hash1(flick + 2.0) - 0.5));
    let bd = abs(y - branch_path);
    let branch = exp(-bd * bd * 2500.0) * (1.0 - bx) * step(0.001, bx) * 0.8;
    let strobe = 0.65 + 0.35 * hash1(floor(t * 40.0) + seed);
    let white = vec3<f32>(1.0, 1.0, 1.0);
    let rgb = (white * (core + branch) * 6.0 + color_a.rgb * (glow + branch * 0.5) * 2.5) * strobe;
    let alpha = clamp(core + glow + branch, 0.0, 1.0) * strobe;
    return vec4<f32>(rgb, alpha);
}

fn frost_ring(uv: vec2<f32>, t: f32, seed: f32, prog: f32) -> vec4<f32> {
    let p = uv * 2.0 - 1.0;
    let r = length(p);
    let a = atan2(p.y, p.x);
    let e = 1.0 - pow(1.0 - prog, 2.5);
    let rad = e * 0.95;
    // Crystalline spikes on the leading edge.
    let spikes = pow(abs(sin(a * 13.0 + seed * 5.0)), 10.0) * 0.18 + pow(abs(sin(a * 31.0 + seed)), 16.0) * 0.08;
    let front = smoothstep(0.1, 0.0, abs(r - rad)) + smoothstep(rad + spikes, rad, r) * step(rad, r) * 1.2;
    let cracks = smoothstep(0.75, 1.0, ridged(p * 6.0 + seed)) * smoothstep(rad, rad * 0.3, r);
    let frost = smoothstep(rad, 0.0, r) * (0.25 + 0.5 * fbm(p * 7.0 + seed));
    let fade = 1.0 - prog;
    let white = vec3<f32>(0.9, 0.97, 1.0);
    let rgb = (white * front * 3.5 + color_a.rgb * (cracks * 2.0 + frost * 0.8) + color_b.rgb * front * 1.5) * fade;
    let alpha = clamp(front + cracks + frost * 0.6, 0.0, 1.0) * fade * step(r, 1.0);
    return vec4<f32>(rgb, alpha);
}

fn frost_decal(uv: vec2<f32>, t: f32, seed: f32, prog: f32) -> vec4<f32> {
    let p = uv * 2.0 - 1.0;
    let r = length(p);
    // A ragged patch that thins toward its edge, with crystalline cracks inside it.
    let frost_patch = smoothstep(0.95, 0.35, r + (fbm(p * 2.5 + seed) - 0.5) * 0.5);
    let cracks = smoothstep(0.82, 1.0, ridged(p * 7.0 + seed * 3.0)) * frost_patch;
    // Sparse round glints.
    let cell = p * 26.0;
    let id = floor(cell);
    let glint = step(0.97, hash2(id + seed)) * smoothstep(0.32, 0.0, length(fract(cell) - 0.5)) * (0.5 + 0.5 * sin(t * 6.0 + hash2(id) * 40.0));
    let fade = 1.0 - smoothstep(0.35, 1.0, prog);
    let rgb = color_a.rgb * (frost_patch * 0.12 + cracks * 0.45 + glint * frost_patch * 1.5) * fade;
    let alpha = clamp(frost_patch * 0.22 + cracks * 0.5, 0.0, 1.0) * fade;
    return vec4<f32>(rgb, alpha);
}

fn vortex(uv: vec2<f32>, t: f32, seed: f32, prog: f32) -> vec4<f32> {
    let p = uv * 2.0 - 1.0;
    let r = length(p);
    let a = atan2(p.y, p.x);
    let dir = select(-1.0, 1.0, params.w > 0.5); // extra: 1 = burst outward, 0 = implode
    let rad = select(1.0 - prog, prog, params.w > 0.5);
    let arms = pow(0.5 + 0.5 * sin(a * 4.0 + r * 10.0 * dir - t * 18.0 + seed), 3.0);
    let band = smoothstep(0.35, 0.0, abs(r - rad * 0.9));
    let core = exp(-r * r * 30.0) * (1.0 - prog);
    let fade = 1.0 - prog;
    let rgb = (color_a.rgb * arms * band * 3.0 + color_b.rgb * band * 1.2 + vec3(1.0) * core * 4.0) * fade;
    let alpha = clamp(arms * band + core, 0.0, 1.0) * fade * smoothstep(1.0, 0.8, r);
    return vec4<f32>(rgb, alpha);
}

fn streak(uv: vec2<f32>, t: f32, seed: f32) -> vec4<f32> {
    let x = uv.x;           // 0 = tail, 1 = head
    let d = abs(uv.y - 0.5);
    let w = mix(0.04, 0.42, x * x);
    let body = exp(-(d / w) * (d / w) * 3.0) * pow(x, 1.6);
    let n = 0.7 + 0.3 * noise2(vec2(x * 9.0 - t * 22.0, uv.y * 4.0 + seed));
    let rgb = (color_a.rgb * 1.5 + color_b.rgb * (1.0 - x)) * body * n * 2.0;
    return vec4<f32>(rgb, clamp(body * n, 0.0, 1.0));
}

@fragment
fn fragment(in: VertexOutput) -> @location(0) vec4<f32> {
    let mode = i32(params.x + 0.5);
    let seed = params.y;
    let prog = params.z;
    let t = globals.time;
    let uv = in.uv;
    var out = vec4<f32>(0.0);
    if (mode == 0) {
        out = arcane_orb(uv, t, seed);
    } else if (mode == 1) {
        out = fireball(uv, t, seed);
    } else if (mode == 2) {
        out = explosion(uv, t, seed, prog);
    } else if (mode == 3) {
        out = lightning(uv, t, seed, max(params2.x, 0.5));
    } else if (mode == 4) {
        out = frost_ring(uv, t, seed, prog);
    } else if (mode == 5) {
        out = frost_decal(uv, t, seed, prog);
    } else if (mode == 6) {
        out = vortex(uv, t, seed, prog);
    } else if (mode == 7) {
        out = streak(uv, t, seed);
    }
    let k = max(params2.y, 0.0);
    return vec4<f32>(out.rgb * k * color_a.a, out.a * color_a.a);
}
