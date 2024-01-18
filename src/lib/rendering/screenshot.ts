export function canvasFilledRegionBounds(ctx: WebGL2RenderingContext | WebGLRenderingContext) {
	const pixels = new Uint8ClampedArray(ctx.drawingBufferWidth * ctx.drawingBufferHeight * 4);

	ctx.readPixels(
		0,
		0,
		ctx.drawingBufferWidth,
		ctx.drawingBufferHeight,
		ctx.RGBA,
		ctx.UNSIGNED_BYTE,
		pixels
	);

	const pixelCount = pixels.length;
	const bound = {
		top: -1,
		left: -1,
		right: -1,
		bottom: -1
	};
	let x = 0;
	let y = 0;
	for (let i = 0; i < pixelCount; i += 4) {
		if (pixels[i + 3] !== 0) {
			x = (i / 4) % ctx.drawingBufferWidth;
			y = ~~(i / 4 / ctx.drawingBufferWidth);
			if (bound.top === -1) {
				bound.top = y;
			}
			if (bound.left === -1) {
				bound.left = x;
			} else if (x < bound.left) {
				bound.left = x;
			}
			if (bound.right === -1) {
				bound.right = x;
			} else if (bound.right < x) {
				bound.right = x;
			}
			if (bound.bottom === -1) {
				bound.bottom = y;
			} else if (bound.bottom < y) {
				bound.bottom = y;
			}
		}
	}

	return bound;
}

export function drawCanvasToCanvas(
	srcCtx: WebGL2RenderingContext | WebGLRenderingContext,
	dstCtx: CanvasRenderingContext2D,
	bound: ReturnType<typeof canvasFilledRegionBounds>
) {
	dstCtx.drawImage(
		srcCtx.canvas,
		-bound.left,
		-(srcCtx.drawingBufferHeight - bound.bottom), // canvas2d is inverted compared to pixels of canvas 3d
		srcCtx.drawingBufferWidth,
		srcCtx.drawingBufferHeight
	);
}

export function imageFromGlContext(
	ctx: WebGLRenderingContext | WebGL2RenderingContext,
	backgroundFill?: string | CanvasGradient | CanvasPattern
): string | null {
	const copyCtx = document.createElement('canvas').getContext('2d');
	if (!copyCtx) {
		return null;
	}
	const bound = canvasFilledRegionBounds(ctx);
	const trimHeight = bound.bottom - bound.top,
		trimWidth = bound.right - bound.left;

	copyCtx.canvas.width = trimWidth;
	copyCtx.canvas.height = trimHeight;
	if (backgroundFill) {
		copyCtx.fillStyle = backgroundFill;
		copyCtx.fillRect(0, 0, copyCtx.canvas.width, copyCtx.canvas.height);
	}
	drawCanvasToCanvas(ctx, copyCtx, bound);
	return copyCtx.canvas.toDataURL('image/png');
}
