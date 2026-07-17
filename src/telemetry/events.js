import { recordEvent } from "./index";

export function trackLearningEvent(event, context = {}) {
  return recordEvent(`learning.${event}`, {
    domain: "learning",
    feature: context.feature || `${String(context.level || "learning").toLowerCase()}.${context.module || "module"}`,
    entity_type: context.entityType || "learning_item",
    entity_id: context.entityId || context.questionId || context.contentId || context.topicId,
    item_index: Number.isInteger(context.index) ? context.index : null,
    display_position: Number.isInteger(context.index) ? context.index + 1 : null,
    total_items: context.total,
    input_method: context.inputMethod,
    lifecycle: context.lifecycle || "observed",
    active_ms: context.activeMs,
    elapsed_ms: context.elapsedMs,
    outcome: context.outcome,
    reason_code: context.reasonCode,
    attributes: {
      level: context.level,
      module: context.module,
      chapter_id: context.chapterId,
      topic_id: context.topicId,
      content_id: context.contentId,
      question_id: context.questionId,
      question_type: context.questionType,
      question_index: context.index,
      total_questions: context.total,
      attempt_number: context.attempt,
      retry_count: context.retryCount,
      is_correct: context.isCorrect,
      direction: context.direction,
      media_state: context.mediaState,
      speed: context.speed,
      progress_bucket: context.progressBucket,
      permission: context.permission,
      mode: context.mode,
      recording_duration_ms: context.recordingDurationMs,
      score: context.score,
    },
  });
}

export function trackFeatureEvent(domain, event, context = {}) {
  return recordEvent(`${domain}.${event}`, {
    domain,
    feature: context.feature || window.location.pathname,
    entity_type: context.entityType || "feature_item",
    entity_id: context.entityId,
    item_index: Number.isInteger(context.index) ? context.index : null,
    display_position: Number.isInteger(context.index) ? context.index + 1 : null,
    total_items: context.total,
    input_method: context.inputMethod,
    lifecycle: context.lifecycle || "observed",
    active_ms: context.activeMs,
    elapsed_ms: context.elapsedMs,
    outcome: context.outcome,
    reason_code: context.reasonCode,
    attributes: context.attributes,
  });
}
