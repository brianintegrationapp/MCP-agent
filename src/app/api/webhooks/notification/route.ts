import { generateAdminAccessToken } from "@/lib/integration-token";
import { NextResponse } from "next/server";
import axios from "axios";
import connectDB from "@/lib/mongodb";
import { DocumentModel } from "@/models/document";
import { DownloadState } from "@/types/download";

const INTEGRATION_APP_API_URL = "https://api.integration.app";

const FLOW_KEYS = {
  DOWNLOAD_DOCUMENT: "download-document",
} as const;

// Types
interface FlowRunInput {
  documentId: string;
}

interface FlowRunData {
  flowRun: {
    universalFlowId: string;
    connectionId: string;
    input: FlowRunInput[];
  };
}

interface WebhookRequest {
  eventType: string;
  data: FlowRunData;
}

interface FlowResponse {
  key: string;
  // Add other flow response fields as needed
}

async function handleDownloadFlow(connectionId: string, documentId: string) {
  try {
    const result = await DocumentModel.findOneAndUpdate(
      {
        connectionId,
        id: documentId,
      },
      {
        $set: {
          downloadState: DownloadState.FAILED,
          downloadError: "Flow execution failed",
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!result) {
      console.error(
        `Document not found: ${documentId} for connection: ${connectionId}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error handling download flow:", error);
    return false;
  }
}

export async function POST(request: Request) {
  console.log("Received webhook notification");

  try {
    const body: WebhookRequest = await request.json();

    if (!body.eventType || !body.data?.flowRun) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const adminAccessToken = await generateAdminAccessToken();
    await connectDB();

    if (body.eventType === "flowRun.failed") {
      const { universalFlowId, connectionId, input } = body.data.flowRun;

      const response = await axios.get<FlowResponse>(
        `${INTEGRATION_APP_API_URL}/flows/${universalFlowId}`,
        {
          headers: {
            Authorization: `Bearer ${adminAccessToken}`,
          },
        }
      );

      const { key } = response.data;
      const documentId = input[0].documentId;

      if (key === FLOW_KEYS.DOWNLOAD_DOCUMENT) {
        await handleDownloadFlow(connectionId, documentId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
