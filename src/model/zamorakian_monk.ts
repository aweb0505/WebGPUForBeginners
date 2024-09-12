import { vec3, mat4 } from "gl-matrix";
import { DegreesToRadians } from "./math_helpers";

export class ZamorakianMonk {
    position: vec3;
    eulers: vec3;
    scale: vec3;
    model!: mat4;
    
    constructor(position: vec3, eulers: vec3, scale: vec3) {
        this.position = position;
        this.eulers = eulers;
        this.scale = scale;
    }

    update() {
        // this.eulers[0] += 0.1;
        // this.eulers[0] %= 360;
    
        this.model = mat4.create();
        mat4.translate(this.model, this.model, this.position);
        mat4.rotateX(this.model, this.model, DegreesToRadians(this.eulers[0]));
        mat4.rotateY(this.model, this.model, DegreesToRadians(this.eulers[1]));
        mat4.rotateZ(this.model, this.model, DegreesToRadians(this.eulers[2]));
        mat4.scale(this.model, this.model, this.scale);
    }

    get_model() : mat4{
        return this.model;
    }
}