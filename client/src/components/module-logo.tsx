import { LucideIcon } from "lucide-react";
import hrLogoPath from "@assets/HR_1754837463723.png";
import cqcLogoPath from "@assets/cqc transparent_1754837827860.png";
import messagingLogoPath from "@assets/Screenshot 2025-08-10 at 16.15.57_1754839009063.png";
import moneyLogoPath from "@assets/Gemini_Generated_Image_ouh17aouh17aouh1_1754840637280.jpeg";
import stockLogoPath from "@assets/Screenshot 2025-08-10 at 16.48.12_1754840917179.png";
import facilitiesLogoPath from "@assets/Screenshot 2025-08-10 at 16.59.22_1754841619562.png";

interface ModuleLogoProps {
  moduleName: string;
  icon: LucideIcon;
  className?: string;
  iconClassName?: string;
}

const moduleColors = {
  cqc: 'bg-chiron-blue',
  hr: 'bg-chiron-blue', 
  messaging: 'bg-chiron-blue',
  money: 'bg-chiron-orange',
  stock: 'bg-chiron-orange',
  facilities: 'bg-chiron-blue'
};

export default function ModuleLogo({ moduleName, icon: IconComponent, className = "w-10 h-10", iconClassName = "w-5 h-5" }: ModuleLogoProps) {
  const moduleColor = moduleColors[moduleName as keyof typeof moduleColors] || 'bg-chiron-blue';

  if (moduleName === 'hr') {
    return (
      <img 
        src={hrLogoPath} 
        alt="HR Logo" 
        className={`${className} object-contain`}
      />
    );
  }

  if (moduleName === 'cqc') {
    return (
      <img 
        src={cqcLogoPath} 
        alt="CQC Logo" 
        className={`${className} object-contain`}
      />
    );
  }

  if (moduleName === 'messaging') {
    return (
      <img 
        src={messagingLogoPath} 
        alt="Messaging Logo" 
        className={`${className} object-contain`}
      />
    );
  }

  if (moduleName === 'money') {
    return (
      <img 
        src={moneyLogoPath} 
        alt="Money Logo" 
        className={`${className} object-contain`}
      />
    );
  }

  if (moduleName === 'stock') {
    return (
      <img 
        src={stockLogoPath} 
        alt="Stock Logo" 
        className={`${className} object-contain`}
      />
    );
  }

  if (moduleName === 'facilities') {
    return (
      <img 
        src={facilitiesLogoPath} 
        alt="Facilities Logo" 
        className={`${className} object-contain`}
      />
    );
  }

  // Fallback to default icon
  return (
    <div className={`${className} ${moduleColor} bg-opacity-10 rounded-lg flex items-center justify-center`}>
      <IconComponent className={`${iconClassName} ${moduleColor.replace('bg-', 'text-')}`} />
    </div>
  );
}