// The props allow you to still control the size, for example <ChironLogo size={48} />
export default function ChironLogo({ size = 58 }: { size?: number }) {
  return (
    <img 
      src="attached_assets/ChironIQ_transparent.png" 
      alt="ChironIQ Logo" 
      style={{ width: size, height: 'auto' }} 
    />
  );
}
