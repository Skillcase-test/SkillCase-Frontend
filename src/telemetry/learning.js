import { useCallback, useEffect, useRef } from "react";
import { recordEvent } from "./index";
import { trackLearningEvent } from "./events";

export function useFlashcardTelemetry({
  level,
  chapterId,
  setId,
  currentCard,
  totalCards,
  cardId,
  isFlipped,
  loading,
}) {
  const shownAtRef = useRef(null);
  const previousFlipRef = useRef(isFlipped);

  useEffect(() => {
    if (loading || !totalCards) return undefined;
    const shownAt = performance.now();
    shownAtRef.current = shownAt;
    recordEvent("learning.flashcard.presented", {
      domain: "learning",
      feature: `${level.toLowerCase()}.flashcard`,
      entity_type: "flashcard",
      entity_id: cardId || `${setId || chapterId}:${currentCard}`,
      item_index: currentCard,
      display_position: currentCard + 1,
      total_items: totalCards,
      lifecycle: "observed",
      attributes: {
        level,
        module: "flashcard",
        chapter_id: chapterId,
        set_id: setId,
        current_index: currentCard,
        total_cards: totalCards,
      },
    });
    return () => {
      recordEvent("learning.flashcard.left", {
        domain: "learning",
        feature: `${level.toLowerCase()}.flashcard`,
        entity_type: "flashcard",
        entity_id: cardId || `${setId || chapterId}:${currentCard}`,
        item_index: currentCard,
        display_position: currentCard + 1,
        total_items: totalCards,
        lifecycle: "observed",
        active_ms: Math.max(0, Math.round(performance.now() - shownAt)),
        attributes: {
          level,
          module: "flashcard",
          chapter_id: chapterId,
          set_id: setId,
          current_index: currentCard,
          total_cards: totalCards,
        },
      });
    };
  }, [cardId, chapterId, currentCard, level, loading, setId, totalCards]);

  useEffect(() => {
    if (loading || previousFlipRef.current === isFlipped) return;
    const previous = previousFlipRef.current;
    previousFlipRef.current = isFlipped;
    recordEvent("learning.flashcard.flipped", {
      domain: "learning",
      feature: `${level.toLowerCase()}.flashcard`,
      entity_type: "flashcard",
      entity_id: cardId || `${setId || chapterId}:${currentCard}`,
      item_index: currentCard,
      display_position: currentCard + 1,
      total_items: totalCards,
      lifecycle: "observed",
      outcome: isFlipped ? "back" : "front",
      attributes: {
        level,
        module: "flashcard",
        chapter_id: chapterId,
        set_id: setId,
        current_index: currentCard,
        total_cards: totalCards,
      },
    });
    if (previous === isFlipped) previousFlipRef.current = isFlipped;
  }, [cardId, chapterId, currentCard, isFlipped, level, loading, setId, totalCards]);

  return useCallback(
    ({ fromIndex, toIndex, inputMethod, direction }) => {
      recordEvent("learning.flashcard.navigation", {
        domain: "learning",
        feature: `${level.toLowerCase()}.flashcard`,
        entity_type: "flashcard_set",
        entity_id: setId || chapterId,
        item_index: toIndex,
        display_position: toIndex + 1,
        total_items: totalCards,
        input_method: inputMethod,
        lifecycle: "observed",
        outcome: direction,
        attributes: {
          level,
          module: "flashcard",
          chapter_id: chapterId,
          set_id: setId,
          from_index: fromIndex,
          to_index: toIndex,
          total_cards: totalCards,
        },
      });
    },
    [chapterId, level, setId, totalCards],
  );
}

export function useQuestionPositionTelemetry({
  feature,
  level = "B1",
  sectionType,
  paperId,
  submissionId,
  question,
  currentIndex,
  totalQuestions,
  loading,
}) {
  useEffect(() => {
    if (loading || !question) return undefined;
    const shownAt = performance.now();
    const questionId = question.question_id || question.id || question.block_id;
    recordEvent("learning.question.presented", {
      domain: "learning",
      feature,
      entity_type: "question_block",
      entity_id: questionId || `${paperId}:${sectionType}:${currentIndex}`,
      item_index: currentIndex,
      display_position: currentIndex + 1,
      total_items: totalQuestions,
      lifecycle: "observed",
      attributes: {
        level,
        module: "exam",
        position_id: paperId,
        submission_id: submissionId,
        section_type: sectionType,
        question_id: questionId,
        question_index: currentIndex,
        question_type: question.type,
        total_questions: totalQuestions,
      },
    });
    return () => {
      recordEvent("learning.question.left", {
        domain: "learning",
        feature,
        entity_type: "question_block",
        entity_id: questionId || `${paperId}:${sectionType}:${currentIndex}`,
        item_index: currentIndex,
        display_position: currentIndex + 1,
        total_items: totalQuestions,
        lifecycle: "observed",
        active_ms: Math.max(0, Math.round(performance.now() - shownAt)),
        attributes: {
          level,
          module: "exam",
          position_id: paperId,
          submission_id: submissionId,
          section_type: sectionType,
          question_id: questionId,
          question_index: currentIndex,
          question_type: question.type,
          total_questions: totalQuestions,
        },
      });
    };
  }, [
    currentIndex,
    feature,
    level,
    loading,
    paperId,
    question,
    sectionType,
    submissionId,
    totalQuestions,
  ]);
}

export function useLearningQuestionJourney({
  level,
  module,
  feature,
  topicId,
  question,
  index,
  total,
  loading,
}) {
  useEffect(() => {
    if (loading || !question) return undefined;
    const startedAt = performance.now();
    const questionId = question.id || question.question_id || `${topicId}:${index}`;
    trackLearningEvent("question.presented", {
      level, module, feature, topicId, questionId,
      questionType: question.type || question.question_type,
      index, total,
    });
    return () => trackLearningEvent("question.left", {
      level, module, feature, topicId, questionId,
      questionType: question.type || question.question_type,
      index, total,
      activeMs: Math.max(0, Math.round(performance.now() - startedAt)),
    });
  }, [feature, index, level, loading, module, question, topicId, total]);
}
