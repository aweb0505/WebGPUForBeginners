struct TransformData {
    view: mat4x4<f32>,
    projection: mat4x4<f32>
};


struct ObjectData {
    model: array<mat4x4<f32>>,
};

// Frame binding group
@binding(0) @group(0) var<uniform> transformUBO: TransformData; // UBO = uniform buffer object
@binding(1) @group(0) var<storage, read> objects: ObjectData;

// Material binding group
@binding(0) @group(1) var myTexture: texture_2d<f32>;
@binding(1) @group(1) var mySampler: sampler;

struct FragmentOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) TexCoord: vec2<f32>
};

@vertex
fn vs_main(
    @builtin(instance_index) ID: u32,
    @location(0) vertexPositions: vec3<f32>, 
    @location(1) vertexTexCoord: vec2<f32>) -> FragmentOutput {
    var output: FragmentOutput;
    output.Position = transformUBO.projection * transformUBO.view * objects.model[ID] * vec4<f32>(vertexPositions, 1.0);
    output.TexCoord = vertexTexCoord;

    return output;
}

@fragment
fn fs_main(@location(0) TexCoord: vec2<f32>) -> @location(0) vec4<f32> {
    return textureSample(myTexture, mySampler, TexCoord);
}