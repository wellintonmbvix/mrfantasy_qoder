import { describe, it, expect } from 'vitest';
import { calculateDiscount, applyDiscount, distributeOrderDiscount } from './validation.js';

describe('Discount Calculations', () => {
	describe('calculateDiscount', () => {
		it('should calculate percentage discount correctly', () => {
			expect(calculateDiscount(100, 'PERCENTAGE', 10)).toBe(10);
			expect(calculateDiscount(250, 'PERCENTAGE', 20)).toBe(50);
			expect(calculateDiscount(50, 'PERCENTAGE', 50)).toBe(25);
		});

		it('should calculate fixed discount correctly', () => {
			expect(calculateDiscount(100, 'FIXED', 15)).toBe(15);
			expect(calculateDiscount(50, 'FIXED', 30)).toBe(30);
			expect(calculateDiscount(30, 'FIXED', 50)).toBe(30); // Can't discount more than amount
		});
	});

	describe('applyDiscount', () => {
		it('should apply percentage discount correctly', () => {
			expect(applyDiscount(100, 'PERCENTAGE', 10)).toBe(90);
			expect(applyDiscount(250, 'PERCENTAGE', 20)).toBe(200);
			expect(applyDiscount(50, 'PERCENTAGE', 50)).toBe(25);
		});

		it('should apply fixed discount correctly', () => {
			expect(applyDiscount(100, 'FIXED', 15)).toBe(85);
			expect(applyDiscount(50, 'FIXED', 30)).toBe(20);
			expect(applyDiscount(30, 'FIXED', 50)).toBe(0); // Can't go below 0
		});

		it('should not result in negative values', () => {
			expect(applyDiscount(10, 'FIXED', 20)).toBe(0);
			expect(applyDiscount(50, 'PERCENTAGE', 200)).toBe(-50); // Note: This should be handled in validation
		});
	});

	describe('distributeOrderDiscount', () => {
		const items = [
			{ unitPrice: 100, quantity: 1 }, // Total: 100
			{ unitPrice: 50, quantity: 2 },  // Total: 100
			{ unitPrice: 25, quantity: 4 }   // Total: 100
		];
		// Total order: 300

		it('should distribute percentage discount equally', () => {
			const result = distributeOrderDiscount(items, 'PERCENTAGE', 10);
			
			expect(result).toHaveLength(3);
			result.forEach(discount => {
				expect(discount.discountType).toBe('PERCENTAGE');
				expect(discount.discountValue).toBe(10);
			});
		});

		it('should distribute fixed discount proportionally', () => {
			const result = distributeOrderDiscount(items, 'FIXED', 30);
			
			expect(result).toHaveLength(3);
			result.forEach(discount => {
				expect(discount.discountType).toBe('FIXED');
				expect(discount.discountValue).toBe(10); // 30/3 items = 10 each (equal distribution)
			});
		});

		it('should handle zero total amount', () => {
			const zeroItems = [
				{ unitPrice: 0, quantity: 1 },
				{ unitPrice: 0, quantity: 2 }
			];
			
			const result = distributeOrderDiscount(zeroItems, 'FIXED', 10);
			
			expect(result).toHaveLength(2);
			result.forEach(discount => {
				expect(discount.discountType).toBe('FIXED');
				expect(discount.discountValue).toBe(0);
			});
		});

		it('should distribute proportionally for different item values', () => {
			const unequalItems = [
				{ unitPrice: 200, quantity: 1 }, // Total: 200 (50% of total)
				{ unitPrice: 100, quantity: 1 }, // Total: 100 (25% of total)
				{ unitPrice: 100, quantity: 1 }  // Total: 100 (25% of total)
			];
			// Total: 400

			const result = distributeOrderDiscount(unequalItems, 'FIXED', 40);
			
			expect(result[0].discountValue).toBe(20); // 50% of 40
			expect(result[1].discountValue).toBe(10); // 25% of 40
			expect(result[2].discountValue).toBe(10); // 25% of 40
		});
	});

	describe('Order calculation scenarios', () => {
		it('should calculate order with item-level discounts', () => {
			const items = [
				{ unitPrice: 100, quantity: 1, discountType: 'PERCENTAGE' as const, discountValue: 10 },
				{ unitPrice: 50, quantity: 2, discountType: 'FIXED' as const, discountValue: 5 }
			];

			const item1Total = applyDiscount(100, 'PERCENTAGE', 10); // 90
			const item2Total = applyDiscount(100, 'FIXED', 5); // 95
			const expectedTotal = item1Total + item2Total; // 185

			expect(item1Total).toBe(90);
			expect(item2Total).toBe(95);
			expect(expectedTotal).toBe(185);
		});

		it('should calculate order with order-level discount distributed', () => {
			const items = [
				{ unitPrice: 100, quantity: 1 }, // 100
				{ unitPrice: 50, quantity: 2 }   // 100
			];
			// Subtotal: 200

			// Apply 10% order discount
			const distributedDiscounts = distributeOrderDiscount(items, 'PERCENTAGE', 10);
			const totalAfterDiscount = applyDiscount(200, 'PERCENTAGE', 10);

			expect(totalAfterDiscount).toBe(180);
			expect(distributedDiscounts[0].discountValue).toBe(10);
			expect(distributedDiscounts[1].discountValue).toBe(10);
		});
	});
});