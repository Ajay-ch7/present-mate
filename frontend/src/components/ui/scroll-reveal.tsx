"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type AnimationType =
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "zoom-in"
  | "zoom-out"
  | "fade";

interface ScrollRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  animation?: AnimationType;
  delay?: number; // ms
  duration?: number; // ms
  threshold?: number;
  once?: boolean;
  className?: string;
}

export function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  duration = 700,
  threshold = 0.12,
  once = true,
  className,
  ...props
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -30px 0px",
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, once]);

  const getHiddenClasses = () => {
    switch (animation) {
      case "fade-up":
        return "opacity-0 translate-y-8";
      case "fade-down":
        return "opacity-0 -translate-y-8";
      case "fade-left":
        return "opacity-0 -translate-x-8";
      case "fade-right":
        return "opacity-0 translate-x-8";
      case "zoom-in":
        return "opacity-0 scale-95";
      case "zoom-out":
        return "opacity-0 scale-105";
      case "fade":
      default:
        return "opacity-0";
    }
  };

  const getVisibleClasses = () => {
    switch (animation) {
      case "fade-up":
      case "fade-down":
        return "opacity-100 translate-y-0";
      case "fade-left":
      case "fade-right":
        return "opacity-100 translate-x-0";
      case "zoom-in":
      case "zoom-out":
        return "opacity-100 scale-100";
      case "fade":
      default:
        return "opacity-100";
    }
  };

  return (
    <div
      ref={ref}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className={cn(
        "transition-all will-change-[opacity,transform]",
        isVisible ? getVisibleClasses() : getHiddenClasses(),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
