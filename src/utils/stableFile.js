// Android WebView hands back a File that points at a content:// URI it does not
// own. Once the picker Activity is torn down (which Android does routinely to
// reclaim memory), the bytes become unreachable while name/size stay cached —
// so validation passes, the UI shows "Selected | 3.04 MB", and the upload dies
// as net::ERR_UPLOAD_FILE_CHANGED with nothing ever leaving the device.
//
// Copy the bytes into the JS heap while the handle is still alive, i.e. inside
// the change handler. Anything parked in state until a later tap needs this.
export async function stableFile(file) {
  const buf = await file.arrayBuffer();
  // Android pickers also leak trailing spaces into names ("CV .pdf").
  const name = file.name.trim().replace(/\s+(\.[^.]+)$/, "$1");
  return new File([buf], name, { type: file.type || "" });
}
