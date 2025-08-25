import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Calendar,
  FileText,
  BookOpen,
  Clock,
  Clipboard,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LLMGuide from "@/components/llm-guide";
import StaffManagement from "@/components/staff-management";
import ModuleLogo from "@/components/module-logo";
import { useState } from "react";

interface HRMetrics {
  totalStaff: number;
  onDuty: number;
  pendingReviews: number;
  leaveRequests: number;
}

export default function ChironHR() {
  const [currentView, setCurrentView] = useState<"dashboard" | "staff">(
    "dashboard",
  );

  const { data: metrics, isLoading: metricsLoading } = useQuery<HRMetrics>({
    queryKey: ["/api/hr/metrics"],
  });

  if (currentView === "staff") {
    return <StaffManagement onBack={() => setCurrentView("dashboard")} />;
  }

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
              <ModuleLogo moduleName="hr" icon={Users} />
              <h1 className="text-xl font-semibold text-slate-900">ChironHR</h1>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="bg-green-50 text-medical-green border-green-200"
          >
            <div className="w-2 h-2 bg-medical-green rounded-full mr-2"></div>
            All Systems Operational
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
                    Total Staff
                  </h3>
                  <Users className="w-5 h-5 text-chiron-blue" />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {metricsLoading ? "..." : metrics?.totalStaff}
                </p>
                <p className="text-sm text-medical-green">+2 this month</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">
                    On Duty Today
                  </h3>
                  <Clock className="w-5 h-5 text-chiron-blue" />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {metricsLoading ? "..." : metrics?.onDuty}
                </p>
                <p className="text-sm text-clinical-gray">75% capacity</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">
                    Pending Reviews
                  </h3>
                  <Clipboard className="w-5 h-5 text-chiron-orange" />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {metricsLoading ? "..." : metrics?.pendingReviews}
                </p>
                <p className="text-sm text-amber-600">Due this week</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">
                    Leave Requests
                  </h3>
                  <Calendar className="w-5 h-5 text-chiron-blue" />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {metricsLoading ? "..." : metrics?.leaveRequests}
                </p>
                <p className="text-sm text-clinical-gray">Awaiting approval</p>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentView("staff")}
                  className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50"
                >
                  <UserPlus className="w-8 h-8 text-chiron-blue" />
                  <span className="text-sm font-medium text-slate-700">
                    Manage Staff
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50"
                  disabled
                >
                  <Calendar className="w-8 h-8 text-chiron-blue" />
                  <span className="text-sm font-medium text-slate-700">
                    View Rota
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50"
                  disabled
                >
                  <FileText className="w-8 h-8 text-chiron-blue" />
                  <span className="text-sm font-medium text-slate-700">
                    Appraisals
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50"
                  disabled
                >
                  <BookOpen className="w-8 h-8 text-chiron-blue" />
                  <span className="text-sm font-medium text-slate-700">
                    Policies
                  </span>
                </Button>
              </div>
            </Card>

            {/* Today's Rota */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Today's Rota
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-chiron-blue rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">DW</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        Dr. Sarah Wilson
                      </p>
                      <p className="text-sm text-clinical-gray">
                        General Practitioner
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      08:00 - 18:00
                    </p>
                    <p className="text-xs text-medical-green">On duty</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-medical-green rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">SJ</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        Sister Jane Smith
                      </p>
                      <p className="text-sm text-clinical-gray">
                        Practice Nurse
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      09:00 - 17:00
                    </p>
                    <p className="text-xs text-medical-green">On duty</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-clinical-gray rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">MB</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Mark Brown</p>
                      <p className="text-sm text-clinical-gray">Receptionist</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      08:30 - 16:30
                    </p>
                    <p className="text-xs text-amber-600">Break 12:00</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* LLM Guide */}
          <div className="lg:col-span-1">
            <LLMGuide
              title="HR Assistant"
              subtitle="Staff management guidance"
              initialMessage="I can help you with staff onboarding, rota management, and compliance tracking. What would you like to know?"
              placeholder="Ask about HR..."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
