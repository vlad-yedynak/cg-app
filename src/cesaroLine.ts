import { Shape } from "./shape.js";
import { CartesianSystem } from "./cartesianSystem.js";
import { Point } from "./point.js";

export class CesaroLine extends Shape {
    private _baseVertices: Point[] = [];
    private _baseStart: Point = new Point(0, 0);
    private _baseEnd: Point = new Point(0, 0);

    private _triangleBaseAngle: number = 60;
    private _triangleBaseAngleRadians: number = 60 * Math.PI / 180;
    private _cosBaseAngle: number = 0;
    private _sinBaseAngle: number = 0;

    private _fillStyle: string = '#0000FF';
    private _strokeStyle: string = '#000000';

    private _edgeCount: number = 1;
    private _iterationsCount: number = 0;

    public constructor(id: number) {
        super(id);
        this.updateTrigCache();
    }

    private updateTrigCache(): void {
        this._triangleBaseAngleRadians = this._triangleBaseAngle * Math.PI / 180;
        this._cosBaseAngle = Math.cos(this._triangleBaseAngleRadians);
        this._sinBaseAngle = Math.sin(this._triangleBaseAngleRadians);
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
            edgeCount: {
                type: 'input',
                inputType: 'number',
                label: 'Edge Count',
                min: '1'
            },
            iterationsCount: {
                type: 'input',
                inputType: 'number',
                label: 'Fractal Iterations Count',
                min: '0',
                max: '8'
            },
            triangleBaseAngle: {
                type: 'input',
                inputType: 'number',
                label: 'Triangle Base Angle',
                min: '0',
                max: '90'
            },
            fillColor: {
                type: 'color',
                label: 'Fill Color'
            },
            lineColor: {
                type: 'color',
                label: 'Line Color'
            }
        };
    }

    public override processParameters(parameters: any): void {
        this._id = parameters.id || 0;

        this._baseStart = new Point(
            parseFloat(parameters[`point0X`]),
            parseFloat(parameters[`point0Y`])
        );

        this._baseEnd = new Point(
            parseFloat(parameters[`point1X`]),
            parseFloat(parameters[`point1Y`])
        );

        this._baseVertices = [];
        this._baseVertices.push(this._baseStart);
        this._baseVertices.push(this._baseEnd);
        if (parameters.vertices) {
            this._baseVertices = parameters.vertices;
        }

        this._triangleBaseAngle = parseFloat(parameters.triangleBaseAngle) || 60;
        this.updateTrigCache();

        this._fillStyle = parameters.fillColor || '#0000FF';
        this._strokeStyle = parameters.lineColor || '#000000';

        this._edgeCount = Math.floor(parameters.edgeCount) || 1;
        this._iterationsCount = Math.floor(parameters.iterationsCount) || 0;

        if (this._edgeCount > 1) {
            this.calculatePolygonEdges();
        }

        if (this._iterationsCount > 0) {
            this.createFractal();
        }
    }

    public override getParameters(): any {
        return {
            id: this._id,
            vertices: [
                this._baseStart,
                this._baseEnd
            ],
            edgeCount: this._edgeCount || 1,
            lineColor: this._strokeStyle || '#000000',
            fillColor: this._fillStyle || '#0000FF',
            iterationsCount: this._iterationsCount || 0,
            triangleBaseAngle: this._triangleBaseAngle || 60,
        };
    }

    private calculatePolygonEdges(): void {
        if (this._edgeCount <= 1) return;

        const polygonAngle = Math.PI - Math.PI * (this._edgeCount - 2) / this._edgeCount;
        const sine = Math.sin(polygonAngle);
        const cosine = Math.cos(polygonAngle);

        for (let i = 0; i < this._edgeCount - 2; ++i) {
            const baseStart = this._baseVertices[i];
            const baseEnd = this._baseVertices[i + 1];
            const vectorX = baseEnd.x - baseStart.x;
            const vectorY = baseEnd.y - baseStart.y;
            const rotatedX = vectorX * cosine - vectorY * sine;
            const rotatedY = vectorX * sine + vectorY * cosine;

            this._baseVertices.push(new Point(
                baseEnd.x + rotatedX,
                baseEnd.y + rotatedY
            ));
        }
    }

    private drawPolygon(system: CartesianSystem) {
        const ctx = system.context2D;
        const offsetPosition = system.currentPosition.offset(system.scale);

        ctx.save();
        ctx.beginPath();

        ctx.fillStyle = this._fillStyle;
        ctx.strokeStyle = this._strokeStyle;
        ctx.lineWidth = 1;

        const canvasWidth = system.canvas.width;
        const canvasHeight = system.canvas.height;
        const scale = system.scale;
        const offsetX = offsetPosition.x;
        const offsetY = offsetPosition.y;

        let transformedVertex = this._baseVertices[0].transform(
            canvasWidth, canvasHeight, scale
        );
        ctx.moveTo(transformedVertex.x + offsetX, transformedVertex.y + offsetY);

        for (let i = 1; i < this._baseVertices.length; i++) {
            transformedVertex = this._baseVertices[i].transform(
                canvasWidth, canvasHeight, scale
            );
            ctx.lineTo(transformedVertex.x + offsetX, transformedVertex.y + offsetY);
        }

        ctx.fill();
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    private generateFractalPoints(point1: Point, point2: Point): {a: Point, b: Point, c: Point} {
        const midX = (point1.x + point2.x) / 2;
        const midY = (point1.y + point2.y) / 2;
        const midpoint = new Point(midX, midY);

        const vectorX = point2.x - point1.x;
        const vectorY = point2.y - point1.y;

        const length = Math.sqrt(vectorX * vectorX + vectorY * vectorY);

        if (length === 0) {
            return { a: point1, b: point1, c: point1 };
        }

        const normalizedVectorX = vectorX / length;
        const normalizedVectorY = vectorY / length;
        const normalizedPerpX = -normalizedVectorY;
        const normalizedPerpY = normalizedVectorX;

        const scalingFactor = length / (Math.PI / this._triangleBaseAngleRadians);
        const halfBase = scalingFactor * this._cosBaseAngle;
        const height = scalingFactor * this._sinBaseAngle;

        return {
            a: new Point(
                midpoint.x - normalizedVectorX * halfBase,
                midpoint.y - normalizedVectorY * halfBase
            ),
            b: new Point(
                midpoint.x + normalizedPerpX * height,
                midpoint.y + normalizedPerpY * height
            ),
            c: new Point(
                midpoint.x + normalizedVectorX * halfBase,
                midpoint.y + normalizedVectorY * halfBase
            ),
        };
    }

    private createFractal() {
        if (this._iterationsCount <= 0) return;

        for (let k = 0; k < this._iterationsCount; ++k) {
            const estimatedSize = this._baseVertices.length * 5;
            const newBaseVertices: Point[] = new Array(estimatedSize);
            let newIndex = 0;

            for (let i = 0; i < this._baseVertices.length; ++i) {
                const prevVertex = this._baseVertices[i];

                if (i === this._baseVertices.length - 1 && this._edgeCount < 2) {
                    newBaseVertices[newIndex++] = prevVertex;
                    break;
                }

                const nextVertex = i === this._baseVertices.length - 1 ?
                    this._baseVertices[0] : this._baseVertices[i + 1];

                newBaseVertices[newIndex++] = prevVertex;

                const points = this.generateFractalPoints(prevVertex, nextVertex);
                newBaseVertices[newIndex++] = points.a;
                newBaseVertices[newIndex++] = points.b;
                newBaseVertices[newIndex++] = points.c;

                if (i < this._baseVertices.length - 1 || this._edgeCount > 1) {
                    newBaseVertices[newIndex++] = nextVertex;
                }
            }

            this._baseVertices = newBaseVertices.slice(0, newIndex);
        }
    }

    public draw(system: CartesianSystem): void {
        this.drawPolygon(system);
    }
}
