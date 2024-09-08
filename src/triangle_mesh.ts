export class TriangleMesh {

    buffer: GPUBuffer
    bufferLayout: GPUVertexBufferLayout

    constructor(device: GPUDevice) {
        // x y r g b
       const vertices: Float32Array = new Float32Array([
           0.0, 0.0, 0.5, 1.0, 0.0, 0.0,
           0.0, -0.5, -0.5, 0.0, 1.0, 0.0,
           0.0, 0.5, -0.5, 0.0, 0.0, 1.0
       ]) 

       const usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;

       const descriptor: GPUBufferDescriptor = {
           size: vertices.byteLength,
           usage: usage,
           mappedAtCreation: true
       };

       this.buffer = device.createBuffer(descriptor);
       new Float32Array(this.buffer.getMappedRange()).set(vertices);
       this.buffer.unmap();


       this.bufferLayout = {
           arrayStride: 6 * 4,
           attributes: [
               {
                // position
                   shaderLocation: 0,
                   offset: 0,
                   format: "float32x3"
               },
               {
                // color
                   shaderLocation: 1,
                   offset: 3 * 4,
                   format: "float32x3"
               }
           ]
       }
    }

}