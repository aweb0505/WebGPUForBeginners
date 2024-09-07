struct FragmentOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) Color: vec4<f32>
};

@vertex
fn vs_main(@location(0) vertexPositions: vec2<f32>, @location(1) vertexColors: vec3<f32>) -> FragmentOutput {
    var output: FragmentOutput;
    output.Position = vec4<f32>(vertexPositions, 0.0, 1.0);
    output.Color = vec4<f32>(vertexColors, 1.0);

    return output;
}

@fragment
fn fs_main(@location(0) Color: vec4<f32>) -> @location(0) vec4<f32> {
    return Color;
}