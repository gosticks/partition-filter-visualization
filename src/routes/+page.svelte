<script lang="ts">
	import { base } from '$app/paths';
	import Button from '$lib/components/button/Button.svelte';
	import { ButtonColor, ButtonSize } from '$lib/components/button/type';
	import DropZone from '$lib/components/DropZone.svelte';
	import GridBackground from '$lib/components/GridBackground.svelte';
	import MessageCard from '$lib/components/MessageCard.svelte';

	function onCsvDropped(files: FileList) {
		// TODO: load csv in Data loader
		alert('TODO: load CSV');

		console.log('Loaded files:', files);
	}
</script>

<GridBackground />
<div class="relative h-screen flex flex-col gap-10 justify-center items-center">
	<MessageCard>
		<h1 class="text-3xl font-extrabold mb-5">Partition Filter (Find headline)</h1>
		<p>
			Lorem ipsum dolor sit amet, consectetur adipisicing elit. Eveniet cumque eligendi cupiditate,
			libero consequuntur sed dolores dolorum sint nisi veritatis autem! Sequi facilis cumque sunt
			ut et quos animi eveniet.
		</p>
		<div class="flex gap-2 mt-6 h-min">
			<Button size={ButtonSize.LG}>Upload CSV</Button><a href="{base}/graph"
				><Button size={ButtonSize.LG} color={ButtonColor.SECONDARY}>View Existing</Button></a
			>
		</div>
		<DropZone onFileDropped={onCsvDropped} />
	</MessageCard>
</div>
