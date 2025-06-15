"use client";

import { useState, useRef } from "react";
import { Send } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";
import { FileAttachment } from "./FileAttachment";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string, attachments?: File[]) => void;
  placeholder?: string;
}

export const ChatInput = ({ value, onChange, onSend, placeholder }: ChatInputProps) => {
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Shift") {
      setIsShiftPressed(true);
    } else if (e.key === "Enter" && !isShiftPressed) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === "Shift") {
      setIsShiftPressed(false);
    }
  };

  const handleSend = () => {
    if (value.trim() || attachedFiles.length > 0) {
      console.log("ChatInput - Sending message:", value, "with attachments:", attachedFiles);
      onSend(value, attachedFiles);
      onChange(""); // Clear the input after sending
      setAttachedFiles([]); // Clear attachments after sending
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.slice(0, start) + emoji + value.slice(end);
      onChange(newValue);

      // Set cursor position after emoji
      setTimeout(() => {
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
        textarea.focus();
      }, 0);
    } else {
      onChange(value + emoji);
    }
  };

  const handleFileSelect = (files: File[]) => {
    setAttachedFiles(files);
  };

  return (
    <div className="relative">
      <div className="flex items-end gap-3">
        {/* File Attachment */}
        <FileAttachment
          onFileSelect={handleFileSelect}
          maxFileSize={10}
          multiple={true}
        />

        {/* Input Area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            placeholder={placeholder || "Type a message..."}
            rows={1}
            className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none max-h-32"
            style={{
              minHeight: "48px",
              height: "auto",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 128) + "px";
            }}
          />

          {/* Emoji Button */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Add emoji"
          >
            😊
          </button>

          {/* Emoji Picker */}
          <EmojiPicker
            isOpen={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onEmojiSelect={handleEmojiSelect}
            position={{ bottom: 50, right: 0 }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!value.trim() && attachedFiles.length === 0}
          className="p-3 bg-teal-400 text-slate-900 rounded-lg hover:bg-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-400"
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Attachment Preview */}
      {attachedFiles.length > 0 && (
        <div className="mt-2 text-sm text-gray-400">
          📎 {attachedFiles.length} file(s) attached
        </div>
      )}
    </div>
  );
};
