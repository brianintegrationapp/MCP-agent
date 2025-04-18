import { v4 as uuidv4 } from 'uuid';

const AUTH_ID_KEY = 'integration_customer_id';
const CUSTOMER_NAME_KEY = 'integration_customer_name';

export type AuthCustomer = {
  customerId: string;
  customerName: string | null;
};

export function getStoredAuth(): AuthCustomer | null {
  if (typeof window === 'undefined') return null;
  
  const customerId = localStorage.getItem(AUTH_ID_KEY);
  const customerName = localStorage.getItem(CUSTOMER_NAME_KEY);
  
  if (!customerId) return null;
  
  return {
    customerId,
    customerName
  };
}

export function storeAuth(auth: AuthCustomer): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(AUTH_ID_KEY, auth.customerId);
  if (auth.customerName) {
    localStorage.setItem(CUSTOMER_NAME_KEY, auth.customerName);
  } else {
    localStorage.removeItem(CUSTOMER_NAME_KEY);
  }
}

export function generateAndStoreAuth(): AuthCustomer {
  const auth = {
    customerId: uuidv4(),
    customerName: null
  };
  storeAuth(auth);
  return auth;
}

export function ensureAuth(): AuthCustomer {
  const existingAuth = getStoredAuth();
  if (existingAuth) return existingAuth;
  return generateAndStoreAuth();
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_ID_KEY);
  localStorage.removeItem(CUSTOMER_NAME_KEY);
} 