import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/components/auth/authProvider";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface UploadEvidenceDialogProps {
  maxFileSize?: number;
  acceptedTypes?: string;
  onUploadSuccess?: () => void;
}

export function UploadEvidenceDialog({
  maxFileSize = 25,
  acceptedTypes = ".pdf, .doc, .docx, .jpg, .jpeg, .png, .xls, .xlsx",
  onUploadSuccess,
}: UploadEvidenceDialogProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [description, setDescription] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const uploadEvidenceMutation = useMutation({
    mutationFn: async (evidenceData: {
      fileName: string;
      path: string;
      description: string;
      createdAt: Date;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/cqc/evidence?email=${encodeURIComponent(user?.email || "")}`,
        evidenceData,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cqc/evidencelist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/cqcevidence"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cqc/dashboard"] });
      toast({
        title: "Success",
        description: "Evidence uploaded successfully",
      });
      onUploadSuccess?.();
      resetForm();
      setOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload evidence",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedFile(null);
    setFileName("");
    setDescription("");
    setCreatedAt("");
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > maxFileSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `File size must be under ${maxFileSize}MB`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    if (!fileName) {
      setFileName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!fileName.trim()) {
      toast({
        title: "Missing file name",
        description: "Please enter a file name",
        variant: "destructive",
      });
      return;
    }

    if (!createdAt) {
      toast({
        title: "Missing date",
        description: "Please select when this evidence was created",
        variant: "destructive",
      });
      return;
    }

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
        fileURL: uploadURL.split("?")[0],
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
      });

      const aclData = await aclResponse.json();
      setProgress(90);

      // Save evidence metadata
      const evidenceData = {
        fileName: fileName.trim(),
        path: aclData.objectPath,
        description: description.trim(),
        createdAt: new Date(createdAt),
      };

      uploadEvidenceMutation.mutate(evidenceData);
      setProgress(100);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file",
        variant: "destructive",
      });
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50"
          data-testid="button-upload-evidence"
        >
          <Upload className="w-8 h-8 text-chiron-blue" />
          <span className="text-sm font-medium text-slate-700">
            Upload Evidence
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Evidence</DialogTitle>
            <DialogDescription>
              Upload a file and provide details about the evidence for CQC
              compliance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file">File</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                  data-testid="button-select-file"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {selectedFile ? "Change File" : "Select File"}
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptedTypes}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
              {selectedFile && (
                <div
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md"
                  data-testid="selected-file-display"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button
                    type="button"
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
              <p className="text-xs text-gray-500">
                Max size: {maxFileSize}MB. Formats: {acceptedTypes}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fileName">File Name *</Label>
              <Input
                id="fileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter a name"
                disabled={uploading}
                required
                data-testid="input-fileName"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this evidence"
                disabled={uploading}
                rows={3}
                data-testid="input-description"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="createdAt">Date Created *</Label>
              <Input
                id="createdAt"
                type="date"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                disabled={uploading}
                required
                data-testid="input-createdAt"
              />
            </div>

            {uploading && (
              <div className="space-y-2" data-testid="upload-progress">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-gray-500 text-center">
                  Uploading... {progress}%
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
              disabled={uploading}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploading || !selectedFile}
              data-testid="button-submit"
            >
              {uploading ? "Uploading..." : "Upload Evidence"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
