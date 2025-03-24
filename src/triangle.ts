import { Point } from "./point.js";
import { Shape } from "./shape.js";
import { CartesianSystem } from "./cartesianSystem.js";

export class Triangle extends Shape {
    private _vertices: Point[] = [];
    private _strokeStyle = '#000000';
    private _fillStyle = '#ffffff';
    private _altitude = 0;
    private _enableRectangle = '';

    public constructor(id: number) {
        super(id);
    }

    public queryParameters(): any {
        return {
            shapeId: {
                type: "id"
            },
            point0: {
                type: 'point',
                label: 'First Point'
            },
            point1: {
                type: 'point',
                label: 'Second Point'
            },
            altitude: {
                type: 'input',
                inputType: 'number',
                label: 'Altitude'
            },
            lineColor: {
                type: 'color',
                label: 'Line Color'
            },
            fillColor: {
                type: 'color',
                label: 'Fill Color'
            },
            enableRectangle: {
                type: 'checkbox',
                label: 'Enable Rectangle'
            }
        };
    }

    public override processParameters(parameters: any): void {
        this._vertices = [];

        let index = 0;
        while (parameters[`point${index}X`] !== undefined && parameters[`point${index}Y`] !== undefined) {
            this._vertices.push(new Point(
                parseFloat(parameters[`point${index}X`]),
                parseFloat(parameters[`point${index}Y`])
            ));
            ++index;
        }

        if (this._vertices.length === 0) {
            if (parameters.firstPointX !== undefined && parameters.firstPointY !== undefined) {
                this._vertices.push(new Point(
                    parseFloat(parameters.firstPointX),
                    parseFloat(parameters.firstPointY)
                ));
            }

            if (parameters.secondPointX !== undefined && parameters.secondPointY !== undefined) {
                this._vertices.push(new Point(
                    parseFloat(parameters.secondPointX),
                    parseFloat(parameters.secondPointY)
                ));
            }
        }

        this._fillStyle = parameters.fillColor || '#0000FF';
        this._strokeStyle = parameters.lineColor || '#000000';
        this._altitude = parseFloat(parameters.altitude) || 0;
        this._enableRectangle = parameters.enableRectangle || '';

        if (this._vertices.length >= 2) {
            this._vertices.push(this.calculateThirdPoint());
        }
    }

    private calculateThirdPoint(): Point {
        const firstPoint = <Point>this._vertices[0];
        const secondPoint = <Point>this._vertices[1];
        const middlePoint = new Point(
            firstPoint.x + (secondPoint.x - firstPoint.x) / 2,
            firstPoint.y + (secondPoint.y - firstPoint.y) / 2
        );

        const baseAngle = Math.atan2(
            secondPoint.y - firstPoint.y,
            secondPoint.x - firstPoint.x
        );
        const altitudeAngle = baseAngle + Math.PI / 2;

        return new Point(
            middlePoint.x + Math.cos(altitudeAngle) * this._altitude,
            middlePoint.y + Math.sin(altitudeAngle) * this._altitude
        );
    }

    public override getParameters(): any {
        return {
            id: this._id,
            vertices: this._vertices || [],
            lineColor: this._strokeStyle || '#000000',
            fillColor: this._fillStyle || '#ffffff',
            altitude: this._altitude || 0,
            enableRectangle: this._enableRectangle || '',
        };
    }

    private enableRectangle(system: CartesianSystem) {
        if (this._vertices.length < 3) {
            return;
        }

        const ctx = system.context2D;
        const offsetPosition = system.currentPosition.offset(system.scale);

        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let maxY = Number.MIN_VALUE;

        this._vertices.forEach(vertex => {
            const transformedVertex = vertex.transform(
                system.canvas.width,
                system.canvas.height,
                system.scale
            );

            minX = Math.min(minX, transformedVertex.x + offsetPosition.x);
            minY = Math.min(minY, transformedVertex.y + offsetPosition.y);
            maxX = Math.max(maxX, transformedVertex.x + offsetPosition.x);
            maxY = Math.max(maxY, transformedVertex.y + offsetPosition.y);
        });

        ctx.save();
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.rect(minX, minY, maxX - minX, maxY - minY);
        ctx.stroke();

        ctx.restore();
    }

    public draw(system: CartesianSystem): void {
        if (this._vertices.length < 3) {
            return;
        }

        let ctx = system.context2D;
        let offsetPosition = system.currentPosition.offset(system.scale);

        ctx.save();

        ctx.beginPath();

        ctx.strokeStyle = this._strokeStyle;
        ctx.fillStyle = this._fillStyle;
        ctx.lineWidth = 1;

        this._vertices.forEach((vertex, index) => {
            let transformedVertex = vertex.transform(
                system.canvas.width,
                system.canvas.height,
                system.scale
            );

            let x = transformedVertex.x;
            let offsetX = offsetPosition.x;
            let y = transformedVertex.y;
            let offsetY = offsetPosition.y;

            if (index === 0) {
                ctx.moveTo(x + offsetX, y + offsetY);
            } else {
                ctx.lineTo(x + offsetX, y + offsetY);
            }
        });

        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        if (this._enableRectangle === 'checked' || this._enableRectangle === 'true') {
            this.enableRectangle(system);
        }
    }
}
