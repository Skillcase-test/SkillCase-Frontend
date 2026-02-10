import {
  Mail,
  MessageCircle,
  Newspaper,
  BookOpen,
  User,
  Clock,
  Paperclip,
  Star,
  MoreVertical,
  ChevronDown,
} from "lucide-react";

// Gmail-style Email Renderer
export const EmailView = ({ content, onWordClick, renderContent }) => {
  // Parse email metadata from content (if structured)
  const from = "Anna Müller <anna.mueller@beispiel.de>";
  const to = "thomas.schmidt@beispiel.de";
  const subject = content.title || "Betreff: Deine Nachricht";
  const date = "22. Jan. 2026, 14:30";
  return (
    <div className="bg-white rounded-xl border border-[#dadce0] overflow-hidden shadow-sm">
      {/* Email Header - Gmail Style */}
      <div className=" border-[#dadce0]">
        {/* Subject Row */}
        <div className="px-4 py-3 flex items-start justify-between">
          <h2 className="text-lg font-normal text-[#202124] flex-1 pr-4">
            {subject}
          </h2>
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-gray-100 rounded-full">
              <Star className="w-5 h-5 text-[#5f6368]" />
            </button>
          </div>
        </div>

        {/* Sender Info Row */}
        <div className="px-4 pb-3 flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-[#1a73e8] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-medium">AM</span>
          </div>

          {/* Sender Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-[#202124] text-sm">
                Anna Müller
              </span>
              <span className="text-xs text-[#5f6368]">
                &lt;anna.mueller@beispiel.de&gt;
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#5f6368] mt-0.5">
              <span>an mich</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>

          {/* Date & Actions */}
          <div className="flex items-center gap-2 text-xs text-[#5f6368] flex-shrink-0">
            <span>{date}</span>
            <button className="p-1.5 hover:bg-gray-100 rounded-full">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="px-4 py-4">
        <div className="text-[15px] text-[#202124] leading-relaxed whitespace-pre-wrap">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// Bubble-style SMS/Message Renderer
export const SmsView = ({ content, onWordClick, renderContent }) => {
  // Parse messages - for now treat content as single message
  // In real implementation, content could have multiple messages
  const contentText = content.content || "";

  // Get vocabulary words for highlighting
  const vocabWords = content.vocabulary?.map((v) => v.word.toLowerCase()) || [];

  // Function to render text with clickable vocabulary
  const renderTextWithVocab = (text) => {
    const words = text.split(/(\s+)/);

    return words.map((word, i) => {
      const cleanWord = word.replace(/[.,!?;:]/g, "").toLowerCase();
      const isVocab = vocabWords.includes(cleanWord);

      if (isVocab) {
        return (
          <span
            key={i}
            onClick={() => onWordClick(cleanWord)}
            className="bg-yellow-200/60 px-1 rounded cursor-pointer hover:bg-yellow-300/80 transition-colors border-b-2 border-yellow-400/60"
          >
            {word}
          </span>
        );
      }
      return <span key={i}>{word}</span>;
    });
  };

  // Split by newlines to create multiple bubbles
  const messages = contentText.split("\n\n").filter((m) => m.trim());

  return (
    <div className="bg-[#f0f4f8] rounded-xl p-4 min-h-[200px]">
      {/* Phone Header */}
      <div className="flex items-center gap-3 pb-3 mb-3 border-b border-[#dde3e9]">
        <div className="w-10 h-10 rounded-full bg-[#002856] flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-[#202124] text-sm">Maria</p>
          <p className="text-xs text-[#5f6368]">Online</p>
        </div>
      </div>

      {/* Messages with integrated vocabulary highlighting */}
      <div className="space-y-3">
        {messages.map((msg, idx) => {
          // Alternate sides for visual effect (even = received, odd = sent)
          const isReceived = idx % 2 === 0;
          return (
            <div
              key={idx}
              className={`flex ${isReceived ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                  isReceived
                    ? "bg-white text-[#202124] rounded-bl-md"
                    : "bg-[#002856] text-white rounded-br-md"
                }`}
                style={{
                  boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                }}
              >
                <p className="text-[15px] leading-relaxed">
                  {renderTextWithVocab(msg.trim())}
                </p>
                <p
                  className={`text-[10px] mt-1 text-right ${
                    isReceived ? "text-[#5f6368]" : "text-white/70"
                  }`}
                >
                  {isReceived ? "14:30" : "14:32"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tip for tapping highlighted words */}
      <div className="mt-4 pt-3 border-t border-[#dde3e9]">
        <p className="text-[10px] text-gray-400 text-center">
          Tap yellow highlighted words to see their meaning
        </p>
      </div>
    </div>
  );
};

// Newspaper/Magazine Article Renderer
export const ArticleView = ({ content, onWordClick, renderContent }) => {
  return (
    <div className="bg-white rounded-xl border border-[#e0e0e0] overflow-hidden">
      {/* Article Header */}
      <div className="bg-gradient-to-r from-[#002856] to-[#003d83] px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <Newspaper className="w-4 h-4 text-white/80" />
          <span className="text-xs font-medium text-white/80 uppercase tracking-wide">
            Artikel
          </span>
        </div>
        <h2 className="text-xl font-serif font-bold text-white leading-tight">
          {content.title || "Nachrichten aus Deutschland"}
        </h2>
      </div>

      {/* Article Body */}
      <div className="px-5 py-5">
        {/* Drop cap first letter style */}
        <div className="text-[16px] text-[#202124] leading-[1.8] font-serif">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// Story/Narrative Renderer - Matches StoryPage.jsx layout
export const StoryView = ({ content, onWordClick, renderContent }) => {
  return (
    <div className="min-h-screen bg-white -mx-4 -mt-4">
      {/* Hero Image Section */}
      <div className="relative w-full h-64 bg-gradient-to-b from-slate-200 to-[#ecfbff]">
        {(content.hero_image_url || content.heroImageUrl) && (
          <img
            src={content.hero_image_url || content.heroImageUrl}
            alt={content.title}
            className="w-full h-full object-cover opacity-50"
          />
        )}
      </div>

      {/* Story Content */}
      <article className="max-w-xl mx-auto px-6 -mt-32 relative z-10 pb-12">
        {/* Story Header Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 mb-8 border border-slate-50 mt-16">
          <h1 className="text-[3.8vh] font-extrabold text-[#002856] mb-2">
            {content.title || "Eine kurze Geschichte"}
          </h1>
          {content.description && (
            <p className="text-slate-500 text-sm">{content.description}</p>
          )}
        </div>

        {/* Story Paragraphs */}
        <div className="prose prose-slate prose-lg max-w-none bg-white rounded-2xl p-6 shadow-md">
          <div className="text-lg leading-8 text-slate-800 font-serif">
            {renderContent()}
          </div>
          {/* Reading tip */}
          <p className="text-[10px] text-gray-400 text-center mt-4">
            Tap highlighted words to see their meaning
          </p>
        </div>
      </article>
    </div>
  );
};

// Main Renderer Component
const ReadingRenderer = ({ content, type, onWordClick, renderContent }) => {
  switch (type) {
    case "email":
      return (
        <EmailView
          content={content}
          onWordClick={onWordClick}
          renderContent={renderContent}
        />
      );
    case "sms":
      return (
        <SmsView
          content={content}
          onWordClick={onWordClick}
          renderContent={renderContent}
        />
      );
    case "article":
      return (
        <ArticleView
          content={content}
          onWordClick={onWordClick}
          renderContent={renderContent}
        />
      );
    case "story":
      return (
        <StoryView
          content={content}
          onWordClick={onWordClick}
          renderContent={renderContent}
        />
      );
    default:
      // Fallback to article style
      return (
        <ArticleView
          content={content}
          onWordClick={onWordClick}
          renderContent={renderContent}
        />
      );
  }
};

export default ReadingRenderer;
