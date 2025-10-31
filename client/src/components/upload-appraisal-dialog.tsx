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

interface UploadAppraisalDialogProps {
  employeeId: string;
  employeeName: string;
  maxFileSize?: number;
  acceptedTypes?: string;
  onUploadSuccess?: () => void;
}

export function UploadAppraisalDialog({
  employeeId,
  employeeName,
  maxFileSize = 25,
  acceptedTypes = ".pdf, .doc, .docx, .jpg, .jpeg, .png, .xls, .xlsx",
  onUploadSuccess,
}: UploadAppraisalDialogProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [description, setDescription] = useState("");
  const [nextAppraisal, setNextAppraisal] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const uploadAppraisalMutation = useMutation({
    mutationFn: async (evidenceData: {
      fileName: string;
      path: string;
      description: string;
      employeeId: string;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/hr/appraisal?email=${encodeURIComponent(user?.email || "")}`,
        evidenceData,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/appraisals"] });
      toast({
        title: "Success",
        description: "Appraisal evidence uploaded successfully",
      });
      onUploadSuccess?.();
      resetForm();
      setOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload appraisal evidence",
        variant: "destructive",
      });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async (data: {
      appraisalDate: string;
      nextAppraisal: string;
    }) => {
      const response = await apiRequest(
        "PUT",
        `/api/hr/staff/${employeeId}?email=${encodeURIComponent(user?.email || "")}`,
        data,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/staff"] });
    },
  });

  const resetForm = () => {
    setSelectedFile(null);
    setFileName("");
    setDescription("");
    setNextAppraisal("");
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

    if (!nextAppraisal) {
      toast({
        title: "Missing next appraisal date",
        description: "Please select the next appraisal date",
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

      setProgress(60);

      // Set ACL policy for the uploaded file
      const aclResponse = await apiRequest("PUT", "/api/files/uploaded", {
        email: user?.email,
        fileURL: uploadURL.split("?")[0],
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
      });

      const aclData = await aclResponse.json();
      setProgress(80);

      // Save appraisal evidence metadata
      const evidenceData = {
        fileName: fileName.trim(),
        path: aclData.objectPath,
        description:
          description.trim() || `Appraisal of ${employeeName} on ${new Date()}`,
        employeeId: employeeId,
      };

      await uploadAppraisalMutation.mutateAsync(evidenceData);
      setProgress(90);

      // Update staff member's appraisal dates
      const today = new Date().toISOString().split("T")[0];
      await updateStaffMutation.mutateAsync({
        appraisalDate: today,
        nextAppraisal: nextAppraisal,
      });

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
          className="w-full"
          data-testid="button-upload-appraisal"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Appraisal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Appraisal Evidence</DialogTitle>
            <DialogDescription>
              Upload appraisal documentation for {employeeName}
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
                placeholder="Enter a descriptive name"
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
                placeholder="Describe this appraisal (optional)"
                disabled={uploading}
                rows={3}
                data-testid="input-description"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nextAppraisal">Next Appraisal Date *</Label>
              <Input
                id="nextAppraisal"
                type="date"
                value={nextAppraisal}
                onChange={(e) => setNextAppraisal(e.target.value)}
                disabled={uploading}
                required
                data-testid="input-nextAppraisal"
              />
              <p className="text-xs text-gray-500">
                When should the next appraisal be scheduled?
              </p>
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
              {uploading ? "Uploading..." : "Upload Appraisal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
