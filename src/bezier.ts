import { Point } from "./point.js";
import { Shape } from "./shape.js";
import { CartesianSystem } from "./cartesianSystem.js";

const factorialCache: { [key: number]: number } = {};

function factorial(n: number): number {
    if (n <= 1) return 1;
    if (factorialCache[n] !== undefined) return factorialCache[n];

    let result = 1;
    for (let i = 2; i <= n; ++i) {
        result *= i;
    }

    factorialCache[n] = result;
    return result;
}

export class Bezier extends Shape {
    private _refPoints: Point[] = [];
    private _step = 0.1;
    private _binomialCoefficients: number[] = [];

    private _refColor = '#000000';
    private _curveColor = '#000000';
    private _tangentsColor = '#000000';

    private _enableRefPolygon = false;
    private _enableTangents = false;
    private _drawRange = false;

    private _minRefPointsCount = 2;

    private _leftX = this.findLeftX();
    private _rightX = this.findRightX();

    private _coefMatrix: number[][] = [];
    private _currentMode: string = 'option0';

    public constructor(id: number) {
        super(id);
        this.precomputeBinomialCoefficients();
        this.precomputeCoefMatrix();
    }

    private printMatrix(): string {
        if (!this._coefMatrix || this._coefMatrix.length === 0) {
            return "Matrix not available";
        }

        let result = "Bezier Coefficient Matrix:\n";

        const maxWidths: number[] = [];
        for (let col = 0; col < this._coefMatrix[0].length; ++col) {
            let maxWidth = 0;
            for (let row = 0; row < this._coefMatrix.length; row++) {
                const value = this._coefMatrix[row][col];
                const width = value !== undefined ? value.toString().length : 0;
                if (width > maxWidth) {
                    maxWidth = width;
                }
            }
            maxWidths.push(maxWidth);
        }

        let majorDiagonal = 0;
        let minorDiagonal = 0;

        const n = this._coefMatrix.length;
        for (let i = 0; i < n; i++) {
            if (i < this._coefMatrix[i].length) {
                majorDiagonal += this._coefMatrix[i][i];
            }

            const minorCol = n - 1 - i;
            if (minorCol >= 0 && minorCol < this._coefMatrix[i].length) {
                minorDiagonal += this._coefMatrix[i][minorCol];
            }
        }

        for (let row = 0; row < this._coefMatrix.length; row++) {
            let rowStr = "[ ";
            for (let col = 0; col < this._coefMatrix[row].length; col++) {
                const value = this._coefMatrix[row][col] !== undefined ?
                    this._coefMatrix[row][col].toString() : "0";
                const padding = " ".repeat(maxWidths[col] - value.length);
                rowStr += padding + value;
                if (col < this._coefMatrix[row].length - 1) {
                    rowStr += ", ";
                }
            }
            rowStr += " ]";
            result += rowStr + "\n";
        }

        result += "Sum of elements from major diagonal: " + majorDiagonal.toString() + "\n";
        result += "Sum of elements from minor diagonal: " + minorDiagonal.toString() + "\n";

        return result;
    }

    private precomputeBinomialCoefficients(): void {
        const n = this._refPoints?.length ? this._refPoints.length - 1 : 0;
        this._binomialCoefficients = new Array(n + 1);

        for (let i = 0; i <= n; i++) {
            const nominator = factorial(n);
            const denominator = factorial(i) * factorial(n - i);
            this._binomialCoefficients[i] = nominator / denominator;
        }
    }

    private combination(from: number, choose: number): number {
        return (factorial(from)) / ((factorial(choose) * factorial(from - choose)))
    }

    private precomputeCoefMatrix(): void {
        const n = this._refPoints.length - 1;

        const matrix: number[][] = [];

        for (let i = 0; i <= n; ++i) {
            matrix[i] = [];
            for (let j = 0; j <= n - i; ++j) {
                matrix[i][j] = this.combination(
                    n, i
                ) * this.combination(
                    n - i, n - i - j
                ) * Math.pow(-1, n - i - j);
            }

            for (let j = n - i + 1; j <= n; ++j) {
                matrix[i][j] = 0;
            }
        }

        this._coefMatrix =  matrix;
    }

    private findLeftX(): number {
        if (!this._refPoints || this._refPoints.length === 0) {
            return 0;
        }

        let minX = this._refPoints[0]?.x ?? 0;

        for (let i = 1; i < this._refPoints.length; i++) {
            const pointX = this._refPoints[i]?.x;
            if (pointX !== undefined && pointX < minX) {
                minX = pointX;
            }
        }

        return minX;
    }

    private findRightX(): number {
        if (!this._refPoints || this._refPoints.length === 0) {
            return 0;
        }

        let maxX = this._refPoints[0]?.x ?? 0;

        for (let i = 1; i < this._refPoints.length; i++) {
            const pointX = this._refPoints[i]?.x;
            if (pointX !== undefined && pointX > maxX) {
                maxX = pointX;
            }
        }

        return maxX;
    }

    private generateInfoContent(): string {
        return this.printMatrix();
    }

    private calculatePointPolynomial(t: number): Point {
        let x = 0;
        let y = 0;

        for (let i = 0; i < this._refPoints.length; ++i) {
            let b = this.bernstein(t, i);
            x += (<Point>this._refPoints[i]).x * b;
            y += (<Point>this._refPoints[i]).y * b;
        }

        return new Point(x, y);
    }

    private calculatePointMatrix(t: number): Point {
        let tPowers: number[] = new Array(this._refPoints.length);
        tPowers[0] = 1;
        for (let i = 1; i < this._refPoints.length; i++) {
            tPowers[i] = tPowers[i-1] * t;
        }
        tPowers.reverse();

        let x = 0;
        let y = 0;

        const n = this._refPoints.length - 1;

        for (let i = 0; i <= n; i++) {
            let coefficient = 0;
            for (let j = 0; j <= n; j++) {
                if (j <= n - i) {
                    coefficient += this._coefMatrix[i][j] * tPowers[j];
                }
            }

            x += this._refPoints[i].x * coefficient;
            y += this._refPoints[i].y * coefficient;
        }

        return new Point(x, y);
    }

    private bernstein(t: number, i: number): number {
        const n = this._refPoints.length - 1;
        const coefficient = <number>this._binomialCoefficients[i];

        let tPower = 1;
        for (let j = 0; j < i; j++) {
            tPower *= t;
        }

        let oneMinusTpower = 1;
        for (let j = 0; j < (n - i); j++) {
            oneMinusTpower *= (1 - t);
        }

        return coefficient * tPower * oneMinusTpower;
    }

    public queryParameters(): any {
        return {
            shapeId: {
                type: "id"
            },
            mode: {
                type: "switch",
                label: "Mode",
                options: {
                    option0: "Polynomial",
                    option1: "Matrix"
                }
            },
            bezierInfo: {
                type: "info",
                label: "Bezier Info"
            },
            refPoints: {
                type: "array",
                minElementCount: this._minRefPointsCount
            },
            step: {
                type: 'input',
                inputType: 'number',
                label: 'Step',
                min: '0.001',
                max: '1'
            },
            fillColor: {
                type: 'color',
                label: 'Reference Polygon Color'
            },
            lineColor: {
                type: 'color',
                label: 'Bezier Curve Color'
            },
            altLineColor: {
              type: 'color',
              label: 'Bezier Tangents Color'
            },
            enableRefPolygon: {
                type: 'checkbox',
                label: 'Enable Reference Polygon'
            },
            enableTangents: {
                type: 'checkbox',
                label: 'Enable Tangents'
            },
            drawRange: {
                type: 'checkbox',
                label: 'Draw Range'
            },
            rangeValues: {
                type: 'range',
                label: 'Range Values'
            }
        };
    }

    public override processParameters(parameters: any): void {
        this._refPoints = [];
        let index = 0;
        while (parameters[`refPoints${index}X`] !== undefined && parameters[`refPoints${index}Y`] !== undefined) {
            this._refPoints.push(new Point(
                parseFloat(parameters[`refPoints${index}X`]),
                parseFloat(parameters[`refPoints${index}Y`])
            ));

            ++index;
        }

        this._step = parseFloat(parameters['step']);
        this._refColor = parameters.fillColor || '#000000';
        this._curveColor = parameters.lineColor || '#000000';
        this._tangentsColor = parameters.altLineColor || '#000000';
        this._enableRefPolygon = parameters.enableRefPolygon || false;
        this._enableTangents = parameters.enableTangents || false;
        this._drawRange = parameters.drawRange || false;
        this._leftX = parameters['rangeValuesMin'] || this.findLeftX();
        this._rightX = parameters['rangeValuesMax'] || this.findRightX();
        this._currentMode = parameters['mode'] || "option0";

        this.precomputeBinomialCoefficients();
        this.precomputeCoefMatrix();
    }

    public override getParameters(): any {
        return {
            id: this._id,
            refPoints: this._refPoints || [],
            step: this._step || 0.1,
            fillColor: this._refColor || '#000000',
            lineColor: this._curveColor || '#000000',
            altLineColor: this._tangentsColor || '#000000',
            enableRefPolygon: this._enableRefPolygon || false,
            enableTangents: this._enableTangents || false,
            minElementCount: this._minRefPointsCount,
            drawRange: this._drawRange || false,
            rangeValues: {
                min: this._leftX,
                max: this._rightX,
            },
            infoContent: this.generateInfoContent(),
            mode: this._currentMode || "option0"
        };
    }

    private drawRefPolygon(system: CartesianSystem): void {
        let ctx = system.context2D;
        let offsetPosition = system.currentPosition.offset(system.scale);

        ctx.save();
        ctx.beginPath();

        ctx.strokeStyle = this._refColor;
        ctx.lineWidth = 1;

        this._refPoints.forEach((point, index) => {
            let transformedVertex = point.transform(
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

        ctx.stroke();
        ctx.restore();
    }

    private drawBezier(system: CartesianSystem): void {
        let ctx = system.context2D;
        let offsetPosition = system.currentPosition.offset(system.scale);

        ctx.save();
        ctx.beginPath();

        ctx.strokeStyle = this._curveColor;
        ctx.lineWidth = 1;

        const numSteps = Math.ceil(1 / this._step);

        let outOfRange = false;
        for (let step = 0; step <= numSteps; ++step) {
            let t = step / numSteps;
            let point: Point;
            switch (this._currentMode) {
                case "option0":
                    point = this.calculatePointPolynomial(t);
                    break;
                case "option1":
                    point = this.calculatePointMatrix(t);
                    break;
                default:
                    point = this.calculatePointPolynomial(t);
                    break;
            }

            if ((point.x <= this._leftX || point.x >= this._rightX) && this._drawRange) {
                outOfRange = true;
                continue;
            }

            let transformedPoint = point.transform(
                system.canvas.width,
                system.canvas.height,
                system.scale
            );

            let x = transformedPoint.x;
            let offsetX = offsetPosition.x;
            let y = transformedPoint.y;
            let offsetY = offsetPosition.y;

            if (step === 0 || outOfRange) {
                ctx.moveTo(x + offsetX, y + offsetY);
                outOfRange = false;
            } else {
                ctx.lineTo(x + offsetX, y + offsetY);
            }
        }

        ctx.stroke();
        ctx.restore();
    }

    private drawTangents(system: CartesianSystem): void {
        if (this._refPoints.length < 2) return;

        let ctx = system.context2D;
        let offsetPosition = system.currentPosition.offset(system.scale);

        ctx.save();
        ctx.strokeStyle = this._tangentsColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2]);

        const canvasWidth = system.canvas.width;
        const canvasHeight = system.canvas.height;
        const maxDimension = Math.max(canvasWidth, canvasHeight) * 2;

        const firstPoint = <Point>this._refPoints[0];
        const secondPoint = <Point>this._refPoints[1];

        const transformedFirst = firstPoint.transform(canvasWidth, canvasHeight, system.scale);
        const transformedSecond = secondPoint.transform(canvasWidth, canvasHeight, system.scale);

        const dirX1 = transformedSecond.x - transformedFirst.x;
        const dirY1 = transformedSecond.y - transformedFirst.y;

        const length1 = Math.sqrt(dirX1 * dirX1 + dirY1 * dirY1);
        if (length1 > 0) {
            const normDirX1 = dirX1 / length1;
            const normDirY1 = dirY1 / length1;

            const startX1 = transformedFirst.x - normDirX1 * maxDimension;
            const startY1 = transformedFirst.y - normDirY1 * maxDimension;
            const endX1 = transformedFirst.x + normDirX1 * maxDimension;
            const endY1 = transformedFirst.y + normDirY1 * maxDimension;

            ctx.beginPath();
            ctx.moveTo(startX1 + offsetPosition.x, startY1 + offsetPosition.y);
            ctx.lineTo(endX1 + offsetPosition.x, endY1 + offsetPosition.y);
            ctx.stroke();
        }

        const lastPoint = <Point>this._refPoints[this._refPoints.length - 1];
        const secondLastPoint = <Point>this._refPoints[this._refPoints.length - 2];

        const transformedLast = lastPoint.transform(canvasWidth, canvasHeight, system.scale);
        const transformedSecondLast = secondLastPoint.transform(canvasWidth, canvasHeight, system.scale);

        const dirX2 = transformedLast.x - transformedSecondLast.x;
        const dirY2 = transformedLast.y - transformedSecondLast.y;

        const length2 = Math.sqrt(dirX2 * dirX2 + dirY2 * dirY2);
        if (length2 > 0) {
            const normDirX2 = dirX2 / length2;
            const normDirY2 = dirY2 / length2;

            const startX2 = transformedLast.x - normDirX2 * maxDimension;
            const startY2 = transformedLast.y - normDirY2 * maxDimension;
            const endX2 = transformedLast.x + normDirX2 * maxDimension;
            const endY2 = transformedLast.y + normDirY2 * maxDimension;

            ctx.beginPath();
            ctx.moveTo(startX2 + offsetPosition.x, startY2 + offsetPosition.y);
            ctx.lineTo(endX2 + offsetPosition.x, endY2 + offsetPosition.y);
            ctx.stroke();
        }

        ctx.restore();
    }

    public draw(system: CartesianSystem): void {
        if (this._enableTangents) {
            this.drawTangents(system);
        }

        if (this._enableRefPolygon) {
            this.drawRefPolygon(system);
        }

        this.drawBezier(system);
    }
}
