export enum DialogSize {
	small = 'small',
	medium = 'medium',
	large = 'large'
}

export type DialogContextService = {
	close: () => void;
	open: () => void;
	toggle: () => boolean;
};
