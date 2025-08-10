import logoPath from "@assets/ChironIQ_transparent_1754836671859.png";

// The props allow you to still control the size, for example <ChironLogo size={48} />
export default function ChironLogo({ size = 58 }: { size?: number }) {
  return (
    <img 
      src={logoPath} 
      alt="ChironIQ Logo" 
      style={{ width: size, height: 'auto' }} 
    />
  );
}
