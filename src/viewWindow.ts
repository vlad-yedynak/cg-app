import { CartesianSystem } from "./cartesianSystem.js";
import { Point } from "./point.js";
import { ShapeFactory } from "./shapeFactory.js";
import { Shape } from "./shape.js";

const SCALE_SPEED = 1.025;

export class ViewWindow {
    private readonly _canvas: HTMLCanvasElement;
    private readonly _system: CartesianSystem;
    private _nextShapeId: number = 1;

    private _isDragging: boolean = false;

    private _currentX: number = 0;
    private _currentY: number = 0;

    private _lastMouseX: number = 0;
    private _lastMouseY: number = 0;

    public constructor(containerID: string) {
        this._canvas = this.createCanvas(containerID);
        this._system = new CartesianSystem(this._canvas);
        this.initializeListeners();
    }

    public draw(): void {
        this._system.move(new Point(this._currentX, this._currentY));
        this._system.draw();
    }

    private initializeListeners(): void {
        this._canvas.addEventListener('wheel', (e: WheelEvent) => this.onWheel(e), false);
        this._canvas.addEventListener('mousedown', (e: MouseEvent) => this.onDragStart(e));
        this._canvas.addEventListener('mousemove', (e: MouseEvent) => this.onDragMove(e));
        this._canvas.addEventListener('mouseup', () => this.onDragEnd());
        this._canvas.addEventListener('mouseleave', () => this.onDragEnd());
        this._canvas.addEventListener('dragstart', (e: DragEvent) => e.preventDefault());
        window.addEventListener('resize', () => this.onResize());

        const addButton = <HTMLButtonElement>document.getElementById('addButton');
        const dropdown = <HTMLElement>document.getElementById('dropdownMenu');
        addButton.addEventListener("click", () => this.toggleShapeMenu());

        const options = document.querySelectorAll('.shape-option-button');
        options.forEach(option => {
            option.addEventListener('click', () => this.openShapeModal(option.id));
        });

        document.addEventListener('click', (e) => {
            if (!addButton?.contains(e.target as Node) &&
                !dropdown?.contains(e.target as Node)) {
                this.closeShapeMenu();
            }
        });

        const shapeForm = <HTMLFormElement>document.getElementById('shapeForm');
        shapeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(e, shapeForm);
        });

        document.addEventListener('click', (e) => {
            if (e.target instanceof HTMLElement && e.target.id === 'shapeModalCancel') {
                this.closeShapeModal();
            }
        });
    }

    private toggleShapeMenu(): void {
        const dropdown = <HTMLElement>document.getElementById('dropdownMenu');

        if (dropdown.style.display === 'none' || dropdown.style.display === '') {
            dropdown.style.display = 'block';
        } else {
            dropdown.style.display = 'none';
        }
    }

    private closeShapeMenu(): void {
        const dropdown = <HTMLElement>document.getElementById('dropdownMenu');
        dropdown.style.display = 'none';
    }

    private renderPointForm(key: string, config: any, defaultX: string = '', defaultY: string = ''): HTMLDivElement {
        let pointForm = document.createElement('div');

        pointForm.className = 'form-group';
        pointForm.innerHTML = `
            <div class="field-label">${config.label}</div>
            <div class="point-inputs">
                <div class="point-input">
                    <label for="${key}X" class="coordinate-label">X:</label>
                    <input id="${key}X" name="${key}X" type="number" step="any" required class="coordinate-input" value="${defaultX}">
                </div>
                <div class="point-input">
                    <label for="${key}Y" class="coordinate-label">Y:</label>
                    <input id="${key}Y" name="${key}Y" type="number" step="any" required class="coordinate-input" value="${defaultY}">
                </div>
            </div>
        `;

        return pointForm;
    }

    private renderInputForm(key: string, config: any, defaultValue: string = ''): HTMLDivElement {
        let inputForm = document.createElement('div');
        inputForm.className = 'form-group';
        const inputType = config.inputType || 'number';

        inputForm.innerHTML = `
        <div class="field-label">${config.label}</div>
        <div class="input-container">
            <input id="${key}Input" 
                   name="${key}" 
                   type="${inputType}"
                   step="any"
                   class="${key}-input" 
                   required
                   value=${defaultValue}>
        </div>
    `;

        return inputForm;
    }

    private renderCheckbox(key: string, config: any, defaultValue: string = ''): HTMLDivElement {
        let checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'form-group';
        const inputType = config.inputType || 'checkbox';

        checkboxContainer.innerHTML = `
        <div class="field-label">${config.label}</div>
        <div class="input-container">
            <input id="${key}Input" 
                   name="${key}"
                   type="${inputType}"
                   class="${key}-input" 
                   value="checked"
                   ${defaultValue}>
        </div>
    `;

        return checkboxContainer;
    }

    private openShapeModal(shapeType: string, shapeToEdit?: Shape): void {
        const shapeModal = <HTMLElement>document.getElementById('shapeModal');
        shapeModal.style.display = 'block';
        const shapeForm = <HTMLFormElement>document.getElementById('shapeForm');

        shapeForm.innerHTML = '';

        const isEditing = !!shapeToEdit;
        const modalTitle = isEditing ? `Edit ${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}` :
            `Add ${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}`;

        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        modalHeader.innerHTML = `<h2>${modalTitle}</h2>`;
        shapeForm.appendChild(modalHeader);

        const shapeId = isEditing ? shapeToEdit.id : this._nextShapeId;
        let shape = isEditing ? shapeToEdit : (new ShapeFactory()).getShapeByType(shapeType, shapeId);
        if (shape === null) {
            return;
        }

        const idField = document.createElement('input');
        idField.type = 'hidden';
        idField.name = 'id';
        idField.value = shapeId.toString();
        shapeForm.appendChild(idField);

        const typeField = document.createElement('input');
        typeField.type = 'hidden';
        typeField.name = 'type';
        typeField.value = shapeType;
        shapeForm.appendChild(typeField);

        const editField = document.createElement('input');
        editField.type = 'hidden';
        editField.name = 'isEditing';
        editField.value = isEditing ? 'true' : 'false';
        shapeForm.appendChild(editField);

        let parameters = shape.queryParameters();
        const shapeProperties = isEditing ? shapeToEdit.getParameters() : {};

        const formFields = document.createElement('div');
        formFields.className = 'form-fields';

        for (const key in parameters) {
            let parameterConfig = parameters[key];

            switch (parameterConfig.type) {
                case 'point':
                    let pointIndex = -1;
                    const pointMatch = key.match(/point(\d+)/i);
                    if (pointMatch && pointMatch[1]) {
                        pointIndex = parseInt(pointMatch[1]);
                    }
                    const defaultX = isEditing && pointIndex >= 0 && shapeProperties.vertices?.[pointIndex] ?
                        shapeProperties.vertices[pointIndex].x.toString() : '';
                    const defaultY = isEditing && pointIndex >= 0 && shapeProperties.vertices?.[pointIndex] ?
                        shapeProperties.vertices[pointIndex].y.toString() : '';
                    formFields.appendChild(this.renderPointForm(key, parameterConfig, defaultX, defaultY));
                    break;
                case 'color':
                    const isStroke = key === 'lineColor';
                    const defaultColor = isEditing ?
                        (isStroke ? shapeProperties.strokeStyle : shapeProperties.fillStyle) : '';
                    formFields.appendChild(this.renderColorForm(key, parameterConfig, defaultColor));
                    break;
                case 'input':
                    const defaultInputValue = isEditing && shapeProperties[key] ?
                        shapeProperties[key].toString() : '';
                    formFields.appendChild(this.renderInputForm(key, parameterConfig, defaultInputValue));
                    break;
                case 'checkbox':
                    console.log(shapeProperties);
                    const defaultCheckboxValue = isEditing && shapeProperties[key] ?
                        shapeProperties[key] : '';
                    formFields.appendChild(this.renderCheckbox(key, parameterConfig, defaultCheckboxValue));
                    break;
                default:
                    break;
            }
        }

        shapeForm.appendChild(formFields);

        let modalButtons = document.createElement('div');
        modalButtons.className = 'modal-buttons';
        modalButtons.innerHTML = `
        <button class="btn-secondary" id="shapeModalCancel" type="button">Cancel</button>
        <button class="btn-primary" id="addShapeButton" type="submit">${isEditing ? 'Update' : 'Save'}</button>
    `;
        shapeForm.appendChild(modalButtons);
    }


    private renderColorForm(key: string, config: any, defaultColor: string = ''): HTMLDivElement {
        const validColor = defaultColor && /^#[0-9A-Fa-f]{6}$/.test(defaultColor) ?
            defaultColor : '#000000';

        let colorForm = document.createElement('div');

        colorForm.className = 'form-group';
        colorForm.innerHTML = `
        <div class="field-label">${config.label}</div>
        <div class="color-picker-container">
            <input id="${key}Input" name="${key}" type="color" required class="color-picker" value="${validColor}">
        </div>
    `;

        return colorForm;
    }

    private handleFormSubmit(e: SubmitEvent, form: HTMLFormElement): void {
        e.preventDefault();

        const formData = new FormData(form);
        let parameters: any = {};

        formData.forEach((value, key) => {
            parameters[key] = value;
        });

        const shapeType = parameters.type;
        const shapeId = parseInt(parameters.id);
        const isEditing = parameters.isEditing === 'true';

        if (!shapeType || isNaN(shapeId)) {
            console.error('Missing shape type or ID');
            return;
        }

        if (isEditing) {
            const existingShape = this._system.findShapeById(shapeId);
            if (existingShape) {
                existingShape.processParameters(parameters);
                this.closeShapeModal();
                this.draw();
            }
        } else {
            let shape = (new ShapeFactory()).getShapeByType(shapeType, shapeId);
            if (shape === null) {
                return;
            }

            shape.processParameters(parameters);
            this.closeShapeModal();
            this._system.addShape(shape);
            this.addShapeTab(shape, shapeType);

            this._nextShapeId++;
            this.draw();
        }
    }

    private addShapeTab(shape: Shape, type: string): void {
        const controlsList = <HTMLUListElement>document.getElementById('controlsList');

        if (document.getElementById(`shape-tab-${shape.id}`)) {
            return;
        }

        const tabItem = document.createElement('li');
        tabItem.className = 'controls-tab';
        tabItem.id = `shape-tab-${shape.id}`;

        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';

        const typeIcon = document.createElement('span');
        typeIcon.className = 'shape-icon';
        typeIcon.innerHTML = this.getShapeIconSVG(type);

        const tabTitle = document.createElement('span');
        tabTitle.className = 'tab-title';
        tabTitle.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} ${shape.id}`;

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'shape-buttons';

        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        editButton.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
        editButton.title = 'Edit shape';

        editButton.dataset.shapeId = shape.id.toString();
        editButton.dataset.shapeType = type;

        editButton.addEventListener('click', (e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            const shapeId = parseInt(btn.dataset.shapeId || '0');
            const shapeType = btn.dataset.shapeType || '';

            const shapeToEdit = this._system.findShapeById(shapeId);
            if (shapeToEdit) {
                this.openShapeModal(shapeType, shapeToEdit);
            } else {
                console.error(`Shape with ID ${shapeId} not found!`);
            }
        });

        const removeButton = document.createElement('button');
        removeButton.className = 'remove-button';
        removeButton.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        removeButton.title = 'Remove shape';

        removeButton.dataset.shapeId = shape.id.toString();

        removeButton.addEventListener('click', (e) => {
            e.stopPropagation();

            const btn = e.currentTarget as HTMLButtonElement;
            const shapeId = parseInt(btn.dataset.shapeId || '0');

            this._system.removeShape(shape);
            this.removeShapeTab(shapeId);

            this.draw();
        });

        buttonContainer.appendChild(editButton);
        buttonContainer.appendChild(removeButton);

        tabContent.appendChild(typeIcon);
        tabContent.appendChild(tabTitle);
        tabContent.appendChild(buttonContainer);
        tabItem.appendChild(tabContent);

        controlsList.appendChild(tabItem);
    }

    private getShapeIconSVG(type: string): string {
        switch (type.toLowerCase()) {
            case 'triangle':
                return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M12 2L22 20H2L12 2z"></path>
                    </svg>`;
            default:
                return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                    </svg>`;
        }
    }

    private removeShapeTab(shapeId: number): void {
        const tabItem = document.getElementById(`shape-tab-${shapeId}`);
        if (tabItem) {
            tabItem.remove();
        }
    }

    private closeShapeModal(): void {
        const shapeModal = <HTMLElement>document.getElementById('shapeModal');
        shapeModal.style.display = 'none';
    }

    private onWheel(e: WheelEvent): void {
        if (e.deltaY < 0) {
            this._system.rescale(this._system.scale / SCALE_SPEED);
        } else if (e.deltaY > 0) {
            this._system.rescale(this._system.scale * SCALE_SPEED);
        }

        this.draw();
    }

    private onDragStart(event: MouseEvent): void {
        this._isDragging = true;
        this._lastMouseX = event.clientX;
        this._lastMouseY = event.clientY;
        this._canvas.style.cursor = 'grabbing';
    }

    private onDragMove(event: MouseEvent): void {
        if (!this._isDragging) {
            return;
        }

        const deltaX = event.clientX - this._lastMouseX;
        const deltaY = event.clientY - this._lastMouseY;
        this._lastMouseX = event.clientX;
        this._lastMouseY = event.clientY;

        this.updatePosition(deltaX, deltaY);
    }

    private onDragEnd(): void {
        this._isDragging = false;
        this._canvas.style.cursor = 'grab';
    }

    private onResize(): void {
        let canvasContainer = <HTMLDivElement>document.getElementById('canvasContainer');
        this._canvas.width = canvasContainer.clientWidth;
        this._canvas.height = canvasContainer.clientHeight;

        this.draw();
    }

    private updatePosition(deltaX: number, deltaY: number): void {
        this._currentX += deltaX / this._system.scale;
        this._currentY -= deltaY / this._system.scale;

        this.draw();
    }

    private createCanvas(containerID: string): HTMLCanvasElement {
        let container = <HTMLDivElement>document.getElementById(containerID);

        if (container.getAttribute('is-loaded') === 'true') {
            throw new Error('The canvas is already loaded');
        }

        let canvas = document.createElement('canvas');
        canvas.id = 'canvas';
        canvas.width = container.offsetWidth - 2;
        canvas.height = container.offsetHeight - 2;
        canvas.style.position = "absolute";
        canvas.style.border = "1px solid";
        canvas.style.cursor = "grab";

        container.appendChild(canvas);
        container.setAttribute('is-loaded', 'true');

        return canvas;
    }
}
