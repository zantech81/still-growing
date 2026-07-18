// Renders a country flag image via flagcdn.com (works on all platforms,
// unlike Unicode Regional Indicator emoji sequences which Windows doesn't render).
export default function FlagImg({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const lower = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/24x18/${lower}.png`}
      srcSet={`https://flagcdn.com/48x36/${lower}.png 2x`}
      width={24}
      height={18}
      alt={code}
      className={className}
    />
  );
}
