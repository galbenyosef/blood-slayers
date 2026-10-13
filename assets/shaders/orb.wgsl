// Liquid resource orb: swirling liquid with a wavy meniscus, dark glass and a highlight.

#import bevy_render::globals::Globals
#import bevy_ui::ui_vertex_output::UiVertexOutput

@group(0) @binding(1) var<uniform> globals: Globals;

@group(1) @binding(0) var<uniform> color_a: vec4<f32>;
@group(1) @binding(1) var<uniform> color_b: vec4<f32>;
@group(1) @binding(2) var<uniform> params: vec4<f32>;

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
        q = q * 2.02 + vec2(3.1, 1.7);
        a *= 0.5;
    }
    return v;
}

@fragment
fn fragment(in: UiVertexOutput) -> @location(0) vec4<f32> {
    let t = globals.time + params.y;
    let c = in.uv - vec2<f32>(0.5);
    let r = length(c) * 2.0;
    if (r > 1.0) {
        discard;
    }
    let fill = clamp(params.x, 0.0, 1.0);
    // Spherical-ish distortion for a sense of volume
    let sph = c * (1.0 + 0.35 * r * r);
    let wave = sin(in.uv.x * 11.0 + t * 2.2) * 0.012 + sin(in.uv.x * 23.0 - t * 3.1) * 0.006;
    let level = 1.0 - fill + wave;
    let depth = in.uv.y - level;

    // Swirling liquid
    let rot = mat2x2<f32>(cos(t * 0.15), -sin(t * 0.15), sin(t * 0.15), cos(t * 0.15));
    let p = rot * sph * 3.0;
    let swirl = fbm(p + vec2<f32>(fbm(p + vec2(t * 0.3, 0.0)), fbm(p - vec2(0.0, t * 0.25))) * 1.6);
    var liquid = mix(color_b.rgb, color_a.rgb, smoothstep(0.25, 0.85, swirl));
    liquid *= mix(1.15, 0.45, clamp(in.uv.y, 0.0, 1.0));          // darker at the bottom
    liquid += color_a.rgb * smoothstep(0.035, 0.0, abs(depth)) * 1.2; // bright meniscus
    let inside = smoothstep(-0.004, 0.004, depth);

    // Empty glass
    var glass = vec3<f32>(0.02, 0.015, 0.02) + color_b.rgb * 0.06 * fbm(sph * 4.0 + vec2(t * 0.05));

    var col = mix(glass, liquid, inside);
    // Rim shading and inner shadow
    col *= mix(1.0, 0.35, smoothstep(0.65, 1.0, r));
    // Hurt pulse
    col += vec3<f32>(1.0, 0.2, 0.1) * params.z * (1.0 - r) * 0.6;
    // Glass highlight
    let hl = c - vec2<f32>(-0.17, -0.22);
    let spec = smoothstep(0.16, 0.0, length(hl * vec2<f32>(1.0, 1.7)));
    col += vec3<f32>(1.0, 0.95, 0.9) * spec * 0.35;
    let a = smoothstep(1.0, 0.97, r);
    return vec4<f32>(col, a);
}
