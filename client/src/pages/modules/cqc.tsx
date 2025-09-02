import { useQuery, useMutation } from "@tanstack/react-query";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import LLMGuide from "@/components/llm-guide";
import ModuleLogo from "@/components/module-logo";
import { useToast } from "@/hooks/use-toast";

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

interface CQCActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export default function ChironCQC() {
  const { toast } = useToast();

  const { data: metrics, isLoading: metricsLoading } =
    useQuery<CQCDashboardMetrics>({
      queryKey: ["/api/cqc/dashboard"],
    });

  const { data: standards, isLoading: standardsLoading } = useQuery<
    CQCStandard[]
  >({
    queryKey: ["/api/cqc/standards"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<
    CQCActivity[]
  >({
    queryKey: ["/api/cqc/activity"],
  });

  const uploadEvidenceMutation = useMutation({
    mutationFn: async (evidenceData: {
      fileName: string;
      description: string;
      standardIds: string[];
    }) => {
      const response = await fetch("/api/cqc/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evidenceData),
      });
      if (!response.ok) throw new Error("Failed to upload evidence");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cqc/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cqc/activity"] });
      toast({
        title: "Success",
        description: "Evidence uploaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload evidence",
        variant: "destructive",
      });
    },
  });

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
                <Button
                  variant="outline"
                  className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50"
                  onClick={() => {
                    const fileName = prompt("Enter evidence file name:");
                    const description = prompt("Enter evidence description:");
                    if (fileName && description) {
                      uploadEvidenceMutation.mutate({
                        fileName,
                        description,
                        standardIds: ["reg12"], // Mock standard ID
                      });
                    }
                  }}
                  disabled={uploadEvidenceMutation.isPending}
                >
                  <Upload className="w-8 h-8 text-chiron-blue" />
                  <span className="text-sm font-medium text-slate-700">
                    Upload Evidence
                  </span>
                </Button>

                <Link href="/modules/cqc/standards">
                  <Button
                    variant="outline"
                    className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50 w-full"
                    data-testid="button-generate-report"
                  >
                    <FileText className="w-8 h-8 text-chiron-blue" />
                    <span className="text-sm font-medium text-slate-700">
                      Generate Report
                    </span>
                  </Button>
                </Link>

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
                  <Button variant="outline" size="sm" data-testid="button-view-all-standards">
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

            {/* Recent Activity */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Recent Compliance Activity
              </h3>
              <div className="space-y-3">
                {activitiesLoading ? (
                  <div className="text-center py-4">
                    <p className="text-clinical-gray">Loading activities...</p>
                  </div>
                ) : (
                  activities?.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-chiron-blue bg-opacity-10 rounded-full flex items-center justify-center">
                        {activity.type === "evidence_upload" ? (
                          <Upload className="w-4 h-4 text-chiron-blue" />
                        ) : (
                          <Activity className="w-4 h-4 text-chiron-blue" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {activity.description}
                        </p>
                        <p className="text-xs text-clinical-gray">
                          {new Date(activity.timestamp).toLocaleDateString(
                            "en-GB",
                          )}
                        </p>
                      </div>
                      <Clock className="w-4 h-4 text-clinical-gray" />
                    </div>
                  ))
                )}
              </div>
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
