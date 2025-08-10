import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShieldCheck, 
  Users, 
  MessageSquare, 
  PoundSterling, 
  Package, 
  Building,
  ArrowRight,
  LucideIcon
} from "lucide-react";
import hrLogoPath from "@assets/HR_1754837463723.png";

interface Module {
  id: string;
  title: string;
  name: string;
  description: string;
  icon: string;
  status: 'good' | 'attention' | 'critical';
}

const iconMap: Record<string, LucideIcon> = {
  'shield-check': ShieldCheck,
  'users': Users,
  'message-square': MessageSquare,
  'pound-sterling': PoundSterling,
  'package': Package,
  'building': Building,
};

const statusColors = {
  good: 'bg-medical-green',
  attention: 'bg-amber-500',
  critical: 'bg-alert-red'
};

const moduleColors = {
  cqc: 'bg-chiron-blue',
  hr: 'bg-chiron-blue', 
  messaging: 'bg-chiron-blue',
  money: 'bg-chiron-orange',
  stock: 'bg-chiron-orange',
  facilities: 'bg-chiron-blue'
};

export default function ModulesGrid() {
  const { data: modules, isLoading } = useQuery<Module[]>({
    queryKey: ['/api/modules']
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <Skeleton className="w-3 h-3 rounded-full" />
            </div>
            <Skeleton className="h-6 mb-2" />
            <Skeleton className="h-16 mb-4" />
            <Skeleton className="h-4 w-32" />
          </Card>
        ))}
      </div>
    );
  }

  if (!modules) {
    return (
      <div className="text-center py-12">
        <p className="text-clinical-gray">Failed to load modules</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {modules.map((module) => {
        const IconComponent = iconMap[module.icon];
        const statusColor = statusColors[module.status];
        const moduleColor = moduleColors[module.name as keyof typeof moduleColors] || 'bg-chiron-blue';
        
        return (
          <Link key={module.id} href={`/modules/${module.name}`}>
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group h-full">
              <CardHeader className="p-0 mb-4">
                <div className="flex items-center justify-between">
                  {module.name === 'hr' ? (
                    <img 
                      src={hrLogoPath} 
                      alt="HR Logo" 
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <div className={`w-12 h-12 ${moduleColor} bg-opacity-10 rounded-lg flex items-center justify-center`}>
                      {IconComponent && (
                        <IconComponent className={`w-6 h-6 ${moduleColor.replace('bg-', 'text-')}`} />
                      )}
                    </div>
                  )}
                  <div className={`w-3 h-3 ${statusColor} rounded-full`}></div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{module.title}</h3>
                <p className="text-sm text-clinical-gray mb-4 line-clamp-3">{module.description}</p>
                <div className="flex items-center text-chiron-blue text-sm font-medium group-hover:text-chiron-orange transition-colors">
                  <span>
                    {module.name === 'cqc' && 'Manage Compliance'}
                    {module.name === 'hr' && 'Manage Team'}
                    {module.name === 'messaging' && 'Open Messages'}
                    {module.name === 'money' && 'Manage Finances'}
                    {module.name === 'stock' && 'Manage Stock'}
                    {module.name === 'facilities' && 'Manage Facilities'}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
