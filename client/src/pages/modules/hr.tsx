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
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LLMGuide from "@/components/llm-guide";
import StaffManagement from "@/components/staff-management";
import AppraisalManagement from "@/components/appraisal";
import RotaManagement from "@/components/rota";
import ModuleLogo from "@/components/module-logo";
import { useState, useMemo } from "react";
import { z } from "zod";
import { insertStaffSchema, staff } from "@shared/schema";
import { createInsertSchema } from "drizzle-zod";
import { useAuth } from "@/components/auth/authProvider";
import { useMutation } from "@tanstack/react-query";

const staffSchema = createInsertSchema(staff).extend({
  firstName: z.string(),
  lastName: z.string(),
});

type StaffData = z.infer<typeof staffSchema>;

interface HRMetrics {
  totalStaff: number;
  onDuty: number;
  pendingReviews: number;
  leaveRequests: number;
}

export default function ChironHR() {
  const [currentView, setCurrentView] = useState<
    "dashboard" | "staff" | "appraisals" | "rota"
  >("dashboard");
  var weekday = new Array(7);
  weekday[0] = "Sunday";
  weekday[1] = "Monday";
  weekday[2] = "Tuesday";
  weekday[3] = "Wednesday";
  weekday[4] = "Thursday";
  weekday[5] = "Friday";
  weekday[6] = "Saturday";
  const [selectedDay, setSelectedDay] = useState<string>(
    weekday[new Date().getDay()],
  );
  const { user, logout } = useAuth();

  const { data: staff, isLoading } = useQuery<StaffData[]>({
    queryKey: ["/api/hr/staff"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<HRMetrics>({
    queryKey: ["/api/hr/metrics"],
  });

  // Get staff working on selected day
  const dailySchedule = useMemo(() => {
    if (!staff) return [];

    const dayIndex = weekday.indexOf(selectedDay);
    if (dayIndex === -1) return [];

    return staff
      .filter((staffMember) => {
        const workingHours = staffMember.workingHours?.[dayIndex];
        return workingHours && workingHours !== "not in";
      })
      .map((staffMember) => ({
        ...staffMember,
        workingHours: staffMember.workingHours?.[dayIndex] || "not in",
      }))
      .sort((a, b) => {
        // Sort by working hours: all day first, then am, then pm
        const order = { "all day": 0, am: 1, pm: 2 };
        return (
          (order[a.workingHours as keyof typeof order] || 3) -
          (order[b.workingHours as keyof typeof order] || 3)
        );
      });
  }, [staff, selectedDay]);

  if (currentView === "staff") {
    return <StaffManagement onBack={() => setCurrentView("dashboard")} />;
  }

  if (currentView === "appraisals") {
    return <AppraisalManagement onBack={() => setCurrentView("dashboard")} />;
  }

  if (currentView === "rota") {
    return <RotaManagement onBack={() => setCurrentView("dashboard")} />;
  }

  const getStatusBadge = (hours: string) => {
    if (hours === "not in") {
      return (
        <Badge
          variant="secondary"
          className="bg-red-50 text-red-700 border-red-200"
        >
          Not In
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="bg-green-50 text-green-700 border-green-200"
      >
        {hours}
      </Badge>
    );
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
                <p className="text-sm text-medical-green"></p>
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
                <p className="text-sm text-clinical-gray">
                  {metricsLoading
                    ? "..."
                    : ((metrics?.onDuty || 0) / (metrics?.totalStaff || 1)) *
                      100}
                  {"% of capacity"}
                </p>
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
                <p className="text-sm text-amber-600">Due this month</p>
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
                  onClick={() => setCurrentView("rota")}
                >
                  <Calendar className="w-8 h-8 text-chiron-blue" />
                  <span className="text-sm font-medium text-slate-700">
                    View Rota
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50"
                  onClick={() => setCurrentView("appraisals")}
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
                {/* Daily Schedule Table */}
                <div className="mt-8">
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">
                          Daily Schedule
                        </h2>
                        <Select
                          value={selectedDay}
                          onValueChange={setSelectedDay}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            {weekday.map((day) => (
                              <SelectItem key={day} value={day}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-6 py-4 text-sm font-semibold text-slate-900 bg-slate-50">
                            Staff Member
                          </TableHead>
                          <TableHead className="px-6 py-4 text-sm font-semibold text-slate-900 bg-slate-50">
                            Position
                          </TableHead>
                          <TableHead className="px-6 py-4 text-sm font-semibold text-slate-900 bg-slate-50">
                            Department
                          </TableHead>
                          <TableHead className="px-6 py-4 text-sm font-semibold text-slate-900 bg-slate-50">
                            Working Hours
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailySchedule.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center py-12 text-slate-500"
                            >
                              <div className="flex flex-col items-center space-y-3">
                                <Users className="w-12 h-12 text-slate-300" />
                                <div>
                                  <p className="text-lg font-medium">
                                    No staff scheduled
                                  </p>
                                  <p className="text-sm">
                                    No staff members are working on{" "}
                                    {selectedDay}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          dailySchedule.map((staffMember) => (
                            <TableRow
                              key={staffMember.employeeId}
                              className="border-b hover:bg-slate-50/50 transition-colors"
                            >
                              <TableCell className="px-6 py-4">
                                <div className="font-medium text-slate-900">
                                  {staffMember.firstName} {staffMember.lastName}
                                </div>
                                <div className="text-sm text-slate-500">
                                  {staffMember.employeeId}
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                <Badge
                                  variant="outline"
                                  className="capitalize bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  {staffMember.position}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                <span className="text-slate-700">
                                  {staffMember.department || "Not specified"}
                                </span>
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                {getStatusBadge(staffMember.workingHours)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
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
