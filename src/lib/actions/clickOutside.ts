export type ActionClickOutsideOptions = {
	onClickOutside: () => void;
	whitelist?: HTMLElement[];
};

export default (node: HTMLElement, options: ActionClickOutsideOptions) => {
	let whitelist = options.whitelist?.filter((el) => el !== undefined) ?? [];
	let onOutsideClick = options.onClickOutside;
	const detectClick = (event: MouseEvent) => {
		const target = event.target as Node;
		if (!node.contains(target) && !whitelist.some((el) => el.isSameNode(target))) {
			event.stopPropagation(); // make event opaque
			onOutsideClick();
		}
		return;
	};
	const listenerOptions = { passive: true, capture: true };
	document.addEventListener('click', detectClick, listenerOptions);

	return {
		destroy() {
			document.removeEventListener('click', detectClick, listenerOptions);
		},
		update(params: ActionClickOutsideOptions) {
			whitelist = params.whitelist?.filter((el) => el !== undefined) ?? [];
			onOutsideClick = params.onClickOutside;
		}
	};
};
