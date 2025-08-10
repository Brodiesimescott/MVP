import { Link } from "wouter";
import { ArrowLeft, Package, AlertTriangle, TrendingDown, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LLMGuide from "@/components/llm-guide";

export default function ChironStock() {
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
              <div className="w-10 h-10 bg-chiron-orange bg-opacity-10 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-chiron-orange" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900">ChironStock</h1>
            </div>
          </div>
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
            <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
            Development Mode
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {/* Coming Soon Notice */}
            <Card className="p-8 mb-8 text-center">
              <div className="w-16 h-16 bg-chiron-orange bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-chiron-orange" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">ChironStock Module</h2>
              <p className="text-clinical-gray mb-6">
                Comprehensive inventory management system for medical supplies, equipment tracking, and automated reordering workflows.
              </p>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 mb-4">
                Coming Soon
              </Badge>
              <p className="text-sm text-clinical-gray">
                This module is currently in development and will include advanced features for stock management, supplier integration, and compliance tracking.
              </p>
            </Card>

            {/* Planned Features */}
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Planned Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
                  <Package className="w-6 h-6 text-chiron-blue mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Inventory Tracking</h4>
                    <p className="text-sm text-clinical-gray">Real-time stock levels, batch tracking, and expiry monitoring</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-chiron-orange mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Automated Alerts</h4>
                    <p className="text-sm text-clinical-gray">Low stock warnings, expiry notifications, and reorder reminders</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-medical-green mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Smart Reordering</h4>
                    <p className="text-sm text-clinical-gray">AI-powered demand forecasting and automatic purchase orders</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-chiron-blue mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Usage Analytics</h4>
                    <p className="text-sm text-clinical-gray">Consumption patterns, cost analysis, and waste reduction insights</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Placeholder Metrics */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <Card className="p-6 opacity-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">Total Items</h3>
                  <Package className="w-5 h-5 text-chiron-blue" />
                </div>
                <p className="text-2xl font-bold text-slate-900">---</p>
                <p className="text-sm text-clinical-gray">Items tracked</p>
              </Card>
              
              <Card className="p-6 opacity-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">Low Stock</h3>
                  <AlertTriangle className="w-5 h-5 text-chiron-orange" />
                </div>
                <p className="text-2xl font-bold text-slate-900">---</p>
                <p className="text-sm text-clinical-gray">Items need reorder</p>
              </Card>
              
              <Card className="p-6 opacity-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">Expiring Soon</h3>
                  <AlertTriangle className="w-5 h-5 text-alert-red" />
                </div>
                <p className="text-2xl font-bold text-slate-900">---</p>
                <p className="text-sm text-clinical-gray">Within 30 days</p>
              </Card>
              
              <Card className="p-6 opacity-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">Stock Value</h3>
                  <BarChart3 className="w-5 h-5 text-chiron-blue" />
                </div>
                <p className="text-2xl font-bold text-slate-900">---</p>
                <p className="text-sm text-clinical-gray">Total inventory</p>
              </Card>
            </div>

            {/* Development Timeline */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Development Timeline</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 pb-4 border-b border-slate-200">
                  <div className="w-3 h-3 bg-chiron-blue rounded-full flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-slate-900">Phase 1: Core Inventory Management</h4>
                    <p className="text-sm text-clinical-gray">Basic stock tracking, add/remove items, search functionality</p>
                    <p className="text-xs text-amber-600 mt-1">Q1 2024</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 pb-4 border-b border-slate-200">
                  <div className="w-3 h-3 bg-slate-300 rounded-full flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-slate-900">Phase 2: Automated Reordering</h4>
                    <p className="text-sm text-clinical-gray">Smart alerts, supplier integration, purchase order automation</p>
                    <p className="text-xs text-clinical-gray mt-1">Q2 2024</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-slate-300 rounded-full flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-slate-900">Phase 3: Advanced Analytics</h4>
                    <p className="text-sm text-clinical-gray">Usage analytics, cost optimization, predictive insights</p>
                    <p className="text-xs text-clinical-gray mt-1">Q3 2024</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* LLM Guide */}
          <div className="lg:col-span-1">
            <LLMGuide
              title="Stock Assistant"
              subtitle="Inventory guidance"
              initialMessage="While the ChironStock module is in development, I can help you plan your inventory management needs and provide guidance on best practices for medical supply tracking. What would you like to know?"
              placeholder="Ask about stock management..."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
