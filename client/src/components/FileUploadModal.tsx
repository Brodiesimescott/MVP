import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, File, X, Loader2 } from "lucide-react";

interface FileUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

interface UploadData {
  fileName: string;
  fileData: string;
  fileSize: number;
  mimeType: string;
  description: string;
  standardIds: string[];
}

export default function FileUploadModal({
  open,
  onOpenChange,
  title = "Upload Evidence File",
}: FileUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadData) => {
      const response = await fetch("/api/cqc/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to upload file");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cqc/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cqc/activity"] });
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !description.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a file and enter a description",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target?.result as string;
        const base64Content = base64Data.split(",")[1]; // Remove data URL prefix

        const uploadData: UploadData = {
          fileName: selectedFile.name,
          fileData: base64Content,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          description: description.trim(),
          standardIds: ["reg12"], // Mock standard ID for now
        };

        uploadMutation.mutate(uploadData);
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process file",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setDescription("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select File</Label>
            <div 
              className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-chiron-blue transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              data-testid="file-drop-zone"
            >
              {selectedFile ? (
                <div className="flex items-center justify-center space-x-2">
                  <File className="w-6 h-6 text-chiron-blue" />
                  <div>
                    <p className="font-medium text-slate-900">{selectedFile.name}</p>
                    <p className="text-sm text-clinical-gray">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    data-testid="button-remove-file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-clinical-gray mx-auto mb-2" />
                  <p className="text-clinical-gray">Click to select a file</p>
                  <p className="text-xs text-clinical-gray mt-1">Max size: 10MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
              data-testid="input-file-upload"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter a description for this evidence file..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="textarea-description"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !description.trim() || uploadMutation.isPending}
            data-testid="button-upload"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}