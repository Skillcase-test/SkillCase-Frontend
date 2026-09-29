import { getMayaImage } from "../../utils/mayaAvatars";

export default function B2MayaPortrait({ pose = "thumbsup", user, alt = "" }) {
  return (
    <span className="b2-maya-frame">
      <img src={getMayaImage(pose, user)} alt={alt} />
    </span>
  );
}
