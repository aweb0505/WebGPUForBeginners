import { vec3 } from "gl-matrix"

// This is a material definition that is defined by a .mtl file
export class MtlMaterial {
    Ns: number
    Ka: vec3
    Kd: vec3
    Ks: vec3
    Ke: vec3
    Ni: number
    d: number
    illum: number

    constructor() {
        this.Ns = 0;
        this.Ka = vec3.create();
        this.Kd = vec3.create();
        this.Ks = vec3.create();
        this.Ke = vec3.create();
        this.Ni = 0
        this.d = 0
        this.illum = 0
    }
    // I need to construct a GPUTexture from the stuff provided in the .mtl file

    async initialize(device: GPUDevice, file_path: string) {

        await this.parse_mtl_file(file_path);

    }

    async parse_mtl_file(file_path: string) {

        

    }
}