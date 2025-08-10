// The props allow you to still control the size, for example <ChironLogo size={48} />
export default function ChironLogo({ size = 48 }: { size?: number }) {
  return (
    <img 
      src="/attached_assets/logo.png" 
      alt="ChironIQ Logo" 
      style={{ width: size, height: 'auto' }} 
    />
  );
}
