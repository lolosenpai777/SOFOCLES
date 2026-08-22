import { cn } from "@/lib/utils";
import React from "react";

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}) => (
  <div
    className={cn("AuroraBackground", showRadialGradient && "AuroraBackground--radial", className)}
    {...props}
  >
    <div className="AuroraBackground__aceternity-layer" aria-hidden="true" />
    {children}
  </div>
);
