// Shared passport constants/helpers — kept out of the component files so
// react-refresh sees component-only exports in PassportPage/PassportBook.
export const PER_PAGE = 6;

// A stable -9..+9 degrees from the module id, so no two stamps are pressed
// at the same angle and none of them jumps between renders.
export function tilt(id) {
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) | 0;
  return (Math.abs(h) % 19) - 9;
}
