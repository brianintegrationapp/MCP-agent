import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/server-auth";
import {
  generateCustomerAccessToken,
  IntegrationTokenError,
} from "@/lib/integration-token";

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const token = await generateCustomerAccessToken(auth);
    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    if (error instanceof IntegrationTokenError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
