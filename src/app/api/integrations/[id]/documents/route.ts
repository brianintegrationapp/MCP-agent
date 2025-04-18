import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { DocumentModel } from "@/models/document";
import { KnowledgeModel } from "@/models/knowledge";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const connectionId = (await params).id;

    if (!connectionId) {
      return NextResponse.json({ documents: [] });
    }

    await connectDB();

    const documents = await DocumentModel.find({ connectionId }).lean();

    const knowledge = await KnowledgeModel.findOne({
      connectionId
    })

    return NextResponse.json({
      documents,
      isTruncated: knowledge?.isTruncated || false
    });
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
