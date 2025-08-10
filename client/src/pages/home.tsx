import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ModulesGrid from "@/components/modules-grid";
import ChironLogo from "@/lib/logo";
import { Bot, Send, User } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <ChironLogo />
              <div>
                <h1 className="text-2xl font-bold text-chiron-blue"></h1>
                <p className="text-3xl font-bold italic text-[#05335b]">Focus On Patients</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-green-50 text-medical-green border-green-200 hover:bg-green-50">
              <div className="w-2 h-2 bg-medical-green rounded-full animate-pulse mr-2"></div>
              System Operational
            </Badge>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-chiron-blue rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">Dr. Sarah Wilson</span>
            </div>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Practice Management Modules */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Practice Management Modules</h2>
              <p className="text-clinical-gray">Comprehensive tools to manage your healthcare practice efficiently</p>
            </div>
            <ModulesGrid />
          </div>

          {/* Chiron AI Assistant */}
          <div className="lg:col-span-2">
            <Card className="p-6 h-[600px] sticky top-8 flex flex-col">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-chiron-blue to-chiron-orange rounded-lg flex items-center justify-center mr-3">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Chiron AI Assistant</h3>
                  <p className="text-xs text-clinical-gray">Always here to help</p>
                </div>
              </div>
              <div className="space-y-3 mb-4 flex-1 overflow-y-auto">
                <div className="flex">
                  <div className="w-6 h-6 bg-chiron-blue rounded-full flex-shrink-0 flex items-center justify-center mr-2">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-sm">
                    <p>Good morning! Your CQC compliance score is at 98%. Would you like me to review the remaining items?</p>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Input placeholder="Ask anything..." className="flex-1 text-sm" />
                <Button size="sm" className="bg-chiron-blue hover:bg-blue-800">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-6 mt-auto">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-clinical-gray mb-2">© 2025 ChironIQ Healthcare Management Platform. All rights reserved.</p>
          <p className="text-xs text-clinical-gray"> | GDPR Compliant | </p>
        </div>
      </footer>
    </div>
  );
}
