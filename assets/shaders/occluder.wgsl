// Environment occluder material: standard PBR, but anything between the camera and the hero
// dissolves smoothly (screen-door dither, resolved by TAA) inside a cone around the hero.
// Shared by the main pass and the depth/normal/motion prepass so no depth holes appear.

#import bevy_pbr::mesh_view_bindings::view

#ifdef PREPASS_PIPELINE
#import bevy_pbr::{
    prepass_io::{VertexOutput, FragmentOutput},
    pbr_prepass_functions::calculate_motion_vector,
}
#else
#import bevy_pbr::{
    forward_io::{VertexOutput, FragmentOutput},
    pbr_fragment::pbr_input_from_standard_material,
    pbr_functions::{alpha_discard, apply_pbr_lighting, main_pass_post_lighting_processing},
}
#endif

// xyz = hero chest position (world), w = effect strength 0..1
@group(#{MATERIAL_BIND_GROUP}) @binding(100) var<uniform> hero: vec4<f32>;
// x = cone radius at the hero, y = cone radius at the camera, z = depth margin, w = unused
@group(#{MATERIAL_BIND_GROUP}) @binding(101) var<uniform> cone: vec4<f32>;

fn ign(p: vec2<f32>) -> f32 {
    return fract(52.9829189 * fract(dot(p, vec2<f32>(0.06711056, 0.00583715))));
}

fn occlusion_fade(world_pos: vec3<f32>) -> f32 {
    if (hero.w <= 0.001) {
        return 0.0;
    }
    let cam = view.world_position;
    let to_hero = hero.xyz - cam;
    let dist_h = length(to_hero);
    let dir = to_hero / dist_h;
    let t = dot(world_pos - cam, dir);
    // Only geometry in front of the hero (towards the camera) fades.
    let depth_fade = 1.0 - smoothstep(dist_h - cone.z - 1.5, dist_h - cone.z, t);
    let k = clamp(t / dist_h, 0.0, 1.0);
    let radius = mix(cone.y, cone.x, k);
    let perp = length(world_pos - (cam + dir * t));
    let radial = 1.0 - smoothstep(radius * 0.55, radius, perp);
    return radial * depth_fade * hero.w;
}

fn dither_discard(world_pos: vec3<f32>, frag: vec2<f32>) {
    let f = occlusion_fade(world_pos) * 0.92;
    if (f > 0.0 && f > ign(frag)) {
        discard;
    }
}

#ifdef PREPASS_PIPELINE
@fragment
fn fragment(in: VertexOutput, @builtin(front_facing) is_front: bool) -> FragmentOutput {
    dither_discard(in.world_position.xyz, in.position.xy);
    var out: FragmentOutput;
#ifdef NORMAL_PREPASS
    out.normal = vec4(normalize(in.world_normal) * 0.5 + vec3(0.5), 1.0);
#endif
#ifdef MOTION_VECTOR_PREPASS
    out.motion_vector = calculate_motion_vector(in.world_position, in.previous_world_position);
#endif
    return out;
}
#else
@fragment
fn fragment(in: VertexOutput, @builtin(front_facing) is_front: bool) -> FragmentOutput {
    dither_discard(in.world_position.xyz, in.position.xy);
    var pbr_input = pbr_input_from_standard_material(in, is_front);
    pbr_input.material.base_color = alpha_discard(pbr_input.material, pbr_input.material.base_color);
    var out: FragmentOutput;
    out.color = apply_pbr_lighting(pbr_input);
    out.color = main_pass_post_lighting_processing(pbr_input, out.color);
    return out;
}
#endif
