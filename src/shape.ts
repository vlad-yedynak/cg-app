import { CartesianSystem } from "./cartesianSystem.js";

export abstract class Shape {
    protected _id: number;

    protected constructor(id: number) {
        this._id = id;
    }

    public get id(): number {
        return this._id;
    }

    public abstract queryParameters(): any;

    public abstract processParameters(parameters: any): void;

    public abstract draw(system: CartesianSystem): void

    public getParameters(): any {
        return { id: this._id };
    }
}
