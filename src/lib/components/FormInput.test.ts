import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FormInput from '$lib/components/FormInput.svelte';

describe('FormInput Component', () => {
	it('should render input with label', () => {
		render(FormInput, {
			props: {
				id: 'test-input',
				label: 'Test Label',
				value: '',
				required: true
			}
		});

		expect(screen.getByLabelText(/Test Label/)).toBeInTheDocument();
		expect(screen.getByText('*')).toBeInTheDocument(); // Required indicator
	});

	it('should display error message when error prop is provided', () => {
		const errorMessage = 'This field is required';
		
		render(FormInput, {
			props: {
				id: 'test-input',
				label: 'Test Label',
				value: '',
				error: errorMessage
			}
		});

		expect(screen.getByText(errorMessage)).toBeInTheDocument();
		const input = screen.getByLabelText(/Test Label/);
		expect(input).toHaveClass('border-red-300');
	});

	it('should display help text when no error is present', () => {
		const helpText = 'Enter your full name';
		
		render(FormInput, {
			props: {
				id: 'test-input',
				label: 'Name',
				value: '',
				helpText: helpText
			}
		});

		expect(screen.getByText(helpText)).toBeInTheDocument();
	});

	it('should call formatter function when provided', async () => {
		const formatter = vi.fn((value: string) => value.toUpperCase());
		
		render(FormInput, {
			props: {
				id: 'test-input',
				label: 'Test Label',
				value: '',
				formatter
			}
		});

		const input = screen.getByLabelText(/Test Label/);
		await fireEvent.input(input, { target: { value: 'hello' } });

		expect(formatter).toHaveBeenCalledWith('hello');
	});

	it('should be disabled when disabled prop is true', () => {
		render(FormInput, {
			props: {
				id: 'test-input',
				label: 'Test Label',
				value: '',
				disabled: true
			}
		});

		const input = screen.getByLabelText(/Test Label/);
		expect(input).toBeDisabled();
	});

	it('should apply custom CSS classes', () => {
		render(FormInput, {
			props: {
				id: 'test-input',
				label: 'Test Label',
				value: '',
				inputClass: 'custom-class'
			}
		});

		const input = screen.getByLabelText(/Test Label/);
		expect(input).toHaveClass('custom-class');
	});

	it('should set correct input type', () => {
		render(FormInput, {
			props: {
				id: 'email-input',
				label: 'Email',
				value: '',
				type: 'email'
			}
		});

		const input = screen.getByLabelText(/Email/);
		expect(input).toHaveAttribute('type', 'email');
	});

	it('should set placeholder text', () => {
		const placeholder = 'Enter your email';
		
		render(FormInput, {
			props: {
				id: 'email-input',
				label: 'Email',
				value: '',
				placeholder
			}
		});

		const input = screen.getByLabelText(/Email/);
		expect(input).toHaveAttribute('placeholder', placeholder);
	});
});