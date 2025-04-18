import jwt, { Algorithm } from "jsonwebtoken";
import type { AuthCustomer } from "./auth";

// Your workspace credentials from Integration.app settings page
const WORKSPACE_KEY = process.env.INTEGRATION_APP_WORKSPACE_KEY;
const WORKSPACE_SECRET = process.env.INTEGRATION_APP_WORKSPACE_SECRET;

interface TokenData {
  id?: string;
  name?: string;
  isAdmin?: boolean;
}

export class IntegrationTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationTokenError";
  }
}

export async function generateAccessToken(
  tokenData: TokenData
): Promise<string> {
  if (!WORKSPACE_KEY || !WORKSPACE_SECRET) {
    throw new IntegrationTokenError(
      "Integration.app credentials not configured"
    );
  }

  try {
    const options = {
      issuer: WORKSPACE_KEY,
      expiresIn: 7200, // 2 hours
      algorithm: "HS512" as Algorithm,
    };

    return jwt.sign(tokenData, WORKSPACE_SECRET, options);
  } catch (error) {
    console.error("Error generating integration token:", error);
    throw new IntegrationTokenError("Failed to generate integration token");
  }
}

export async function generateCustomerAccessToken(
  auth: AuthCustomer
): Promise<string> {
  const tokenData: TokenData = {
    id: auth.customerId,
    name: auth.customerName || auth.customerId,
  };

  return generateAccessToken(tokenData);
}

export async function generateAdminAccessToken(): Promise<string> {
  const tokenData: TokenData = {
    isAdmin: true,
  };

  return generateAccessToken(tokenData);
}
