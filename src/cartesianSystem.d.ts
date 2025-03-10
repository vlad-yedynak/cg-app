declare class CartesianSystem {
    private canvas;
    private context2D;
    private readonly width;
    private readonly height;
    constructor(canvas: HTMLCanvasElement);
    draw(): void;
    private drawAxes;
    private drawXAxis;
    private drawYAxis;
    private drawGrid;
}
export default CartesianSystem;
//# sourceMappingURL=cartesianSystem.d.ts.map