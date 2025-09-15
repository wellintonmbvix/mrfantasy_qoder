<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    export let currentImageUrl: string = '';
    export let disabled: boolean = false;
    
    const dispatch = createEventDispatcher();
    
    let fileInput: HTMLInputElement;
    let uploading = false;
    let dragActive = false;
    let error = '';
    
    async function handleFileSelect(event: Event) {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
            await uploadFile(file);
        }
    }
    
    async function uploadFile(file: File) {
        if (disabled) return;
        
        uploading = true;
        error = '';
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch('/api/products/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                dispatch('upload', {
                    imageUrl: result.imageUrl
                });
            } else {
                error = result.error || 'Erro no upload';
            }
        } catch (err) {
            error = 'Erro de conexão. Tente novamente.';
            console.error('Upload error:', err);
        } finally {
            uploading = false;
        }
    }
    
    function handleDragOver(event: DragEvent) {
        event.preventDefault();
        if (!disabled) {
            dragActive = true;
        }
    }
    
    function handleDragLeave(event: DragEvent) {
        event.preventDefault();
        dragActive = false;
    }
    
    async function handleDrop(event: DragEvent) {
        event.preventDefault();
        dragActive = false;
        
        if (disabled) return;
        
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            await uploadFile(files[0]);
        }
    }
    
    function removeImage() {
        dispatch('upload', { imageUrl: '' });
    }
    
    function openFileDialog() {
        if (!disabled) {
            fileInput.click();
        }
    }
</script>

<div class="space-y-3">
    <label for="product-image-upload" class="form-label">Imagem do produto</label>
    
    <!-- Preview da imagem atual -->
    {#if currentImageUrl}
        <div class="relative inline-block">
            <img 
                src={currentImageUrl} 
                alt="Preview do produto"
                class="w-32 h-32 object-cover rounded-lg border border-gray-200"
            />
            {#if !disabled}
                <button
                    type="button"
                    on:click={removeImage}
                    class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                    title="Remover imagem"
                >
                    ×
                </button>
            {/if}
        </div>
    {/if}
    
    <!-- Área de upload -->
    <div 
        class="border-2 border-dashed rounded-lg p-6 text-center transition-colors {dragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300'} {disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-400 hover:bg-gray-50 cursor-pointer'}"
        on:dragover={handleDragOver}
        on:dragleave={handleDragLeave}
        on:drop={handleDrop}
        on:click={openFileDialog}
        on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openFileDialog();
            }
        }}
        tabindex="0"
        role="button"
        aria-label="Área de upload de imagem"
    >
        {#if uploading}
            <div class="flex flex-col items-center">
                <svg class="animate-spin h-8 w-8 text-primary-600 mb-2" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p class="text-sm text-gray-600">Enviando imagem...</p>
            </div>
        {:else}
            <div class="flex flex-col items-center">
                <svg class="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p class="text-sm text-gray-600 mb-2">
                    {#if disabled}
                        Upload desabilitado
                    {:else}
                        Clique para selecionar ou arraste uma imagem aqui
                    {/if}
                </p>
                <p class="text-xs text-gray-500">JPG, JPEG, PNG ou WebP • Máximo 5MB</p>
            </div>
        {/if}
    </div>
    
    <!-- Input de arquivo oculto -->
    <input
        id="product-image-upload"
        bind:this={fileInput}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        on:change={handleFileSelect}
        class="hidden"
        {disabled}
    />
    
    <!-- Mensagem de erro -->
    {#if error}
        <p class="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
        </p>
    {/if}
</div>