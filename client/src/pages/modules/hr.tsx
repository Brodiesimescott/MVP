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

//import { createStaff } from "@/lib/api/staff";
import { useMutation } from "@tanstack/react-query";

interface StaffData {
  name: string;
  title: string;
  workingHours: string;
}

window.onload = () => {
  const hiddenDiv1 = document.getElementById("3");
  const hiddenDiv2 = document.getElementById("4");

  if (hiddenDiv1 && hiddenDiv2) {
    hiddenDiv1.style.display = "none";
    hiddenDiv2.style.display = "none";
  }
};

const initialStaff: StaffData[] = [
  {
    name: "Dr. Sarah Wilson",
    title: "General Practitioner",
    workingHours: "08:00 - 18:00",
  },
  {
    name: "Sister Jane Smith",
    title: "Practice Nurse",
    workingHours: "09:00 - 17:00",
  },
  {
    name: "Mark Brown",
    title: "Receptionist",
    workingHours: "08:30 - 16:30",
  },
];

const replacementStaff: StaffData[] = [
  {
    name: "Emily Carter",
    title: "Practice Nurse",
    workingHours: "10:00 - 18:00",
  },
  {
    name: "Olivia Davis",
    title: "Practice Nurse",
    workingHours: "09:30 - 17:30",
  },
];

const useCreateInitialStaff = () => {
  return useMutation({
    mutationFn: async () => {
      for (const staffData of initialStaff) {
        await createStaff({
          name: staffData.name,
          title: staffData.title,
          workingHours: staffData.workingHours,
          department: "default", // Replace with appropriate default
          onDuty: false, // Or true, depending on default
        });
      }
    },
  });
};

interface HRMetrics {
  totalStaff: number;
  onDuty: number;
  pendingReviews: number;
  leaveRequests: number;
}

function markAsUnavailable(event: any) {
  const button = event.target;
  const parentDiv = button.closest(".bg-slate-50");

  const mainSection = document.getElementById("Rota-Section");
  const divToToggle1 = document.getElementById("3");
  const divToToggle2 = document.getElementById("4");
  const p = document.getElementById("p" + parentDiv.id);
  const p3 = document.getElementById("p3");
  const p4 = document.getElementById("p4");
  const b3 = document.getElementById("button3");
  const b4 = document.getElementById("button4");

  if (parentDiv && divToToggle1 && divToToggle2) {
    const currentColor = parentDiv.style.backgroundColor;
    const defaultColor = "";

    if (currentColor === "rgb(173, 173, 173)") {
      parentDiv.style.backgroundColor = defaultColor;
      button.textContent = "Mark as Unavailable";
      p.textContent = "On duty";
      p.style.color = "#04af74";

      divToToggle1.style.display = "none";
      divToToggle2.style.display = "none";

      divToToggle1.style.backgroundColor = defaultColor;
      divToToggle2.style.backgroundColor = defaultColor;

      p3.textContent = "Off duty";
      p3.style.color = "#000000";
      p4.textContent = "Off duty";
      p4.style.color = "#000000";

      b3.textContent = "Mark as Available";
      b4.textContent = "Mark as Available";
    } else {
      parentDiv.style.backgroundColor = "#ADADAD";
      button.textContent = "Mark as Available";
      p.textContent = "Off duty";
      p.style.color = "red";

      divToToggle1.style.display = "";
      divToToggle2.style.display = "";
    }
  }
}

function markAsAvailable(event: any) {
  const button = event.target;
  const parentDiv = button.closest(".bg-slate-50");

  const mainSection = document.getElementById("Rota-Section");
  const divToToggle1 = document.getElementById("3");
  const divToToggle2 = document.getElementById("4");
  const p = document.getElementById("p" + parentDiv.id);

  if (parentDiv && p && divToToggle1 && divToToggle2) {
    const currentColor = parentDiv.style.backgroundColor;
    const defaultColor = "";

    if (currentColor === "rgb(179, 230, 165)") {
      parentDiv.style.backgroundColor = defaultColor;
      button.textContent = "Mark as Available";
      p.textContent = "Off duty";
      p.style.color = "#000000";
    } else {
      parentDiv.style.backgroundColor = "#B3E6A5";
      button.textContent = "Mark as Unavailable";
      p.textContent = "On duty";
      p.style.color = "#04af74";
    }

    if (divToToggle1 && divToToggle2) {
      if (parentDiv.id == "3") {
        // Check if the section is hidden
        const isHidden2 = divToToggle2.style.display === "none";

        // Toggle the display between none and block (visible)
        divToToggle2.style.display = isHidden2 ? "" : "none";
      }

      if (parentDiv.id == "4") {
        // Check if the section is hidden
        const isHidden1 = divToToggle1.style.display === "none";

        // Toggle the display between none and block (visible)Mask
        divToToggle1.style.display = isHidden1 ? "" : "none";
      }
    }
  }
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
                  onClick={() => setCurrentView("staff")}
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

            {/* Define an array of colors for staff members */}

            {/* Today's Rota */}
            <Card className="p-6" id="Rota-Section">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Today's Rota
              </h3>

              <div>
                <div
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  id="1"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 bg-chiron-blue rounded-full flex items-center justify-center`}
                    >
                      <span className="text-white font-medium text-sm">DS</span>
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
                    <p className="text-xs text-medical-green" id="p1">
                      On duty
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                      onClick={(event) => markAsUnavailable(event)}
                    >
                      Mark as Unavailable
                    </button>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  id="2"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 bg-medical-green rounded-full flex items-center justify-center`}
                    >
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
                    <p className="text-xs text-medical-green" id="p2">
                      On duty
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                      onClick={(event) => markAsUnavailable(event)}
                    >
                      Mark as Unavailable
                    </button>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  id="3"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 bg-medical-green rounded-full flex items-center justify-center`}
                    >
                      <span className="text-white font-medium text-sm">EC</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Emily Carte</p>
                      <p className="text-sm text-clinical-gray">
                        Practice Nurse
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      10:00 - 18:00
                    </p>
                    <p className="text-xs text-red" id="p3">
                      Off duty
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                      id="button3"
                      onClick={(event) => markAsAvailable(event)}
                    >
                      Mark as Available
                    </button>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  id="4"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 bg-medical-green rounded-full flex items-center justify-center`}
                    >
                      <span className="text-white font-medium text-sm">OD</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Olivia Davis</p>
                      <p className="text-sm text-clinical-gray">
                        Practice Nurse
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      09:30 - 17:30
                    </p>
                    <p className="text-xs text-red" id="p4">
                      Off duty
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                      id="button4"
                      onClick={(event) => markAsAvailable(event)}
                    >
                      Mark as Available
                    </button>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  id="5"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 bg-clinical-gray rounded-full flex items-center justify-center`}
                    >
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
                    <p className="text-xs text-medical-green" id="p3">
                      On duty
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                      onClick={(event) => markAsUnavailable(event)}
                    >
                      Mark as Unavailable
                    </button>
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
