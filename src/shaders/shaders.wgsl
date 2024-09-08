struct TransformData {
    model: mat4x4<f32>,
    view: mat4x4<f32>,
    projection: mat4x4<f32>
};
@binding(0) @group(0) var<uniform> transformUBO: TransformData; // UBO = uniform buffer object

struct FragmentOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) Color: vec4<f32>
};

@vertex
fn vs_main(@location(0) vertexPositions: vec3<f32>, @location(1) vertexColors: vec3<f32>) -> FragmentOutput {
    var output: FragmentOutput;
    output.Position = transformUBO.projection * transformUBO.view * transformUBO.model * vec4<f32>(vertexPositions, 1.0);
    output.Color = vec4<f32>(vertexColors, 1.0);

    return output;
}

@fragment
fn fs_main(@location(0) Color: vec4<f32>) -> @location(0) vec4<f32> {
    return Color;
}