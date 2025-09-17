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
import { useState } from "react";
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

export default function RotaManagement({ onBack }: RotaManagementProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffData | null>(null);
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

  const table = {
    headers: [
      "Employee",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ],
    rows: staff?.map((staff) => ({
      name: `${staff.firstName} ${staff.lastName}`,
      monday: staff?.workingHours[0] || { monday: "not in" },
      tuesday: staff?.workingHours[1] || { tuesday: "not in" },
      wednesday: staff?.workingHours[2] || { wednesday: "not in" },
      thursday: staff?.workingHours[3] || { thursday: "not in" },
      friday: staff?.workingHours[4] || { friday: "not in" },
    })),
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

      setShowAddDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update staff member",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StaffFormData) => {
    updateStaffMutation.mutate({
      employeeId: selectedStaff.employeeId,
      data,
    });
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
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to HR</span>
            </Button>
            <div className="w-px h-6 bg-slate-200"></div>
            <h1 className="text-xl font-semibold text-slate-900">
              Rota Management
            </h1>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-chiron-blue hover:bg-blue-800">
                <Plus className="w-4 h-4 mr-2" />
                Edit Rota
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Rota</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                    >
                      Cancel
                    </Button>
                    {/**<Button type="submit" disabled={createStaffMutation.isPending}>
                  {createStaffMutation.isPending
                    ? "Adding..."
                    : "Add Staff Member"}
                </Button>*/}
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>
      <main>
        <Table>
          <TableHeader>
            <TableRow key={0}>
              {table.headers.map((header, index) => (
                <TableHead
                  key={index}
                  className="px-6 py-4 text-sm font-medium text-gray-900"
                >
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows?.map((row, index) => (
              <TableRow key={index} className='border-b" bg-white'>
                <TableCell className="whitespace-nowrap px-6 py-4 text-sm font-light text-gray-900">
                  {row.name}
                </TableCell>
                <TableCell className="whitespace-nowrap px-6 py-4 text-sm font-light text-gray-900">
                  {row.monday}
                </TableCell>
                <TableCell className="whitespace-nowrap px-6 py-4 text-sm font-light text-gray-900">
                  {row.tuesday}
                </TableCell>
                <TableCell className="whitespace-nowrap px-6 py-4 text-sm font-light text-gray-900">
                  {row.wednesday}
                </TableCell>
                <TableCell className="whitespace-nowrap px-6 py-4 text-sm font-light text-gray-900">
                  {row.thursday}
                </TableCell>
                <TableCell className="whitespace-nowrap px-6 py-4 text-sm font-light text-gray-900">
                  {row.friday}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="lg:col-span-1">
          <LLMGuide
            title="Staff Guide"
            subtitle="Management assistance"
            initialMessage="I can help you with onboarding new staff, managing contracts, and ensuring compliance. What would you like to know?"
            placeholder="Ask about staff..."
          />
        </div>
      </main>
    </div>
  );
}
