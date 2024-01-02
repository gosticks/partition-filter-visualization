<script lang="ts" context="module">
	import { colorBrewer } from '$lib/rendering/colors';
	import type { ValueRange } from '$lib/store/dataStore/filterActions';
	import { DataScaling } from '$lib/store/dataStore/types';

	export interface IGraph2dData {
		xAxisLabel?: string;
		yAxisLabel?: string;
		xRange: ValueRange;
		yRange: ValueRange;
		points: {
			color?: string;
			name?: string;
			data: number[][];
		}[];
	}
</script>

<script lang="ts">
	import * as d3 from 'd3';
	import { onDestroy, onMount } from 'svelte';

	export let data: IGraph2dData;
	export let height = 200;
	export let width = 300;
	export let xScale: DataScaling = DataScaling.LINEAR;
	export let yScale: DataScaling = DataScaling.LINEAR;
	export let xAxisOffset = 30;
	export let yAxisOffset = 20;

	let graphElement: HTMLDivElement;

	let svg: d3.Selection<SVGGElement, number[][], null, undefined>;
	let xAxis: d3.Selection<SVGGElement, number[][], null, undefined>;
	let yAxis: d3.Selection<SVGGElement, number[][], null, undefined>;
	let xAxisTitle: d3.Selection<SVGTextElement, number[][], null, undefined>;
	let yAxisTitle: d3.Selection<SVGTextElement, number[][], null, undefined>;
	let curves: d3.Selection<SVGPathElement, number[][], null, undefined>[] | undefined = undefined;

	function setupGraph() {
		svg = d3
			.select(graphElement)
			.append('svg')
			.attr('width', width + xAxisOffset + 15)
			.attr('height', height + yAxisOffset)
			.append('g') as typeof svg;
		svg.attr('transform', 'translate(' + xAxisOffset + ',' + yAxisOffset + ')');

		xAxis = svg.append('g').attr('opacity', 0.4);
		yAxis = svg.append('g').attr('opacity', 0.4);
		xAxisTitle = svg
			.append('text')
			.attr('class', 'd3-text')
			.attr('text-anchor', 'end')
			.attr('transform', `translate(${width + 2}, ${height - 30}), rotate(90)`);
		yAxisTitle = svg
			.append('text')
			.attr('text-anchor', 'start')
			.attr('class', 'd3-text')
			// .attr('transform', 'rotate(-90)')
			.attr('y', yAxisOffset - 10)
			.attr('x', xAxisOffset - 20);
	}

	function getScale(range: [number, number], domain: [number, number], scale: DataScaling) {
		switch (scale) {
			case DataScaling.LINEAR:
				return d3.scaleLinear().range(range).domain(domain);
			case DataScaling.LOG:
				return d3.scaleLog().range(range).domain(domain);
		}
	}

	function renderData(data: IGraph2dData, xScale: DataScaling, yScale: DataScaling) {
		if (!data || data.points.length === 0) {
			return;
		}

		console.log(data);

		const xAxisScale = getScale([0, width], data.xRange, xScale);
		xAxis
			.attr('transform', 'translate(0,' + (height - yAxisOffset) + ')')
			.call(d3.axisBottom(xAxisScale));

		// add the y Axis
		const yAxisScale = getScale([height - yAxisOffset, 0], data.yRange, yScale);
		yAxis.call(d3.axisLeft(yAxisScale));

		svg.selectAll('circle').remove();
		// remove all curves if number changes
		if (curves && curves.length !== data.points.length) {
			curves.forEach((curve) => curve.remove());
			curves = undefined;
		}

		if (!curves) {
			curves = data.points.map(() => svg.append('path'));
		}

		xAxisTitle.text(data.xAxisLabel ?? 'X');
		yAxisTitle.text(data.yAxisLabel ?? 'Y');

		// Update curves
		data.points.forEach((container, idx) => {
			(curves?.[idx] as any)
				.datum(container.data)
				.attr('class', 'line')
				.attr('fill', container.color ?? '#69b3a2')
				.attr('fill-opacity', 0.0)
				//.attr('opacity', '.1')
				.attr('stroke-width', 2)
				.attr('stroke-linejoin', 'round')
				.attr('stroke-opacity', 0.6)
				.attr('stroke', container.color ?? 'yellow')
				.transition()
				.attr(
					'd',
					d3
						.line()
						.x((d) => xAxisScale(Number(d[0])))
						.y((d) => yAxisScale(Number(d[1])))
						.curve(d3.curveLinear) as any
				);

			svg
				.selectAll('circle')
				.data(container.data)
				.enter()
				.append('circle')
				.attr('cx', (d) => xAxisScale(Number(d[0])))
				.attr('cy', (d) => yAxisScale(Number(d[1])))
				.transition()
				.attr('r', 2) // Radius of the circle
				.attr('fill', container.color ?? 'yellow'); // Color of the circle
		});
	}

	$: if (svg) {
		renderData(data, xScale, yScale);
	}

	onMount(async () => {
		setupGraph();
	});
</script>

<div class="d3-graph" bind:this={graphElement} />

<style lang="scss">
	:global(.d3-text) {
		@apply fill-slate-500;
		font-size: 16px;
	}

	:global(.dark .d3-text) {
		@apply fill-slate-200;
	}

	.d3-graph > :global(svg) {
		max-width: 100%;
	}
</style>
