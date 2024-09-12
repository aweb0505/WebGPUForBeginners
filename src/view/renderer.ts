import shader from "./shaders/shaders.wgsl";
import cubemap from "./shaders/cubemap.wgsl";
import { TriangleMesh } from "./triangle_mesh";
import { QuadMesh } from "./quad_mesh";
import { mat4 } from "gl-matrix";
import { Material } from "./material";
import { object_types, RenderData } from "../model/definitions";
import { ObjectMesh } from "./object_mesh";
import { CubeMapMaterial } from "./cube_map_material";
import { Camera } from "../model/camera";

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
    cube_map_pipeline!: GPURenderPipeline
    frame_group_layout!: GPUBindGroupLayout
    material_group_layout!: GPUBindGroupLayout
    cubemap_group_layout!: GPUBindGroupLayout
    cubemap_bind_group!: GPUBindGroup
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
    zammy_monk_mesh!: ObjectMesh;
    triangle_material!: Material;

    quad_material!: Material;
    worm_material!: Material;
    zammy_monk_material!: Material;

    cube_map_material!: CubeMapMaterial;
    object_buffer!: GPUBuffer;
    camera_uniform_buffer!: GPUBuffer;

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
        this.cubemap_group_layout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "uniform"
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        viewDimension: "cube"
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                }
            ],
        })


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

        this.cubemap_bind_group = this.device.createBindGroup({
            layout: this.cubemap_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.camera_uniform_buffer
                    }
                },
                {
                    binding: 1,
                    resource: this.cube_map_material.view
                },
                {
                    binding: 2,
                    resource: this.cube_map_material.sampler
                }
            ]
        })

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

        const cube_map_pipeline_layout = await this.device.createPipelineLayout({
            bindGroupLayouts: [this.cubemap_group_layout]
        });

        const pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.frame_group_layout, this.material_group_layout]
        });

        this.cube_map_pipeline = this.device.createRenderPipeline({
            vertex: {
                module: this.device.createShaderModule({
                    code: cubemap
                }),
                entryPoint: "cubemap_vertex_main"
            },

            fragment: {
                module: this.device.createShaderModule({
                    code: cubemap
                }),
                entryPoint: "cubemap_fragment_main",
                targets: [{
                    format: this.format
                }]
            },

            primitive: {
                topology: "triangle-list"
            },

            layout: cube_map_pipeline_layout,
            depthStencil: this.depthStencilState
        })

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

        this.zammy_monk_mesh = new ObjectMesh();
        this.zammy_monk_material = new Material();

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

        const camera_uniform_buffer_descriptor: GPUBufferDescriptor = {
            size: 48,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }
        this.camera_uniform_buffer = this.device.createBuffer(camera_uniform_buffer_descriptor);

        await this.triangle_material.initialize(this.device, "dist/img/jacobJones.PNG", this.material_group_layout);
        await this.quad_material.initialize(this.device, "dist/img/floor.png", this.material_group_layout);
        await this.worm_material.initialize(this.device, "dist/img/Worm_Color.jpg", this.material_group_layout);
        await this.zammy_monk_material.initialize(this.device, "dist/img/floor.png", this.material_group_layout);
        await this.giant_worm_mesh.initialize(this.device, "dist/models/Giant Worm Creature.obj");
        await this.zammy_monk_mesh.initialize(this.device, "dist/models/zamorakian_monk/zammymonk.obj");

        // Load cubemap image data
        // const cubemap_file_paths = [
        //     "dist/img/cubemaps/stylized_desert/nx.png",
        //     "dist/img/cubemaps/stylized_desert/ny.png",
        //     "dist/img/cubemaps/stylized_desert/nz.png",
        //     "dist/img/cubemaps/stylized_desert/px.png",
        //     "dist/img/cubemaps/stylized_desert/py.png",
        //     "dist/img/cubemaps/stylized_desert/pz.png",
        // ]

        const cubemap_file_paths = [
            "dist/img/cubemaps/basic_sky/sky_back.png",  //x+
            "dist/img/cubemaps/basic_sky/sky_front.png",   //x-
            "dist/img/cubemaps/basic_sky/sky_left.png",   //y+
            "dist/img/cubemaps/basic_sky/sky_right.png",  //y-
            "dist/img/cubemaps/basic_sky/sky_top.png", //z+
            "dist/img/cubemaps/basic_sky/sky_bottom.png",    //z-
        ]

        this.cube_map_material = new CubeMapMaterial();
        await this.cube_map_material.initialize(this.device, cubemap_file_paths);
    }

    prepare_scene(renderables: RenderData, camera: Camera) {
        const projection = mat4.create();
        mat4.perspective(projection, Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, 10000);

        const view = renderables.view_transform;
        
        this.device.queue.writeBuffer(this.object_buffer, 0, renderables.model_transforms, 0, renderables.model_transforms.length);
        this.device.queue.writeBuffer(<GPUBuffer>this.uniform_buffer, 0, <ArrayBuffer>view);
        this.device.queue.writeBuffer(<GPUBuffer>this.uniform_buffer, 64, <ArrayBuffer>projection);

        const dy = Math.tan(Math.PI/8);
        const dx = dy * this.canvas.width / this.canvas.height;

        this.device.queue.writeBuffer(
            this.camera_uniform_buffer, 0,
            new Float32Array(
                [
                    camera.forwards[0],
                    camera.forwards[1],
                    camera.forwards[2],
                    0.0,
                    dx * camera.right[0],
                    dx * camera.right[1],
                    dx * camera.right[2],
                    0.0,
                    dy * camera.up[0],
                    dy * camera.up[1],
                    dy * camera.up[2],
                    0.0
                ]
            ), 0, 12
        )
    }

    async render(renderables: RenderData, camera: Camera) {

        if (!this.device || !this.pipeline) {
            return;
        }

        this.prepare_scene(renderables, camera);

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
        
        // Start Draw cubemap
        renderpass.setPipeline(this.cube_map_pipeline);
        renderpass.setBindGroup(0, this.cubemap_bind_group);

        renderpass.setBindGroup(1, this.quad_material.bindGroup); 
        renderpass.draw(6, 1, 0, 0);

        // End draw cubemap

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

        // Giant worm
        // renderpass.setVertexBuffer(0, this.giant_worm_mesh.buffer);
        // renderpass.setBindGroup(1, this.worm_material.bindGroup);
        // renderpass.draw(this.giant_worm_mesh.vertexCount, 1, 0, objects_drawn);
        // objects_drawn += 1

        // Zammy monk
        renderpass.setVertexBuffer(0, this.zammy_monk_mesh.buffer);
        renderpass.setBindGroup(1, this.zammy_monk_material.bindGroup);
        renderpass.draw(this.zammy_monk_mesh.vertexCount, 1, 0, objects_drawn);
        objects_drawn += 1

        renderpass.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }
}