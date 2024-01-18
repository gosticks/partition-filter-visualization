<script lang="ts">
	import type { INotification } from '$lib/store/notificationStore';
	import notificationStore, { NotificationType } from '$lib/store/notificationStore';
	import { XIcon } from 'svelte-feather-icons';
	import Button from './button/Button.svelte';
	import { ButtonColor, ButtonSize, ButtonVariant } from './button/type';
	import { fadeSlide } from '$lib/transitions/fadeSlide';

	export let notification: INotification;

	const getButtonType = (notification: INotification): ButtonColor => {
		switch (notification.type) {
			case NotificationType.error:
				return ButtonColor.ERROR;
			case NotificationType.info:
				return ButtonColor.INFO;
			case NotificationType.success:
				return ButtonColor.SUCCESS;
		}
	};

	let buttonType = getButtonType(notification);

	$: buttonType = getButtonType(notification);
</script>

<div
	transition:fadeSlide={{ duration: 70 }}
	class="px-3 py-2 shadow-xl max-w-xl rounded-xl max-w-full break-words border"
	class:bg-red-500={notification.type === NotificationType.error}
	class:border-red-600={notification.type === NotificationType.error}
	class:text-red-200={notification.type === NotificationType.error}
	class:dark:bg-red-800={notification.type === NotificationType.error}
	class:dark:border-red-600={notification.type === NotificationType.error}
	class:dark:text-red-400={notification.type === NotificationType.error}
	class:bg-primary-200={notification.type === NotificationType.info}
	class:border-primary-400={notification.type === NotificationType.info}
	class:text-primary-800={notification.type === NotificationType.info}
	class:dark:bg-primary-800={notification.type === NotificationType.info}
	class:dark:border-primary-600={notification.type === NotificationType.info}
	class:dark:text-primary-400={notification.type === NotificationType.info}
	class:bg-green-500={notification.type === NotificationType.success}
	class:border-green-600={notification.type === NotificationType.success}
	class:text-green-100={notification.type === NotificationType.success}
	class:dark:bg-green-800={notification.type === NotificationType.success}
	class:dark:border-green-600={notification.type === NotificationType.success}
	class:dark:text-green-400={notification.type === NotificationType.success}
>
	<div class="flex gap-1 justify-between">
		<h3 class="font-bold line-clamp-1 break-all">{notification.message}</h3>
		<Button
			variant={ButtonVariant.LINK}
			on:click={() => notificationStore.removeNotification(notification.id)}
			size={ButtonSize.SM}
			color={buttonType}><XIcon size={'16'} /></Button
		>
	</div>
	{#if notification.description} <p class="line-clamp-2">{notification.description}</p> {/if}

	{#if notification.callback}
		<div class="text-right">
			<Button size={ButtonSize.SM} color={buttonType} on:click={notification.callback}
				>{notification.callbackLabel ?? 'more'}</Button
			>
		</div>
	{/if}
</div>
