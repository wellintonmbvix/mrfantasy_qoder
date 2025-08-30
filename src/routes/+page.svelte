<script lang="ts">
	import { goto } from '$app/navigation';
	
	function goToDashboard() {
		goto('/dashboard');
	}
	
	function goToLogin() {
		goto('/auth/login');
	}
</script>

<svelte:head>
	<title>Mr. Fantasy - Sistema de Aluguel de Fantasias</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
	<div class="max-w-md w-full space-y-8 p-8">
		<div class="text-center">
			<div class="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-primary-500">
				<svg class="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
				</svg>
			</div>
			<h1 class="mt-6 text-4xl font-extrabold text-gray-900">
				Mr. Fantasy
			</h1>
			<p class="mt-2 text-lg text-gray-600">
				Sistema de Aluguel de Fantasias
			</p>
			<p class="mt-1 text-sm text-gray-500">
				Gerencie seus aluguéis de fantasias de forma fácil e eficiente
			</p>
		</div>

		<div class="space-y-4">
			<button
				on:click={goToDashboard}
				class="btn btn-primary w-full text-lg py-3"
			>
				Acessar Dashboard
			</button>
			
			<button
				on:click={goToLogin}
				class="btn btn-secondary w-full text-lg py-3"
			>
				Fazer Login
			</button>
		</div>

		<div class="text-center">
			<p class="text-xs text-gray-400">
				Desenvolvido com SvelteKit e Tailwind CSS
			</p>
		</div>
	</div>
</div>