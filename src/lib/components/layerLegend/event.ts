export interface LayerSelectionEvent<A = object, B = object> {
	layer: A | B;
	index: number;
	subIndex?: number;
	parentLayer?: A;
}
