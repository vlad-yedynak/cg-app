import { Shape } from "./shape.js";
import { Triangle } from "./triangle.js";
import { Bezier } from "./bezier.js";

export class ShapeFactory {
    public getShapeByType(type: string, id: number = 0): Shape | null {
        switch (type.toLowerCase()) {
            case 'triangle':
                return new Triangle(id);
            case 'bezier':
                return new Bezier(id);
            default:
                return null;
        }
    }
}
