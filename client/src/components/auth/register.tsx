import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import ChironLogo from "@/lib/logo";
import { Eye, EyeOff, Mail, Lock, User, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createInsertSchema } from "drizzle-zod";
import { insertStaffSchema, staff } from "@shared/schema";

type FormData = z.infer<typeof formSchema>;

interface RegisterFormProps {
  onRegister: (email: string, firstName?: string, lastName?: string) => void;
  onSwitchToLogin: () => void;
}

const staffSchema = createInsertSchema(staff).extend({
  firstName: z.string(),
  lastName: z.string(),
});

type StaffData = z.infer<typeof staffSchema>;

const staffFormSchema = insertStaffSchema
  .extend({
    creator: z.string(),
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

const formSchema = z
  .object({
    employeeId: z.string().min(1, "Employee ID is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
    practiceId: z.string().min(1, {
      message: "Enter practice id.",
    }),
    role: z.enum(["staff", "poweruser", "user"]),
    position: z.enum([
      "doctor",
      "nurse",
      "business",
      "admin",
      "reception",
      "pharmacy",
      "physio",
      "health visitor",
      "dentist",
      "dental therapist",
      "hygienist",
    ]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export default function RegisterForm({
  onRegister,
  onSwitchToLogin,
}: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      practiceId: "",
      role: "user",
      position: "admin",
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // First create the user account
      const response = await apiRequest("POST", "/api/signup", data);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Sign Up failed");
      }

      const userData = await response.json();

      // Then create the staff member record
      const staffData = {
        employeeId: data.employeeId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        creator: data.email,
        title: "",
        phone: "",
        address: "",
        dateOfBirth: "",
        niNumber: "",
        position: "admin",
        department: "",
        startDate: new Date().toISOString().split("T")[0],
        contract: "permanent",
        salary: "0",
        workingHours: [
          "not in",
          "not in",
          "not in",
          "not in",
          "not in",
          "not in",
          "not in",
        ],
        professionalBody: "",
        professionalBodyNumber: "",
        appraisalDate: "",
        nextAppraisal: "",
        revalidationInfo: "",
        dbsCheckExpiry: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        emergencyContactRelation: "",
      };

      const staffResponse = await apiRequest(
        "POST",
        "/api/hr/createstaff",
        staffData,
      );

      if (!staffResponse.ok) {
        throw new Error("Failed to create staff member record");
      }

      return userData;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Sign up successful!",
        description: "Your account and staff profile have been created",
      });
      onRegister(variables.email, variables.firstName, variables.lastName);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: FormData) => {
    signUpMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-yellow-200 rounded-lg flex items-center justify-center">
            <ChironLogo />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Create Account
          </CardTitle>
          <p className="text-slate-600">Join HR Management System today</p>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">
                      Employee ID
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          {...field}
                          placeholder="Enter employee ID"
                          className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                          data-testid="input-employeeid"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700">
                        First Name
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <Input
                            {...field}
                            placeholder="First name"
                            className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
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
                      <FormLabel className="text-slate-700">
                        Last Name
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <Input
                            {...field}
                            placeholder="Last name"
                            className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">
                      Email Address
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          className="pl-10 pr-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          className="pl-10 pr-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="practiceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PracticeId</FormLabel>
                    <FormControl>
                      <Input
                        type="practiceId"
                        placeholder="Enter practice Id"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="poweruser">
                          Practice Owner
                        </SelectItem>
                        <SelectItem value="user">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="doctor">doctor</SelectItem>
                        <SelectItem value="nurse">nurse</SelectItem>
                        <SelectItem value="business">business</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                        <SelectItem value="reception">reception</SelectItem>
                        <SelectItem value="pharmacy">pharmacy</SelectItem>
                        <SelectItem value="physio">physio</SelectItem>
                        <SelectItem value="health visitor">
                          health visitor
                        </SelectItem>
                        <SelectItem value="dentist">dentist</SelectItem>
                        <SelectItem value="dental therapist">
                          dental therapist
                        </SelectItem>
                        <SelectItem value="hygienist">hygienist</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={signUpMutation.isPending}>
                {signUpMutation.isPending ? "Signing up..." : "Signed up"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Already have an account?{" "}
              <button
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                Sign in here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
