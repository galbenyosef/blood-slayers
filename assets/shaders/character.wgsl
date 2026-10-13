// Character material: standard PBR + fresnel rim light, hit flash and a burning dissolve.

#import bevy_pbr::{
    pbr_fragment::pbr_input_from_standard_material,
    pbr_functions::alpha_discard,
}

#ifdef PREPASS_PIPELINE
#import bevy_pbr::{
    prepass_io::{VertexOutput, FragmentOutput},
    pbr_deferred_functions::deferred_output,
}
#else
#import bevy_pbr::{
    forward_io::{VertexOutput, FragmentOutput},
    pbr_functions::{apply_pbr_lighting, main_pass_post_lighting_processing},
}
#endif

@group(#{MATERIAL_BIND_GROUP}) @binding(100) var<uniform> flash: vec4<f32>;
@group(#{MATERIAL_BIND_GROUP}) @binding(101) var<uniform> rim: vec4<f32>;
@group(#{MATERIAL_BIND_GROUP}) @binding(102) var<uniform> dissolve: vec4<f32>;
@group(#{MATERIAL_BIND_GROUP}) @binding(103) var<uniform> edge: vec4<f32>;

fn hash3(p: vec3<f32>) -> f32 {
    var q = fract(p * 0.3183099 + vec3<f32>(0.71, 0.113, 0.419));
    q *= 17.0;
    return fract(q.x * q.y * q.z * (q.x + q.y + q.z));
}

fn noise3(x: vec3<f32>) -> f32 {
    let i = floor(x);
    let f = fract(x);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(hash3(i + vec3(0.0, 0.0, 0.0)), hash3(i + vec3(1.0, 0.0, 0.0)), u.x),
            mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), u.x), u.y),
        mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), u.x),
            mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), u.x), u.y),
        u.z);
}

@fragment
fn fragment(
    in: VertexOutput,
    @builtin(front_facing) is_front: bool,
) -> FragmentOutput {
    var pbr_input = pbr_input_from_standard_material(in, is_front);
    pbr_input.material.base_color = alpha_discard(pbr_input.material, pbr_input.material.base_color);

    // Burning dissolve, driven by world-space noise biased upwards so bodies burn away top-down.
    var edge_amt = 0.0;
    if (dissolve.x > 0.0) {
        let wp = in.world_position.xyz;
        let n = noise3(wp * 2.7) * 0.65 + noise3(wp * 8.0) * 0.35;
        let v = n * 0.85 + 0.15 * clamp(1.0 - wp.y * dissolve.z, 0.0, 1.0);
        if (v < dissolve.x) {
            discard;
        }
        edge_amt = 1.0 - smoothstep(0.0, dissolve.y, v - dissolve.x);
    }

#ifdef PREPASS_PIPELINE
    let out = deferred_output(in, pbr_input);
#else
    var out: FragmentOutput;
    out.color = apply_pbr_lighting(pbr_input);

    let n = normalize(pbr_input.N);
    let v = normalize(pbr_input.V);
    let fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);
    out.color = vec4<f32>(out.color.rgb + rim.rgb * rim.a * fres, out.color.a);
    out.color = vec4<f32>(mix(out.color.rgb, flash.rgb, clamp(flash.a, 0.0, 1.0)), out.color.a);
    out.color = vec4<f32>(out.color.rgb + edge.rgb * edge_amt * 3.0, out.color.a);

    out.color = main_pass_post_lighting_processing(pbr_input, out.color);
#endif
    return out;
}
