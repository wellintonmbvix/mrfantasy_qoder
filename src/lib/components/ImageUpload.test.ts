import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImageUpload from '../components/ImageUpload.svelte';

// Mock fetch
global.fetch = vi.fn();

describe('ImageUpload', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders upload area with correct text', () => {
		render(ImageUpload);
		
		expect(screen.getByText('Imagem do produto')).toBeInTheDocument();
		expect(screen.getByText('Clique para selecionar ou arraste uma imagem aqui')).toBeInTheDocument();
		expect(screen.getByText('JPG, JPEG, PNG ou WebP • Máximo 5MB')).toBeInTheDocument();
	});

	it('shows image preview when currentImageUrl is provided', () => {
		render(ImageUpload, {
			props: {
				currentImageUrl: '/test-image.jpg'
			}
		});

		const image = screen.getByAltText('Preview do produto');
		expect(image).toBeInTheDocument();
		expect(image).toHaveAttribute('src', '/test-image.jpg');
	});

	it('disables upload when disabled prop is true', () => {
		render(ImageUpload, {
			props: {
				disabled: true
			}
		});

		expect(screen.getByText('Upload desabilitado')).toBeInTheDocument();
		
		const uploadArea = screen.getByRole('button', { name: 'Área de upload de imagem' });
		expect(uploadArea).toHaveClass('cursor-not-allowed');
	});

	it('dispatches upload event when image is removed', async () => {
		const { component } = render(ImageUpload, {
			props: {
				currentImageUrl: '/test-image.jpg'
			}
		});

		let uploadEvent: any = null;
		component.$on('upload', (event) => {
			uploadEvent = event.detail;
		});

		const removeButton = screen.getByTitle('Remover imagem');
		await fireEvent.click(removeButton);

		expect(uploadEvent).toEqual({ imageUrl: '' });
	});

	it('shows error message when upload fails', async () => {
		// Mock fetch to return error
		(global.fetch as any).mockResolvedValueOnce({
			json: async () => ({ success: false, error: 'Arquivo muito grande' })
		});

		const { component } = render(ImageUpload);

		const fileInput = screen.getByDisplayValue('');
		const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

		await fireEvent.change(fileInput, { target: { files: [file] } });

		// Wait for async operations
		await new Promise(resolve => setTimeout(resolve, 100));

		expect(screen.getByText('Arquivo muito grande')).toBeInTheDocument();
	});

	it('shows success and dispatches event when upload succeeds', async () => {
		// Mock fetch to return success
		(global.fetch as any).mockResolvedValueOnce({
			json: async () => ({ 
				success: true, 
				imageUrl: '/uploads/products/test.jpg',
				message: 'Upload realizado com sucesso'
			})
		});

		const { component } = render(ImageUpload);

		let uploadEvent: any = null;
		component.$on('upload', (event) => {
			uploadEvent = event.detail;
		});

		const fileInput = screen.getByDisplayValue('');
		const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

		await fireEvent.change(fileInput, { target: { files: [file] } });

		// Wait for async operations
		await new Promise(resolve => setTimeout(resolve, 100));

		expect(uploadEvent).toEqual({ imageUrl: '/uploads/products/test.jpg' });
	});
});