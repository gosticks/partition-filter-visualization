<script lang="ts">
	import { ButtonSize, ButtonColor, ButtonVariant } from './type';

	export let size: ButtonSize = ButtonSize.MD;
	export let disabled: boolean = false;
	export let color: ButtonColor = ButtonColor.SECONDARY;
	export let variant: ButtonVariant = ButtonVariant.DEFAULT;
	let className: string | undefined = undefined;
	export { className as class };

	let sizeClasses = classForColors(color);
	let colorClasses = classForSize(size);

	// Check if we have leading or trailing slots
	$: hasLeadingSlot = !!$$slots.leading;
	$: hasTrailingSlot = !!$$slots.trailing;

	$: sizeClasses = classForSize(size);
	$: colorClasses = classForVariant(variant, color);

	function classForSize(size: ButtonSize): string {
		switch (size) {
			case ButtonSize.SM:
				return 'px-2 py-1 text-xs shadow-sm rounded-md';
			case ButtonSize.MD:
				return 'px-4 py-2 text-sm shadow-mg rounded-lg';
			case ButtonSize.LG:
				return 'px-4 py-2 text-base shadow-lg rounded-xl';
		}
	}

	function classForColors(color: ButtonColor): string {
		switch (color) {
			case ButtonColor.PRIMARY:
				return 'border text-white bg-primary-600 hover:bg-primary-700 border-[3px] border-primary-700 hover:border-primary-700';
			case ButtonColor.SECONDARY:
				return 'border text-secondary-600 dark:text-background-50 bg-white border-secondary-300 dark:border-background-950 dark:bg-background-900 hover:bg-gray-50 dark:hover:bg-background-800 dark:hover:border-background-900';
			case ButtonColor.INVERTED:
				return 'border text-background-200 hover:bg-gray-50 dark:hover:bg-background-800 dark:hover:border-background-900';
			case ButtonColor.SUCCESS:
				return 'border text-green-100 bg-green-600 border border-green-700 hover:bg-green-700';
			case ButtonColor.INFO:
				return 'border text-primary-100 bg-primary-600 border border-primary-700 hover:bg-primary-500';
			case ButtonColor.ERROR:
				return 'border text-red-100 bg-red-600 border border-red-700 hover:bg-red-500';
		}
	}

	function classForVariant(variant: ButtonVariant, color: ButtonColor) {
		switch (variant) {
			case ButtonVariant.OUTLINE:
				switch (color) {
					case ButtonColor.PRIMARY:
						return 'text-primary-600 border-[3px] border-primary-600 hover:bg-primary-600 hover:text-white dark:hover:text-white dark:border-primary-600 dark:hover:bg-primary-600 dark:hover:border-primary-600';
					case ButtonColor.SECONDARY:
						return 'text-secondary-600 border-secondary-600 hover:bg-secondary-600 hover:text-white dark:hover:text-white dark:border-secondary-800 dark:hover:bg-secondary-600 dark:hover:border-secondary-600';
				}
			case ButtonVariant.DEFAULT:
				return classForColors(color);
			case ButtonVariant.LINK:
				switch (color) {
					case ButtonColor.PRIMARY:
						return 'text-primary-600 hover:text-primary-700 dark:text-primary-100 dark:hover:text-primary-300 border-0';
					case ButtonColor.SECONDARY:
						return 'text-secondary-600 hover:text-secondary-700 dark:text-secondary-100 dark:hover:text-secondary-300 border-0';
					case ButtonColor.INVERTED:
						return 'text-background-200 hover:text-background-300 dark:text-background-200 dark:hover:text-background-500 border-0';
					case ButtonColor.SUCCESS:
						return 'text-green-700 hover:text-green-800 dark:hover:text-green-100 dark:text-green-200';
					case ButtonColor.INFO:
						return 'text-blue-700 hover:text-blue-800 dark:hover:text-blue-100 dark:text-blue-200';
					case ButtonColor.ERROR:
						return 'text-red-700 hover:text-red-800 dark:hover:text-red-100 dark:text-red-200';
				}
		}
	}
</script>

<button
	{disabled}
	on:click
	class:disabled
	class:gap-2={hasLeadingSlot || hasTrailingSlot}
	class:justify-center={!hasLeadingSlot && !hasTrailingSlot}
	class:justify-between={hasLeadingSlot || hasTrailingSlot}
	class="inline-flex items-center {colorClasses} {sizeClasses}  font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 {className ??
		''}"
>
	<slot name="leading" />
	<slot />
	<slot name="trailing" />
</button>

<style>
	.disabled {
		@apply cursor-not-allowed opacity-30 pointer-events-none;
	}
</style>
