import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  ArrowLeft,
  ShieldCheck,
  Upload,
  FileText,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  File,
  Download,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import LLMGuide from "@/components/llm-guide";
import ModuleLogo from "@/components/module-logo";
import { UploadEvidenceDialog } from "@/components/upload-evidence-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/authProvider";
import { PracticeEvidence } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface CQCDashboardMetrics {
  complianceScore: number;
  openIssues: number;
  totalStandards: number;
  evidenceCount: number;
  keyQuestions: {
    Safe: number;
    Effective: number;
    Caring: number;
    Responsive: number;
    WellLed: number;
  };
}

interface CQCStandard {
  id: string;
  regulationId: string;
  title: string;
  summary: string;
  keyQuestion: string;
  sourceUrl: string;
}

export default function ChironCQC() {
  const { toast } = useToast();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const { user } = useAuth();

  const { data: metrics, isLoading: metricsLoading } =
    useQuery<CQCDashboardMetrics>({
      queryKey: ["/api/cqc/dashboard", user?.email],
      queryFn: async () => {
        if (!user?.email) throw new Error("Not authenticated");
        const response = await fetch(
          `/api/cqc/dashboard?email=${encodeURIComponent(user.email)}`,
          { credentials: "include" },
        );
        if (!response.ok) throw new Error("Failed to fetch dashboard");
        return response.json();
      },
      enabled: !!user?.email,
    });

  const { data: standards, isLoading: standardsLoading } = useQuery<
    CQCStandard[]
  >({
    queryKey: ["/api/cqc/standards", user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error("Not authenticated");
      const response = await fetch(
        `/api/cqc/standards?email=${encodeURIComponent(user.email)}`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error("Failed to fetch standards");
      return response.json();
    },
    enabled: !!user?.email,
  });

  const { data: cqcevidence, isLoading: iscqcevidenceLoading } = useQuery<
    PracticeEvidence[]
  >({
    queryKey: ["/api/hr/cqcevidence", user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error("Not authenticated");
      const response = await fetch(
        `/api/hr/cqcevidence?email=${encodeURIComponent(user.email)}`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error("Failed to fetch");
      return await response.json();
    },
    enabled: !!user?.email,
  });

  const generateReportMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!user?.email) throw new Error("Not authenticated");
      const response = await fetch("/api/cqc/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message,
          email: user.email,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate report");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate dashboard query to refresh with new scores
      queryClient.invalidateQueries({ queryKey: ["/api/cqc/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/cqcevidence"] });
      toast({
        title: "Report Generated Successfully",
        description: `Analyzed ${data.filesAnalyzed} files and updated CQC Compliance Scores`,
      });
      setIsGeneratingReport(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Report Generation Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsGeneratingReport(false);
    },
  });

  const handleGenerateReport = () => {
    setIsGeneratingReport(true);
    generateReportMutation.mutate("");
  };

  const getQuestionColor = (score: number) => {
    if (score >= 95) return "text-medical-green";
    if (score >= 85) return "text-amber-600";
    return "text-alert-red";
  };

  const getQuestionBgColor = (score: number) => {
    if (score >= 95) return "bg-green-50 border-green-200";
    if (score >= 85) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };


  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="flex items-center space-x-2 text-clinical-gray hover:text-chiron-blue"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="w-px h-6 bg-slate-200"></div>
            <div className="flex items-center space-x-3">
              <ModuleLogo moduleName="cqc" icon={ShieldCheck} />
              <h1 className="text-xl font-semibold text-slate-900">
                ChironCQC
              </h1>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="bg-green-50 text-medical-green border-green-200"
          >
            <div className="w-2 h-2 bg-medical-green rounded-full mr-2"></div>
            Compliance Monitoring Active
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">
                    Compliance Score
                  </h3>
                  <ShieldCheck className="w-5 h-5 text-chiron-blue" />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {metricsLoading ? "..." : `${metrics?.complianceScore}%`}
                </p>
                <p className="text-sm text-medical-green">Above target</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">
                    Open Issues
                  </h3>
                  <AlertCircle className="w-5 h-5 text-chiron-orange" />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {metricsLoading ? "..." : metrics?.openIssues}
                </p>
                <p className="text-sm text-clinical-gray">Needs attention</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">
                    Standards
                  </h3>
                  <FileText className="w-5 h-5 text-chiron-blue" />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {metricsLoading ? "..." : metrics?.totalStandards}
                </p>
                <p className="text-sm text-clinical-gray">Total monitored</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">
                    Evidence Files
                  </h3>
                  <Upload className="w-5 h-5 text-chiron-blue" />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {metricsLoading ? "..." : metrics?.evidenceCount}
                </p>
                <p className="text-sm text-clinical-gray">Uploaded</p>
              </Card>
            </div>

            {/* CQC Five Key Questions */}
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">
                CQC Five Key Questions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {metrics?.keyQuestions &&
                  Object.entries(metrics.keyQuestions).map(
                    ([question, score]) => (
                      <div
                        key={question}
                        className={`p-4 rounded-lg border ${getQuestionBgColor(score)}`}
                      >
                        <div className="text-center">
                          <div
                            className={`text-2xl font-bold mb-1 ${getQuestionColor(score)}`}
                          >
                            {score}%
                          </div>
                          <div className="text-sm font-medium text-slate-700 mb-2">
                            {question === "WellLed" ? "Well-led" : question}
                          </div>
                          <Progress value={score} className="h-2" />
                        </div>
                      </div>
                    ),
                  )}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <UploadEvidenceDialog
                  maxFileSize={25}
                  acceptedTypes=".pdf, .doc, .docx, .jpg, .jpeg, .png, .xls, .xlsx"
                />
                <Button
                  variant="outline"
                  className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50"
                  data-testid="button-generate-report"
                  onClick={handleGenerateReport}
                  disabled={
                    isGeneratingReport || generateReportMutation.isPending
                  }
                >
                  {isGeneratingReport || generateReportMutation.isPending ? (
                    <>
                      <Clock className="w-8 h-8 text-chiron-blue animate-spin" />
                      <span className="text-sm font-medium text-slate-700">
                        Analyzing Files...
                      </span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-8 h-8 text-chiron-blue" />
                      <span className="text-sm font-medium text-slate-700">
                        Generate Report
                      </span>
                    </>
                  )}
                </Button>
                <Link href="/modules/cqc/standards">
                  <Button
                    variant="outline"
                    className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50 w-full"
                    data-testid="button-standards-browser"
                  >
                    <CheckCircle className="w-8 h-8 text-chiron-blue" />
                    <span className="text-sm font-medium text-slate-700">
                      Standards Browser
                    </span>
                  </Button>
                </Link>
                <Link href="/modules/cqc/standards">
                  <Button
                    variant="outline"
                    className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50 w-full"
                    data-testid="button-audit-trail"
                  >
                    <Activity className="w-8 h-8 text-chiron-blue" />
                    <span className="text-sm font-medium text-slate-700">
                      Audit Trail
                    </span>
                  </Button>
                </Link>
              </div>
            </Card>

            {/* CQC Standards Overview */}
            <Card className="p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  CQC Standards
                </h3>
                <Link href="/modules/cqc/standards">
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-view-all-standards"
                  >
                    View All
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {standardsLoading ? (
                  <div className="text-center py-4">
                    <p className="text-clinical-gray">Loading standards...</p>
                  </div>
                ) : (
                  standards?.slice(0, 3).map((standard) => (
                    <div
                      key={standard.id}
                      className="flex items-start justify-between p-4 bg-slate-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge
                            variant="outline"
                            className="text-chiron-blue border-chiron-blue"
                          >
                            {standard.regulationId}
                          </Badge>
                          <Badge variant="secondary" className="text-slate-600">
                            {standard.keyQuestion}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-slate-900 mb-1">
                          {standard.title}
                        </h4>
                        <p className="text-sm text-clinical-gray">
                          {standard.summary}
                        </p>
                      </div>
                      <div className="ml-4">
                        <CheckCircle className="w-5 h-5 text-medical-green" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Recent Activity needs replaced*/}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Uploaded Evidence
              </h3>
              {iscqcevidenceLoading ? (
                <div className="text-center py-8">
                  <p className="text-clinical-gray">Loading Evidence...</p>
                </div>
              ) : !cqcevidence || cqcevidence.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-clinical-gray mb-4">No evidence found</p>
                </div>
              ) : (
                <Card data-testid="card-uploaded-files">
                  <CardHeader>
                    <CardTitle>CQC Evidence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {cqcevidence
                        .filter(
                          (practiceevidence) =>
                            practiceevidence.practiceId === user?.practiceId,
                        )
                        .map((evidence, index) => (
                          <div
                            key={evidence.fileName}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            data-testid={`uploaded-file-${index}`}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <FileText className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium">
                                {evidence.fileName}
                              </span>
                              {evidence.description && (
                                <span className="text-xs text-gray-500 italic">
                                  - {evidence.description}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500">
                                {evidence.createdAt
                                  ? new Date(
                                      evidence.createdAt,
                                    ).toLocaleDateString()
                                  : "Recently uploaded"}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (user?.email) {
                                    const url = `${evidence.path}?email=${encodeURIComponent(user.email)}`;
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
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </Card>
          </div>

          {/* LLM Guide */}
          <div className="lg:col-span-1">
            <LLMGuide
              title="CQC Assistant"
              subtitle="Compliance guidance"
              initialMessage="I can help you with CQC registration, compliance monitoring, and evidence management. I have detailed knowledge of all CQC regulations. What would you like to know?"
              placeholder="Ask about CQC..."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
