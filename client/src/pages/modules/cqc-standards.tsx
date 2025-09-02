import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Clock,
  Book
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ModuleLogo from "@/components/module-logo";

interface CQCStandard {
  id: string;
  regulationId: string;
  title: string;
  summary: string;
  keyQuestion: string;
  sourceUrl: string;
  status: "compliant" | "needs-attention" | "pending-review";
  lastReviewed: string;
  evidenceCount: number;
}

export default function CQCStandards() {
  const { data: standards, isLoading } = useQuery<CQCStandard[]>({
    queryKey: ["/api/cqc/standards"],
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="w-5 h-5 text-medical-green" />;
      case "needs-attention":
        return <AlertTriangle className="w-5 h-5 text-chiron-orange" />;
      case "pending-review":
        return <Clock className="w-5 h-5 text-clinical-gray" />;
      default:
        return <Clock className="w-5 h-5 text-clinical-gray" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "compliant":
        return <Badge className="bg-green-50 text-medical-green border-green-200">Compliant</Badge>;
      case "needs-attention":
        return <Badge variant="destructive">Needs Attention</Badge>;
      case "pending-review":
        return <Badge variant="secondary">Pending Review</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/modules/cqc"
              className="flex items-center space-x-2 text-clinical-gray hover:text-chiron-blue"
              data-testid="link-back-cqc"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to CQC Dashboard</span>
            </Link>
            <div className="w-px h-6 bg-slate-200"></div>
            <div className="flex items-center space-x-3">
              <ModuleLogo moduleName="cqc" icon={ShieldCheck} />
              <h1 className="text-xl font-semibold text-slate-900">
                CQC Standards Browser
              </h1>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="bg-chiron-blue bg-opacity-10 text-chiron-blue border-chiron-blue"
          >
            <Book className="w-4 h-4 mr-2" />
            {standards?.length || 0} Standards
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Standards Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {standards?.filter(s => s.status === "compliant").length || 0}
                </p>
                <p className="text-sm text-medical-green">Compliant</p>
              </div>
              <CheckCircle className="w-8 h-8 text-medical-green" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {standards?.filter(s => s.status === "needs-attention").length || 0}
                </p>
                <p className="text-sm text-chiron-orange">Needs Attention</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-chiron-orange" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {standards?.filter(s => s.status === "pending-review").length || 0}
                </p>
                <p className="text-sm text-clinical-gray">Pending Review</p>
              </div>
              <Clock className="w-8 h-8 text-clinical-gray" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {standards?.length || 0}
                </p>
                <p className="text-sm text-chiron-blue">Total Standards</p>
              </div>
              <FileText className="w-8 h-8 text-chiron-blue" />
            </div>
          </Card>
        </div>

        {/* Standards List */}
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="flex items-center justify-between">
              <span>CQC Standards & Regulations</span>
              <Button variant="outline" size="sm" data-testid="button-refresh-standards">
                <Clock className="w-4 h-4 mr-2" />
                Last Updated: Today
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-clinical-gray">Loading CQC standards...</p>
              </div>
            ) : standards && standards.length > 0 ? (
              <div className="space-y-4">
                {standards.map((standard) => (
                  <div
                    key={standard.id}
                    className="border border-slate-200 rounded-lg p-6 hover:border-chiron-blue transition-colors"
                    data-testid={`card-standard-${standard.id}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge
                            variant="outline"
                            className="text-chiron-blue border-chiron-blue font-mono"
                          >
                            {standard.regulationId}
                          </Badge>
                          <Badge variant="secondary" className="text-slate-600">
                            {standard.keyQuestion === "WellLed" ? "Well-led" : standard.keyQuestion}
                          </Badge>
                          {getStatusBadge(standard.status)}
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                          {standard.title}
                        </h3>
                        <p className="text-clinical-gray mb-4">
                          {standard.summary}
                        </p>
                        <div className="flex items-center text-sm text-clinical-gray space-x-6">
                          <span>Last reviewed: {new Date(standard.lastReviewed).toLocaleDateString('en-GB')}</span>
                          <span>Evidence files: {standard.evidenceCount}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 ml-6">
                        {getStatusIcon(standard.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(standard.sourceUrl, '_blank')}
                          data-testid={`button-view-standard-${standard.id}`}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Source
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-clinical-gray mx-auto mb-4" />
                <p className="text-clinical-gray">
                  No CQC standards found
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}