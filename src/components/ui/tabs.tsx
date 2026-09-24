"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cn } from "cn"

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative flex h-11 w-full max-w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-muted p-1 no-scrollbar sm:inline-flex sm:w-fit",
        className
      )}
      {...props}
    />
  )
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        "group/tab relative z-10 inline-flex h-9 flex-1 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[active]:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 sm:flex-none",
        className
      )}
      {...props}
    />
  )
}

function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        "absolute top-1 left-0 z-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) rounded-lg bg-background shadow-sm ring-1 ring-border/70 transition-[translate,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:bg-card",
        className
      )}
      {...props}
    />
  )
}

/** A small count pill inside a tab ("Colors 5") — inverts on the active tab so it stays legible. */
function TabsCount({ className, children, ...props }: React.ComponentProps<"span">) {
  if (children == null || children === 0) return null
  return (
    <span
      data-slot="tabs-count"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground/[0.07] px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground transition-colors group-data-[active]/tab:bg-foreground group-data-[active]/tab:text-background",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn("outline-none animate-fade-in", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTab, TabsIndicator, TabsCount, TabsPanel }
