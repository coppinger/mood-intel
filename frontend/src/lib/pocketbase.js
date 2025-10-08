import PocketBase from 'pocketbase';

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8080');

// Auto-refresh auth on page load
pb.authStore.loadFromCookie(document.cookie);

export default pb;
