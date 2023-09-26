import type { Readable, readable } from 'svelte/store';

export function draggable(node: HTMLElement, params: { enabled: Readable<boolean> }) {
	let startX: number; // Starting X coordinate of the mouse
	let startY: number; // Starting Y coordinate of the mouse
	let origX: number; // Original X coordinate of the element
	let origY: number; // Original Y coordinate of the element
	let transX = 0;
	let transY = 0;

	function handleMousedown(event: MouseEvent) {
		if (!params.enabled) return; // Return early if dragging is disabled

		const rect = node.getBoundingClientRect();
		startX = event.clientX;
		startY = event.clientY;
		origX = rect.left + window.scrollX;
		origY = rect.top + window.scrollY;

		window.addEventListener('mousemove', handleMousemove);
		window.addEventListener('mouseup', handleMouseup);
	}

	function handleMousemove(event: MouseEvent) {
		if (!params.enabled) return; // Return early if dragging is disabled

		const dx = event.clientX - startX;
		const dy = event.clientY - startY;
		const newX = origX + dx;
		const newY = origY + dy;
		transX = newX - origX;
		transY = newY - origY;
		node.style.transform = `translate3d(${transX}px, ${transY}px, 0)`;
	}

	function handleMouseup() {
		window.removeEventListener('mousemove', handleMousemove);
		window.removeEventListener('mouseup', handleMouseup);

		// reset transform and update position
		const rect = node.getBoundingClientRect();
		node.style.left = `${rect.left}px`;
		node.style.top = `${rect.top}px`;
		node.style.transform = '';
	}

	node.addEventListener('mousedown', handleMousedown);

	return {
		destroy() {
			node.removeEventListener('mousedown', handleMousedown);
			window.removeEventListener('mousemove', handleMousemove);
			window.removeEventListener('mouseup', handleMouseup);
		}
	};
}
