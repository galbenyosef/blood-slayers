// Procedural effects: flames, loot beams, ground rings, shockwaves, soft particles, globes, slashes.

#import bevy_pbr::{
    forward_io::VertexOutput,
    mesh_view_bindings::{globals, view},
}

@group(#{MATERIAL_BIND_GROUP}) @binding(0) var<uniform> color: vec4<f32>;
@group(#{MATERIAL_BIND_GROUP}) @binding(1) var<uniform> params: vec4<f32>;

fn hash2(p: vec2<f32>) -> f32 {
    let h = dot(p, vec2<f32>(127.1, 311.7));
    return fract(sin(h) * 43758.5453123);
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
    for (var i = 0; i < 4; i++) {
        v += a * noise2(q);
        q = q * 2.03 + vec2(1.7, 9.2);
        a *= 0.5;
    }
    return v;
}

fn flame(uv: vec2<f32>, t: f32, seed: f32) -> vec4<f32> {
    let y = 1.0 - uv.y;            // 0 at the base
    let x = uv.x - 0.5;
    let n = fbm(vec2<f32>(uv.x * 3.0 + seed, y * 3.0 - t * 2.6));
    let n2 = noise2(vec2<f32>(uv.x * 7.0 - seed, y * 6.0 - t * 4.5));
    let xd = x + (n - 0.5) * 0.32 * y + (n2 - 0.5) * 0.08;
    let width = 0.36 * pow(max(1.0 - y, 0.0), 0.75) * (0.75 + 0.25 * n);
    let body = smoothstep(width, width * 0.2, abs(xd)) * smoothstep(0.0, 0.08, y);
    let fade = smoothstep(1.0, 0.25 + 0.3 * n, y);
    let core = smoothstep(width * 0.6, 0.0, abs(xd)) * smoothstep(0.65, 0.0, y);
    let a = clamp(body * fade, 0.0, 1.0);
    let hot = vec3<f32>(1.0, 0.82, 0.45);
    let mid = vec3<f32>(1.0, 0.38, 0.06);
    let cool = vec3<f32>(0.55, 0.06, 0.02);
    var c = mix(cool, mid, smoothstep(0.0, 0.5, a));
    c = mix(c, hot, core);
    return vec4<f32>(c * a * (1.0 + core * 1.5), a);
}

@fragment
fn fragment(in: VertexOutput) -> @location(0) vec4<f32> {
    let mode = i32(params.x + 0.5);
    let t = globals.time;
    let uv = in.uv;
    var out = vec4<f32>(0.0);

    if (mode == 0) {
        // Flame
        let f = flame(uv, t, params.y);
        if (params.w > 0.5) {
            // Witch-fire: the same flame, recoloured to the tint, with a pale hot heart.
            let lum = dot(f.rgb, vec3<f32>(0.4, 0.45, 0.15));
            let heart = vec3<f32>(lum * lum) * (color.r + color.g + color.b) * 0.22;
            out = vec4<f32>(color.rgb * lum * 1.7 + heart, f.a * color.a);
        } else {
            out = vec4<f32>(f.rgb * color.rgb, f.a * color.a);
        }
    } else if (mode == 1) {
        // Loot beam: vertical soft column with rising streaks
        let x = abs(uv.x - 0.5) * 2.0;
        let y = 1.0 - uv.y;
        let col = pow(max(1.0 - x, 0.0), 2.2);
        let streak = 0.6 + 0.4 * noise2(vec2<f32>(uv.x * 6.0, y * 3.0 - t * 1.5));
        let fade = pow(max(1.0 - y, 0.0), 1.6) * smoothstep(0.0, 0.03, y);
        let a = col * fade * streak;
        out = vec4<f32>(color.rgb * a, a * color.a);
    } else if (mode == 2) {
        // Ground ring (selection / elite marker / telegraph). params.z = fill progress
        let c = uv - vec2<f32>(0.5);
        let r = length(c) * 2.0;
        let ring = smoothstep(0.06, 0.0, abs(r - 0.86)) ;
        let pulse = 0.75 + 0.25 * sin(t * 4.0 + params.y);
        let fill = smoothstep(params.z + 0.02, params.z - 0.02, r) * 0.35 * step(0.001, params.z);
        let inner = smoothstep(0.86, 0.3, r) * 0.08;
        let a = (ring * pulse + fill + inner) * step(r, 1.0);
        out = vec4<f32>(color.rgb * a, a * color.a);
    } else if (mode == 3) {
        // Expanding shockwave; params.z = progress 0..1
        let c = uv - vec2<f32>(0.5);
        let r = length(c) * 2.0;
        let p = params.z;
        let w = 0.08 + 0.1 * p;
        let ring = smoothstep(w, 0.0, abs(r - p));
        let n = 0.7 + 0.3 * noise2(normalize(c + vec2(1e-4)) * 6.0 + vec2(t));
        let a = ring * n * (1.0 - p) * step(r, 1.0);
        out = vec4<f32>(color.rgb * a, a * color.a);
    } else if (mode == 4) {
        // Soft round particle
        let r = length(uv - vec2<f32>(0.5)) * 2.0;
        let a = pow(max(1.0 - r, 0.0), 1.8);
        out = vec4<f32>(color.rgb * a, a * color.a);
    } else if (mode == 5) {
        // Glowing globe (health globes): fresnel + swirling interior
        let n = normalize(in.world_normal);
        let v = normalize(view.world_position.xyz - in.world_position.xyz);
        let fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.0);
        let sw = fbm(in.world_position.xz * 3.0 + vec2<f32>(t * 0.7, -t * 0.4) + n.xy * 2.0);
        let a = clamp(0.35 + fres * 0.9 + sw * 0.4, 0.0, 1.0);
        out = vec4<f32>(color.rgb * (0.4 + fres * 1.5 + sw * 0.8), a * color.a);
    } else if (mode == 6) {
        // Slash arc on the ground: params.z = progress, params.w = arc half-angle
        let c = uv - vec2<f32>(0.5);
        let r = length(c) * 2.0;
        let ang = abs(atan2(c.x, -c.y));
        let p = params.z;
        let sweep = smoothstep(params.w, params.w * 0.6, ang);
        let band = smoothstep(0.45, 0.75, r) * smoothstep(1.0, 0.9, r);
        let streak = 0.6 + 0.4 * noise2(vec2<f32>(r * 12.0, ang * 4.0 - p * 10.0));
        let a = sweep * band * streak * (1.0 - p) * (1.0 - p);
        out = vec4<f32>(color.rgb * a, a * color.a);
    }
    return out;
}
