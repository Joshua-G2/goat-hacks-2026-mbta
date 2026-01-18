import { cn } from "../lib/utils";

export default function AnimatedGradientText({ 
  children, 
  className,
  as: Component = "span",
  ...props 
}) {
  return (
    <Component
      className={cn(
        "inline-flex animate-gradient bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-[length:200%_auto] bg-clip-text text-transparent font-bold",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
