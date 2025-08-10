import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bot, Send } from "lucide-react";

interface LLMGuideProps {
  title: string;
  subtitle: string;
  initialMessage: string;
  placeholder?: string;
  className?: string;
}

export default function LLMGuide({ 
  title, 
  subtitle, 
  initialMessage, 
  placeholder = "Ask anything...",
  className = ""
}: LLMGuideProps) {
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
      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        <div className="flex">
          <div className="w-6 h-6 bg-chiron-blue rounded-full flex-shrink-0 flex items-center justify-center mr-2">
            <Bot className="w-3 h-3 text-white" />
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <p>{initialMessage}</p>
          </div>
        </div>
      </div>
      <div className="flex space-x-2">
        <Input placeholder={placeholder} className="flex-1 text-sm" />
        <Button size="sm" className="bg-chiron-blue hover:bg-blue-800">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
