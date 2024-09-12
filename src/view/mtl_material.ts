import { vec3 } from "gl-matrix"

// This is a material definition within the .mtl file
type SubMaterial = {
    matId: string
    Ns: number
    Ka: vec3
    Kd: vec3
    Ks: vec3
    Ke: vec3
    Ni: number
    d: number
    illum: number
}

// Contains a list of submaterials that are defined within a .mtl file
export class MtlMaterial {
    
    sub_materials: SubMaterial[]

    constructor() {
        this.sub_materials = [];
    }
    // I need to construct a GPUTexture from the stuff provided in the .mtl file

    async initialize(file_path: string, device?: GPUDevice, ) {

        await this.parse_mtl_file(file_path);

    }

    async parse_mtl_file(file_path: string) {

        var result: SubMaterial = {
            matId: "",
            Ns: 0,
            Ka: vec3.create(),
            Kd: vec3.create(),
            Ks: vec3.create(),
            Ke: vec3.create(),
            Ni: 0,
            d: 0,
            illum: 0,
        };

        const response = await fetch(file_path);
        const blob: Blob = await response.blob();
        const text = await blob.text();
        const lines = text.split("\n");

        lines.forEach(
            line => {
                const identifiers = line.slice(0, 2).split('');

                if (identifiers[0] == 'n' && identifiers[1] == 'e') {
                    result.matId = this.read_in_string(line);
                } else if (identifiers[0] == 'N' && identifiers[1] == 's') {
                    result.Ns = this.read_in_number(line);
                } else if (identifiers[0] == 'K' && identifiers[1] == 'a') {
                    result.Ka = this.read_in_vec3(line);
                } else if (identifiers[0] == 'K' && identifiers[1] == 'd') {
                    result.Kd = this.read_in_vec3(line);
                } else if (identifiers[0] == 'K' && identifiers[1] == 's') {
                    result.Ks = this.read_in_vec3(line);
                } else if (identifiers[0] == 'K' && identifiers[1] == 'e') {
                    result.Ke = this.read_in_vec3(line);
                } else if (identifiers[0] == 'N' && identifiers[1] == 'i') {
                    result.Ni = this.read_in_number(line);
                } else if (identifiers[0] == 'd') {
                    result.d = this.read_in_number(line);
                } else if (identifiers[0] == 'i' && identifiers[1] == 'l') {
                    result.illum = this.read_in_number(line);
                } else if (identifiers.length == 0 && result.matId != "") {
                    this.sub_materials.push(result);
                    result = this.reset_sub_material(result);
                }
            }
        )
    }

    reset_sub_material(to_reset: SubMaterial): SubMaterial{
        to_reset = {
            matId: "",
            Ns: 0,
            Ka: vec3.create(),
            Kd: vec3.create(),
            Ks: vec3.create(),
            Ke: vec3.create(),
            Ni: 0,
            d: 0,
            illum: 0,
        }

        return to_reset;
    }

    read_in_string(line: string): string {
        const components = line.split(' ');
        // component identifier, string
        const new_string = components[1];

        return new_string;
    }

    read_in_number(line: string): number{
        const components = line.split(' ');
        // component identifier, number
        const new_number = Number(components[1]).valueOf();

        return new_number;
    }

    read_in_vec3(line: string): vec3 {
        const components = line.split(' ');
        // component identifier, float, float, float
        const new_vec3: vec3 = [
            Number(components[1]).valueOf(),
            Number(components[2]).valueOf(),
            Number(components[3]).valueOf(),
        ]

        return new_vec3;
    }
}