import { useState } from "react";
import { FileUploader } from "@/components/FileUploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Shield, Users, AlertCircle } from "lucide-react";

export function FileUploadDemo() {
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    path: string;
    name: string;
    uploadedAt: string;
  }>>([]);

  const handleUploadComplete = (filePath: string) => {
    setUploadedFiles(prev => [...prev, {
      path: filePath,
      name: `Document_${prev.length + 1}`,
      uploadedAt: new Date().toLocaleString()
    }]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6" data-testid="page-file-upload-demo">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Secure File Upload</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Upload confidential healthcare documents with enterprise-grade security
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card data-testid="card-upload-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-chiron-blue" />
              Upload Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploader 
              onUploadComplete={handleUploadComplete}
              maxFileSize={25}
              acceptedTypes=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
            />
            
            <div className="space-y-3">
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Use Cases</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">CQC Evidence</Badge>
                  <Badge variant="secondary">Staff Certificates</Badge>
                  <Badge variant="secondary">Financial Records</Badge>
                  <Badge variant="secondary">Compliance Documents</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Features */}
        <Card data-testid="card-security-features">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Security Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium">End-to-End Encryption</h4>
                  <p className="text-xs text-gray-500">Files encrypted during upload and storage</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium">Practice-Level Access</h4>
                  <p className="text-xs text-gray-500">Only your practice members can access files</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium">GDPR Compliant</h4>
                  <p className="text-xs text-gray-500">Meets UK healthcare data protection standards</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card data-testid="card-uploaded-files">
          <CardHeader>
            <CardTitle>Recently Uploaded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  data-testid={`uploaded-file-${index}`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{file.uploadedAt}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
