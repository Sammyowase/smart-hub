"use client";

import { useState, useRef } from "react";
import { 
  Paperclip, 
  Image, 
  FileText, 
  File, 
  X, 
  Upload,
  AlertCircle 
} from "lucide-react";

interface FileAttachmentProps {
  onFileSelect: (files: File[]) => void;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
  multiple?: boolean;
}

interface AttachedFile {
  file: File;
  id: string;
  preview?: string;
}

const defaultAllowedTypes = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const FileAttachment = ({ 
  onFileSelect, 
  maxFileSize = 10, 
  allowedTypes = defaultAllowedTypes,
  multiple = true 
}: FileAttachmentProps) => {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    } else if (fileType === 'application/pdf' || fileType.includes('document')) {
      return <FileText className="w-4 h-4" />;
    } else {
      return <File className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed`;
    }
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`;
    }
    return null;
  };

  const createFilePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const handleFileSelect = async (files: FileList) => {
    setError(null);
    const newFiles: AttachedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validationError = validateFile(file);
      
      if (validationError) {
        setError(validationError);
        continue;
      }

      const preview = await createFilePreview(file);
      newFiles.push({
        file,
        id: Math.random().toString(36).substr(2, 9),
        preview
      });
    }

    if (newFiles.length > 0) {
      const updatedFiles = multiple ? [...attachedFiles, ...newFiles] : newFiles;
      setAttachedFiles(updatedFiles);
      onFileSelect(updatedFiles.map(f => f.file));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeFile = (id: string) => {
    const updatedFiles = attachedFiles.filter(f => f.id !== id);
    setAttachedFiles(updatedFiles);
    onFileSelect(updatedFiles.map(f => f.file));
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative">
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={allowedTypes.join(',')}
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Attachment Button */}
      <button
        onClick={openFileDialog}
        className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        title="Attach files"
      >
        <Paperclip className="w-5 h-5" />
      </button>

      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg p-3 min-w-80 max-w-96 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-medium text-sm">Attached Files</h4>
            <span className="text-gray-400 text-xs">{attachedFiles.length} file(s)</span>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {attachedFiles.map((attachedFile) => (
              <div
                key={attachedFile.id}
                className="flex items-center gap-3 p-2 bg-gray-900/50 rounded border border-gray-600"
              >
                {/* File Preview/Icon */}
                <div className="flex-shrink-0">
                  {attachedFile.preview ? (
                    <img
                      src={attachedFile.preview}
                      alt={attachedFile.file.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-gray-400">
                      {getFileIcon(attachedFile.file.type)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{attachedFile.file.name}</p>
                  <p className="text-gray-400 text-xs">{formatFileSize(attachedFile.file.size)}</p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFile(attachedFile.id)}
                  className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`mt-3 border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              dragOver
                ? "border-teal-400 bg-teal-400/10"
                : "border-gray-600 hover:border-gray-500"
            }`}
          >
            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">
              Drop files here or{" "}
              <button
                onClick={openFileDialog}
                className="text-teal-400 hover:text-teal-300 underline"
              >
                browse
              </button>
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Max {maxFileSize}MB • {allowedTypes.length} file types supported
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
