export const portal = (node: HTMLElement) => {
	const target = document.querySelector('main');
	target?.appendChild(node).focus();

	return {
		destroy() {
			if (target?.contains(node)) {
				target?.removeChild(node);
			}
		}
	};
};

const findParentWithClass = (element: HTMLElement, className: string): HTMLElement | null => {
	let el: HTMLElement | null = element;
	while (el) {
		if (el.classList && el.classList.contains(className)) {
			return el;
		}
		el = el.parentElement;
	}

	return null;
};

export const defaultPortalRootClass = 'portal-root';

export enum PortalPlacement {
	TOP,
	BOTTOM,
	LEADING,
	TRAILING
}

const getPosition = (
	node: HTMLElement,
	parent: HTMLElement,
	placement: PortalPlacement,
	spacing = 3
) => {
	const componentBounds = node.getBoundingClientRect();
	const parentBounds = parent.getBoundingClientRect();

	let left = parentBounds.left;
	let top = parentBounds.top;

	switch (placement) {
		case PortalPlacement.TOP:
			top = parentBounds.top - componentBounds.height - 20 - spacing;
			break;
		case PortalPlacement.BOTTOM:
			top = parentBounds.top + parentBounds.height + spacing;
			break;
		case PortalPlacement.LEADING:
			left = parentBounds.left - componentBounds.width - spacing;
			break;
		case PortalPlacement.TRAILING:
			left = parentBounds.left + parentBounds.width + spacing;
			break;
		default:
			console.error('Invalid placement value');
			return;
	}

	// Adjust if off-screen
	if (left + componentBounds.width > window.innerWidth) {
		left = window.innerWidth - (componentBounds.width + spacing);
	}

	if (top + componentBounds.height > window.innerHeight) {
		top = window.innerHeight - (componentBounds.height + spacing);
	}

	if (left < 0) left = spacing;
	if (top < 0) top = spacing;

	return [left, top];
};

const restrictToScreen = (node: HTMLElement, x: number, y: number, spacing = 3) => {
	const componentBounds = node.getBoundingClientRect();

	let left = x;
	let top = y;

	// Adjust if off-screen
	if (left + componentBounds.width > window.innerWidth) {
		left = window.innerWidth - (componentBounds.width + spacing);
	}

	if (top + componentBounds.height > window.innerHeight) {
		top = window.innerHeight - (componentBounds.height + spacing);
	}

	if (left < 0) left = spacing;
	if (top < 0) top = spacing;

	return [left, top];
};

export interface PortalOptions {
	rootClass: string;
	placement: PortalPlacement;
}

const defaultPortalOptions: PortalOptions = {
	rootClass: defaultPortalRootClass,
	placement: PortalPlacement.BOTTOM
};

export const relativePortal = (node: HTMLElement, _options: Partial<PortalOptions> = {}) => {
	const { rootClass, placement } = { ...defaultPortalOptions, ..._options };
	// position node relative to its parent
	const parent = node.parentElement;
	if (!parent) {
		return portal(node);
	}

	const position = getPosition(node, parent, placement);
	if (!position) {
		return;
	}

	const [left, top] = position;

	node.style.left = `${left}px`;
	node.style.top = `${top}px`;

	// TODO: Update position on resize

	// Find next portal-root class along the node tree to attack
	const portalRoot = findParentWithClass(node, rootClass);

	let targetElement: HTMLElement | null;
	if (portalRoot) {
		targetElement = portalRoot;
	} else {
		targetElement = document.querySelector('main');
	}

	targetElement?.appendChild(node).focus();
	return {
		destroy() {
			if (targetElement?.contains(node)) {
				targetElement?.removeChild(node);
			}
		}
	};
};

export const positionPortal = (
	node: HTMLElement,
	_options: Partial<PortalOptions> & { x: number; y: number }
) => {
	const { rootClass, x, y } = { ...defaultPortalOptions, ..._options };
	// position node relative to its parent
	const parent = node.parentElement;
	if (!parent) {
		return portal(node);
	}

	const position = restrictToScreen(node, x, y);
	if (!position) {
		return;
	}

	const [left, top] = position;

	node.style.left = `${left}px`;
	node.style.top = `${top}px`;

	// TODO: Update position on resize

	// Find next portal-root class along the node tree to attack
	const portalRoot = findParentWithClass(node, rootClass);

	let targetElement: HTMLElement | null;
	if (portalRoot) {
		targetElement = portalRoot;
	} else {
		targetElement = document.querySelector('main');
	}

	targetElement?.appendChild(node).focus;

	return {
		destroy() {
			if (targetElement?.contains(node)) {
				targetElement?.removeChild(node);
			}
		}
	};
};
