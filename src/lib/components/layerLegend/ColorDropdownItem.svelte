<script lang="ts">
	import type { Option } from '../DropdownSelect.svelte';

	export let selected: boolean;
	export let option: Option<{}>;
	export let index: number;
</script>

<div class="inline-flex gap-2">
	<div
		class="flex-shrink-0 rounded-full border border-slate-800"
		style={`background-color: ${option.label}; width: 17px; height: 17px`}
	/>
	{option.label}
</div>
