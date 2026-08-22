"use client";

import React from "react";
import {
  MousePointer2,
  Minus, // Trend Line
  Waypoints, // Pitchfork
  Brush,
  Type,
  Scaling, // Patterns
  Ruler, // Measure
  ZoomIn,
  Magnet,
  Lock,
  EyeOff,
  Trash2,
  Star,
  Activity // Prediction
} from "lucide-react";

export function TVLeftSidebar() {
  const tools = [
    { icon: MousePointer2, label: "Cursor" },
    { icon: Minus, label: "Trend Line Tools" },
    { icon: Waypoints, label: "Gann and Fibonacci Tools" },
    { icon: Brush, label: "Geometric Shapes" },
    { icon: Type, label: "Annotation Tools" },
    { icon: Scaling, label: "Patterns" },
    { icon: Activity, label: "Prediction and Measurement Tools" },
  ];

  const bottomTools = [
    { icon: Ruler, label: "Measure" },
    { icon: ZoomIn, label: "Zoom In" },
    { icon: Magnet, label: "Magnet Mode" },
    { icon: Lock, label: "Stay in Drawing Mode" },
    { icon: Lock, label: "Lock All Drawing Tools" }, // Re-using Lock for now
    { icon: EyeOff, label: "Hide All Drawings" },
    { icon: Trash2, label: "Remove Drawings & Indicators" },
  ];

  return (
    <div className="w-12 h-full bg-[#131722] border-r border-[#2A2E39] flex flex-col py-2 items-center justify-between text-[#B2B5BE] shrink-0">
      
      {/* Top Group */}
      <div className="flex flex-col gap-1 w-full items-center">
        {tools.map((Tool, i) => (
          <button 
            key={i} 
            title={Tool.label}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#2A2E39] transition-colors relative group"
          >
            <Tool.icon className="w-4 h-4" />
            <div className="absolute right-0 bottom-0 w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* tiny arrow indicator for dropdown tools in TV */}
              <svg width="4" height="4" viewBox="0 0 4 4" fill="currentColor">
                <path d="M0 0l4 4H0V0z"/>
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom Group */}
      <div className="flex flex-col gap-1 w-full items-center">
        {bottomTools.map((Tool, i) => (
          <button 
            key={i} 
            title={Tool.label}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#2A2E39] transition-colors"
          >
            <Tool.icon className="w-4 h-4" />
          </button>
        ))}
        <button 
          title="Show Favorite Drawing Tools Toolbar"
          className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#2A2E39] transition-colors mt-2"
        >
          <Star className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
