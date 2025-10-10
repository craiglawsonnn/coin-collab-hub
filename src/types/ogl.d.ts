declare module 'ogl' {
  export class Renderer {
    constructor(opts?: any);
    gl: (WebGLRenderingContext | WebGL2RenderingContext) & { canvas: HTMLCanvasElement };
    dpr: number;
    setSize(w: number, h: number): void;
    render(opts: { scene: any }): void;
  }
  export class Program {
    constructor(gl: WebGLRenderingContext, opts: { vertex: string; fragment: string; uniforms?: any });
    uniforms: Record<string, any>;
  }
  export class Triangle { constructor(gl: WebGLRenderingContext); }
  export class Mesh { constructor(gl: WebGLRenderingContext, opts: { geometry: any; program: any }); }
  export class Vec2 {
    constructor(x?: number, y?: number);
    set(x: number, y: number): void;
  }
  export class Vec3 {
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): void;
  }
}
