<script lang="ts">
	import { ui, type Notification } from '$lib/stores/ui.js';
	import { fade, fly } from 'svelte/transition';
	
	$: notifications = $ui.notifications;
	
	function getIcon(type: string) {
		switch (type) {
			case 'success':
				return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'error':
				return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'warning':
				return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z';
			case 'info':
				return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
			default:
				return '';
		}
	}
	
	function getColors(type: string) {
		switch (type) {
			case 'success':
				return {
					bg: 'bg-green-50',
					border: 'border-green-200',
					icon: 'text-green-400',
					text: 'text-green-800'
				};
			case 'error':
				return {
					bg: 'bg-red-50',
					border: 'border-red-200',
					icon: 'text-red-400',
					text: 'text-red-800'
				};
			case 'warning':
				return {
					bg: 'bg-yellow-50',
					border: 'border-yellow-200',
					icon: 'text-yellow-400',
					text: 'text-yellow-800'
				};
			case 'info':
				return {
					bg: 'bg-blue-50',
					border: 'border-blue-200',
					icon: 'text-blue-400',
					text: 'text-blue-800'
				};
			default:
				return {
					bg: 'bg-gray-50',
					border: 'border-gray-200',
					icon: 'text-gray-400',
					text: 'text-gray-800'
				};
		}
	}
	
	function removeNotification(id: string) {
		ui.removeNotification(id);
	}
</script>

<!-- Notifications Container -->
<div class="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
	{#each notifications as notification (notification.id)}
		{@const colors = getColors(notification.type)}
		<div
			transition:fly={{ x: 300, duration: 300 }}
			class="rounded-md border p-4 shadow-lg {colors.bg} {colors.border}"
		>
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 {colors.icon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getIcon(notification.type)} />
					</svg>
				</div>
				<div class="ml-3 flex-1">
					<p class="text-sm font-medium {colors.text}">
						{notification.message}
					</p>
				</div>
				<div class="ml-auto pl-3">
					<div class="-mx-1.5 -my-1.5">
						<button
							type="button"
							on:click={() => removeNotification(notification.id)}
							class="inline-flex rounded-md p-1.5 {colors.text} hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
						>
							<span class="sr-only">Dismiss</span>
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				</div>
			</div>
		</div>
	{/each}
</div>