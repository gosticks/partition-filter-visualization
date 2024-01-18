<script lang="ts">
	let className: string | undefined = '';
	export { className as class };
</script>

<div
	class="max-w-prose min-w-[300px] bg-background-50 ring-1 ring-background-900/5 dark:bg-background-800 dark:ring-background-950/5 shadow-xl p-6 rounded-xl {className}"
>
	<slot />
</div>
