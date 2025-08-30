<script lang="ts">
	export let id: string;
	export let label: string;
	export let value: string = '';
	export let placeholder: string = '';
	export let required: boolean = false;
	export let disabled: boolean = false;
	export let error: string = '';
	export let helpText: string = '';
	export let rows: number = 3;
	export let maxlength: number | undefined = undefined;
	export let textareaClass: string = '';
	
	let textareaElement: HTMLTextAreaElement;
	
	function handleInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		value = target.value;
	}
	
	function handleBlur(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		target.dispatchEvent(new CustomEvent('field-blur', {
			detail: { value: target.value }
		}));
	}
	
	$: hasError = !!error;
	$: fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`;
	$: remainingChars = maxlength ? maxlength - value.length : null;
</script>

<div class="form-field">
	<label for={fieldId} class="form-label">
		{label}
		{#if required}
			<span class="text-red-500 ml-1">*</span>
		{/if}
		{#if maxlength && remainingChars !== null}
			<span class="text-sm text-gray-500 ml-auto">
				{remainingChars}/{maxlength}
			</span>
		{/if}
	</label>
	
	<textarea
		bind:this={textareaElement}
		{id}
		{value}
		{placeholder}
		{required}
		{disabled}
		{rows}
		{maxlength}
		class="form-input {textareaClass} {hasError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}"
		on:input={handleInput}
		on:blur={handleBlur}
		on:focus
		on:keydown
		on:keyup
		on:change
	></textarea>
	
	{#if hasError}
		<p class="mt-1 text-sm text-red-600 flex items-center">
			<svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
			</svg>
			{error}
		</p>
	{:else if helpText}
		<p class="mt-1 text-sm text-gray-500">{helpText}</p>
	{/if}
</div>

<style>
	.form-field {
		@apply w-full;
	}
</style>