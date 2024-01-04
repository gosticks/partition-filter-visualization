<script lang="ts" context="module">
	export enum TagColor {
		default = 'dark:border-background-600 dark:bg-background-800',
		orange = 'border-orange-300 bg-orange-200 dark:border-orange-600 dark:bg-orange-800',
		green = 'border-green-300 bg-green-200 dark:border-green-600 dark:bg-green-800',
		red = 'border-red-300 bg-red-200 dark:border-red-600 dark:bg-red-800',
		blue = 'border-blue-300 bg-blue-200 dark:border-blue-600 dark:bg-blue-800'
	}
</script>

<script lang="ts">
	export let color: TagColor = TagColor.default;
</script>

<span
	class={`inline-block px-2 py-1 mr-2 mb-2 ${color} border rounded-lg text-center`}
	style="font-family: monospace;"
>
	<span class="whitespace-nowrap">
		<slot />
	</span>
</span>
