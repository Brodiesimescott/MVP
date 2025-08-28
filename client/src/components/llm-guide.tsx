import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bot, User, Loader2, Send } from "lucide-react";

interface LLMGuideProps {
  title: string;
  subtitle: string;
  initialMessage: string;
  placeholder?: string;
  className?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function LLMGuide({ 
  title, 
  subtitle, 
  initialMessage, 
  placeholder = "Ask anything...",
  className = ""
}: LLMGuideProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      role: "assistant",
      content: initialMessage,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get AI response');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const aiMessage: ChatMessage = {
        id: Date.now().toString() + "-ai",
        role: "assistant",
        content: data.response,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
    },
    onError: (error) => {
      toast({
        title: "AI Chat Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive"
      });
      console.error("AI Chat Error:", error);
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || chatMutation.isPending) return;

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString() + "-user",
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");

    // Send to AI
    chatMutation.mutate(userMessage.content);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={`p-6 h-fit sticky top-8 ${className}`}>
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-chiron-blue to-chiron-orange rounded-lg flex items-center justify-center mr-3">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-clinical-gray">{subtitle}</p>
        </div>
      </div>
      
      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto" data-testid="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className="flex">
            <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mr-2 ${
              message.role === 'assistant' ? 'bg-chiron-blue' : 'bg-clinical-gray'
            }`}>
              {message.role === 'assistant' ? (
                <Bot className="w-3 h-3 text-white" />
              ) : (
                <User className="w-3 h-3 text-white" />
              )}
            </div>
            <div className={`rounded-lg p-3 text-sm max-w-xs ${
              message.role === 'assistant' 
                ? 'bg-slate-50 text-slate-900' 
                : 'bg-chiron-blue text-white ml-auto'
            }`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.role === 'assistant' ? 'text-clinical-gray' : 'text-blue-200'
              }`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        
        {chatMutation.isPending && (
          <div className="flex">
            <div className="w-6 h-6 bg-chiron-blue rounded-full flex-shrink-0 flex items-center justify-center mr-2">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <p className="text-clinical-gray">AI is thinking...</p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="flex space-x-2">
        <Input 
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={placeholder} 
          className="flex-1 text-sm"
          disabled={chatMutation.isPending}
          data-testid="input-ai-chat"
        />
        <Button 
          type="submit"
          size="sm" 
          className="bg-chiron-blue hover:bg-blue-800"
          disabled={chatMutation.isPending || !inputMessage.trim()}
          data-testid="button-send-ai-message"
        >
          {chatMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </Card>
  );
}