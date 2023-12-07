<script lang="ts" context="module">
	export interface LayerSelectionEvent<A = object, B = object> {
		layer: A | B;
		index: number;
		subIndex?: number;
		parentLayer?: A;
	}

	export interface LayerColorSelectionEvent<A = object, B = object> {
		layer: A | B;
		index: number;
		subIndex?: number;
		parentLayer?: A;
		color?: string;
	}

	interface BasicLayer {
		name: string;
		color?: string;
	}

	type LayerVisibility = boolean;
	type SublayerVisibility = boolean;

	export type LayerVisibilityList = [LayerVisibility, SublayerVisibility[]][];
</script>

<script lang="ts">
	import type { DropdownSelectionEvent } from '../DropdownSelect.svelte';

	import LayerItem from './LayerItem.svelte';

	import { createEventDispatcher } from 'svelte';

	type ChildLayer = $$Generic<BasicLayer>;
	type ParentLayer = $$Generic<ChildLayer & { layers?: ChildLayer[] }>;

	interface $$Events {
		select: CustomEvent<LayerSelectionEvent<ParentLayer, ChildLayer>>;
		color: CustomEvent<LayerColorSelectionEvent<ParentLayer, ChildLayer>>;
	}

	export var layerVisibility: LayerVisibilityList;
	export var layers: ParentLayer[];
	export var selection: ParentLayer | ChildLayer | undefined = undefined;

	const changeDispatch = createEventDispatcher();

	const onColorSelection =
		(index: number, layer: ChildLayer | ParentLayer, subLayer?: number) =>
		(evt: DropdownSelectionEvent<string>) => {
			changeDispatch('color', {
				index,
				layer,
				color: evt.detail.selected.at(0)?.value
			});
		};
</script>

<ul>
	{#each layerVisibility as [visible, childVisibility], index}
		{@const layer = layers[index]}
		<LayerItem
			class="pb-2"
			{visible}
			selected={layer === selection}
			name={layer.name}
			on:select={onColorSelection(index, layer)}
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
