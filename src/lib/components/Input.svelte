<script lang="ts">
	export let value: string | undefined;
	let className = '';
	export { className as class };
	export let autofocus: boolean = false;
	const init = (el: HTMLInputElement) => {
		if (autofocus) {
			el.focus();
		}
	};
</script>

<input
	bind:value
	use:init
	class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 {className}"
	{...$$restProps}
/>
