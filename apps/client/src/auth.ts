import { ref } from 'vue';
import { authResponseSchema, type Account, type Credentials } from '@lt/contracts';
import { ApiError, authRequest } from './api';

export const currentAccount = ref<Account | null>(null);
export async function restoreAccount() {
  try { currentAccount.value = authResponseSchema.parse(await authRequest('/me')).user; }
  catch (error) {
    if (error instanceof ApiError && error.status === 401) { currentAccount.value = null; return; }
    throw error;
  }
}
export async function authenticate(mode: 'login' | 'register', credentials: Credentials) {
  currentAccount.value = authResponseSchema.parse(await authRequest(`/${mode}`, 'POST', credentials)).user;
}
export async function logout() {
  await authRequest('/logout', 'POST');
  currentAccount.value = null;
}
// Only known internal destinations are accepted; no arbitrary redirects.
export function loginDestination(value?: string) {
  try { return decodeURIComponent(value ?? '') === '/pages/discover/index' ? '/pages/discover/index' : '/pages/me/index'; }
  catch { return '/pages/me/index'; }
}
