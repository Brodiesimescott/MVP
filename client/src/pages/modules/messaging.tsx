import { useQuery, useMutation, queryOptions } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  ArrowLeft,
  MessageSquare,
  Search,
  Plus,
  Send,
  Shield,
  Bell,
  Users,
  Radio,
  Settings,
} from "lucide-react";
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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import useWebSocket from "@/hooks/use-websocket";
import ModuleLogo from "@/components/module-logo";
import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { optional, z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertConversationSchema, insertMessageSchema } from "@shared/schema";
import Select from "react-select";
import { useAuth } from "@/components/auth/authProvider";

interface ContactOption {
  value: string;
  label: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Conversation {
  id: number;
  title?: string;
  participantIds: string[];
  updatedAt: string;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: string;
  content: string;
  blocked: boolean;
  blockReason?: string;
  createdAt: string;
}

const userSchema = z.object({
  id: z.string(),
  practiceId: z.string(),
  role: z.enum(["staff", "powerUser", "user"]),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

type UserData = z.infer<typeof userSchema>;

export default function ChironMessaging() {
  const [selectedConversation, setSelectedConversation] = useState<
    number | null
  >(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAnouncementDialog, setShowAnouncementDialog] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMessageQuery, setSearchMessageQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  const { toast } = useToast();

  const { data: userDetails } = useQuery({
    queryKey: ["/api/home"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/home", user?.email);

      if (!response.ok) {
        throw new Error("Authentication failed");
      }
      return (await response.json()) as UserData;
    },
    retry: false,
  });

  const { data: contacts, refetch: refetchContacts } = useQuery<User[]>({
    queryKey: ["/api/messaging/contacts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/messaging/contacts");

      if (!response.ok) {
        throw new Error("Authentication failed");
      }
      return (await response.json()) as UserData[];
    },
    retry: false,
  });

  const { data: conversations, refetch: refetchConversations } = useQuery<
    Conversation[]
  >({
    queryKey: ["/api/messaging/conversations", user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error("Not authenticated");
      const response = await fetch(`/api/messaging/conversations?email=${encodeURIComponent(user.email)}`);
      if (!response.ok) throw new Error("Failed to fetch conversations");
      return response.json();
    },
    enabled: !!user?.email,
  });

  const { data: messages, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/messaging/messages", selectedConversation, user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error("Not authenticated");
      const response = await fetch(`/api/messaging/messages?conversationId=${selectedConversation}&email=${encodeURIComponent(user.email)}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: selectedConversation !== null && !!user?.email,
  });

  const { data: convomessages, refetch: refetchconvoMessages } = useQuery<
    Message[] | null
  >({
    queryKey: ["/api/messaging/initConversation", selectedConversation, user?.email],
    queryFn: selectedConversation && user?.email
      ? async () => {
          const response = await fetch(`/api/messaging/initConversation/${selectedConversation}?email=${encodeURIComponent(user.email)}`);
          if (!response.ok) throw new Error("Failed to fetch conversation messages");
          return response.json();
        }
      : async () => null,
    enabled: selectedConversation !== null && !!user?.email,
  });

  const { data: announcements, refetch: refetchAnnouncements } = useQuery<
    Message[] | null
  >({
    queryKey: ["/api/messaging/announcements", user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error("Not authenticated");
      const response = await fetch(`/api/messaging/announcements?email=${encodeURIComponent(user.email)}`);
      if (!response.ok) throw new Error("Failed to fetch announcements");
      return response.json();
    },
    enabled: !!user?.email,
  });

  // WebSocket connection for real-time messaging
  const { socket, isConnected } = useWebSocket("/ws");

  useEffect(() => {
    if (socket) {
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_message") {
            refetchMessages();
            queryClient.invalidateQueries({
              queryKey: ["/api/messaging/conversations"],
            });
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socket.addEventListener("message", handleMessage);

      return () => {
        socket.removeEventListener("message", handleMessage);
      };
    }
  }, [socket, refetchMessages]);

  type ConvoFormData = z.infer<typeof insertConversationSchema>;

  const form = useForm<ConvoFormData>({
    resolver: zodResolver(insertConversationSchema),
    defaultValues: {
      title: undefined,
      practiceId: userDetails?.practiceId,
      participantIds: [userDetails?.id],
    },
  });

  // create conversation
  const createConvoMutation = useMutation({
    mutationFn: async (data: ConvoFormData) => {
      const response = await apiRequest(
        "POST",
        "/api/messaging/createconversations",
        data,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/messaging/conversations"],
      });
      refetchConversations();
      toast({
        title: "Success",
        description: "conversation added successfully",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    },
  });

  const onConvoSubmit = (data: ConvoFormData) => {
    createConvoMutation.mutate(data);
  };

  // Join conversation when selected
  useEffect(() => {
    if (socket && selectedConversation && isConnected) {
      socket.send(
        JSON.stringify({
          type: "join_conversation",
          conversationId: selectedConversation,
        }),
      );
    }
  }, [socket, selectedConversation, isConnected]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      content,
      conversationId,
    }: {
      content: string;
      conversationId: number;
    }) => {
      const response = await fetch("/api/messaging/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content, 
          conversationId,
          email: user?.email,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.reason || "Failed to send message");
      }

      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      setMessageError(null);
      refetchMessages();
      refetchconvoMessages();
    },
    onError: (error: Error) => {
      setMessageError(error.message);
      toast({
        title: "Message Blocked",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    sendMessageMutation.mutate({
      content: newMessage.trim(),
      conversationId: selectedConversation,
    });
  };

  const onAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const announcements = conversations?.find(
      (obj) => obj.title == "Announcements",
    );
    const conversationid = announcements?.id!;
    sendMessageMutation.mutate({
      content: newMessage.trim(),
      conversationId: conversationid!,
    });
  };

  const formatTime = (timestamp: string) => {
    // need to add : if timestamp = 1 day ago set data not time
    return new Date(timestamp).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const contactTags: ContactOption[] | undefined = contacts
    ?.map((contact) => ({
      value: contact.id,
      label: `${contact.firstName} ${contact.lastName}`,
    }))
    .concat([
      { value: userDetails!.id, label: `${user!.firstName} ${user!.lastName}` },
    ]);

  type contactType = { label: string; value: string };

  const getContactName = (userId: string) => {
    const contact = contacts?.find((c) => c.id === userId);
    if (userId == userDetails?.id) {
      return user ? `${user.firstName} ${user.lastName}` : "UU";
    }
    return contact
      ? `${contact.firstName} ${contact.lastName}`
      : "Unknown User";
  };

  const getContactInitials = (userId: string) => {
    refetchContacts();
    refetchConversations();
    refetchAnnouncements();
    const contact = contacts?.find((c) => c.id === userId);
    if (userId == userDetails?.id) {
      return user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}` : "UU";
    }
    return contact ? `${contact.firstName[0]}${contact.lastName[0]}` : "help";
  };

  // Filter conversations based on search query
  const filteredConversations = conversations?.filter((conversation) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();

    // Search by conversation title
    if (
      conversation.title &&
      conversation.title.toLowerCase().includes(query)
    ) {
      return true;
    }

    // Search by participant names
    const participantNames = conversation.participantIds.map(
      (participantId) => {
        return getContactName(participantId).toLowerCase();
      },
    );

    return participantNames.some((name) => name.includes(query));
  });

  // Filter messages based on search query
  const filteredMessages = convomessages?.filter((message) => {
    if (!searchMessageQuery.trim()) return true;

    const query = searchMessageQuery.toLowerCase();

    // Search by message contents
    if (message.content && message.content.toLowerCase().includes(query)) {
      return true;
    }

    // Search by participant names
    const participantNames = getContactName(message.senderId).toLowerCase();

    return participantNames.includes(query);
  });

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
              <ModuleLogo moduleName="messaging" icon={MessageSquare} />
              <h1 className="text-xl font-semibold text-slate-900">
                ChironMessaging
              </h1>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="bg-green-50 text-medical-green border-green-200"
          >
            <div className="w-2 h-2 bg-medical-green rounded-full mr-2"></div>
            {isConnected ? "Secure Connection Active" : "Connecting..."}
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
          {/* Left Column - Conversations */}
          <div className="col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3">Messages</h3>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-clinical-gray" />
                  <Input
                    placeholder="Search conversations..."
                    className="pl-10 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {/* new converstaion*/}
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-chiron-blue hover:bg-blue-800"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Conversation</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onConvoSubmit)}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>title *</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="participantIds"
                            render={({ field: { value, onChange } }) => (
                              <FormItem>
                                <FormLabel>Participants</FormLabel>
                                <Select
                                  isMulti={true}
                                  name="participantIds"
                                  value={contactTags?.filter((el) =>
                                    value?.includes(el.value),
                                  )}
                                  onChange={(
                                    option: readonly contactType[],
                                  ) => {
                                    if (option === null) {
                                      onChange(null);

                                      return;
                                    }
                                    onChange(option.map((el) => el.value));
                                  }}
                                  options={contactTags}
                                  className="basic-multi-select"
                                  classNamePrefix="select"
                                />
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
                            disabled={createConvoMutation.isPending}
                            onClick={() => setShowAddDialog(false)}
                          >
                            {createConvoMutation.isPending
                              ? "Adding..."
                              : "Add Conversation"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
              {searchQuery && (
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-clinical-gray">
                    {filteredConversations?.length || 0} of{" "}
                    {conversations?.length || 0} conversations
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="text-xs h-6 px-2"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
            <div className="overflow-y-auto h-full">
              <div className="p-2 space-y-1">
                {filteredConversations?.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-8 h-8 text-clinical-gray mx-auto mb-2" />
                    {searchQuery ? (
                      <>
                        <p className="text-sm text-clinical-gray">
                          No conversations found
                        </p>
                        <p className="text-xs text-clinical-gray">
                          Try adjusting your search terms
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-clinical-gray">
                          No conversations yet
                        </p>
                        <p className="text-xs text-clinical-gray">
                          Start messaging with your team
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {filteredConversations?.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`p-3 hover:bg-slate-50 rounded-lg cursor-pointer ${selectedConversation === conversation.id ? "border-l-4 border-chiron-blue bg-blue-50" : ""}`}
                        onClick={() => setSelectedConversation(conversation.id)}
                      >
                        <div className="flex items-center space-x-3 mb-1">
                          <div className="w-8 h-8 bg-medical-green rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-xs">
                              {getContactInitials(
                                conversation.participantIds[0],
                              )}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {conversation.title
                                ? conversation.title
                                : getContactName(
                                    conversation.participantIds[0],
                                  )}
                            </p>
                            <p className="text-xs text-clinical-gray">
                              {formatTime(conversation.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Center Column - Chat */}
          <div className="col-span-6 bg-white rounded-xl border border-slate-200 flex flex-col">
            {selectedConversation ? (
              <>
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-medical-green rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {conversations !== undefined
                          ? getContactInitials(
                              conversations.find(
                                (i) => i.id! == selectedConversation,
                              )!.participantIds[0],
                            )
                          : ""}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {conversations !== undefined &&
                        conversations.find((i) => i.id == selectedConversation)!
                          .title !== null
                          ? conversations.find(
                              (i) => i.id == selectedConversation,
                            )!.title
                          : conversations !== undefined
                            ? getContactName(
                                conversations.find(
                                  (i) => i.id == selectedConversation,
                                )!.participantIds[0],
                              )
                            : "error"}
                      </h3>
                      <p className="text-sm text-medical-green flex items-center">
                        <span className="w-2 h-2 bg-medical-green rounded-full mr-2"></span>
                        {conversations
                          ?.find((i) => i.id! == selectedConversation)!
                          .participantIds.map((x) =>
                            getContactName(x).concat(" "),
                          )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {convomessages?.map((message) =>
                    message.senderId !== userDetails?.id ? (
                      <div key={message.id} className="flex">
                        <div className="w-8 h-8 bg-medical-green rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-white font-medium text-xs">
                            {getContactInitials(message.senderId)}
                          </span>
                        </div>
                        <div className="bg-slate-100 rounded-lg p-3 max-w-xs">
                          <p className="text-sm text-slate-900">
                            {message.content}
                          </p>
                          <p className="text-xs text-clinical-gray mt-1">
                            {getContactName(message.senderId)}
                          </p>
                          <p className="text-xs text-clinical-gray mt-1">
                            {message.createdAt}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div key={message.id} className="flex justify-end">
                        <div className="bg-chiron-blue text-white rounded-lg p-3 max-w-xs">
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs text-blue-200 mt-1">
                            {getContactName(message.senderId)}
                          </p>
                          <p className="text-xs text-blue-200 mt-1">
                            {message.createdAt}
                          </p>
                        </div>
                      </div>
                    ),
                  )}

                  {/* AI Safety Net Indicator */}
                  <div className="flex justify-center">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-amber-600" />
                        <span className="text-sm text-amber-800">
                          Messages are monitored by AI safety system
                        </span>
                      </div>
                    </div>
                  </div>

                  <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-slate-200">
                  <form onSubmit={handleSendMessage} className="flex space-x-3">
                    <Input
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        setMessageError(null);
                      }}
                      placeholder="Type a secure message..."
                      className="flex-1"
                    />

                    <Button
                      type="submit"
                      className="bg-chiron-blue hover:bg-blue-800"
                      disabled={
                        sendMessageMutation.isPending ||
                        !newMessage.trim() ||
                        selectedConversation ===
                          conversations?.find(
                            (obj) => obj.title == "Announcements",
                          )?.id
                      }
                      onClick={() => setShowAddDialog(false)}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                  {messageError && (
                    <p className="text-xs text-alert-red mt-2">
                      {messageError}
                    </p>
                  )}
                  <p className="text-xs text-clinical-gray mt-2">
                    Messages are encrypted and monitored for patient data
                    protection
                  </p>
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-clinical-gray" />
                    <Input
                      placeholder="Search Messages..."
                      className="pl-10 text-sm"
                      value={searchMessageQuery}
                      onChange={(e) => setSearchMessageQuery(e.target.value)}
                    />
                  </div>
                  {searchMessageQuery && (
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-clinical-gray">
                        {filteredMessages?.length || 0} of{" "}
                        {convomessages?.length || 0} message
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchMessageQuery("")}
                        className="text-xs h-6 px-2"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-clinical-gray mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-clinical-gray">
                    Choose a conversation from the sidebar to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Announcements */}
          <div className="col-span-3 bg-white rounded-xl border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Practice Updates</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {announcements?.map((message) => (
                  <div key={message.id} className="flex">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <Bell className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium text-chiron-blue">
                            {getContactName(message.senderId)}
                          </span>
                          <p className="text-xs text-blue-700 mt-1">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-medium text-slate-900 mb-3">
                  Quick Actions
                </h4>
                <div className="space-y-2">
                  <Dialog
                    open={showAnouncementDialog}
                    onOpenChange={setShowAnouncementDialog}
                  >
                    <DialogTrigger asChild>
                      <Button className="w-full justify-start text-sm text-clinical-gray hover:bg-slate-50">
                        <Radio className="w-4 h-4 mr-2" />
                        Send Announcement
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Anouncement</DialogTitle>
                      </DialogHeader>

                      <form
                        onSubmit={onAnnouncementSubmit}
                        className="flex space-x-3"
                      >
                        <Input
                          value={newMessage}
                          onChange={(e) => {
                            setNewMessage(e.target.value);
                            setMessageError(null);
                          }}
                          placeholder="Type a secure message..."
                          className="flex-1"
                        />

                        <div className="flex justify-end space-x-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAnouncementDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={
                              sendMessageMutation.isPending ||
                              userDetails?.role === "staff"
                            }
                          >
                            {sendMessageMutation.isPending
                              ? "Adding..."
                              : "Add Anouncement"}
                          </Button>
                        </div>
                      </form>
                      {messageError && (
                        <p className="text-xs text-alert-red mt-2">
                          {messageError}
                        </p>
                      )}
                    </DialogContent>
                  </Dialog>
                  <Link
                    href="/modules/hr"
                    className="flex items-center space-x-2 text-clinical-gray hover:text-chiron-blue"
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-sm text-clinical-gray hover:bg-slate-50"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      View All Staff
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm text-clinical-gray hover:bg-slate-50"
                    disabled
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Message Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
