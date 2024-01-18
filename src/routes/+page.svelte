<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import GridBackground from '$lib/components/GridBackground.svelte';
	import MessageCard from '$lib/components/MessageCard.svelte';
	import Button from '$lib/components/button/Button.svelte';
	import { ChevronRightIcon } from 'svelte-feather-icons';
	import type { PageServerData } from './$types';
	import { ButtonColor, ButtonSize, ButtonVariant } from '$lib/components/button/type';
	import { base } from '$app/paths';

	export let data: PageServerData;

	let filters = [
		{
			name: 'Ribbon',
			paper: 'https://arxiv.org/abs/2103.02515',
			compare: '',
			code: ''
		},
		{
			name: 'Xor',
			paper: 'https://arxiv.org/abs/1912.08258',
			compare: '',
			code: ''
		}
	];
</script>

<div class="relative min-h-screen p-10 gap-14 flex flex-col items-center">
	<GridBackground />
	<div class="min-h-[25vh] md:min-h-[50vh] md:max-w-6xl flex flex-col gap-10 justify-center">
		<h1
			class="text-6xl md:text-8xl font-bold md:max-w-[60vw] drop-shadow-[7px_6px_0px_rgba(100,10,100,0.5)] bg-gradient-to-r from-orange-600 to-purple-700 inline-block text-transparent bg-clip-text"
		>
			Approximate Filters
		</h1>
		<p class="text-4xl max-w-[60vw]">visualization tool for comapring multidemsional data</p>
		<p class="text-4xl max-w-[60vw]">
			<a href="{base}/graph/custom"
				><Button variant={ButtonVariant.DEFAULT} size={ButtonSize.LG} color={ButtonColor.PRIMARY}
					>New Comparisson</Button
				></a
			>
		</p>
	</div>
	<div class="max-w-6xl w-full">
		<h2 class="text-3xl font-bold mb-4">Featured comparisons</h2>
		<div class="-mx-6 grid gap-10 grid-cols-2 md:grid-cols-3">
			{#each data.items as item}
				<a href="{base}/graph/{item.href}"
					><MessageCard class="hover:shadow-2xl transition-shadow">
						<div class="flex place-content-between items-center">
							<div>
								<h3 class="text-2xl font-bold mb-4">{item.name}</h3>
								<p>{item.description}</p>
							</div>
							<ChevronRightIcon size="24" class="opacity-40" />
						</div>
					</MessageCard>
				</a>
			{/each}
		</div>
	</div>
	<div class="max-w-6xl w-full">
		<h2 class="text-3xl font-bold mb-4">Filters</h2>
		<div class="-mx-6 grid gap-10 grid-cols-2 md:grid-cols-3">
			{#each filters as filter}
				<MessageCard>
					<h3 class="text-2xl font-bold mb-4">{filter.name}</h3>
					<div class="mt-4">
						{#if filter.compare}<a href={filter.compare}><Button>Compare</Button></a>{/if}
						{#if filter.paper}<a href={filter.paper}><Button>Paper</Button></a>{/if}
						{#if filter.code}
							<a href={filter.code}><Button>Code</Button></a>{/if}
					</div>
				</MessageCard>
			{/each}
		</div>
	</div>
</div>
