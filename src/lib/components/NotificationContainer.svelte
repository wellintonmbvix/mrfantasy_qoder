<script lang="ts">
	import { notificationStore } from '$lib/stores/notifications.js';
	import { fade } from 'svelte/transition';

	let notifications: any[] = [];

	$: {
		notifications = $notificationStore || [];		
	}

	function closeNotification(id: string) {
		notificationStore.remove(id);
	}

	function getIconForType(type: string) {
		switch (type) {
			case 'success':
				return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'error':
				return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z';
			case 'warning':
				return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z';
			case 'info':
			default:
				return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
		}
	}

	function getColorClasses(type: string) {
		switch (type) {
			case 'success':
				return 'bg-green-50 border-green-200 text-green-800';
			case 'error':
				return 'bg-red-50 border-red-200 text-red-800';
			case 'warning':
				return 'bg-yellow-50 border-yellow-200 text-yellow-800';
			case 'info':
			default:
				return 'bg-blue-50 border-blue-200 text-blue-800';
		}
	}

	function getIconColorClass(type: string) {
		switch (type) {
			case 'success':
				return 'text-green-400';
			case 'error':
				return 'text-red-400';
			case 'warning':
				return 'text-yellow-400';
			case 'info':
			default:
				return 'text-blue-400';
		}
	}
</script>

<!-- Notification Container -->
{#if notifications.length > 0}
	<div 
		class="fixed top-4 right-4 z-[9999] space-y-2 w-96"
		role="alert"
		aria-live="polite"
		style="z-index: 9999; pointer-events: none;"
	>
		{#each notifications as notification (notification.id)}
			<div
				transition:fade={{ duration: 300 }}
				class="rounded-lg border p-4 shadow-lg {getColorClasses(notification.type)}"
				style="pointer-events: auto;"
			>
				<div class="flex items-start">
					<div class="flex-shrink-0">
						<svg 
							class="h-5 w-5 {getIconColorClass(notification.type)}" 
							fill="none" 
							viewBox="0 0 24 24" 
							stroke="currentColor"
						>
							<path 
								stroke-linecap="round" 
								stroke-linejoin="round" 
								stroke-width="2" 
								d={getIconForType(notification.type)} 
							/>
						</svg>
					</div>
					<div class="ml-3 flex-1">
						<p class="text-sm font-medium">{notification.message}</p>
					</div>
					<div class="ml-4 flex-shrink-0">
						<button
							type="button"
							class="inline-flex rounded-md p-1.5 transition-colors hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2"
							on:click={() => closeNotification(notification.id)}
						>
							<span class="sr-only">Fechar</span>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path 
									stroke-linecap="round" 
									stroke-linejoin="round" 
									stroke-width="2" 
									d="M6 18L18 6M6 6l12 12" 
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}