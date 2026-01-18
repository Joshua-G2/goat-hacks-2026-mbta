import { cn } from "../lib/utils";

export default function BlurryBlob({ className, ...props }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Blob 1 - Purple */}
      <div
        className={cn(
          "absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob",
          className
        )}
        {...props}
      />
      {/* Blob 2 - Pink */}
      <div
        className={cn(
          "absolute top-0 -right-4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000",
          className
        )}
        style={{ animationDelay: '2s' }}
        {...props}
      />
      {/* Blob 3 - Blue */}
      <div
        className={cn(
          "absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000",
          className
        )}
        style={{ animationDelay: '4s' }}
        {...props}
      />
    </div>
  );
}
