interface ToastEntry {
	id: number;
	message: string;
}

let toasts: ToastEntry[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

function notify() {
	for (const fn of listeners) fn();
}

export function toast(message: string, duration = 2500) {
	const id = nextId++;
	toasts = [...toasts, { id, message }];
	notify();
	setTimeout(() => {
		toasts = toasts.filter((t) => t.id !== id);
		notify();
	}, duration);
}

export function subscribeToasts(fn: () => void) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

export function getToasts() {
	return toasts;
}
