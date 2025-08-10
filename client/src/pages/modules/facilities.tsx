import { Link } from "wouter";
import { ArrowLeft, Building, Wrench, Calendar, AlertCircle, CheckCircle, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LLMGuide from "@/components/llm-guide";

export default function ChironFacilities() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2 text-clinical-gray hover:text-chiron-blue">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="w-px h-6 bg-slate-200"></div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-chiron-blue bg-opacity-10 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-chiron-blue" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900">ChironFacilities</h1>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-50 text-medical-green border-green-200">
            <div className="w-2 h-2 bg-medical-green rounded-full mr-2"></div>
            Planning Phase
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {/* Module Overview */}
            <Card className="p-8 mb-8 text-center">
              <div className="w-16 h-16 bg-chiron-blue bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-chiron-blue" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">ChironFacilities Module</h2>
              <p className="text-clinical-gray mb-6">
                Complete facility management solution for healthcare practices, including maintenance tracking, asset management, and compliance monitoring.
              </p>
              <Badge variant="secondary" className="bg-blue-100 text-chiron-blue border-blue-200 mb-4">
                In Planning
              </Badge>
              <p className="text-sm text-clinical-gray">
                Comprehensive facility management tools designed specifically for healthcare environments and regulatory requirements.
              </p>
            </Card>

            {/* Key Features */}
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Key Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
                  <Wrench className="w-6 h-6 text-chiron-blue mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Preventive Maintenance</h4>
                    <p className="text-sm text-clinical-gray">Scheduled maintenance for medical equipment, HVAC systems, and building infrastructure</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
                  <Calendar className="w-6 h-6 text-medical-green mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Maintenance Scheduling</h4>
                    <p className="text-sm text-clinical-gray">Automated scheduling, reminders, and work order management</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
                  <Settings className="w-6 h-6 text-chiron-orange mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Asset Management</h4>
                    <p className="text-sm text-clinical-gray">Complete asset lifecycle tracking, warranties, and depreciation</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-chiron-blue mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Compliance Monitoring</h4>
                    <p className="text-sm text-clinical-gray">Healthcare facility regulations, safety inspections, and certifications</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Placeholder Dashboard */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <Card className="p-6 opacity-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">Total Assets</h3>
                  <Building className="w-5 h-5 text-chiron-blue" />
                </div>
                <p className="text-2xl font-bold text-slate-900">---</p>
                <p className="text-sm text-clinical-gray">Tracked items</p>
              </Card>
              
              <Card className="p-6 opacity-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">Due Maintenance</h3>
                  <Calendar className="w-5 h-5 text-chiron-orange" />
                </div>
                <p className="text-2xl font-bold text-slate-900">---</p>
                <p className="text-sm text-clinical-gray">This month</p>
              </Card>
              
              <Card className="p-6 opacity-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">Open Issues</h3>
                  <AlertCircle className="w-5 h-5 text-alert-red" />
                </div>
                <p className="text-2xl font-bold text-slate-900">---</p>
                <p className="text-sm text-clinical-gray">Require attention</p>
              </Card>
              
              <Card className="p-6 opacity-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">Compliance</h3>
                  <CheckCircle className="w-5 h-5 text-medical-green" />
                </div>
                <p className="text-2xl font-bold text-slate-900">---</p>
                <p className="text-sm text-clinical-gray">Overall status</p>
              </Card>
            </div>

            {/* Regulatory Focus */}
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Healthcare Facility Compliance</h3>
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-900">Medical Equipment Maintenance</h4>
                    <Badge variant="outline" className="text-chiron-blue border-chiron-blue">MHRA Compliant</Badge>
                  </div>
                  <p className="text-sm text-clinical-gray mb-3">
                    Ensure all medical devices meet MHRA requirements with automated maintenance schedules and documentation.
                  </p>
                  <div className="bg-slate-50 rounded p-3">
                    <p className="text-xs text-clinical-gray">
                      Includes: Equipment calibration, safety testing, maintenance records, and compliance certificates
                    </p>
                  </div>
                </div>
                
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-900">Building Safety & Fire Systems</h4>
                    <Badge variant="outline" className="text-medical-green border-green-300">Fire Safety Order</Badge>
                  </div>
                  <p className="text-sm text-clinical-gray mb-3">
                    Comprehensive fire safety management including equipment testing, evacuation procedures, and documentation.
                  </p>
                  <div className="bg-slate-50 rounded p-3">
                    <p className="text-xs text-clinical-gray">
                      Includes: Fire alarm testing, emergency lighting, extinguisher maintenance, and risk assessments
                    </p>
                  </div>
                </div>
                
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-900">Environmental Controls</h4>
                    <Badge variant="outline" className="text-chiron-orange border-orange-300">Health & Safety</Badge>
                  </div>
                  <p className="text-sm text-clinical-gray mb-3">
                    Monitor and maintain optimal environmental conditions for patient care and staff safety.
                  </p>
                  <div className="bg-slate-50 rounded p-3">
                    <p className="text-xs text-clinical-gray">
                      Includes: HVAC maintenance, water quality testing, temperature monitoring, and air quality assessments
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Implementation Roadmap */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Implementation Roadmap</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-4 pb-4 border-b border-slate-200">
                  <div className="w-8 h-8 bg-chiron-blue rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">Asset Registration & Cataloging</h4>
                    <p className="text-sm text-clinical-gray">Complete facility audit, asset tagging, and digital catalog creation</p>
                    <p className="text-xs text-amber-600 mt-1">Q2 2024 - Foundation Phase</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 pb-4 border-b border-slate-200">
                  <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">Maintenance Management System</h4>
                    <p className="text-sm text-clinical-gray">Automated scheduling, work orders, and maintenance tracking</p>
                    <p className="text-xs text-clinical-gray mt-1">Q3 2024 - Core Features</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">Compliance & Reporting Dashboard</h4>
                    <p className="text-sm text-clinical-gray">Regulatory compliance monitoring, automated reporting, and audit trails</p>
                    <p className="text-xs text-clinical-gray mt-1">Q4 2024 - Advanced Features</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* LLM Guide */}
          <div className="lg:col-span-1">
            <LLMGuide
              title="Facilities Assistant"
              subtitle="Property & maintenance guidance"
              initialMessage="I can help you plan your facility management strategy, understand healthcare building regulations, and optimize maintenance workflows. What aspects of facility management are most important for your practice?"
              placeholder="Ask about facilities..."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
