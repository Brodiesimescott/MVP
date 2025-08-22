import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Search, Eye, Edit, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import LLMGuide from "@/components/llm-guide";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStaffSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Staff } from "@shared/schema";

const staffFormSchema = insertStaffSchema.extend({
  practiceId: z.string().optional(),
});

type StaffFormData = z.infer<typeof staffFormSchema>;

interface StaffManagementProps {
  onBack: () => void;
}

export default function StaffManagement({ onBack }: StaffManagementProps) {
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "view" | "edit">("list");
  const { toast } = useToast();

  const { data: staff, isLoading } = useQuery<Staff[]>({
    queryKey: ["/api/hr/staff"],
  });

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
      position: "",
      department: "",
      startDate: "",
      contractType: "permanent",
      salary: "0",
      workingHours: "",
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
      setShowAddDialog(false);
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
      id,
      data,
    }: {
      id: string;
      data: Partial<StaffFormData>;
    }) => {
      const response = await apiRequest("PUT", `/api/hr/staff/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/staff"] });
      toast({
        title: "Success",
        description: "Staff member updated successfully",
      });
      setViewMode("view");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update staff member",
        variant: "destructive",
      });
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/hr/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/metrics"] });
      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
      setViewMode("list");
      setSelectedStaff(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete staff member",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StaffFormData) => {
    if (viewMode === "edit" && selectedStaff) {
      updateStaffMutation.mutate({ id: selectedStaff.id, data });
    } else {
      createStaffMutation.mutate(data);
    }
  };

  const handleViewStaff = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setViewMode("view");
  };

  const handleEditStaff = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setViewMode("edit");
    // Populate form with staff data
    form.reset(staffMember);
  };

  if (viewMode === "view" && selectedStaff) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setViewMode("list")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Staff List</span>
              </Button>
              <div className="w-px h-6 bg-slate-200"></div>
              <h1 className="text-xl font-semibold text-slate-900">
                Staff Profile
              </h1>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => handleEditStaff(selectedStaff)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteStaffMutation.mutate(selectedStaff.id)}
                disabled={deleteStaffMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <Card className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-chiron-blue rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {selectedStaff.firstName[0]}
                          {selectedStaff.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900">
                          {selectedStaff.title} {selectedStaff.firstName}{" "}
                          {selectedStaff.lastName}
                        </h4>
                        <p className="text-clinical-gray">
                          {selectedStaff.position}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 mt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-clinical-gray">Email:</span>
                        <span className="text-slate-900">
                          {selectedStaff.email || "Not provided"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-clinical-gray">Phone:</span>
                        <span className="text-slate-900">
                          {selectedStaff.phone || "Not provided"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-clinical-gray">Address:</span>
                        <span className="text-slate-900">
                          {selectedStaff.address || "Not provided"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Employment Details */}
                <Card className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">
                    Employment Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-clinical-gray">Employee ID:</span>
                      <span className="text-slate-900">
                        {selectedStaff.employeeId}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-clinical-gray">Department:</span>
                      <span className="text-slate-900">
                        {selectedStaff.department}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-clinical-gray">Start Date:</span>
                      <span className="text-slate-900">
                        {selectedStaff.startDate}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-clinical-gray">Contract Type:</span>
                      <Badge variant="secondary">
                        {selectedStaff.contractType}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-clinical-gray">Status:</span>
                      <Badge className="bg-medical-green text-white">
                        {selectedStaff.status || "Active"}
                      </Badge>
                    </div>
                  </div>
                </Card>

                {/* Professional Details */}
                <Card className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">
                    Professional Compliance
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-clinical-gray">
                        Professional Body:
                      </span>
                      <span className="text-slate-900">
                        {selectedStaff.professionalBody || "Not applicable"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-clinical-gray">
                        Registration Number:
                      </span>
                      <span className="text-slate-900">
                        {selectedStaff.professionalBodyNumber ||
                          "Not applicable"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-clinical-gray">
                        Next Appraisal:
                      </span>
                      <span className="text-slate-900">
                        {selectedStaff.appraisalDate || "Not scheduled"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-clinical-gray">
                        DBS Check Expiry:
                      </span>
                      <span className="text-slate-900">
                        {selectedStaff.dbsCheckExpiry || "Not provided"}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Emergency Contact */}
                <Card className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">
                    Emergency Contact
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-clinical-gray">Name:</span>
                      <span className="text-slate-900">
                        {selectedStaff.emergencyContactName || "Not provided"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-clinical-gray">Phone:</span>
                      <span className="text-slate-900">
                        {selectedStaff.emergencyContactPhone || "Not provided"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-clinical-gray">Relation:</span>
                      <span className="text-slate-900">
                        {selectedStaff.emergencyContactRelation ||
                          "Not provided"}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div className="lg:col-span-1">
              <LLMGuide
                title="Staff Guide"
                subtitle="Management assistance"
                initialMessage="I can help you with staff records, compliance tracking, and HR policies. What would you like to know about this staff member?"
                placeholder="Ask about staff..."
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (viewMode === "edit" && selectedStaff) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setViewMode("view")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Profile</span>
              </Button>
              <div className="w-px h-6 bg-slate-200"></div>
              <h1 className="text-xl font-semibold text-slate-900">
                Edit Staff Member
              </h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <Card className="p-6">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="employeeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee ID *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Dr., Mr., Ms., etc."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Position *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setViewMode("view")}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateStaffMutation.isPending}
                      >
                        {updateStaffMutation.isPending
                          ? "Updating..."
                          : "Update Staff Member"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <LLMGuide
                title="Staff Guide"
                subtitle="Management assistance"
                initialMessage="I can help you with staff records, compliance tracking, and HR policies. What would you like to know?"
                placeholder="Ask about staff..."
              />
            </div>
          </div>
        </main>
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
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to HR</span>
            </Button>
            <div className="w-px h-6 bg-slate-200"></div>
            <h1 className="text-xl font-semibold text-slate-900">
              Staff Management
            </h1>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-chiron-blue hover:bg-blue-800">
                <Plus className="w-4 h-4 mr-2" />
                Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee ID *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Dr., Mr., Ms., etc."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createStaffMutation.isPending}
                    >
                      {createStaffMutation.isPending
                        ? "Adding..."
                        : "Add Staff Member"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {/* Search and Filters */}
            <Card className="p-6 mb-6">
              <div className="flex space-x-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-clinical-gray" />
                  <Input
                    placeholder="Search staff members..."
                    className="pl-10"
                  />
                </div>
                <Select>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="clinical">Clinical</SelectItem>
                    <SelectItem value="administration">
                      Administration
                    </SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Staff Grid */}
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-clinical-gray">Loading staff...</p>
              </div>
            ) : !staff || staff.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-clinical-gray mb-4">
                  No staff members found
                </p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-chiron-blue hover:bg-blue-800"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Staff Member
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staff.map((staffMember) => (
                  <Card key={staffMember.id} className="p-6">
                    <CardContent className="p-0">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-chiron-blue rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {staffMember.firstName[0]}
                            {staffMember.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {staffMember.title} {staffMember.firstName}{" "}
                            {staffMember.lastName}
                          </h3>
                          <p className="text-sm text-clinical-gray">
                            {staffMember.position}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-clinical-gray">
                            Employee ID:
                          </span>
                          <span className="text-slate-900">
                            {staffMember.employeeId}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-clinical-gray">
                            Department:
                          </span>
                          <span className="text-slate-900">
                            {staffMember.department}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-clinical-gray">Status:</span>
                          <Badge className="bg-medical-green text-white">
                            {staffMember.status || "Active"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleViewStaff(staffMember)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-chiron-blue hover:bg-blue-800"
                          onClick={() => handleEditStaff(staffMember)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <LLMGuide
              title="Staff Guide"
              subtitle="Management assistance"
              initialMessage="I can help you with onboarding new staff, managing contracts, and ensuring compliance. What would you like to know?"
              placeholder="Ask about staff..."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
