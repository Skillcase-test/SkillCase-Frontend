export async function uploadFileToSignedUrl({ file, uploadUrl, contentType }) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType || file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("S3 upload failed");
  }

  return true;
}
