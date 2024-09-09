import shader from "./shaders/shaders.wgsl";
import { TriangleMesh } from "./triangle_mesh";
import { QuadMesh } from "./quad_mesh";
import { mat4 } from "gl-matrix";
import { Material } from "./material";
import { object_types, RenderData } from "../model/definitions";
import { ObjectMesh } from "./object_mesh";

export class Renderer {

    canvas: HTMLCanvasElement;

    // Device/Context objects
    adapter!: GPUAdapter;
    device!: GPUDevice;
    context!: GPUCanvasContext;
    format!: GPUTextureFormat;

    // Pipeline objects
    uniform_buffer!: GPUBuffer;
    pipeline!: GPURenderPipeline;
    frame_group_layout!: GPUBindGroupLayout
    material_group_layout!: GPUBindGroupLayout
    frame_bind_group!: GPUBindGroup

    // Depth stencil things
    depthStencilState!: GPUDepthStencilState;
    depthStencilBuffer!: GPUTexture;
    depthStencilView!: GPUTextureView;
    depthStencilAttachment!: GPURenderPassDepthStencilAttachment;

    // Assets
    triangle_mesh!: TriangleMesh;
    quad_mesh!: QuadMesh;
    giant_worm_mesh!: ObjectMesh;
    triangle_material!: Material;
    quad_material!: Material;
    worm_material!: Material;
    object_buffer!: GPUBuffer;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    async Initialize() {

        await this.setup_device();

        await this.make_bind_group_layouts();

        await this.create_assets();

        await this.make_depth_buffer_resources();

        await this.make_pipeline();

        await this.make_bind_group();

    }

    async setup_device() {

        //adapter: wrapper around (physical) GPU.
        //Describes features and limits
        this.adapter = <GPUAdapter>await navigator.gpu?.requestAdapter();
        //device: wrapper around GPU functionality
        //Function calls are made through the device
        this.device = <GPUDevice>await this.adapter?.requestDevice();
        //context: similar to vulkan instance (or OpenGL context)
        this.context = <GPUCanvasContext>this.canvas.getContext("webgpu");
        this.format = "bgra8unorm";
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "opaque"
        });

    }

    async make_bind_group_layouts() {
        this.frame_group_layout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage",
                        hasDynamicOffset: false
                    }
                }
            ],
        });

        this.material_group_layout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                }
            ],
        });
    }

    async make_bind_group() {
        this.frame_bind_group = this.device.createBindGroup({
            layout: this.frame_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.uniform_buffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.object_buffer
                    }
                }
            ]
        })
    }

    async make_depth_buffer_resources() {

        this.depthStencilState = {
            format: "depth24plus-stencil8",
            depthWriteEnabled: true,
            depthCompare: "less-equal",
        };

        const size: GPUExtent3D = {
            width: this.canvas.width,
            height: this.canvas.height,
            depthOrArrayLayers: 1
        };

        const depthBufferDescriptor: GPUTextureDescriptor = {
            size: size,
            format: "depth24plus-stencil8",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        };

        this.depthStencilBuffer = this.device.createTexture(depthBufferDescriptor);

        const viewDescriptor: GPUTextureViewDescriptor = {
            format: "depth24plus-stencil8",
            dimension: "2d",
            aspect: "all"
        };

        this.depthStencilView = this.depthStencilBuffer.createView(viewDescriptor);
        
        this.depthStencilAttachment = {
            view: this.depthStencilView,
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",
            stencilLoadOp: "clear",
            stencilStoreOp: "discard"
        }
    }

    async make_pipeline() {

        const pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.frame_group_layout, this.material_group_layout]
        });

        this.pipeline = this.device.createRenderPipeline({
            vertex: {
                module: this.device.createShaderModule({
                    code: shader
                }),
                entryPoint: "vs_main",
                buffers: [this.triangle_mesh.bufferLayout,]
            },

            fragment: {
                module: this.device.createShaderModule({
                    code: shader
                }),
                entryPoint: "fs_main",
                targets: [{
                    format: this.format
                }]
            },

            primitive: {
                topology: "triangle-list"
            },

            layout: pipeline_layout,
            depthStencil: this.depthStencilState
        });

    }

    async create_assets() {
        this.triangle_mesh = new TriangleMesh(this.device);
        this.triangle_material = new Material();

        this.quad_mesh = new QuadMesh(this.device);
        this.quad_material = new Material();

        this.giant_worm_mesh = new ObjectMesh();
        this.worm_material = new Material();

        const uniformBufferDescriptor: GPUBufferDescriptor = {
            size: 64 * 2,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }
        this.uniform_buffer = this.device.createBuffer(uniformBufferDescriptor);

        const modelBufferDescriptor: GPUBufferDescriptor = {
            size: 64 * 1024,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        };
        this.object_buffer = this.device.createBuffer(modelBufferDescriptor);

        await this.triangle_material.initialize(this.device, "dist/img/jacobJones.PNG", this.material_group_layout);
        await this.quad_material.initialize(this.device, "dist/img/floor.png", this.material_group_layout);
        await this.worm_material.initialize(this.device, "dist/img/Worm_Color.jpg", this.material_group_layout);
        await this.giant_worm_mesh.initialize(this.device, "dist/models/Giant Worm Creature.obj");

    }

    async render(renderables: RenderData) {

        if (!this.device || !this.pipeline) {
            return;
        }

        const projection = mat4.create();
        mat4.perspective(projection, Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, 10000);

        const view = renderables.view_transform;
        
        this.device.queue.writeBuffer(this.object_buffer, 0, renderables.model_transforms, 0, renderables.model_transforms.length);
        this.device.queue.writeBuffer(<GPUBuffer>this.uniform_buffer, 0, <ArrayBuffer>view);
        this.device.queue.writeBuffer(<GPUBuffer>this.uniform_buffer, 64, <ArrayBuffer>projection);

        //command encoder: records draw commands for submission
        const commandEncoder: GPUCommandEncoder = this.device.createCommandEncoder();
        //texture view: image view to the color buffer in this case
        const textureView: GPUTextureView = this.context.getCurrentTexture().createView();
        //renderpass: holds draw commands, allocated from command encoder
        const renderpass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.5, g: 0.0, b: 0.25, a: 1.0 },
                loadOp: "clear",
                storeOp: "store"
            }],
            depthStencilAttachment: this.depthStencilAttachment
        });
        renderpass.setPipeline(this.pipeline);
        renderpass.setBindGroup(0, this.frame_bind_group);

        var objects_drawn: number = 0;
        // Triangles
        renderpass.setVertexBuffer(0, this.triangle_mesh.buffer);
        renderpass.setBindGroup(1, this.triangle_material.bindGroup);
        renderpass.draw(3, renderables.object_counts[object_types.TRIANGLE], 0, objects_drawn);
        objects_drawn += renderables.object_counts[object_types.TRIANGLE];

        // Quads
        renderpass.setVertexBuffer(0, this.quad_mesh.buffer);
        renderpass.setBindGroup(1, this.quad_material.bindGroup);
        renderpass.draw(6, renderables.object_counts[object_types.QUAD], 0, objects_drawn);
        objects_drawn += renderables.object_counts[object_types.QUAD];
        
        // Objects
        renderpass.setVertexBuffer(0, this.giant_worm_mesh.buffer);
        renderpass.setBindGroup(1, this.worm_material.bindGroup);
        renderpass.draw(this.giant_worm_mesh.vertexCount, 1, 0, objects_drawn);
        objects_drawn += 1

        renderpass.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }
}