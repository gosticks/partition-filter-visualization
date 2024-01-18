export type Jsonable =
	| string
	| number
	| boolean
	| null
	| undefined
	| readonly Jsonable[]
	| { readonly [key: string]: Jsonable }
	| { toJSON(): Jsonable };

export class PostProeccingError extends Error {
	public readonly context?: Jsonable;

	constructor(message: string, options: { cause?: unknown; context?: Jsonable } = {}) {
		const { cause, context } = options;

		super(message, { cause });
		this.name = this.constructor.name;
		this.context = context;
	}
}
