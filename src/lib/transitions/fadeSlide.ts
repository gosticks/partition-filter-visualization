export function fadeSlide(node: HTMLElement, options?: { duration?: number }) {
	return {
		duration: options?.duration || 100,
		css: (t: number) => `
            transform: translateY(${(1 - t) * -20}px) scale(${0.9 + t * 0.1});
            opacity: ${t};
        `
	};
}
