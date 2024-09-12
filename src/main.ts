import { App } from "./control/app";
import { MtlMaterial } from "./view/mtl_material";

// Testing

// const new_mtl_material = new MtlMaterial();
// new_mtl_material.initialize("dist/models/zammy_monk_with_mtl/zammymonk_with_mtl.mtl")

// console.log(new_mtl_material);

const canvas : HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("gfx-main");

const app = new App(canvas);

app.initialize().then(() => app.run());