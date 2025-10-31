import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/components/auth/authProvider";

interface FileUploaderProps {
  onUploadComplete?: (filePath: string) => void;
  maxFileSize?: number; // in MB
  acceptedTypes?: string;
  className?: string;
  disabled?: boolean;
}

export function FileUploader({
  onUploadComplete,
  maxFileSize = 10,
  acceptedTypes = ".pdf, .doc, .docx, .jpg, .jpeg, .png",
  className = "",
  disabled = false,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxFileSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `File size must be under ${maxFileSize}MB`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setProgress(10);

      // Get upload URL from backend
      const uploadResponse = await apiRequest(
        "POST",
        "/api/objects/upload",
        {},
      );

      const uploadData = await uploadResponse.json();
      const { uploadURL } = uploadData;
      setProgress(30);

      // Upload file directly to object storage
      const uploadFileResponse = await fetch(uploadURL, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type,
        },
      });

      if (!uploadFileResponse.ok) {
        throw new Error("Upload failed");
      }

      setProgress(70);

      // Set ACL policy for the uploaded file
      const aclResponse = await apiRequest("PUT", "/api/files/uploaded", {
        email: user?.email,
        fileURL: uploadURL.split("?")[0], // Remove query parameters
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
      });

      const aclData = await aclResponse.json();
      setProgress(100);

      toast({
        title: "Upload successful",
        description: "File has been uploaded securely",
      });

      onUploadComplete?.(aclData.objectPath);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="file-uploader">
      <div className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50">
        <Button
          className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          variant="outline"
          data-testid="button-select-file"
        >
          <Upload className="w-8 h-8 text-chiron-blue" />
          <span className="text-sm font-medium text-slate-700">
            Upload Evidence
          </span>
        </Button>

        <Input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />

        {selectedFile && (
          <Button
            onClick={handleUpload}
            disabled={uploading}
            data-testid="button-upload-file"
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        )}
      </div>

      {selectedFile && (
        <div
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md"
          data-testid="selected-file-display"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">{selectedFile.name}</span>
            <span className="text-xs text-gray-500">
              ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
          <Button
            onClick={clearFile}
            variant="ghost"
            size="sm"
            disabled={uploading}
            data-testid="button-clear-file"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {uploading && (
        <div className="space-y-2" data-testid="upload-progress">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-500 text-center">
            Uploading... {progress}%
          </p>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Supported formats: {acceptedTypes}. Max size: {maxFileSize}MB
      </p>
    </div>
  );
}
