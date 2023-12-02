<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import GridBackground from '$lib/components/GridBackground.svelte';
	import MessageCard from '$lib/components/MessageCard.svelte';
	import Button from '$lib/components/button/Button.svelte';
	import { ChevronRightIcon } from 'svelte-feather-icons';
	import type { PageServerData } from './$types';

	export let data: PageServerData;
</script>

<div class="relative min-h-screen p-10 gap-14 flex flex-col items-center">
	<GridBackground />
	<div class="min-h-[50vh] max-w-6xl flex flex-col gap-10 justify-center">
		<h1
			class="text-9xl font-bold max-w-[60vw] drop-shadow-[7px_6px_0px_rgba(100,10,100,0.5)] bg-gradient-to-r from-orange-600 to-purple-700 inline-block text-transparent bg-clip-text"
		>
			Approximate Filters
		</h1>
		<p class="text-4xl max-w-[60vw]">
			Amazing tradeoff between, computation, size and precision for your data
		</p>
	</div>
	<div class="max-w-6xl w-full">
		<h2 class="text-3xl font-bold mb-4">Featured comparisons</h2>
		<div class="-mx-6 grid gap-10 grid-cols-3">
			{#each data.items as item}
				<a href="/graph/{item.href}"
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
		<div class="-mx-6 grid gap-10 grid-cols-3">
			<MessageCard>
				<h3 class="text-2xl font-bold mb-4">Ribbon</h3>
				<p class="opacity-60">
					Lorem ipsum dolor sit amet consectetur, adipisicing elit. Quidem natus optio incidunt
					placeat ab cumque ut laborum corporis omnis at fugit officiis
				</p>
				<div class="mt-4">
					<Button>Compare</Button>
					<Button>Paper</Button>
					<Button>Code</Button>
				</div>
			</MessageCard>
			<MessageCard>
				<h3 class="text-2xl font-bold mb-4">Ribbon</h3>
				<p class="opacity-60">
					Lorem ipsum dolor sit amet consectetur, adipisicing elit. Quidem natus optio incidunt
					placeat ab cumque ut laborum corporis omnis at fugit officiis
				</p>
				<div class="mt-4">
					<Button>Compare</Button>
					<Button>Paper</Button>
					<Button>Code</Button>
				</div>
			</MessageCard>
			<MessageCard>
				<h3 class="text-2xl font-bold mb-4">Ribbon</h3>
				<p class="opacity-60">
					Lorem ipsum dolor sit amet consectetur, adipisicing elit. Quidem natus optio incidunt
					placeat ab cumque ut laborum corporis omnis at fugit officiis
				</p>
				<div class="mt-4">
					<Button>Compare</Button>
					<Button>Paper</Button>
					<Button>Code</Button>
				</div>
			</MessageCard>
			<MessageCard>
				<h3 class="text-2xl font-bold mb-4">Ribbon</h3>
				<p class="opacity-60">
					Lorem ipsum dolor sit amet consectetur, adipisicing elit. Quidem natus optio incidunt
					placeat ab cumque ut laborum corporis omnis at fugit officiis
				</p>
				<div class="mt-4">
					<Button>Compare</Button>
					<Button>Paper</Button>
					<Button>Code</Button>
				</div>
			</MessageCard>
			<MessageCard>
				<h3 class="text-2xl font-bold mb-4">Ribbon</h3>
				<p class="opacity-60">
					Lorem ipsum dolor sit amet consectetur, adipisicing elit. Quidem natus optio incidunt
					placeat ab cumque ut laborum corporis omnis at fugit officiis
				</p>
				<div class="mt-4">
					<Button>Compare</Button>
					<Button>Paper</Button>
					<Button>Code</Button>
				</div>
			</MessageCard>
			<MessageCard>
				<h3 class="text-2xl font-bold mb-4">Ribbon</h3>
				<!-- <TableSelection /> -->
			</MessageCard>
			<MessageCard>
				<h3 class="text-2xl font-bold mb-4">Ribbon</h3>
				<!-- <TableSelection /> -->
			</MessageCard>
		</div>
	</div>
</div>
