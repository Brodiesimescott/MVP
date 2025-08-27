import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import useWebSocket from "@/hooks/use-websocket";
import ModuleLogo from "@/components/module-logo";
import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { response } from "express";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Conversation {
  id: string;
  title?: string;
  participantIds: string[];
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
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
    string | null
  >(null);
  const [conversationMessages, setconvorsationMessage] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ["/api/home"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/home");
      console.log(response);
      if (!response.ok) {
        throw new Error("Authentication failed");
      }
      return (await response.json()) as UserData;
    },
    retry: false,
  });

  const { data: contacts } = useQuery<User[]>({
    queryKey: ["/api/messaging/contacts"],
  });

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/messaging/conversations"],
  });

  const { data: messages, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/messaging/messages", selectedConversation],
    enabled: !!selectedConversation,
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
      conversationId: string;
    }) => {
      const response = await fetch("/api/messaging/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, conversationId }),
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

  const formatTime = (timestamp: string) => {
    // need to add : if timestamp = 1 day ago set data not time
    return new Date(timestamp).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getContactName = (userId: string) => {
    const contact = contacts?.find((c) => c.id === userId);
    return contact
      ? `${contact.firstName} ${contact.lastName}`
      : "Unknown User";
  };

  const getContactInitials = (userId: string) => {
    const contact = contacts?.find((c) => c.id === userId);
    if (userId == user?.id) {
      return user ? `${user.firstName[0]}${user.lastName[0]}` : "UU";
    }
    return contact ? `${contact.firstName[0]}${contact.lastName[0]}` : "UU";
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
                  />
                </div>
                {/* new converstaion*/}
                <Button
                  size="sm"
                  className="bg-chiron-blue hover:bg-blue-800"
                  disabled
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto h-full">
              <div className="p-2 space-y-1">
                {conversations?.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-8 h-8 text-clinical-gray mx-auto mb-2" />
                    <p className="text-sm text-clinical-gray">
                      No conversations yet
                    </p>
                    <p className="text-xs text-clinical-gray">
                      Start messaging with your team
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mock conversations for demo */}
                    <div
                      className={`p-3 hover:bg-slate-50 rounded-lg cursor-pointer ${selectedConversation === "mock-1" ? "border-l-4 border-chiron-blue bg-blue-50" : ""}`}
                      onClick={() => setSelectedConversation("mock-1")}
                    >
                      <div className="flex items-center space-x-3 mb-1">
                        <div className="w-8 h-8 bg-medical-green rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-xs">
                            SS
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            Sister Jane Smith
                          </p>
                          <p className="text-xs text-clinical-gray">
                            2 mins ago
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-clinical-gray truncate ml-11">
                        Test results are ready for review...
                      </p>
                    </div>

                    <div
                      className={`p-3 hover:bg-slate-50 rounded-lg cursor-pointer ${selectedConversation === "mock-2" ? "border-l-4 border-chiron-blue bg-blue-50" : ""}`}
                      onClick={() => setSelectedConversation("mock-2")}
                    >
                      <div className="flex items-center space-x-3 mb-1">
                        <div className="w-8 h-8 bg-chiron-orange rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-xs">
                            MB
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            Mark Brown
                          </p>
                          <p className="text-xs text-clinical-gray">
                            1 hour ago
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-clinical-gray truncate ml-11">
                        Can we schedule a team meeting?
                      </p>
                    </div>

                    <div
                      className={`p-3 hover:bg-slate-50 rounded-lg cursor-pointer ${selectedConversation === "mock-3" ? "border-l-4 border-chiron-blue bg-blue-50" : ""}`}
                      onClick={() => setSelectedConversation("mock-3")}
                    >
                      <div className="flex items-center space-x-3 mb-1">
                        <div className="w-8 h-8 bg-clinical-gray rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-xs">
                            TC
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            Team Chat
                          </p>
                          <p className="text-xs text-clinical-gray">
                            Yesterday
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-clinical-gray truncate ml-11">
                        CQC inspection preparation...
                      </p>
                    </div>
                    {conversations?.map((conversation) => (
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
                (
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-medical-green rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {selectedConversation === "mock-1"
                          ? "SJ"
                          : selectedConversation === "mock-2"
                            ? "MB"
                            : selectedConversation === "mock-3"
                              ? "TC"
                              : "UU"}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {selectedConversation === "mock-1"
                          ? "Sister Jane Smith"
                          : selectedConversation === "mock-2"
                            ? "Mark Brown"
                            : selectedConversation === "mock-3"
                              ? "Team Chat"
                              : "Unknown User"}
                      </h3>
                      <p className="text-sm text-medical-green flex items-center">
                        <span className="w-2 h-2 bg-medical-green rounded-full mr-2"></span>
                        Online
                      </p>
                    </div>
                  </div>
                </div>
                ):({" "}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) =>
                    message.senderId !== user?.id ? (
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
                            {message.createdAt}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div key={message.id} className="flex justify-end">
                        <div className="bg-chiron-blue text-white rounded-lg p-3 max-w-xs">
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs text-blue-200 mt-1">
                            {message.createdAt}
                          </p>
                        </div>
                      </div>
                    ),
                  )}

                  {/* Sample messages for demonstration */}
                  <div className="flex">
                    <div className="w-8 h-8 bg-medical-green rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-white font-medium text-xs">SJ</span>
                    </div>
                    <div className="bg-slate-100 rounded-lg p-3 max-w-xs">
                      <p className="text-sm text-slate-900">
                        {selectedConversation === "mock-1"
                          ? "Hi Dr. Wilson, the morning appointment results are ready for review."
                          : selectedConversation === "mock-2"
                            ? "CQC check ahead. Be ready."
                            : selectedConversation === "mock-3"
                              ? "Good morning! Hope everyone is ready for today's schedule."
                              : ""}
                      </p>
                      <p className="text-xs text-clinical-gray mt-1">
                        10:15 AM
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="bg-chiron-blue text-white rounded-lg p-3 max-w-xs">
                      <p className="text-sm">
                        Thanks! I'll review them now. Any urgent cases?
                      </p>
                      <p className="text-xs text-blue-200 mt-1">10:17 AM</p>
                    </div>
                  </div>

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
                        sendMessageMutation.isPending || !newMessage.trim()
                      }
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Bell className="w-4 h-4 text-chiron-blue mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-chiron-blue">
                      System Maintenance
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Scheduled downtime Sunday 2-4 AM
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Shield className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      CQC Inspection
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Preparation meeting tomorrow 3 PM
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Users className="w-4 h-4 text-medical-green mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      New Staff Member
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Welcome Dr. Emily Chen starting Monday
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-medium text-slate-900 mb-3">
                  Quick Actions
                </h4>
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm text-clinical-gray hover:bg-slate-50"
                    disabled
                  >
                    <Radio className="w-4 h-4 mr-2" />
                    Send Announcement
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm text-clinical-gray hover:bg-slate-50"
                    disabled
                  >
                    <Users className="w-4 h-4 mr-2" />
                    View All Staff
                  </Button>
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
