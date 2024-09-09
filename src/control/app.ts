import { Renderer } from "../view/renderer";
import { Scene } from "../model/scene";
import jQuery from "jquery";
import $ from "jquery";

export class App {

    canvas: HTMLCanvasElement;
    speed_multiplier_label: HTMLElement | null;
    key_code_label: HTMLElement | null;
    renderer: Renderer;
    scene: Scene;

    forward_amount: number = 0;
    right_amount: number = 0;

    shift_key_held: boolean = false;
    ctrl_key_held: boolean = false;

    speed_multiplier: number = 1; // factor by which holding shift speed up camera movement
    sped_up_multiplier: number = 5;
    default_speed_multiplier: number = 1;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.scene = new Scene();
        this.speed_multiplier_label = document.getElementById("speed-multiplier-label");
        this.key_code_label = document.getElementById("key-code-label");

        $(document).on("keydown", (event) => this.handle_key_down(event));
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

        this.speed_multiplier = this.shift_key_held ? this.sped_up_multiplier : this.default_speed_multiplier;

        this.speed_multiplier_label!.innerText = "Camera Speed: " + this.speed_multiplier + "\n Sped Up Multiplier: " + this.sped_up_multiplier;
        
        this.scene.move_player(this.forward_amount  * this.speed_multiplier, this.right_amount  * this.speed_multiplier);

        this.renderer.render(
            this.scene.get_renderables()
        );

        if (running) {
            requestAnimationFrame(this.run);
        }
    }

    handle_key_down(event: JQuery.KeyDownEvent) {
        if (event.code == "ShiftLeft") {
            this.shift_key_held = true;
        }

        if (event.code == "ControlLeft") {
            this.ctrl_key_held = true;
        }
        
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

        if (this.ctrl_key_held) {
            event.preventDefault();
            if (event.code == "Equal" && this.sped_up_multiplier < 25) {
                console.log("speed up");
                this.sped_up_multiplier += 1;
            } else if (event.code == "Minus" && this.sped_up_multiplier > 1) {
                this.sped_up_multiplier -= 1;
            }
        }

        this.key_code_label!.innerText = "Key held: " + event.code + ": Control key held?: " + this.ctrl_key_held;
    }

    handle_key_release(event: JQuery.KeyUpEvent) {
        if (event.code == "ShiftLeft") {
            this.shift_key_held = false;
        }

        if (event.code == "ControlLeft") {
            this.ctrl_key_held = false;
        }

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

        this.key_code_label!.innerText = "None";
    }

    handle_mouse_move(event: MouseEvent) {
        this.scene.spin_player(event.movementX * 0.02, -event.movementY * 0.02);
    }
}