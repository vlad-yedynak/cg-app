import { Point } from "./point.js";
import { Shape } from "./shape.js";
import { CartesianSystem } from "./cartesianSystem.js";


export class AnimatedSquare extends Shape {
    private _vertices: Point[] = [];
    private _originalVertices: Point[] = [];
    private _strokeStyle = '#000000';
    private _fillStyle = '#ffffff';
    private _rotationSpeed = 0;
    private _verticalSpeed = 0;

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
            point2: {
                type: 'point',
                label: 'Third Point'
            },
            point3: {
                type: 'point',
                label: 'Fourth Point'
            },
            rotationSpeed: {
                type: 'input',
                inputType: 'number',
                label: 'Rotation Speed'
            },
            verticalSpeed: {
                type: 'input',
                inputType: 'number',
                label: 'Vertical Speed'
            },
            lineColor: {
                type: 'color',
                label: 'Line Color'
            },
            fillColor: {
                type: 'color',
                label: 'Fill Color'
            }
        };
    }

    public override processParameters(parameters: any): void {
        this._id = parameters.id || 0;
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

        this._originalVertices = this.copyVertices(this._vertices);
        this._verticalSpeed = parameters.verticalSpeed || 0;
        this._rotationSpeed = parameters.rotationSpeed || 0;
        this._fillStyle = parameters.fillColor || '#0000FF';
        this._strokeStyle = parameters.lineColor || '#000000';
    }

    public override getParameters(): any {
        return {
            id: this._id,
            vertices: this._originalVertices || [],
            verticalSpeed: this._verticalSpeed || 0,
            rotationSpeed: this._rotationSpeed || 0,
            lineColor: this._strokeStyle || '#000000',
            fillColor: this._fillStyle || '#ffffff'
        };
    }

    public override validateParameters(parameters: any): boolean {
        this.processParameters(parameters);
        let sideA = this._vertices[0].distanceTo(this._vertices[1]);
        let sideB = this._vertices[1].distanceTo(this._vertices[2]);
        let sideC = this._vertices[2].distanceTo(this._vertices[3]);
        let sideD = this._vertices[3].distanceTo(this._vertices[0]);
        let diagonalA = this._vertices[0].distanceTo(this._vertices[2]);
        let diagonalB = this._vertices[1].distanceTo(this._vertices[3]);

        return sideA == sideB &&
            sideB == sideC &&
            sideC == sideD &&
            diagonalA == diagonalB;
    }

    private transform(): void {
        const sin = Math.sin(Math.PI / 180 * this._rotationSpeed);
        const cos = Math.cos(Math.PI / 180 * this._rotationSpeed);
        const center = new Point(
            (this._vertices[2].x + this._vertices[0].x) / 2,
            (this._vertices[2].y + this._vertices[0].y) / 2
        );

        this._vertices.forEach((vertex) => {
            const x = vertex.x - center.x;
            const y = vertex.y - center.y;
            vertex.x = x * cos - y * sin + center.x;
            vertex.y = x * sin + y * cos + center.y;
            vertex.y += 0.01 * this._verticalSpeed;
        })
    }

    public calculateFrame(): void
    {
        this.transform();
    }

    public draw(system: CartesianSystem): void {
        if (this._vertices.length < 4) {
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
    }

    public reset(): void {
        this._vertices = this.copyVertices(this._originalVertices);
    }

    private copyVertices(source: Point[]): Point[] {
        let result: Point[] = [];

        source.forEach((vertex) => {
            let clone = new Point(vertex.x, vertex.y);
            result.push(clone);
        })

        return result;
    }
}
