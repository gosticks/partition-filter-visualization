<script lang="ts">
	import { ListIcon } from 'svelte-feather-icons';
	import LayerItem from './LayerItem.svelte';
	import type { LayerSelectionEvent } from './event';

	import { createEventDispatcher } from 'svelte';

	interface BasicLayer {
		name: string;
		color?: string;
	}

	type ChildLayer = $$Generic<BasicLayer>;
	type ParentLayer = $$Generic<ChildLayer & { layers?: ChildLayer[] }>;

	type LayerVisibility = boolean;
	type SublayerVisibility = boolean;

	interface $$Events {
		select: CustomEvent<LayerSelectionEvent<ParentLayer, ChildLayer>>;
	}

	export var layerVisibility: [LayerVisibility, SublayerVisibility[]][];
	export var layers: ParentLayer[];
	export var selection: ParentLayer | ChildLayer | undefined = undefined;

	const changeDispatch = createEventDispatcher();
</script>

<ul>
	{#each layerVisibility as [visible, childVisibility], index}
		{@const layer = layers[index]}
		<LayerItem
			class="pb-2"
			{visible}
			selected={layer === selection}
			name={layer.name}
			color={layer.color}
			on:click={() =>
				changeDispatch('select', {
					index,
					layer
				})}
		>
			{#if layer.layers}
				<ul class="pl-2 pr-[2px] overflow-clip">
					{#each layer.layers as subLayer, subindex}
						{@const sublayerVisible = childVisibility[subindex]}
						<LayerItem
							nested
							selected={subLayer === selection}
							name={subLayer.name}
							color={subLayer.color}
							visible={sublayerVisible}
							on:click={(evt) =>
								changeDispatch('select', {
									index,
									layer: subLayer,
									subIndex: subindex,
									parentLayer: layer
								})}
						/>
					{/each}
				</ul>
			{/if}
		</LayerItem>
	{/each}
</ul>
