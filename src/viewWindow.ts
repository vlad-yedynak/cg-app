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
                   min="${config['min']}"
                   max="${config['max']}"
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
            shapeModal.style.display = 'none';
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
                    const isAltStroke = key === 'altLineColor';
                    let defaultColor = '';
                    if (isEditing && isStroke) {
                        defaultColor = shapeProperties.lineColor;
                    } else if (isEditing && isAltStroke) {
                        defaultColor = shapeProperties.altLineColor;
                    } else if (isEditing) {
                        defaultColor = shapeProperties.fillColor;
                    }
                    formFields.appendChild(this.renderColorForm(key, parameterConfig, defaultColor));
                    break;
                case 'input':
                    const defaultInputValue = isEditing && shapeProperties[key] ?
                        shapeProperties[key].toString() : '';
                    formFields.appendChild(this.renderInputForm(key, parameterConfig, defaultInputValue));
                    break;
                case 'checkbox':
                    const defaultCheckboxValue = isEditing && shapeProperties[key] ?
                        shapeProperties[key] : '';
                    formFields.appendChild(this.renderCheckbox(key, parameterConfig, defaultCheckboxValue));
                    break;
                case 'array':
                    const defaultArray = isEditing && shapeProperties[key] ?
                        shapeProperties[key] : {};
                    formFields.appendChild(this.renderArrayElement(key, parameterConfig, defaultArray));
                    break;
                case 'range':
                    const defaultRange = isEditing && shapeProperties[key] ?
                        shapeProperties[key] : {};
                    formFields.appendChild(this.renderRangeElement(key, parameterConfig, defaultRange));
                    break;
                case 'info':
                    const infoLabel = shapeProperties['infoContent'];
                    formFields.appendChild(this.renderInfoPopup(parameterConfig, infoLabel));
                    break;
                case 'switch':
                    const currentOption = isEditing && shapeProperties[key] ?
                        shapeProperties[key] : '';
                    formFields.appendChild(this.renderSwitchElement(key, parameterConfig, currentOption));
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

    private renderSwitchElement(key: string, config: any, currentSwitch: string = ''): HTMLDivElement {
        const switchContainer = document.createElement('div');
        switchContainer.className = 'form-group switch-control';

        const label = document.createElement('div');
        label.className = 'field-label';
        label.textContent = config.label || 'Options';
        switchContainer.appendChild(label);

        const switchTrack = document.createElement('div');
        switchTrack.className = 'switch-track';

        const options = [];
        let optionIndex = 0;

        while (config[`options`][`option${optionIndex}`] !== undefined) {
            options.push({
                value: `option${optionIndex}`,
                label: config[`options`][`option${optionIndex}`]
            });
            optionIndex++;
        }

        if (options.length === 0) {
            options.push({ value: 'option0', label: 'Option 1' });
            options.push({ value: 'option1', label: 'Option 2' });
        }

        let selectedOption = currentSwitch;
        if (!selectedOption || !options.some(opt => opt.value === selectedOption)) {
            selectedOption = options[0].value;
        }

        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = key;
        hiddenInput.id = `${key}Input`;
        hiddenInput.value = selectedOption;
        switchContainer.appendChild(hiddenInput);

        options.forEach((option) => {
            const switchButton = document.createElement('button');
            switchButton.type = 'button';
            switchButton.className = 'switch-option';
            switchButton.dataset.value = option.value;
            switchButton.textContent = option.label;

            if (option.value === selectedOption) {
                switchButton.classList.add('selected');
            }

            switchButton.addEventListener('click', () => {
                hiddenInput.value = option.value;

                switchTrack.querySelectorAll('.switch-option').forEach(btn => {
                    btn.classList.remove('selected');
                });
                switchButton.classList.add('selected');

                const changeEvent = new CustomEvent('switch-changed', {
                    detail: { key, value: option.value }
                });
                document.dispatchEvent(changeEvent);
            });

            switchTrack.appendChild(switchButton);
        });

        switchContainer.appendChild(switchTrack);

        return switchContainer;
    }

    private renderInfoPopup(config: any, label: string): HTMLDivElement {
        const infoContainer = document.createElement('div');
        infoContainer.className = 'form-group info-popup';

        const fieldLabel = document.createElement('div');
        fieldLabel.className = 'field-label';
        fieldLabel.textContent = config.label || 'Information';

        const infoIconWrapper = document.createElement('div');
        infoIconWrapper.className = 'info-icon-wrapper';

        const infoIcon = document.createElement('div');
        infoIcon.className = 'info-icon';
        infoIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>`;

        const tooltip = document.createElement('div');
        tooltip.className = 'info-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.zIndex = '1000';
        tooltip.style.visibility = 'hidden';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.2s';

        let matrixRows: string[] = [];
        if (label && label.includes('\n')) {
            matrixRows = label.split('\n');
        }

        const actualMatrixRows = matrixRows.filter(row => row.trim().startsWith('['));
        const rowCount = actualMatrixRows.length;

        const rowSelectorContainer = document.createElement('div');
        rowSelectorContainer.className = 'row-selector-container';

        const rowSelector = document.createElement('div');
        rowSelector.className = 'row-selector';

        const rowLabel = document.createElement('span');
        rowLabel.textContent = 'Show row: ';

        const rowInput = document.createElement('input');
        rowInput.type = 'number';
        rowInput.min = '0';
        rowInput.max = rowCount > 0 ? (rowCount - 1).toString() : '0';
        rowInput.value = '0';
        rowInput.className = 'row-input';
        rowInput.style.width = '40px';
        rowInput.title = `Enter a row number between 0 and ${rowCount > 0 ? (rowCount - 1) : 0}`;

        const showAllButton = document.createElement('button');
        showAllButton.textContent = 'Show All';
        showAllButton.className = 'show-all-btn';
        showAllButton.type = 'button';

        rowSelector.appendChild(rowLabel);
        rowSelector.appendChild(rowInput);
        rowSelector.appendChild(showAllButton);

        const contentArea = document.createElement('div');
        contentArea.className = 'matrix-content-area';

        if (label && label.includes('\n')) {
            const preElement = document.createElement('pre');
            preElement.className = 'matrix-content';
            preElement.textContent = label;
            contentArea.appendChild(preElement);
        } else {
            contentArea.textContent = label || '';
        }

        rowInput.addEventListener('input', (e) => {
            e.stopPropagation();

            let rowIndex = parseInt(rowInput.value);

            if (isNaN(rowIndex) || rowIndex < 0) {
                rowIndex = 0;
                rowInput.value = '0';
            } else if (rowIndex >= rowCount) {
                rowIndex = rowCount - 1;
                rowInput.value = (rowCount - 1).toString();
            }

            const titleLine = matrixRows.find(row => row.includes('Matrix:')) || '';

            const preElement = contentArea.querySelector('.matrix-content') as HTMLPreElement;
            if (preElement) {
                if (rowCount > 0) {
                    const selectedRow = actualMatrixRows[rowIndex];
                    preElement.textContent = `${titleLine}\nRow ${rowIndex}:\n${selectedRow}`;
                } else {
                    preElement.textContent = label;
                }
            }
        });

        rowInput.addEventListener('click', (e) => e.stopPropagation());
        rowInput.addEventListener('mousedown', (e) => e.stopPropagation());

        showAllButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const preElement = contentArea.querySelector('.matrix-content') as HTMLPreElement;
            if (preElement) {
                preElement.textContent = label;
            }
        });

        showAllButton.addEventListener('mousedown', (e) => e.stopPropagation());

        rowSelectorContainer.appendChild(rowSelector);
        tooltip.appendChild(rowSelectorContainer);
        tooltip.appendChild(contentArea);

        infoIconWrapper.appendChild(infoIcon);
        infoIconWrapper.appendChild(tooltip);

        let tooltipVisible = false;

        infoIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            if (!label || contentArea.textContent === '') {
                return;
            }

            tooltipVisible = !tooltipVisible;

            document.querySelectorAll('.info-tooltip').forEach(el => {
                if (el !== tooltip) {
                    (el as HTMLElement).style.visibility = 'hidden';
                    (el as HTMLElement).style.opacity = '0';
                }
            });

            tooltip.style.visibility = tooltipVisible ? 'visible' : 'hidden';
            tooltip.style.opacity = tooltipVisible ? '1' : '0';

            if (tooltipVisible) {
                positionTooltip();
            }
        });

        const positionTooltip = () => {
            const rect = tooltip.getBoundingClientRect();
            const isOutOfRight = rect.right > window.innerWidth;
            const isOutOfBottom = rect.bottom > window.innerHeight;

            if (isOutOfRight) {
                tooltip.style.left = 'auto';
                tooltip.style.right = '100%';
                tooltip.style.marginRight = '8px';
                tooltip.style.marginLeft = '0';
            } else {
                tooltip.style.left = '100%';
                tooltip.style.right = 'auto';
                tooltip.style.marginLeft = '8px';
                tooltip.style.marginRight = '0';
            }

            if (isOutOfBottom) {
                tooltip.style.top = 'auto';
                tooltip.style.bottom = '0';
            } else {
                tooltip.style.top = '0';
                tooltip.style.bottom = 'auto';
            }
        };

        tooltip.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        tooltip.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        document.addEventListener('click', (e) => {
            if (tooltipVisible && !infoIconWrapper.contains(e.target as Node) &&
                !tooltip.contains(e.target as Node)) {
                tooltipVisible = false;
                tooltip.style.visibility = 'hidden';
                tooltip.style.opacity = '0';
            }
        });

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'info-content-wrapper';
        contentWrapper.appendChild(fieldLabel);
        contentWrapper.appendChild(infoIconWrapper);

        infoContainer.appendChild(contentWrapper);

        return infoContainer;
    }

    private renderRangeElement(key: string, config: any, defaultValues: any = {}): HTMLDivElement {
        const rangeContainer = document.createElement('div');
        rangeContainer.className = 'form-group range-inputs';

        const label = document.createElement('div');
        label.className = 'field-label';
        label.textContent = config.label || 'Range';
        rangeContainer.appendChild(label);

        const inputsContainer = document.createElement('div');
        inputsContainer.className = 'range-inputs-container';

        const defaultMinValue = defaultValues.min?.toString() || '';
        const defaultMaxValue = defaultValues.max?.toString() || '';

        const minInputContainer = document.createElement('div');
        minInputContainer.className = 'range-input';
        minInputContainer.innerHTML = `
        <label for="${key}Min" class="range-label">Min:</label>
        <input id="${key}Min" name="${key}Min" type="number" step="any" class="range-input-field" value="${defaultMinValue}">
    `;

        const maxInputContainer = document.createElement('div');
        maxInputContainer.className = 'range-input';
        maxInputContainer.innerHTML = `
        <label for="${key}Max" class="range-label">Max: </label>
        <input id="${key}Max" name="${key}Max" type="number" step="any" class="range-input-field" value="${defaultMaxValue}">
    `;

        inputsContainer.appendChild(minInputContainer);
        inputsContainer.appendChild(maxInputContainer);
        rangeContainer.appendChild(inputsContainer);

        const form = document.getElementById('shapeForm');
        if (form) {
            const minInput = minInputContainer.querySelector(`#${key}Min`) as HTMLInputElement;
            const maxInput = maxInputContainer.querySelector(`#${key}Max`) as HTMLInputElement;

            if (minInput && maxInput) {
                minInput.addEventListener('input', () => {
                    if (parseFloat(minInput.value) > parseFloat(maxInput.value)) {
                        maxInput.value = minInput.value;
                    }
                });

                maxInput.addEventListener('input', () => {
                    if (parseFloat(maxInput.value) < parseFloat(minInput.value)) {
                        minInput.value = maxInput.value;
                    }
                });
            }

            const observer = new MutationObserver(() => {
                this.updateRangeConstraints(form, key);
            });

            observer.observe(form, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['value']
            });

            setTimeout(() => this.updateRangeConstraints(form, key), 100);

            form.addEventListener('input', (e) => {
                if (e.target instanceof HTMLInputElement && e.target.name.endsWith('X')) {
                    this.updateRangeConstraints(form, key);
                }
            });
        }

        return rangeContainer;
    }

    private updateRangeConstraints(form: HTMLElement, rangeKey: string): void {
        const xInputs = form.querySelectorAll('input[name$="X"]');

        if (xInputs.length === 0) return;

        const xValues = Array.from(xInputs)
            .map(input => parseFloat((input as HTMLInputElement).value))
            .filter(value => !isNaN(value));

        if (xValues.length === 0) return;

        const minX = Math.min(...xValues);
        const maxX = Math.max(...xValues);

        const minInput = form.querySelector(`#${rangeKey}Min`) as HTMLInputElement;
        const maxInput = form.querySelector(`#${rangeKey}Max`) as HTMLInputElement;

        if (minInput && maxInput) {
            minInput.min = minX.toString();
            minInput.max = maxX.toString();
            maxInput.min = minX.toString();
            maxInput.max = maxX.toString();

            if (parseFloat(minInput.value) < minX) minInput.value = minX.toString();
            if (parseFloat(minInput.value) > maxX) minInput.value = minX.toString();
            if (parseFloat(maxInput.value) < minX) maxInput.value = maxX.toString();
            if (parseFloat(maxInput.value) > maxX) maxInput.value = maxX.toString();

            if (parseFloat(minInput.value) > parseFloat(maxInput.value)) {
                minInput.value = maxInput.value;
            }
        }
    }

    private renderArrayElement(key: string, config: any, defaultArray: any): HTMLDivElement {
        const arrayContainer = document.createElement('div');
        arrayContainer.className = 'array-container form-group';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'array-header';

        const label = document.createElement('div');
        label.className = 'field-label';
        label.textContent = config.label || 'Points';

        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'add-item-button';
        addButton.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add Point';

        headerDiv.appendChild(label);
        headerDiv.appendChild(addButton);

        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'array-items';
        itemsContainer.id = `${key}-items`;

        let itemCount = 0;
        if (defaultArray && Array.isArray(defaultArray) && defaultArray.length > 0) {
            defaultArray.forEach((point: any, index: number) => {
                if (point && typeof point.x !== 'undefined' && typeof point.y !== 'undefined') {
                    const itemConfig = {
                        type: 'point',
                        label: `Point ${index + 1}`
                    };

                    const itemKey = `${key}${index}`;
                    const itemElement = this.renderArrayItemElement(
                        itemKey,
                        itemConfig,
                        point.x.toString(),
                        point.y.toString(),
                        itemsContainer
                    );

                    itemsContainer.appendChild(itemElement);
                    itemCount++;
                }
            });
        }

        if (itemCount === 0) {
            const minElementCount = config.minElementCount || 0;
            for (let i = 0; i < minElementCount; ++i) {
                let itemConfig = {
                    type: 'point',
                    label: `Point ${i + 1}`
                };
                let itemKey = `${key + i.toString()}`;
                let itemElement = this.renderArrayItemElement(
                    itemKey,
                    itemConfig,
                    '',
                    '',
                    itemsContainer
                );

                itemsContainer.appendChild(itemElement);
            }
        }

        itemsContainer.dataset.itemCount = itemCount.toString();

        addButton.addEventListener('click', () => {
            const currentCount = itemsContainer.childElementCount;
            const newItemKey = `${key}${currentCount}`;

            const newItemConfig = {
                type: 'point',
                label: `Point ${currentCount + 1}`
            };

            const newItemElement = this.renderArrayItemElement(
                newItemKey,
                newItemConfig,
                '',
                '',
                itemsContainer
            );

            itemsContainer.appendChild(newItemElement);
            itemsContainer.dataset.itemCount = (currentCount + 1).toString();
            newItemElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        arrayContainer.appendChild(headerDiv);
        arrayContainer.appendChild(itemsContainer);

        return arrayContainer;
    }

    private renderArrayItemElement(key: string, config: any, defaultX: string, defaultY: string, container: HTMLElement): HTMLDivElement {
        const itemWrapper = document.createElement('div');
        itemWrapper.className = 'array-item-wrapper';

        const pointForm = this.renderPointForm(key, config, defaultX, defaultY);
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'remove-item-button';
        removeButton.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        removeButton.title = 'Remove point';

        removeButton.addEventListener('click', () => {
            let nextSibling = itemWrapper.nextSibling;
            while (nextSibling) {
                const currentSibling = nextSibling;
                nextSibling = nextSibling.nextSibling;
                currentSibling.remove();
            }

            itemWrapper.remove();
        });

        itemWrapper.appendChild(pointForm);

        if (container.childElementCount >= 2) {
            itemWrapper.appendChild(removeButton);
        }

        return itemWrapper;
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
            case 'bezier':
                return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M4 16C8 4 16 20 20 8"></path>
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
