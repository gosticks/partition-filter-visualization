<script lang="ts">
	export let nested = false;
	export let name: string;
	export let color: string = '#eeeeee';
	export let visible = true;
	export let selected = false;
	let className: string | undefined = undefined;
	export { className as class };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<li class={className}>
	<div
		on:click|stopPropagation
		class="flex gap-2 justify-between items-center cursor-pointer"
		class:opacity-30={!visible}
	>
		<div class="flex gap-1 flex-shrink items-center">
			{#if nested}<p
					class="w-6 h-8 -mt-7 border-b border-l border-slate-300 pointer-events-none dark:border-background-700"
				/>
			{/if}
			<p
				class=" px-1 rounded-md text-sm flex-shrink text-ellipsis overflow-hidden"
				class:bg-orange-400={selected}
				class:text-orange-800={selected}
			>
				{name}
			</p>
		</div>
		<div
			class="flex-shrink-0 rounded-full border border-slate-800"
			style={`background-color: ${color}; width: ${nested ? 12 : 17}px; height: ${
				nested ? 12 : 17
			}px`}
		/>
	</div>
	<div>
		<slot />
	</div>
</li>
