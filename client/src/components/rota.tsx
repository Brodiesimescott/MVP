import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Users,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Textarea } from "@/components/ui/textarea";
import LLMGuide from "@/components/llm-guide";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStaffSchema, staff } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import { createInsertSchema } from "drizzle-zod";
import { index } from "drizzle-orm/mysql-core";
import { useAuth } from "@/components/auth/authProvider";

interface RotaRequirement {
  position: string;
  am: number;
  pm: number;
  allDay: number;
  checked: boolean;
}

interface StaffAssignment {
  employeeId: string;
  shifts: ("am" | "pm" | "all-day")[];
}

interface RotaDay {
  day: string;
  requirements: RotaRequirement[];
  assignments: StaffAssignment[];
}

interface RotaManagementProps {
  onBack: () => void;
}

const staffSchema = createInsertSchema(staff).extend({
  firstName: z.string(),
  lastName: z.string(),
});

type StaffData = z.infer<typeof staffSchema>;

const staffFormSchema = insertStaffSchema
  .extend({
    practiceId: z.string().optional(),
    // Person fields from insertPersonSchema
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    // Use contract field directly from schema instead of contractType
  })
  .omit({
    // Remove fields that will be handled separately
  });

type StaffFormData = z.infer<typeof staffFormSchema>;

const rotaFormSchema = z.object({
  workingHours: z.array(z.string().nullable()).length(7),
});

type RotaFormData = z.infer<typeof rotaFormSchema>;

export default function RotaManagement({ onBack }: RotaManagementProps) {
  const { user, logout } = useAuth();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateRotaDialog, setShowCreateRotaDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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
  const [selectedRotaDay, setSelectedRotaDay] = useState<string>("Monday");
  const [rotaRequirements, setRotaRequirements] = useState<RotaRequirement[]>([
    { position: "admin", am: 0, pm: 0, allDay: 0, checked: false },
    { position: "nurse", am: 0, pm: 0, allDay: 0, checked: false },
    { position: "doctor", am: 0, pm: 0, allDay: 0, checked: false },
    { position: "reception", am: 0, pm: 0, allDay: 0, checked: false },
    { position: "business", am: 0, pm: 0, allDay: 0, checked: false },
    { position: "pharmacy", am: 0, pm: 0, allDay: 0, checked: false },
    { position: "physio", am: 0, pm: 0, allDay: 0, checked: false },
    { position: "health visitor", am: 0, pm: 0, allDay: 0, checked: false },
    { position: "dentist", am: 0, pm: 0, allDay: 0, checked: false },
    { position: "dental therapist", am: 0, pm: 0, allDay: 0, checked: false },
    { position: "hygienist", am: 0, pm: 0, allDay: 0, checked: false },
  ]);
  const [rotaAssignments, setRotaAssignments] = useState<StaffAssignment[]>([]);

  // https://stackoverflow.com/questions/66627655/how-do-i-map-several-controlled-input-checkboxes-from-an-array-in-react

  const { data: staff, isLoading } = useQuery<StaffData[]>({
    queryKey: ["/api/hr/staff", user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error("Not authenticated");
      const response = await fetch(
        `/api/hr/staff?email=${encodeURIComponent(user.email)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch");
      return await response.json();
    },
    enabled: !!user?.email,
  });

  const { data: existingRota, isLoading: isRotaLoading } =
    useQuery<RotaDay | null>({
      queryKey: ["/api/hr/rota", selectedRotaDay, user?.email],
      queryFn: async () => {
        if (!user?.email) throw new Error("Not authenticated");
        const response = await fetch(
          `/api/hr/rota/${selectedRotaDay}?email=${encodeURIComponent(user.email)}`,
        );
        if (response.status === 404) return null;
        if (!response.ok) throw new Error("Failed to fetch");
        return await response.json();
      },
      enabled: !!user?.email && !!selectedRotaDay,
    });

  const { toast } = useToast();

  // Populate form with existing rota data when it changes
  useEffect(() => {
    if (existingRota) {
      setRotaRequirements(existingRota.requirements || rotaRequirements);
      setRotaAssignments(existingRota.assignments || []);
    }
  }, [existingRota]);

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      employeeId: "",
      firstName: "",
      lastName: "",
      title: "",
      email: "",
      phone: "",
      address: "",
      dateOfBirth: "",
      niNumber: "",
      position: "admin",
      department: "",
      startDate: "",
      contract: "permanent", // Use contract instead of contractType
      salary: "0",
      workingHours: undefined,
      professionalBody: "",
      professionalBodyNumber: "",
      appraisalDate: "",
      nextAppraisal: "",
      revalidationInfo: "",
      dbsCheckExpiry: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
    },
  });

  const rotaForm = useForm<RotaFormData>({
    resolver: zodResolver(rotaFormSchema),
    defaultValues: {
      workingHours: [
        "not in",
        "not in",
        "not in",
        "not in",
        "not in",
        "not in",
        "not in",
      ],
    },
  });

  // Filter staff based on search query
  const filteredStaff = useMemo(() => {
    if (!staff) return [];
    if (!searchQuery.trim()) return staff;

    const query = searchQuery.toLowerCase().trim();
    return staff.filter((staffMember) => {
      const fullName =
        `${staffMember.firstName} ${staffMember.lastName}`.toLowerCase();
      const position = staffMember.position?.toLowerCase() || "";
      const email = staffMember.email?.toLowerCase() || "";

      return (
        fullName.includes(query) ||
        position.includes(query) ||
        email.includes(query)
      );
    });
  }, [staff, searchQuery]);

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

  const table = {
    headers: [
      "Employee",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    rows:
      filteredStaff?.map((staffMember) => ({
        id: staffMember.employeeId,
        name: `${staffMember.firstName} ${staffMember.lastName}`,
        sunday: staffMember.workingHours?.[0] || "not in",
        monday: staffMember.workingHours?.[1] || "not in",
        tuesday: staffMember.workingHours?.[2] || "not in",
        wednesday: staffMember.workingHours?.[3] || "not in",
        thursday: staffMember.workingHours?.[4] || "not in",
        friday: staffMember.workingHours?.[5] || "not in",
        saturday: staffMember.workingHours?.[6] || "not in",
      })) || [],
  };

  const updateStaffMutation = useMutation({
    mutationFn: async ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: Partial<StaffFormData>;
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
      toast({
        title: "Success",
        description: "Staff member updated successfully",
      });
      setShowEditDialog(false);
      setSelectedStaff(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update staff member",
        variant: "destructive",
      });
    },
  });

  const updateRotaMutation = useMutation({
    mutationFn: async ({
      employeeId,
      workingHours,
    }: {
      employeeId: string;
      workingHours: (string | "not in")[];
    }) => {
      const response = await apiRequest(
        "PUT",
        `/api/hr/staff/${employeeId}?email=${encodeURIComponent(user?.email || "")}`,
        {
          workingHours,
        },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/staff"] });
      toast({
        title: "Success",
        description: "Rota updated successfully",
      });
      setShowEditDialog(false);
      setSelectedStaff(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update rota",
        variant: "destructive",
      });
    },
  });

  const createRotaMutation = useMutation({
    mutationFn: async (data: {
      day: string;
      requirements: RotaRequirement[];
      assignments: StaffAssignment[];
    }) => {
      if (!user?.email) throw new Error("Not authenticated");

      const response = await fetch(
        `/api/hr/rota?email=${encodeURIComponent(user.email)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to create rota");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/rota"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/staff"] });
      toast({
        title: "Success",
        description: `Rota created for ${selectedRotaDay}`,
      });
      setShowCreateRotaDialog(false);
      resetRotaForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create rota",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StaffFormData) => {
    if (!selectedStaff?.employeeId) {
      toast({
        title: "Error",
        description: "No staff member selected",
        variant: "destructive",
      });
      return;
    }
    updateStaffMutation.mutate({
      employeeId: selectedStaff.employeeId,
      data,
    });
  };

  const onRotaSubmit = async (data: RotaFormData) => {
    if (!selectedStaff?.employeeId || !user?.email) {
      toast({
        title: "Error",
        description: "No staff member selected",
        variant: "destructive",
      });
      return;
    }

    const oldWorkingHours = selectedStaff.workingHours || [
      "not in",
      "not in",
      "not in",
      "not in",
      "not in",
      "not in",
      "not in",
    ];
    const newWorkingHours = data.workingHours.map((hour) => hour ?? "not in");

    // Update staff member's working hours first
    updateRotaMutation.mutate({
      employeeId: selectedStaff.employeeId,
      workingHours: newWorkingHours,
    });

    // Update rotas for changed days
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const oldShift = oldWorkingHours[dayIndex];
      const newShift = newWorkingHours[dayIndex];

      // If the shift changed for this day
      if (oldShift !== newShift) {
        const dayName = weekday[dayIndex];
        
        try {
          // Fetch existing rota for this day
          const response = await fetch(
            `/api/hr/rota/${dayName}?email=${encodeURIComponent(user.email)}`,
          );
          
          if (response.ok) {
            const existingRota = await response.json() as RotaDay;
            let updatedAssignments = [...(existingRota.assignments || [])];

            // Find existing assignment for this staff member
            const existingIndex = updatedAssignments.findIndex(
              (a) => a.employeeId === selectedStaff.employeeId
            );

            if (newShift === "not in") {
              // Remove staff from rota if they're now "not in"
              if (existingIndex !== -1) {
                updatedAssignments.splice(existingIndex, 1);
              }
            } else {
              // Convert shift format
              const shiftFormat: ("am" | "pm" | "all-day")[] = newShift === "all day" ? ["all-day"] : [newShift as "am" | "pm"];
              
              if (existingIndex !== -1) {
                // Update existing assignment
                updatedAssignments[existingIndex] = {
                  ...updatedAssignments[existingIndex],
                  shifts: shiftFormat,
                };
              } else {
                // Add new assignment
                updatedAssignments.push({
                  employeeId: selectedStaff.employeeId,
                  shifts: shiftFormat,
                });
              }
            }

            // Update the rota with new assignments
            await apiRequest(
              "PUT",
              `/api/hr/rota/${dayName}?email=${encodeURIComponent(user.email)}`,
              { assignments: updatedAssignments }
            );
          }
        } catch (error) {
          console.error(`Failed to update rota for ${dayName}:`, error);
        }
      }
    }

    // Invalidate queries to refresh the UI
    queryClient.invalidateQueries({ queryKey: ["/api/hr/rota"] });
  };

  const handleEditRota = (staffMember: StaffData) => {
    setSelectedStaff(staffMember);
    rotaForm.reset({
      workingHours: staffMember.workingHours || [
        "not in",
        "not in",
        "not in",
        "not in",
        "not in",
        "not in",
        "not in",
      ],
    });
    setShowEditDialog(true);
  };

  // Rota creation functions
  const updateRequirement = (
    position: string,
    shift: "am" | "pm" | "allDay",
    value: number,
  ) => {
    setRotaRequirements((prev) =>
      prev.map((req) =>
        req.position === position
          ? { ...req, [shift]: Math.max(0, value) }
          : req,
      ),
    );
  };

  const assignStaff = (employeeId: string, shift: "am" | "pm" | "all-day") => {
    setRotaAssignments((prev) => {
      const existing = prev.find((a) => a.employeeId === employeeId);

      if (existing) {
        // If assigning all-day, remove other shifts
        if (shift === "all-day") {
          return prev.map((a) =>
            a.employeeId === employeeId ? { ...a, shifts: ["all-day"] } : a,
          );
        }

        // If already has all-day, don't add other shifts
        if (existing.shifts.includes("all-day")) {
          return prev;
        }

        // Add shift if not already present
        if (!existing.shifts.includes(shift)) {
          return prev.map((a) =>
            a.employeeId === employeeId
              ? { ...a, shifts: [...a.shifts, shift] }
              : a,
          );
        }
        return prev;
      } else {
        return [...prev, { employeeId, shifts: [shift] }];
      }
    });
  };

  const removeStaffAssignment = (
    employeeId: string,
    shift?: "am" | "pm" | "all-day",
  ) => {
    setRotaAssignments((prev) => {
      if (shift) {
        // Remove specific shift
        return prev
          .map((a) =>
            a.employeeId === employeeId
              ? { ...a, shifts: a.shifts.filter((s) => s !== shift) }
              : a,
          )
          .filter((a) => a.shifts.length > 0);
      } else {
        // Remove all assignments for this staff member
        return prev.filter((a) => a.employeeId !== employeeId);
      }
    });
  };

  const calculateCoverage = (position: string) => {
    const requirement = rotaRequirements.find((r) => r.position === position);
    if (!requirement)
      return { am: 0, pm: 0, allDay: 0, amPmEquivalent: 0, effectiveAllDay: 0 };

    const positionStaff =
      filteredStaff?.filter((s) => s.position === position) || [];
    const assignments = rotaAssignments.filter((a) =>
      positionStaff.some((s) => s.employeeId === a.employeeId),
    );

    let amCovered = 0;
    let pmCovered = 0;
    let allDayCovered = 0;
    let amPmEquivalent = 0;

    assignments.forEach((assignment) => {
      const hasAm = assignment.shifts.includes("am");
      const hasPm = assignment.shifts.includes("pm");
      const hasAllDay = assignment.shifts.includes("all-day");

      if (hasAllDay) {
        allDayCovered += 1;
        amCovered += 1;
        pmCovered += 1;
      } else {
        if (hasAm) amCovered += 1;
        if (hasPm) pmCovered += 1;
        if (hasAm && hasPm) amPmEquivalent += 1;
      }
    });

    return {
      am: amCovered,
      pm: pmCovered,
      allDay: allDayCovered,
      amPmEquivalent,
      effectiveAllDay: allDayCovered + amPmEquivalent,
    };
  };

  const getStaffAssignment = (employeeId: string) => {
    return rotaAssignments.find((a) => a.employeeId === employeeId);
  };

  const canAssignShift = (
    employeeId: string,
    shift: "am" | "pm" | "all-day",
    position: string,
  ) => {
    const assignment = getStaffAssignment(employeeId);
    const coverage = calculateCoverage(position);
    const requirement = rotaRequirements.find((r) => r.position === position);

    if (!requirement) return false;

    // Check if already has this shift
    if (assignment?.shifts.includes(shift)) return false;

    // Check if already has all-day (can't add am/pm)
    if (assignment?.shifts.includes("all-day") && shift !== "all-day")
      return false;

    // Check if requirements are already met
    if (shift === "am" && coverage.am >= requirement.am) return false;
    if (shift === "pm" && coverage.pm >= requirement.pm) return false;
    if (shift === "all-day" && coverage.effectiveAllDay >= requirement.allDay)
      return false;

    return true;
  };

  const resetRotaForm = () => {
    setRotaRequirements([
      { position: "admin", am: 0, pm: 0, allDay: 0, checked: false },
      { position: "nurse", am: 0, pm: 0, allDay: 0, checked: false },
      { position: "doctor", am: 0, pm: 0, allDay: 0, checked: false },
      { position: "reception", am: 0, pm: 0, allDay: 0, checked: false },
      { position: "business", am: 0, pm: 0, allDay: 0, checked: false },
      { position: "pharmacy", am: 0, pm: 0, allDay: 0, checked: false },
      { position: "physio", am: 0, pm: 0, allDay: 0, checked: false },
      { position: "health visitor", am: 0, pm: 0, allDay: 0, checked: false },
      { position: "dentist", am: 0, pm: 0, allDay: 0, checked: false },
      { position: "dental therapist", am: 0, pm: 0, allDay: 0, checked: false },
      { position: "hygienist", am: 0, pm: 0, allDay: 0, checked: false },
    ]);
    setRotaAssignments([]);
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading staff data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="flex items-center space-x-2 hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to HR</span>
            </Button>
            <div className="w-px h-6 bg-slate-200"></div>
            <h1 className="text-xl font-semibold text-slate-900">
              Rota Management
            </h1>
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <span>
                {filteredStaff?.length || 0} of {staff?.length || 0} staff
                members
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowCreateRotaDialog(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4" />
              <span>Create Rota</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search staff by name, position, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          {searchQuery && (
            <Button
              variant="outline"
              onClick={() => setSearchQuery("")}
              className="shrink-0 hover:bg-slate-50"
            >
              Clear Search
            </Button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {table.headers.map((header, index) => (
                  <TableHead
                    key={index}
                    className="px-6 py-4 text-sm font-semibold text-slate-900 bg-slate-50"
                  >
                    {header}
                  </TableHead>
                ))}
                <TableHead className="px-6 py-4 text-sm font-semibold text-slate-900 bg-slate-50">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-slate-500"
                  >
                    <div className="flex flex-col items-center space-y-3">
                      {searchQuery ? (
                        <>
                          <Search className="w-12 h-12 text-slate-300" />
                          <div>
                            <p className="text-lg font-medium">
                              No matches found
                            </p>
                            <p className="text-sm">
                              Try adjusting your search terms
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Users className="w-12 h-12 text-slate-300" />
                          <div>
                            <p className="text-lg font-medium">
                              No staff members found
                            </p>
                            <p className="text-sm">
                              Add staff members to get started
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.rows.map((row, index) => {
                  const staffMember = filteredStaff?.[index];
                  return (
                    <TableRow
                      key={row.id || index}
                      className="border-b hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell className="px-6 py-4">
                        <div>
                          <div className="font-medium text-slate-900">
                            {row.name}
                          </div>
                          {staffMember?.position && (
                            <div className="text-sm text-slate-500 capitalize">
                              {staffMember.position}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getStatusBadge(row.monday)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getStatusBadge(row.tuesday)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getStatusBadge(row.wednesday)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getStatusBadge(row.thursday)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getStatusBadge(row.friday)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getStatusBadge(row.saturday)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getStatusBadge(row.sunday)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {staffMember && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRota(staffMember)}
                            className="flex items-center space-x-2 hover:bg-blue-50 hover:border-blue-200"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit Rota</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Daily Schedule Table */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Daily Schedule
                </h2>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
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
                            No staff members are working on {selectedDay}
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

        <div className="mt-8">
          <LLMGuide
            title="Rota Management Guide"
            subtitle="Get help with scheduling and staff management"
            initialMessage="I can help you with staff scheduling, managing working hours, handling time conflicts, and optimizing your rota. What would you like assistance with?"
            placeholder="Ask about rota management..."
          />
        </div>
      </main>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Edit Rota -{" "}
              {selectedStaff
                ? `${selectedStaff.firstName} ${selectedStaff.lastName}`
                : "Staff Member"}
            </DialogTitle>
          </DialogHeader>
          <Form {...rotaForm}>
            <form
              onSubmit={rotaForm.handleSubmit(onRotaSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-4">
                {weekday.map((day, index) => (
                  <FormField
                    key={day}
                    control={rotaForm.control}
                    name={`workingHours.${index}` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-slate-700">
                          {day}
                        </FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value)}
                          value={field.value || "not in"}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select working hours" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="am">Morning (AM)</SelectItem>
                            <SelectItem value="pm">Afternoon (PM)</SelectItem>
                            <SelectItem value="all day">All Day</SelectItem>
                            <SelectItem value="not in">Not In</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setSelectedStaff(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateRotaMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {updateRotaMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Updating...</span>
                    </div>
                  ) : (
                    "Update Rota"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Rota Dialog */}
      <Dialog
        open={showCreateRotaDialog}
        onOpenChange={setShowCreateRotaDialog}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              {existingRota ? "Edit" : "Create"} Rota for {selectedRotaDay}
              {existingRota && (
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  Existing
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Day Selection */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-slate-700">Day:</label>
              <Select
                value={selectedRotaDay}
                onValueChange={setSelectedRotaDay}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
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

            {/* Requirements Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Staff Requirements
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {rotaRequirements.map((req) => (
                  <Card key={req.position} className="p-4">
                    <h4 className="font-medium text-slate-900 capitalize mb-3">
                      {req.position}
                    </h4>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <Checkbox
                        checked={req.checked}
                        onCheckedChange={() => {
                          const item = req.position;
                          const isChecked = req.checked;

                          const updatedReqs = rotaRequirements.map(
                            (subject) => {
                              if (subject.position === item) {
                                return {
                                  ...subject,
                                  checked: !isChecked,
                                };
                              }

                              return subject;
                            },
                          );

                          setRotaRequirements(updatedReqs);
                        }}
                      />
                      Show Card
                    </label>
                    {req.checked == true && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-slate-600">AM</label>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateRequirement(
                                  req.position,
                                  "am",
                                  req.am - 1,
                                )
                              }
                              disabled={req.am <= 0 && req.allDay <= 0}
                              className="w-8 h-8 p-0"
                            >
                              -
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {req.am}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateRequirement(
                                  req.position,
                                  "am",
                                  req.am + 1,
                                )
                              }
                              className="w-8 h-8 p-0"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-slate-600">PM</label>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateRequirement(
                                  req.position,
                                  "pm",
                                  req.pm - 1,
                                )
                              }
                              disabled={req.pm <= 0 && req.allDay <= 0}
                              className="w-8 h-8 p-0"
                            >
                              -
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {req.pm}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateRequirement(
                                  req.position,
                                  "pm",
                                  req.pm + 1,
                                )
                              }
                              className="w-8 h-8 p-0"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-slate-600">
                            All Day
                          </label>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateRequirement(
                                  req.position,
                                  "allDay",
                                  req.allDay - 1,
                                )
                              }
                              disabled={req.allDay <= 0}
                              className="w-8 h-8 p-0"
                            >
                              -
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {req.allDay}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateRequirement(
                                  req.position,
                                  "allDay",
                                  req.allDay + 1,
                                )
                              }
                              className="w-8 h-8 p-0"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            {/* Coverage Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Coverage Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {rotaRequirements.map((req) => {
                  const coverage = calculateCoverage(req.position);
                  if (req.checked) {
                    return (
                      <Card key={req.position} className="p-4">
                        <h4 className="font-medium text-slate-900 capitalize mb-3">
                          {req.position}
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span>AM:</span>
                            <div className="flex items-center space-x-2">
                              <span
                                className={
                                  coverage.am >= req.am
                                    ? "text-green-600"
                                    : "text-amber-600"
                                }
                              >
                                {coverage.am}/{req.am}
                              </span>
                              {coverage.am >= req.am ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              ) : (
                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>PM:</span>
                            <div className="flex items-center space-x-2">
                              <span
                                className={
                                  coverage.pm >= req.pm
                                    ? "text-green-600"
                                    : "text-amber-600"
                                }
                              >
                                {coverage.pm}/{req.pm}
                              </span>
                              {coverage.pm >= req.pm ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              ) : (
                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>All Day:</span>
                            <div className="flex items-center space-x-2">
                              <span
                                className={
                                  coverage.effectiveAllDay >= req.allDay
                                    ? "text-green-600"
                                    : "text-amber-600"
                                }
                              >
                                {coverage.effectiveAllDay}/{req.allDay}
                              </span>
                              {coverage.effectiveAllDay >= req.allDay ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              ) : (
                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                          {coverage.amPmEquivalent > 0 && (
                            <div className="text-xs text-blue-600 mt-1">
                              {coverage.amPmEquivalent} AM+PM = All Day
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  }
                })}
              </div>
            </div>

            {/* Staff Assignment */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Staff Assignment
              </h3>
              <div className="space-y-4">
                {rotaRequirements.map((req, index) => {
                  const positionStaff =
                    filteredStaff?.filter((s) => s.position === req.position) ||
                    [];
                  if (positionStaff.length === 0) return null;

                  if (req.checked) {
                    return (
                      <Card key={req.position} className="p-4">
                        <h4 className="font-medium text-slate-900 capitalize mb-4">
                          {req.position}s
                        </h4>
                        <div className="space-y-3">
                          {positionStaff.map((staffMember) => {
                            const assignment = getStaffAssignment(
                              staffMember.employeeId,
                            );
                            return (
                              <div
                                key={staffMember.employeeId}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className="font-medium text-slate-900">
                                    {staffMember.firstName}{" "}
                                    {staffMember.lastName}
                                  </span>
                                  <div className="flex space-x-1">
                                    {assignment?.shifts.map((shift) => (
                                      <div
                                        key={shift}
                                        className="flex items-center space-x-1"
                                      >
                                        <Badge
                                          variant="secondary"
                                          className="bg-green-100 text-green-800 border-green-200"
                                        >
                                          {shift === "all-day"
                                            ? "All Day"
                                            : shift.toUpperCase()}
                                        </Badge>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            removeStaffAssignment(
                                              staffMember.employeeId,
                                              shift,
                                            )
                                          }
                                          className="w-4 h-4 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                          ×
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      assignStaff(staffMember.employeeId, "am")
                                    }
                                    disabled={
                                      !canAssignShift(
                                        staffMember.employeeId,
                                        "am",
                                        req.position,
                                      )
                                    }
                                    className="text-xs"
                                  >
                                    AM
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      assignStaff(staffMember.employeeId, "pm")
                                    }
                                    disabled={
                                      !canAssignShift(
                                        staffMember.employeeId,
                                        "pm",
                                        req.position,
                                      )
                                    }
                                    className="text-xs"
                                  >
                                    PM
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      assignStaff(
                                        staffMember.employeeId,
                                        "all-day",
                                      )
                                    }
                                    disabled={
                                      !canAssignShift(
                                        staffMember.employeeId,
                                        "all-day",
                                        req.position,
                                      )
                                    }
                                    className="text-xs"
                                  >
                                    All Day
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    );
                  }
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-6 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={resetRotaForm}
                className="text-slate-600 hover:text-slate-800"
              >
                Reset Form
              </Button>
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateRotaDialog(false);
                    resetRotaForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    createRotaMutation.mutate({
                      day: selectedRotaDay,
                      requirements: rotaRequirements,
                      assignments: rotaAssignments,
                    });
                  }}
                  disabled={createRotaMutation.isPending}
                  data-testid="button-create-rota"
                >
                  {createRotaMutation.isPending
                    ? existingRota
                      ? "Updating..."
                      : "Creating..."
                    : existingRota
                      ? "Update Rota"
                      : "Create Rota"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
