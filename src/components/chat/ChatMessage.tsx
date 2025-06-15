"use client";

import { Bot, User, Paperclip, Download, Image, FileText, File } from "lucide-react";
import { cn } from "@/lib/utils";

interface Attachment {
  name: string;
  size: number;
  type: string;
  url: string;
}

interface Message {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  isAI?: boolean;
  attachments?: Attachment[];
}

interface ChatMessageProps {
  message: Message;
  isOwn: boolean;
}

export const ChatMessage = ({ message, isOwn }: ChatMessageProps) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br>');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    } else if (fileType === 'application/pdf' || fileType.includes('document')) {
      return <FileText className="w-4 h-4" />;
    } else {
      return <File className="w-4 h-4" />;
    }
  };

  const handleAttachmentClick = (attachment: Attachment) => {
    // In a real implementation, this would download or open the file
    console.log('Opening attachment:', attachment.name);
    // For now, just show an alert since we don't have real file URLs
    alert(`Attachment: ${attachment.name} (${formatFileSize(attachment.size)})`);
  };

  return (
    <div className={cn(
      "flex gap-3",
      isOwn && !message.isAI && "flex-row-reverse"
    )}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        message.isAI
          ? "bg-purple-500/20 text-purple-400"
          : isOwn
            ? "bg-teal-400/20 text-teal-400"
            : "bg-gray-600 text-white"
      )}>
        {message.isAI ? (
          <Bot className="w-4 h-4" />
        ) : (
          <span className="text-xs font-medium">
            {message.authorName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex-1 max-w-[70%]",
        isOwn && !message.isAI && "flex flex-col items-end"
      )}>
        {/* Author and Time */}
        <div className={cn(
          "flex items-center gap-2 mb-1",
          isOwn && !message.isAI && "flex-row-reverse"
        )}>
          <span className={cn(
            "text-sm font-medium",
            message.isAI
              ? "text-purple-400"
              : isOwn
                ? "text-teal-400"
                : "text-white"
          )}>
            {message.authorName}
          </span>
          <span className="text-xs text-gray-500">
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Message Bubble */}
        <div className={cn(
          "rounded-lg px-4 py-2 break-words",
          message.isAI
            ? "bg-purple-500/10 border border-purple-500/20 text-gray-200"
            : isOwn
              ? "bg-teal-400 text-slate-900"
              : "bg-gray-700 text-white"
        )}>
          {/* Text Content */}
          {message.content && (
            <div
              dangerouslySetInnerHTML={{
                __html: formatContent(message.content)
              }}
              className={cn(
                "text-sm leading-relaxed",
                message.isAI && "space-y-2"
              )}
            />
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={cn(
              "space-y-2",
              message.content && "mt-3"
            )}>
              {message.attachments.map((attachment, index) => (
                <div
                  key={index}
                  onClick={() => handleAttachmentClick(attachment)}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded border cursor-pointer transition-colors",
                    message.isAI
                      ? "bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10"
                      : isOwn
                        ? "bg-black/10 border-black/20 hover:bg-black/20"
                        : "bg-gray-600/50 border-gray-600 hover:bg-gray-600"
                  )}
                >
                  <div className={cn(
                    "p-1 rounded",
                    message.isAI
                      ? "text-purple-400"
                      : isOwn
                        ? "text-slate-700"
                        : "text-gray-300"
                  )}>
                    {getFileIcon(attachment.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      message.isAI
                        ? "text-gray-200"
                        : isOwn
                          ? "text-slate-800"
                          : "text-white"
                    )}>
                      {attachment.name}
                    </p>
                    <p className={cn(
                      "text-xs",
                      message.isAI
                        ? "text-gray-400"
                        : isOwn
                          ? "text-slate-600"
                          : "text-gray-400"
                    )}>
                      {formatFileSize(attachment.size)}
                    </p>
                  </div>
                  <Download className={cn(
                    "w-4 h-4",
                    message.isAI
                      ? "text-purple-400"
                      : isOwn
                        ? "text-slate-700"
                        : "text-gray-300"
                  )} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
