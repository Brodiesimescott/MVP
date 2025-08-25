import React from "react";
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
import { userRoleEnum } from "@shared/schema.ts";

const formSchema = z.object({
  email: z.string().email({
    message: "Enter valid Email Address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  practiceId: z.string().min(1, {
    message: "Enter practice id.",
  }),
  firstname: z.string().min(1, {
    message: "Enter first name.",
  }),
  lastname: z.string().min(1, {
    message: "Enter last name.",
  }),
  role: z.enum(["staff", "poweruser", "user"]),
});

type FormData = z.infer<typeof formSchema>;

const SignUp = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      practiceId: "",
      firstname: "",
      lastname: "",
      role: "user",
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/signup", data);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Sign Up failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      toast({
        title: "Sign up successful!",
      });
      setLocation("/home");
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
    <div className="container mx-auto">
      <div className="max-w-md mx-auto mt-10 bg-white p-8 border border-gray-200 rounded-md shadow-sm">
        <h1 className="text-2xl font-semibold mb-6 text-center">SignUp</h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter email" {...field} />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter password"
                      {...field}
                    />
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
              name="firstname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Firstname</FormLabel>
                  <FormControl>
                    <Input
                      type="firstname"
                      placeholder="Enter first name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lastname</FormLabel>
                  <FormControl>
                    <Input
                      type="lastname"
                      placeholder="Enter last name"
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
                      <SelectItem value="poweruser">Power User</SelectItem>
                      <SelectItem value="user">User</SelectItem>
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
      </div>
    </div>
  );
};

export default SignUp;
