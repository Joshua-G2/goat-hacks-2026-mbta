import { cn } from "../lib/utils";

export default function GlitchText({ 
  children, 
  className,
  ...props 
}) {
  return (
    <div className={cn("relative inline-block", className)} {...props}>
      <span className="relative z-10 font-bold text-white">
        {children}
      </span>
      <span 
        className="absolute top-0 left-0 -z-10 animate-glitch font-bold text-red-500"
        aria-hidden="true"
      >
        {children}
      </span>
      <span 
        className="absolute top-0 left-0 -z-20 animate-glitch font-bold text-blue-500"
        style={{ animationDelay: '0.1s' }}
        aria-hidden="true"
      >
        {children}
      </span>
    </div>
  );
}
