import { Renderer } from "../view/renderer";
import { Scene } from "../model/scene";
import jQuery from "jquery";
import $ from "jquery";

export class App {

    canvas: HTMLCanvasElement;
    renderer: Renderer;
    scene: Scene;

    forward_amount: number = 0;
    right_amount: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.scene = new Scene();

        $(document).on("keydown", (event) => this.handle_key_press(event));
        $(document).on("keyup", (event) => this.handle_key_release(event));

        this.canvas.onclick = () => {
            this.canvas.requestPointerLock();
        }
        this.canvas.addEventListener(
            "mousemove",
            (event) => {this.handle_mouse_move(event);}
        )
    }
    
    async initialize() {
        await this.renderer.Initialize();
    }

    run = () => {
        var running: boolean = true;

        this.scene.update();
        this.scene.move_player(this.forward_amount, this.right_amount);

        this.renderer.render(
            this.scene.get_player(),
            this.scene.get_triangles()
        );

        if (running) {
            requestAnimationFrame(this.run);
        }
    }

    handle_key_press(event: JQuery.KeyDownEvent) {
        if (event.code == "KeyW") {
            this.forward_amount = 0.02;
        }
        if (event.code == "KeyA") {
            this.right_amount = -0.02;
        }
        if (event.code == "KeyS") {
            this.forward_amount = -0.02;
        }
        if (event.code == "KeyD") {
            this.right_amount = 0.02;
        }
    }

    handle_key_release(event: JQuery.KeyUpEvent) {
        if (event.code == "KeyW") {
            this.forward_amount = 0;
        }
        if (event.code == "KeyA") {
            this.right_amount = 0;
        }
        if (event.code == "KeyS") {
            this.forward_amount = 0;
        }
        if (event.code == "KeyD") {
            this.right_amount = 0;
        }
    }

    handle_mouse_move(event: MouseEvent) {
        this.scene.spin_player(event.movementX * 0.02, -event.movementY * 0.02);
    }
}