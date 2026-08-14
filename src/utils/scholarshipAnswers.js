/**
 * Shared answer formatting for the scholarship exam.
 *
 * Both the candidate result view (ScholarshipResult) and the admin submission
 * review (SubmissionReview) must resolve stored answers to human-readable
 * text the same way — index-based answers (MCQ options, matching pairs,
 * composite dropdowns, dialogue dropdowns) become their option text, and the
 * correct answer is derived per question type. Keeping this in one module
 * guarantees the two surfaces never drift apart.
 */

export function toAlphaLabel(index) {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    const rem = (value - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label;
}

/** True when the options array contains image options. */
function hasImageOptions(opts) {
  return (
    Array.isArray(opts) &&
    opts.some((opt) => opt && typeof opt === "object" && opt.type === "image")
  );
}

/**
 * Resolve a stored option value (an index, or a raw text value) to its
 * display text. Object options (images) render as "[image]".
 */
function resolveOptionValue(value, opts) {
  if (typeof value === "number" && opts?.[value] !== undefined) {
    const opt = opts[value];
    return typeof opt === "object" ? "[image]" : String(opt);
  }
  return String(value ?? "");
}

/**
 * Resolve a candidate's stored answer to display text.
 * Accepts raw values or JSON-encoded strings (as returned by the API).
 */
export function formatAnswerValue(answer, qType, qData) {
  if (answer === null || answer === undefined || answer === "") return "—";
  let ans = answer;
  if (typeof ans === "string") {
    try {
      ans = JSON.parse(ans);
    } catch {
      /* keep raw string */
    }
  }
  const opts = qData?.options;

  if (
    qType === "mcq_single" ||
    qType === "mcq" ||
    qType === "fill_options" ||
    qType === "fill_blank_options"
  ) {
    return resolveOptionValue(ans, opts);
  }

  if (qType === "mcq_multi") {
    const arr = Array.isArray(ans) ? ans : [];
    return (
      arr
        .map((i) => {
          if (typeof i === "number" && opts?.[i] !== undefined) {
            const opt = opts[i];
            return typeof opt === "object" ? "[image]" : String(opt);
          }
          return String(i ?? "");
        })
        .join(", ") || "—"
    );
  }

  if (qType === "true_false" || qType === "truefalse") {
    return ans === true || ans === "true" ? "True" : "False";
  }

  if (qType === "sentence_ordering" || qType === "sentence_reorder") {
    return Array.isArray(ans) ? ans.join(" → ") : String(ans);
  }

  if (qType === "matching") {
    const pairs = Array.isArray(ans) ? ans : [];
    const left = qData?.left || [];
    const right = qData?.right || [];
    return pairs
      .map((p) => `${left[p[0]] ?? p[0]} ↔ ${right[p[1]] ?? p[1]}`)
      .join(", ");
  }

  if (
    qType === "composite_question" &&
    ans &&
    typeof ans === "object" &&
    !Array.isArray(ans)
  ) {
    const items = Array.isArray(qData?.items) ? qData.items : [];
    return Object.keys(ans)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => {
        const idx = Number(k);
        const v = ans[k];
        const item = items[idx];
        const label = toAlphaLabel(idx).toLowerCase();
        if (item?.type === "dropdown" || item?.type === "option") {
          const itemOpts = Array.isArray(item.options) ? item.options : [];
          if (typeof v === "number" && itemOpts[v] !== undefined) {
            return `(${label}). ${String(itemOpts[v])}`;
          }
          return `(${label}). ${String(v ?? "(blank)")}`;
        }
        const display = Array.isArray(v) ? v.join(", ") : String(v ?? "(blank)");
        return `(${label}). ${display}`;
      })
      .join(" | ");
  }

  if (
    qType === "dialogue_dropdown" &&
    ans &&
    typeof ans === "object" &&
    !Array.isArray(ans)
  ) {
    const dialogue = qData?.dialogue || [];
    return Object.keys(ans)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => {
        const line = dialogue[Number(k)];
        const rawVal = ans[k];
        if (
          line?.options &&
          typeof rawVal === "number" &&
          line.options[rawVal] !== undefined
        ) {
          return String(line.options[rawVal]);
        }
        return String(rawVal ?? "—");
      })
      .join(" / ");
  }

  if (Array.isArray(ans)) return ans.join(", ");
  return String(ans);
}

/**
 * Resolve the correct answer for a question to display text.
 * Returns null for types with no single correct answer to show
 * (e.g. paragraph, manually graded).
 */
export function formatCorrectAnswer(qData, qType) {
  const opts = qData?.options;

  if (qType === "mcq_single" || qType === "mcq") {
    return resolveOptionValue(qData?.correct, opts);
  }

  if (qType === "mcq_multi") {
    const correctArr = qData?.correct || [];
    return correctArr
      .map((c) => {
        if (typeof c === "number" && opts?.[c] !== undefined) {
          const opt = opts[c];
          return typeof opt === "object" ? "[image]" : String(opt);
        }
        return String(c);
      })
      .join(", ");
  }

  if (qType === "true_false" || qType === "truefalse") {
    return qData?.correct === true || qData?.correct === "true"
      ? "True"
      : "False";
  }

  if (qType === "fill_options" || qType === "fill_blank_options") {
    if (
      hasImageOptions(opts) &&
      typeof qData?.correct === "number" &&
      opts[qData.correct] !== undefined
    ) {
      return "[image]";
    }
    return resolveOptionValue(qData?.correct, opts);
  }

  if (qType === "sentence_ordering" || qType === "sentence_reorder") {
    return (qData?.correct_order || []).join(" → ");
  }

  if (qType === "sentence_correction") {
    return String(qData?.correct_sentence || qData?.correct || "");
  }

  if (qType === "matching") {
    const left = qData?.left || [];
    const right = qData?.right || [];
    return (qData?.correct_pairs || [])
      .map((p) => `${left[p[0]]} ↔ ${right[p[1]]}`)
      .join(", ");
  }

  if (qType === "fill_typing" || qType === "fill_blank_typing") {
    return String(qData?.correct || qData?.correct_answer || "");
  }

  if (qType === "composite_question") {
    const items = Array.isArray(qData?.items) ? qData.items : [];
    return items
      .map((item, idx) => {
        const label = toAlphaLabel(idx).toLowerCase();
        const itemOpts = Array.isArray(item?.options) ? item.options : [];
        const correctVal = item?.correct;
        if (
          (item?.type === "dropdown" || item?.type === "option") &&
          typeof correctVal === "number" &&
          itemOpts[correctVal] !== undefined
        ) {
          return `(${label}). ${String(itemOpts[correctVal])}`;
        }
        const display = Array.isArray(correctVal)
          ? correctVal.join(", ")
          : String(correctVal ?? "");
        return `(${label}). ${display}`;
      })
      .join(" | ");
  }

  if (qType === "dialogue_dropdown") {
    const dialogue = qData?.dialogue || [];
    const resolved = dialogue
      .map((line, idx) => {
        if (!line?.options) return null;
        const label = toAlphaLabel(idx).toLowerCase();
        const optsArr = line.options || [];
        if (
          typeof line.correct === "number" &&
          optsArr[line.correct] !== undefined
        ) {
          return `(${label}). ${String(optsArr[line.correct])}`;
        }
        return null;
      })
      .filter(Boolean);
    return resolved.length > 0 ? resolved.join(" | ") : "(see dropdown)";
  }

  return null;
}
