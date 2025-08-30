
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/auth" | "/api/auth/login" | "/api/auth/logout" | "/api/auth/me" | "/api/customers" | "/api/customers/[id]" | "/api/groups" | "/api/groups/[id]" | "/api/orders" | "/api/orders/[id]" | "/api/products" | "/api/products/[id]" | "/api/test" | "/api/users" | "/api/users/[id]" | "/auth" | "/auth/login" | "/customers" | "/dashboard" | "/orders" | "/products" | "/users";
		RouteParams(): {
			"/api/customers/[id]": { id: string };
			"/api/groups/[id]": { id: string };
			"/api/orders/[id]": { id: string };
			"/api/products/[id]": { id: string };
			"/api/users/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/api": { id?: string };
			"/api/auth": Record<string, never>;
			"/api/auth/login": Record<string, never>;
			"/api/auth/logout": Record<string, never>;
			"/api/auth/me": Record<string, never>;
			"/api/customers": { id?: string };
			"/api/customers/[id]": { id: string };
			"/api/groups": { id?: string };
			"/api/groups/[id]": { id: string };
			"/api/orders": { id?: string };
			"/api/orders/[id]": { id: string };
			"/api/products": { id?: string };
			"/api/products/[id]": { id: string };
			"/api/test": Record<string, never>;
			"/api/users": { id?: string };
			"/api/users/[id]": { id: string };
			"/auth": Record<string, never>;
			"/auth/login": Record<string, never>;
			"/customers": Record<string, never>;
			"/dashboard": Record<string, never>;
			"/orders": Record<string, never>;
			"/products": Record<string, never>;
			"/users": Record<string, never>
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/auth" | "/api/auth/" | "/api/auth/login" | "/api/auth/login/" | "/api/auth/logout" | "/api/auth/logout/" | "/api/auth/me" | "/api/auth/me/" | "/api/customers" | "/api/customers/" | `/api/customers/${string}` & {} | `/api/customers/${string}/` & {} | "/api/groups" | "/api/groups/" | `/api/groups/${string}` & {} | `/api/groups/${string}/` & {} | "/api/orders" | "/api/orders/" | `/api/orders/${string}` & {} | `/api/orders/${string}/` & {} | "/api/products" | "/api/products/" | `/api/products/${string}` & {} | `/api/products/${string}/` & {} | "/api/test" | "/api/test/" | "/api/users" | "/api/users/" | `/api/users/${string}` & {} | `/api/users/${string}/` & {} | "/auth" | "/auth/" | "/auth/login" | "/auth/login/" | "/customers" | "/customers/" | "/dashboard" | "/dashboard/" | "/orders" | "/orders/" | "/products" | "/products/" | "/users" | "/users/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}