<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { auth, user as authUser, isAuthenticated } from '$lib/stores/auth.js';
	import NotificationContainer from '$lib/components/NotificationContainer.svelte';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	// Set auth store user on mount and when data changes
	$: if (data.user) {
		auth.setUser(data.user);
	} else if (data.user === null) {
		auth.setUser(null);
	}
	
	// Reactive declarations
	let user: any;
	let isAuthPage: boolean;
	let allNavigationItems: any[];
	
	$: {
		user = $authUser || data.user;
		isAuthPage = $page.url.pathname.startsWith('/auth');
		// Adicionar item de empresa para Admin e Manager
		const companyItems = (user?.role === 'ADMIN' || user?.role === 'MANAGER') ? [
			{
				name: 'Empresa',
				href: '/company',
				icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 8v-4a1 1 0 011-1h2a1 1 0 011 1v4M7 21h10'
			}
		] : [];
		allNavigationItems = user?.role === 'ADMIN' 
			? [...navigationItems, ...companyItems, ...adminItems] 
			: [...navigationItems, ...companyItems];
	}

	async function logout() {
		try {
			await auth.logout();
			await goto('/auth/login', { invalidateAll: true });
		} catch (error) {
			console.error('Erro ao fazer logout:', error);
		}
	}

	const navigationItems = [
		{
			name: 'Dashboard',
			href: '/dashboard',
			icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586l-2 2V5H5v14h7v2H4a1 1 0 01-1-1V4z'
		},
		{
			name: 'Clientes',
			href: '/customers',
			icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z'
		},
		{
			name: 'Produtos',
			href: '/products',
			icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 21h6'
		},
		{
			name: 'Pedidos',
			href: '/orders',
			icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0.621 0 1.125-.504 1.125-1.125V9.375c0-.621.504-1.125 1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z'
		}
	];

	const adminItems = [
		{
			name: 'Usuários',
			href: '/users',
			icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z'
		},
		{
			name: 'Meios de Pagamento',
			href: '/payment-methods',
			icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z'
		}
	];
</script>

<svelte:head>
	<title>Mr. Fantasy - Sistema de Aluguel de Fantasias</title>
</svelte:head>

{#if $isAuthenticated && !isAuthPage}
	<div class="min-h-full">
		<!-- Sidebar -->
		<div class="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
			<div class="flex-1 flex flex-col min-h-0 bg-primary-800">
				<div class="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
					<!-- Logo -->
					<div class="flex items-center flex-shrink-0 px-4">
						<h1 class="text-white text-xl font-bold">Mr. Fantasy</h1>
					</div>

					<!-- Navigation -->
					<nav class="mt-5 flex-1 px-2 space-y-1">
						{#each allNavigationItems as item}
							<a
								href={item.href}
								class="group flex items-center px-2 py-2 text-sm leading-5 font-medium rounded-md transition ease-in-out duration-150 {$page.url.pathname.startsWith(item.href) 
									? 'text-white bg-primary-900' 
									: 'text-primary-200 hover:text-white hover:bg-primary-700'}"
							>
								<svg class="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
								</svg>
								{item.name}
							</a>
						{/each}
					</nav>
				</div>

				<!-- User menu -->
				<div class="flex-shrink-0 flex bg-primary-700 p-4">
					<div class="flex items-center">
						<div>
							<p class="text-sm leading-5 font-medium text-white">{user?.username}</p>
							<p class="text-xs leading-4 text-primary-300">{user?.role}</p>
						</div>
						<!-- svelte-ignore a11y_consider_explicit_label -->
						<button
							on:click={logout}
							class="ml-auto text-primary-200 hover:text-white transition-colors"
							title="Sair"
						>
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
							</svg>
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Mobile sidebar -->
		<div class="md:hidden">
			<!-- Mobile menu button -->
			<div class="bg-primary-800 px-4 py-3 flex items-center justify-between">
				<h1 class="text-white text-lg font-bold">Mr. Fantasy</h1>
				<!-- svelte-ignore a11y_consider_explicit_label -->
				<button class="text-white">
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Main content -->
		<div class="md:pl-64 flex flex-col flex-1">
			<main class="flex-1">
				<div class="py-6">
					<div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
						<slot />
					</div>
				</div>
			</main>
		</div>
	</div>
{:else}
	<!-- Auth pages or not authenticated -->
	<slot />
{/if}

<!-- Notifications -->
<NotificationContainer />