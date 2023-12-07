<script lang="ts">
	import { PortalPlacement } from '$lib/actions/portal';
	import { colorBrewer } from '$lib/rendering/colors';
	import { EyeIcon, EyeOffIcon } from 'svelte-feather-icons';
	import DropdownSelect, { type OptionConstructor } from '../DropdownSelect.svelte';
	import { ButtonSize, ButtonVariant } from '../button/type';
	import ColorDropdownItem from './ColorDropdownItem.svelte';
	import Button from '../button/Button.svelte';

	export let nested = false;
	export let name: string;
	export let color: string = '#eeeeee';
	export let visible = true;
	export let selected = false;
	let className: string | undefined = undefined;
	export { className as class };

	const colorOptionConstructor: OptionConstructor<string, string> = (value, index, meta) => {
		return {
			label: value,
			value: value,
			id: index
		};
	};
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<li class={className}>
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<!-- svelte-ignore a11y-missing-attribute -->
	<div
		class="flex justify-between items-center gap-2 px-1 rounded-md text-sm flex-shrink text-ellipsis overflow-hidden"
		class:bg-orange-400={selected}
		class:text-orange-800={selected}
	>
		<div class="flex">
			<DropdownSelect
				singular
				optionConstructor={colorOptionConstructor}
				values={colorBrewer.Spectral[11]}
				itemRenderer={ColorDropdownItem}
				on:select
				placement={PortalPlacement.TRAILING}
				variant={ButtonVariant.LINK}
				size={ButtonSize.SM}
			>
				<div
					class="flex-shrink-0 rounded-full border border-slate-800"
					style={`background-color: ${color}; width: ${nested ? 12 : 17}px; height: ${
						nested ? 12 : 17
					}px`}
				/>
			</DropdownSelect>

			<a class="flex gap-2 justify-between items-center cursor-pointer" class:opacity-30={!visible}>
				<div class="flex gap-1 flex-shrink items-center">
					{#if nested}<p
							class="w-6 h-8 -mt-7 border-b border-l border-slate-300 pointer-events-none dark:border-background-700"
						/>
					{/if}
					<p>
						{name}
					</p>
				</div>
			</a>
		</div>
		<Button on:click size={ButtonSize.SM} variant={ButtonVariant.LINK}>
			{#if visible}<EyeIcon size="16" />{:else}<EyeOffIcon size="16" />{/if}
		</Button>
	</div>
	<div>
		<slot />
	</div>
</li>
