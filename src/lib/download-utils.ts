import axios from "axios";
import mime from "mime";

export async function downloadFile(url: string) {
  const response = await axios({
    url,
    method: "GET",
    responseType: "arraybuffer",
  });

  const contentType = response.headers["content-type"];
  const extension = mime.getExtension(contentType);

  return {
    buffer: Buffer.from(response.data),
    contentType,
    extension,
  };
}
