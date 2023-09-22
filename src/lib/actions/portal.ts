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

export const relativePortal = (node: HTMLElement, rootClass = defaultPortalRootClass) => {
	// position node relative to its parent
	const parent = node.parentElement;
	if (!parent) {
		return portal(node);
	}

	const componentBounds = node.getBoundingClientRect();
	const parentBounds = parent.getBoundingClientRect();

	let left = parentBounds.left;
	let top = parentBounds.top + parentBounds.height + 3;

	if (window.innerWidth < left + componentBounds.width) {
		left = window.innerWidth - (componentBounds.width + 25);
	}

	if (window.innerHeight < top + componentBounds.height) {
		top = window.innerHeight - (componentBounds.height + 25);
	}

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
