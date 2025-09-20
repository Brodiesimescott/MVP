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
import { useState, useMemo } from "react";
import { createInsertSchema } from "drizzle-zod";

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
  workingHours: z.array(z.string().nullable()).length(5),
});

type RotaFormData = z.infer<typeof rotaFormSchema>;

export default function RotaManagement({ onBack }: RotaManagementProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  var weekday = new Array(7);
  weekday[0] = "Monday";
  weekday[1] = "Tuesday";
  weekday[2] = "Wednesday";
  weekday[3] = "Thursday";
  weekday[4] = "Friday";
  const [selectedDay, setSelectedDay] = useState<string>(
    weekday[new Date().getDay()] || "Monday",
  );

  const { data: staff, isLoading } = useQuery<StaffData[]>({
    queryKey: ["/api/hr/staff"],
  });

  const { toast } = useToast();

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
      workingHours: ["not in", "not in", "not in", "not in", "not in"],
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
    ],
    rows:
      filteredStaff?.map((staffMember) => ({
        id: staffMember.employeeId,
        name: `${staffMember.firstName} ${staffMember.lastName}`,
        monday: staffMember.workingHours?.[0] || "not in",
        tuesday: staffMember.workingHours?.[1] || "not in",
        wednesday: staffMember.workingHours?.[2] || "not in",
        thursday: staffMember.workingHours?.[3] || "not in",
        friday: staffMember.workingHours?.[4] || "not in",
      })) || [],
  };

  const createStaffMutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      const response = await apiRequest("POST", "/api/hr/staff", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/metrics"] });
      toast({
        title: "Success",
        description: "Staff member added successfully",
      });
      setShowEditDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add staff member",
        variant: "destructive",
      });
    },
  });

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
        `/api/hr/staff/${employeeId}`,
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
      const response = await apiRequest("PUT", `/api/hr/staff/${employeeId}`, {
        workingHours,
      });
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

  const onRotaSubmit = (data: RotaFormData) => {
    if (!selectedStaff?.employeeId) {
      toast({
        title: "Error",
        description: "No staff member selected",
        variant: "destructive",
      });
      return;
    }

    updateRotaMutation.mutate({
      employeeId: selectedStaff.employeeId,
      workingHours: data.workingHours,
    });
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
      ],
    });
    setShowEditDialog(true);
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
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
                  (day, index) => (
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
                  ),
                )}
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
    </div>
  );
}
