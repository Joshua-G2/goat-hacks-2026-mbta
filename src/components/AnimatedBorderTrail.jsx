import { cn } from "../lib/utils";

export default function AnimatedBorderTrail({ 
  children, 
  className,
  trailColor = "bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500",
  trailSize = "medium",
  duration = "3s",
  ...props 
}) {
  const sizeClasses = {
    small: "before:h-[2px]",
    medium: "before:h-[3px]",
    large: "before:h-[4px]"
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl",
        "before:absolute before:inset-0 before:z-0",
        "before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent",
        "before:translate-x-[-100%] before:animate-[shimmer_3s_infinite]",
        sizeClasses[trailSize],
        className
      )}
      style={{
        "--shimmer-duration": duration,
      }}
      {...props}
    >
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
      <div className={cn(
        "absolute inset-0 -z-10 rounded-xl",
        trailColor,
        "opacity-75 blur-sm"
      )} />
    </div>
  );
}
