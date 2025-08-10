import { Shield } from "lucide-react";

export default function ChironLogo({ size = 12 }: { size?: number }) {
  return (
    <div className={`w-${size} h-${size} bg-chiron-blue rounded-lg flex items-center justify-center`}>
      <Shield className="w-6 h-6 text-white" />
    </div>
  );
}
