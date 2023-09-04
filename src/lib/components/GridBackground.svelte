<div class="grid-bg-container">
	<div
		class="bg-gradient-to-tr from-background-50 to-background-200 dark:from-background-950 dark:to-background-950"
	/>
	<div class="grid-background" />
</div>

<style lang="scss">
	.grid-bg-container {
		z-index: -1;
		pointer-events: none;
	}

	.grid-bg-container,
	.grid-bg-container > * {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		content: '';
	}

	.grid-background {
		background-size: 50px 50px;
		background-image: radial-gradient(circle, var(--tw-ring-color) 1.5px, rgba(0, 0, 0, 0) 1px);
	}

	:global(.dark) .grid-background {
		background-image: radial-gradient(
			circle,
			var(--tw-ring-color) 1.5px,
			rgba(255, 255, 255, 0) 1px
		);
	}
</style>
