import shader from "./shaders/shaders.wgsl";
import { TriangleMesh } from "./triangle_mesh";
import { QuadMesh } from "./quad_mesh";
import { mat4 } from "gl-matrix";
import { Material } from "./material";
import { object_types, RenderData } from "../model/definitions";
import { Quad } from "../model/quad";

export class Renderer {

    canvas: HTMLCanvasElement;

    // Device/Context objects
    adapter!: GPUAdapter;
    device!: GPUDevice;
    context!: GPUCanvasContext;
    format!: GPUTextureFormat;

    // Pipeline objects
    uniform_buffer!: GPUBuffer;
    triangle_bind_group!: GPUBindGroup;
    quad_bind_group!: GPUBindGroup;
    pipeline!: GPURenderPipeline;

    // Depth stencil things
    depthStencilState!: GPUDepthStencilState;
    depthStencilBuffer!: GPUTexture;
    depthStencilView!: GPUTextureView;
    depthStencilAttachment!: GPURenderPassDepthStencilAttachment;

    // Assets
    triangle_mesh!: TriangleMesh;
    quad_mesh!: QuadMesh;
    triangle_material!: Material;
    quad_material!: Material;
    object_buffer!: GPUBuffer;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    async Initialize() {

        await this.setup_device();

        await this.create_assets();

        await this.make_depth_buffer_resources();

        await this.make_pipeline();

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

        this.uniform_buffer = this.device.createBuffer({
            size: 64 * 2,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage",
                        hasDynamicOffset: false
                    }
                }
            ],
        });

        this.triangle_bind_group = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.uniform_buffer
                    }
                },
                {
                    binding: 1,
                    resource: this.triangle_material.view
                },
                {
                    binding: 2,
                    resource: this.triangle_material.sampler
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.object_buffer
                    }
                }
            ]
        });

        this.quad_bind_group = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.uniform_buffer
                    }
                },
                {
                    binding: 1,
                    resource: this.quad_material.view
                },
                {
                    binding: 2,
                    resource: this.quad_material.sampler
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.object_buffer
                    }
                }
            ]
        });

        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
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

            layout: pipelineLayout,
            depthStencil: this.depthStencilState
        });

    }

    async create_assets() {
        this.triangle_mesh = new TriangleMesh(this.device);
        this.triangle_material = new Material();

        this.quad_mesh = new QuadMesh(this.device);
        this.quad_material = new Material();

        const modelBufferDescriptor: GPUBufferDescriptor = {
            size: 64 * 1024,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        };
        this.object_buffer = this.device.createBuffer(modelBufferDescriptor);

        await this.triangle_material.initialize(this.device, "dist/img/jacobJones.PNG");
        await this.quad_material.initialize(this.device, "dist/img/floor.png");
    }

    async render(renderables: RenderData) {

        const projection = mat4.create();
        mat4.perspective(projection, Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, 10);

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

        var objects_drawn: number = 0;
        // Triangles
        renderpass.setVertexBuffer(0, this.triangle_mesh.buffer);
        renderpass.setBindGroup(0, this.triangle_bind_group);
        renderpass.draw(3, renderables.object_counts[object_types.TRIANGLE], 0, objects_drawn);
        objects_drawn += renderables.object_counts[object_types.TRIANGLE];

        // Quads
        renderpass.setVertexBuffer(0, this.quad_mesh.buffer);
        renderpass.setBindGroup(0, this.quad_bind_group);
        renderpass.draw(6, renderables.object_counts[object_types.QUAD], 0, objects_drawn);
        objects_drawn += renderables.object_counts[object_types.QUAD];

        renderpass.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }
}