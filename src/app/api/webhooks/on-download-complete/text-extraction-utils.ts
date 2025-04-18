import { UnstructuredClient } from "unstructured-client";
import { PartitionResponse } from "unstructured-client/sdk/models/operations";
import { Strategy, Files } from "unstructured-client/sdk/models/shared";

const key = process.env.UNSTRUCTURED_API_KEY;
const url = process.env.UNSTRUCTURED_API_URL;

export const UnstructuredIsEnabled = key && url;

export const isSupportedFile = (name: string) => {
  const supportedFileExtensions = [
    "pdf",
    "doc",
    "docx",
    "txt",
    "rtf",
    "md",
    "csv",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
  ];

  const fileExtension = name.split(".").pop();

  if (!fileExtension) {
    return false;
  }

  return supportedFileExtensions.includes(fileExtension);
};

export const convertJSONToText = (elements: PartitionResponse["elements"]) => {
  return elements?.map((element) => element.text).join("\n\n") ?? "";
};

const extractTextFromFile = async ({
  fileName,
  content,
}: {
  fileName: string;
  content: Files["content"];
}) => {
  const client = new UnstructuredClient({
    serverURL: url,
    security: {
      apiKeyAuth: key,
    },
  });

  const res = (await client.general.partition({
    partitionParameters: {
      files: {
        content,
        fileName: fileName,
      },
      strategy: Strategy.HiRes,
      splitPdfPage: false,
      splitPdfAllowFailed: true,
      splitPdfConcurrencyLevel: 15,
      languages: ["eng"],
    },
  })) as PartitionResponse;

  if (res.statusCode == 200) {
    return convertJSONToText(res.elements);
  } else {
    throw new Error("Failed to partition file");
  }
};

const hasUnstructuredCredentials = key && url;

export const Unstructured = {
  extractTextFromFile,
  hasUnstructuredCredentials,
};
