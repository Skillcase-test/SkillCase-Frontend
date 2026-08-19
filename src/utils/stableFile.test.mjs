// Behavioural check for the Android stale-File upload bug.
//
// Android's picker hands the WebView a File backed by a content:// URI the
// WebView does not own. When Android tears the picker Activity down to reclaim
// memory, the bytes become unreachable while name/size stay cached — so
// validation passes, the UI still says "Selected | 3.04 MB", and the POST dies
// as net::ERR_UPLOAD_FILE_CHANGED with nothing reaching the server.
//
// killHandle() below is that teardown. Web never calls it; Android does.
//
//   node src/utils/stableFile.test.mjs

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stableFile } from "./stableFile.js";

const BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4

/** A File whose bytes can be revoked while its metadata survives. */
function pickFile({
  name = "Prashant R. CV .pdf",
  type = "application/pdf",
} = {}) {
  const real = new File([BYTES], name, { type });
  let alive = true;
  return {
    name: real.name,
    size: real.size, // cached metadata — still readable after teardown
    type: real.type,
    arrayBuffer: () =>
      alive
        ? real.arrayBuffer()
        : Promise.reject(
            new DOMException(
              "The requested file could not be read",
              "NotReadableError",
            ),
          ),
    killHandle: () => {
      alive = false;
    },
  };
}

/** Stands in for the browser streaming a multipart body at submit time. */
async function upload(file) {
  const buf = await file.arrayBuffer();
  return { status: 200, bytes: new Uint8Array(buf), name: file.name };
}

/** Pre-fix: park the raw File in React state, upload on a later tap. */
async function oldFlow(platform) {
  const picked = pickFile();
  const inState = picked; // setSelectedResume(file)
  if (platform === "android") picked.killHandle();
  return upload(inState);
}

/** Post-fix: copy the bytes inside the change handler, while the handle lives. */
async function newFlow(platform) {
  const picked = pickFile();
  const inState = await stableFile(picked); // setSelectedResume(stable)
  if (platform === "android") picked.killHandle();
  return upload(inState);
}

const tests = {
  "web, pre-fix: uploads fine (why nobody caught this on desktop)":
    async () => {
      assert.equal((await oldFlow("web")).status, 200);
    },

  "android, pre-fix: reproduces the production failure": async () => {
    await assert.rejects(oldFlow("android"), (err) => {
      assert.equal(err.name, "NotReadableError");
      return true;
    });
  },

  "android, post-fix: upload survives the picker teardown": async () => {
    const res = await newFlow("android");
    assert.equal(res.status, 200);
    assert.deepEqual(res.bytes, BYTES, "bytes must survive intact");
  },

  "web, post-fix: unchanged": async () => {
    assert.deepEqual((await newFlow("web")).bytes, BYTES);
  },

  "metadata alone is not proof the bytes are readable": async () => {
    const picked = pickFile();
    picked.killHandle();
    // This is exactly what the UI reads to render "Selected | 0.22 MB | PDF".
    assert.equal(picked.size, BYTES.length);
    assert.equal(picked.type, "application/pdf");
    await assert.rejects(picked.arrayBuffer());
  },

  "a dead handle fails at selection, not at submit": async () => {
    const picked = pickFile();
    picked.killHandle();
    await assert.rejects(stableFile(picked));
  },

  "preserves size and MIME": async () => {
    const out = await stableFile(pickFile({ name: "cv.pdf" }));
    assert.equal(out.size, BYTES.length);
    assert.equal(out.type, "application/pdf");
  },

  "empty MIME from an old Android WebView is tolerated": async () => {
    const out = await stableFile(pickFile({ name: "scan.pdf", type: "" }));
    assert.equal(out.type, "");
    assert.equal(out.name, "scan.pdf");
  },

  "strips the space Android pickers leave before the extension": async () => {
    const cases = [
      ["Prashant R. CV .pdf", "Prashant R. CV.pdf"],
      ["  PRASHANT-KUMAR.pdf  ", "PRASHANT-KUMAR.pdf"],
      ["already-clean.pdf", "already-clean.pdf"],
      ["multi   space .pdf", "multi   space.pdf"],
      ["no-extension", "no-extension"],
      ["screenshot .png", "screenshot.png"],
    ];
    for (const [input, expected] of cases) {
      const out = await stableFile(pickFile({ name: input }));
      assert.equal(out.name, expected, `${JSON.stringify(input)}`);
    }
  },

  "backend PDF validation still passes on the copy": async () => {
    // Mirrors jobScreeningRouter.js fileFilter: mimetype OR .pdf extension.
    const out = await stableFile(pickFile());
    const ok =
      out.type === "application/pdf" || out.name.toLowerCase().endsWith(".pdf");
    assert.equal(ok, true);
  },

  "every deferred-upload call site stabilises at selection": () => {
    const sites = [
      "src/pages/jobScreening/components/ProfileCompletionStep.jsx",
      "src/pages/jobScreening/components/AdditionalDocumentsStep.jsx",
      "src/pages/ProfilePage.jsx",
      "src/components/SupportWidget.jsx",
    ];
    for (const site of sites) {
      const src = readFileSync(
        new URL(`../../${site}`, import.meta.url),
        "utf8",
      );
      assert.match(src, /stableFile\(/, `${site} must stabilise picked files`);
    }
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
}
console.log(
  `\n${Object.keys(tests).length - failed}/${Object.keys(tests).length} passed`,
);
process.exit(failed ? 1 : 0);
