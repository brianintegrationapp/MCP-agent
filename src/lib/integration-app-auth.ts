import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const INTEGRATION_APP_TOKEN_HEADER = 'x-integration-app-token';
const WORKSPACE_SECRET = process.env.INTEGRATION_APP_WORKSPACE_SECRET!;

interface IntegrationAppTokenPayload {
  iss: string | undefined; // Workspace key
  sub: string | undefined; // User ID
  fields: Record<string, unknown>; // User fields
}

export async function verifyIntegrationAppToken(request: NextRequest): Promise<IntegrationAppTokenPayload | null> {
  const token = request.headers.get(INTEGRATION_APP_TOKEN_HEADER);
  
  if (!token) {
    return null;
  }

  try {
    const encoder = new TextEncoder();
    const { payload } = await jwtVerify(
      token,
      encoder.encode(WORKSPACE_SECRET)
    );

    return {
      iss: payload.iss,
      sub: payload.sub,
      fields: payload.fields as Record<string, unknown>,
    };
  } catch (error) {
    console.error('Failed to verify integration.app token:', error);
    return null;
  }
} 