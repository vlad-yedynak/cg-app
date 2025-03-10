import { Shape } from "./shape.js";
import { Triangle } from "./triangle.js";

export class ShapeFactory {
    public getShapeByType(type: string, id: number = 0): Shape | null {
        switch (type.toLowerCase()) {
            case 'triangle':
                return new Triangle(id);
            default:
                return null;
        }
    }
}
