import { getAuthHeaders } from "@/app/auth-provider";

export async function startSync(
  connectionId: string,
  integration: {
    key: string;
    name: string;
    logoUri: string;
  }
) {
  const response = await fetch(`/api/integrations/${connectionId}/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      integrationId: integration.key,
      integrationName: integration.name,
      integrationLogo: integration.logoUri,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to start sync");
  }

  return response.json();
}
