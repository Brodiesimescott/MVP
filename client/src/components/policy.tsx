import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Upload,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import LLMGuide from "@/components/llm-guide";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertStaffSchema,
  staff,
  AppraisalEvidence,
  Policy,
  insertAppraisalEvidenceSchema,
} from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { createInsertSchema } from "drizzle-zod";
import { FileUploader } from "@/components/FileUploader";
import { useAuth } from "@/components/auth/authProvider";

const userSchema = z.object({
  id: z.string(),
  practiceId: z.string(),
  role: z.enum(["staff", "powerUser", "user"]),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

type UserData = z.infer<typeof userSchema>;

interface PolicyManagementProps {
  onBack: () => void;
}

export default function PolicyManagement({ onBack }: PolicyManagementProps) {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState<String | null>(null);
  const { toast } = useToast();

  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/home", user?.email],
    queryFn: async () => {
      if (!user?.email) {
        throw new Error("No user email");
      }
      const response = await fetch(
        `/api/home?email=${encodeURIComponent(user.email)}`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) {
        localStorage.removeItem("hr_user");
        throw new Error("Authentication failed");
      }
      return (await response.json()) as UserData;
    },
    retry: false,
    enabled: !!user?.email,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (error || !userData) {
    //setLocation("/login");
    return null;
  }

  const { data: policies, isLoading: isPoliciesLoading } = useQuery<Policy[]>({
    queryKey: ["/api/hr/policies", user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error("Not authenticated");
      const response = await fetch(
        `/api/hr/policies?email=${encodeURIComponent(user.email)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch");
      return await response.json();
    },
    enabled: !!user?.email,
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.currentTarget.value);
  };

  const uploadPolicyMutation = useMutation({
    mutationFn: async (evidenceData: {
      fileName: string;
      path: string;
      description?: string;
      practiceId: string;
    }) => {
      const response = await apiRequest("POST", "/api/hr/policy", {
        ...evidenceData,
        email: user?.email,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/policies"] });
      toast({
        title: "Success",
        description: "Policy uploaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload policy",
        variant: "destructive",
      });
    },
  });

  const handleUploadComplete = (filePath: string) => {
    const fileName = prompt("Enter evidence name:");
    const description = prompt("Enter evidence description:");

    const evidenceData = {
      fileName: fileName || `Policy_${new Date().toLocaleString()}`,
      path: filePath,
      description:
        description ||
        `policy of ${user?.firstName} ${user?.lastName} - ${new Date().toLocaleString()}`,
      practiceId: userData.practiceId,
    };
    uploadPolicyMutation.mutate(evidenceData);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="flex items-center space-x-2"
              data-testid="button-back-to-hr"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to HR</span>
            </Button>
            <div className="w-px h-6 bg-slate-200"></div>
            <h1 className="text-xl font-semibold text-slate-900">
              Policy Management
            </h1>
          </div>
        </div>
      </header>

      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4">
          Upload Policy Document
        </h3>
        <div className="flex space-x-2">
          <div>
            <FileUploader
              onUploadComplete={handleUploadComplete}
              maxFileSize={25}
              acceptedTypes=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
              disabled={uploadPolicyMutation.isPending}
            />
          </div>
        </div>
      </Card>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {/* Search and Filters */}
            <Card className="p-6 mb-6">
              <div className="flex space-x-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-clinical-gray" />
                  <Input
                    placeholder="Search policies..."
                    className="pl-10"
                    onChange={onChange}
                    data-testid="input-search-policies"
                  />
                </div>
              </div>
            </Card>

            {/* Policy Grid */}
            {isPoliciesLoading || isLoading ? (
              <div className="text-center py-8">
                <p className="text-clinical-gray">Loading policies...</p>
              </div>
            ) : !policies || policies.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-clinical-gray mb-4">
                  No policies found. Upload your first policy document above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {policies.map((policy, index) => {
                  if (
                    search == null ||
                    policy.fileName
                      .toLowerCase()
                      .includes(search.toLowerCase()) ||
                    policy.description
                      .toLowerCase()
                      .includes(search.toLowerCase()) ||
                    search == ""
                  ) {
                    return (
                      <Card data-testid="card-uploaded-files">
                        <CardHeader>
                          <CardTitle>Policy Evidence</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div
                              key={policy.fileName}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                              data-testid={`uploaded-file-${index}`}
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium">
                                  {policy.fileName}
                                </span>
                                {policy.description && (
                                  <span className="text-xs text-gray-500 italic">
                                    - {policy.description}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {policy.createdAt
                                  ? new Date(
                                      policy.createdAt,
                                    ).toLocaleDateString()
                                  : "Recently uploaded"}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (user?.email) {
                                    const url = `${policy.path}?email=${encodeURIComponent(user.email)}`;
                                    window.open(url, "_blank");
                                  }
                                }}
                                className="h-8 w-8 p-0"
                                data-testid={`button-view-file-${index}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <LLMGuide
              title="Staff Guide"
              subtitle="Management assistance"
              initialMessage="I can help you with managing staff appraisals. What would you like to know?"
              placeholder="Ask about staff/appraisals..."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
