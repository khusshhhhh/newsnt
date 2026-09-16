import { cn } from "@/lib/utils";

export function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1440px] px-6 sm:px-8 lg:px-12", className)}
      {...props}
    />
  );
}
