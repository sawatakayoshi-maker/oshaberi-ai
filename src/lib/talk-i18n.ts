// お話（Talk）画面の多言語ラベル。OHANASHI AI（ja/en/ko/th/vi）から移植・拡張。
export type LangCode = "ja" | "en" | "ko" | "th" | "vi";

export const LANGS: { code: LangCode; label: string }[] = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "th", label: "ไทย" },
  { code: "vi", label: "Tiếng Việt" },
];

// AI に「この言語で返答して」と伝えるための言語名
export const LANG_NATIVE: Record<LangCode, string> = {
  ja: "日本語",
  en: "English",
  ko: "한국어 (Korean)",
  th: "ภาษาไทย (Thai)",
  vi: "Tiếng Việt (Vietnamese)",
};

export interface TalkStrings {
  subtitle: string;
  remembers: string;
  voiceOn: string;
  voiceOff: string;
  standbyOn: string;
  standbyOff: string;
  slow: string;
  slowOn: string;
  web: string;
  webOn: string;
  voiceSet: string;
  stop: string;
  note: string;
  copy: string;
  copied: string;
  clear: string;
  clearConfirm: string;
  fontLabels: [string, string, string];
  placeholder: string;
  send: string;
  introSuffix: string; // 「{name}」+ これ
  thinking: string;
  noteTitle: string;
  noteHint: string;
  noteClose: string;
  webNote: string;
}

export const TALK_I18N: Record<LangCode, TalkStrings> = {
  ja: {
    subtitle: "相談相手。音声・アバター・メモ・Web検索に対応。",
    remembers: "前回の続きも覚えています",
    voiceOn: "🔊 声オン",
    voiceOff: "🔈 声オフ",
    standbyOn: "🎧 待受オン",
    standbyOff: "🎧 待受オフ",
    slow: "🐢 ゆっくり",
    slowOn: "🐢 ゆっくり中",
    web: "🔎 Web検索",
    webOn: "🔎 Web検索オン",
    voiceSet: "⚙️ 声設定",
    stop: "■ 停止",
    note: "📝 メモ",
    copy: "📋 コピー",
    copied: "コピーしました",
    clear: "記憶を消す",
    clearConfirm: "これまでの会話の記憶を消します。よろしいですか?",
    fontLabels: ["文字:標準", "文字:大", "文字:特大"],
    placeholder: "メッセージを入力…",
    send: "送信",
    introSuffix: "です。気軽に話しかけてください。聞き役になります。",
    thinking: "…考え中",
    noteTitle: "📝 ずっと覚えておくメモ",
    noteHint: "※ここに書いた内容は毎回かならずAIに伝わります。消したいときは空にしてください（自動保存）。",
    noteClose: "閉じる",
    webNote: "🔎 Web検索オン：最新情報を検索します（検索利用料・本文トークンで費用が増えます）。",
  },
  en: {
    subtitle: "A companion. Voice, avatar, memo, and web search.",
    remembers: "I remember our last talk",
    voiceOn: "🔊 Voice On",
    voiceOff: "🔈 Voice Off",
    standbyOn: "🎧 Listening",
    standbyOff: "🎧 Hands-free",
    slow: "🐢 Slow",
    slowOn: "🐢 Slow on",
    web: "🔎 Web search",
    webOn: "🔎 Web search ON",
    voiceSet: "⚙️ Voice",
    stop: "■ Stop",
    note: "📝 Memo",
    copy: "📋 Copy",
    copied: "Copied",
    clear: "Clear memory",
    clearConfirm: "Erase the saved conversation memory. OK?",
    fontLabels: ["Text: S", "Text: L", "Text: XL"],
    placeholder: "Type a message…",
    send: "Send",
    introSuffix: " here. Feel free to talk — I'll listen.",
    thinking: "…thinking",
    noteTitle: "📝 Always-remember memo",
    noteHint: "What you write here is always sent to the AI. Clear it to remove (auto-saved).",
    noteClose: "Close",
    webNote: "🔎 Web search ON: fetches latest info (search fees and tokens increase cost).",
  },
  ko: {
    subtitle: "이야기 상대. 음성·아바타·메모·웹 검색 지원.",
    remembers: "지난 이야기도 기억해요",
    voiceOn: "🔊 소리 켜짐",
    voiceOff: "🔈 소리 꺼짐",
    standbyOn: "🎧 대기 켜짐",
    standbyOff: "🎧 대기 꺼짐",
    slow: "🐢 천천히",
    slowOn: "🐢 천천히 중",
    web: "🔎 웹 검색",
    webOn: "🔎 웹 검색 켜짐",
    voiceSet: "⚙️ 음성 설정",
    stop: "■ 멈춤",
    note: "📝 메모",
    copy: "📋 복사",
    copied: "복사했어요",
    clear: "기억 지우기",
    clearConfirm: "지금까지의 대화 기억을 지울게요. 괜찮나요?",
    fontLabels: ["글자:보통", "글자:크게", "글자:특대"],
    placeholder: "메시지를 입력…",
    send: "보내기",
    introSuffix: "입니다. 편하게 말 걸어 주세요. 잘 들을게요.",
    thinking: "…생각 중",
    noteTitle: "📝 계속 기억하는 메모",
    noteHint: "여기에 쓴 내용은 매번 반드시 AI에게 전달됩니다. 지우려면 비워 두세요(자동 저장).",
    noteClose: "닫기",
    webNote: "🔎 웹 검색 켜짐: 최신 정보를 검색합니다(검색 비용·토큰으로 비용이 늘어납니다).",
  },
  th: {
    subtitle: "เพื่อนคุย รองรับเสียง อวตาร บันทึก และค้นเว็บ",
    remembers: "จำเรื่องคราวก่อนได้ด้วยนะ",
    voiceOn: "🔊 เปิดเสียง",
    voiceOff: "🔈 ปิดเสียง",
    standbyOn: "🎧 กำลังฟัง",
    standbyOff: "🎧 แฮนด์ฟรี",
    slow: "🐢 ช้า",
    slowOn: "🐢 กำลังช้า",
    web: "🔎 ค้นเว็บ",
    webOn: "🔎 ค้นเว็บ เปิด",
    voiceSet: "⚙️ ตั้งค่าเสียง",
    stop: "■ หยุด",
    note: "📝 บันทึก",
    copy: "📋 คัดลอก",
    copied: "คัดลอกแล้ว",
    clear: "ลบความจำ",
    clearConfirm: "จะลบความจำการสนทนาที่ผ่านมานะ ตกลงไหม?",
    fontLabels: ["อักษร:ปกติ", "อักษร:ใหญ่", "อักษร:ใหญ่มาก"],
    placeholder: "พิมพ์ข้อความ…",
    send: "ส่ง",
    introSuffix: " ค่ะ พูดคุยได้เลยนะ เราจะรับฟัง",
    thinking: "…กำลังคิด",
    noteTitle: "📝 บันทึกที่จำตลอด",
    noteHint: "สิ่งที่เขียนที่นี่จะถูกส่งให้ AI ทุกครั้ง ลบโดยการเว้นว่าง (บันทึกอัตโนมัติ)",
    noteClose: "ปิด",
    webNote: "🔎 ค้นเว็บ เปิด: ค้นหาข้อมูลล่าสุด (ค่าค้นหาและโทเคนทำให้ค่าใช้จ่ายเพิ่มขึ้น)",
  },
  vi: {
    subtitle: "Người bạn trò chuyện. Hỗ trợ giọng nói, avatar, ghi nhớ, tìm web.",
    remembers: "Mình nhớ cả lần trước",
    voiceOn: "🔊 Bật tiếng",
    voiceOff: "🔈 Tắt tiếng",
    standbyOn: "🎧 Đang nghe",
    standbyOff: "🎧 Rảnh tay",
    slow: "🐢 Chậm",
    slowOn: "🐢 Đang chậm",
    web: "🔎 Tìm web",
    webOn: "🔎 Tìm web BẬT",
    voiceSet: "⚙️ Giọng nói",
    stop: "■ Dừng",
    note: "📝 Ghi nhớ",
    copy: "📋 Sao chép",
    copied: "Đã sao chép",
    clear: "Xóa trí nhớ",
    clearConfirm: "Sẽ xóa trí nhớ cuộc trò chuyện. Bạn đồng ý chứ?",
    fontLabels: ["Chữ: vừa", "Chữ: lớn", "Chữ: rất lớn"],
    placeholder: "Nhập tin nhắn…",
    send: "Gửi",
    introSuffix: " đây. Cứ thoải mái trò chuyện nhé, mình sẽ lắng nghe.",
    thinking: "…đang nghĩ",
    noteTitle: "📝 Ghi nhớ mãi mãi",
    noteHint: "Nội dung viết ở đây luôn được gửi tới AI. Để xóa, hãy để trống (tự động lưu).",
    noteClose: "Đóng",
    webNote: "🔎 Tìm web BẬT: tìm thông tin mới nhất (phí tìm kiếm và token làm tăng chi phí).",
  },
};
