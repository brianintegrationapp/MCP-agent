import { IntegrationAppClient } from "@integration-app/sdk";
import { generateCustomerAccessToken } from "./integration-token";
import type { AuthCustomer } from "./auth";

let clientInstance: IntegrationAppClient | null = null;

export class IntegrationClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationClientError";
  }
}

export async function getIntegrationClient(
  auth: AuthCustomer
): Promise<IntegrationAppClient> {
  try {
    // Generate a fresh token for the customer
    const token = await generateCustomerAccessToken(auth);

    // Create a new client instance with the fresh token
    // We create a new instance each time to ensure we're using a fresh token
    const client = new IntegrationAppClient({
      token,
    });

    return client;
  } catch (error) {
    console.error("Failed to initialize Integration.app client:", error);
    throw new IntegrationClientError(
      error instanceof Error
        ? error.message
        : "Failed to initialize Integration.app client"
    );
  }
}

/**
 * Use this when you need to ensure a single client instance is reused
 * Note: The token used will be from when the client was first initialized
 */
export async function getSharedIntegrationClient(
  auth: AuthCustomer
): Promise<IntegrationAppClient> {
  if (!clientInstance) {
    clientInstance = await getIntegrationClient(auth);
  }
  return clientInstance;
}

/**
 * Reset the shared client instance, forcing a new one to be created next time
 */
export function resetSharedIntegrationClient(): void {
  clientInstance = null;
}
