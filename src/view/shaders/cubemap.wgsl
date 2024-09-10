struct Camera {
    forwards: vec3<f32>,
    right: vec3<f32>,
    up: vec3<f32>
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var cube_map_texture: texture_cube<f32>;
@group(0) @binding(2) var cube_map_sampler: sampler;

struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) direction: vec3<f32>,
}

const positions = array<vec2<f32>, 6>(
    vec2<f32>( 1.0, 1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( -1.0, -1.0),

    vec2<f32>( 1.0, 1.0),
    vec2<f32>( -1.0, -1.0),
    vec2<f32>( -1.0, 1.0),
);

@vertex
fn cubemap_vertex_main(@builtin(vertex_index) VertexIndex: u32) -> VertexOutput {

    var output: VertexOutput;
    output.Position = vec4<f32>(positions[VertexIndex], 1.0, 1.0);
    var x: f32 = positions[VertexIndex].x;
    var y: f32 = positions[VertexIndex].y;

    output.direction = normalize(camera.forwards + x * camera.right + y * camera.up);

    return output;
}

@fragment
fn cubemap_fragment_main(@location(0) direction: vec3<f32>) -> @location(0) vec4<f32> {
    return textureSample(cube_map_texture, cube_map_sampler, direction);
}