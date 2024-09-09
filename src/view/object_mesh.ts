import { vec2, vec3 } from "gl-matrix";

export class ObjectMesh {

    buffer!: GPUBuffer
    bufferLayout!: GPUVertexBufferLayout

    // Waveform .obj parameters
    v: vec3[]
    vt: vec2[]
    vn: vec3[]
    vertices: Float32Array
    vertexCount: number = 0

    constructor() {
        this.v = []
        this.vt = []
        this.vn = []
        this.vertices = new Float32Array()
    }

    async initialize(device: GPUDevice, file_path: string) {

        await this.read_file(file_path);
        this.vertexCount = this.vertices.length / 5;

       const usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;

       const descriptor: GPUBufferDescriptor = {
           size: this.vertices.byteLength,
           usage: usage,
           mappedAtCreation: true
       };

       this.buffer = device.createBuffer(descriptor);
       new Float32Array(this.buffer.getMappedRange()).set(this.vertices);
       this.buffer.unmap();


       this.bufferLayout = {
           arrayStride: 5 * 4,
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
                   format: "float32x2"
               }
           ]
       }
    }

    async read_file(file_path: string) {

        var result: number[] = [];

        const response: Response = await fetch(file_path);
        const blob: Blob = await response.blob();
        const file_contents = (await blob.text());
        const lines = file_contents.split("\n");

        lines.forEach(
            (line) => {
                const identifiers = line.slice(0, 2).split('');

                if (identifiers[0] == 'v' && identifiers[1] == ' ') {
                    this.read_vertex_line(line);
                } else if (identifiers[0] == 'v' && identifiers[1] == 't') {
                    this.read_texcoord_line(line);
                } else if (identifiers[0] == 'v' && identifiers[1] == 'n') {
                    this.read_normal_line(line);
                } else if (identifiers[0] == 'f') {
                    this.read_face_line(line, result);
                }
            }
        )

        this.vertices = new Float32Array(result);

    }

    read_vertex_line(line: string) {
        const components = line.split(' ');
        // v float, float, float 
        const new_vertex: vec3 = [
            Number(components[1]).valueOf(),
            Number(components[2]).valueOf(),
            Number(components[3]).valueOf(),
        ]

        this.v.push(new_vertex);
    }

    read_texcoord_line(line: string) {
        const components = line.split(' ');
        // vt float, float
        const new_texcoord: vec2 = [
            Number(components[1]).valueOf(),
            Number(components[2]).valueOf(),
        ]

        this.vt.push(new_texcoord);
    }

    read_normal_line(line: string) {
        const components = line.split(' ');
        // vn float, float, float 
        const new_normal: vec3 = [
            Number(components[1]).valueOf(),
            Number(components[2]).valueOf(),
            Number(components[3]).valueOf(),
        ]

        this.vn.push(new_normal);
    }

    read_face_line(line: string, result: number[]) {
        line = line.replace("\n", "");
        const polygon_description = line.split(' ');
        // f vertex, vertex, ...
        const triangle_count = polygon_description.length - 3;

        for ( var i = 0; i < triangle_count; i++) {
            this.read_face_vertex(polygon_description[1], result); //x 
            this.read_face_vertex(polygon_description[2 + i], result); // y
            this.read_face_vertex(polygon_description[3 + i], result); // z 
        }
    }

    read_face_vertex(vertex: string, result: number[]) {
        const components = vertex.split("/");

        const v = this.v[Number(components[0]).valueOf() - 1];
        const vt = this.vt[Number(components[1]).valueOf() - 1]; // 1-indexed so we gotta subtract 1

        result.push(v[0]);
        result.push(v[1]);
        result.push(v[2]);

        result.push(vt[0]);
        result.push(vt[1]);
    }

}