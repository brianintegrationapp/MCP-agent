import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { KnowledgeModel } from "@/models/knowledge";
import { DocumentModel } from "@/models/document";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const connectionId = (await params).id;
    await connectDB();

    // Delete knowledge
    await KnowledgeModel.deleteOne({ connectionId });

    // Get all document IDs for this connection
    await DocumentModel.deleteMany({ connectionId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete knowledge:", error);
    return NextResponse.json(
      { error: "Failed to delete knowledge" },
      { status: 500 }
    );
  }
}
