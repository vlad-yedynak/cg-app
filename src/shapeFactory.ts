import { Shape } from "./shape.js";
import { Triangle } from "./triangle.js";
import { Bezier } from "./bezier.js";
import { CesaroLine } from "./cesaroLine.js";
import {AnimatedSquare} from "./animatedSquare.js";

export class ShapeFactory {
    public getShapeByType(type: string, id: number = 0): Shape | null {
        switch (type) {
            case 'triangle':
                return new Triangle(id);
            case 'bezier':
                return new Bezier(id);
            case 'cesaro':
                return new CesaroLine(id);
            case 'animatedSquare':
                return new AnimatedSquare(id);
            default:
                return null;
        }
    }
}
