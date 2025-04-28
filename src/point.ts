export class Point {
    private _x: number;
    private _y: number;

    public constructor(x: number, y: number) {
        this._x = x;
        this._y = y;
    }

    public get x(): number {
        return this._x;
    }

    public get y(): number {
        return this._y;
    }

    public set x(value: number) {
        this._x = value;
    }

    public set y(value: number) {
        this._y = value;
    }

    public transform(viewWidth: number, viewHeight: number, scale: number): Point {
        let transformedX = viewWidth * 0.5 + this._x * scale;
        let transformedY = viewHeight * 0.5 - this._y * scale;

        return new Point(transformedX, transformedY);
    }

    public offset(scale: number): Point {
        let offsetX = this._x * scale;
        let offsetY = -this._y * scale;

        return new Point(offsetX, offsetY);
    }
    
    public distanceTo(point: Point): number {
        return Math.sqrt(
            (point.x - this.x) * (point.x - this.x) +
            (point.y - this.y) * (point.y - this.y)
        );
    }
}
