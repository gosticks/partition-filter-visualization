<script lang="ts">
	let className: string = '';
	export { className as class };
</script>

<h2 class="font-bold text-xl {className}"><slot /></h2>
