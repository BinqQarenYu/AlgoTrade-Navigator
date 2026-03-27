'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X, GripVertical } from 'lucide-react';

interface DraggableOverlayProps {
  id: string;
  title?: string;
  defaultPosition?: { x: number; y: number };
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  zIndex?: number;
}

/**
 * Gold Standard Draggable Overlay
 * Optimized for high-frequency trading dashboards where UI blocking is unacceptable.
 * Uses direct DOM manipulation via refs and hardware-accelerated transforms.
 */
export function DraggableOverlay({ 
  id, 
  title,
  defaultPosition = { x: 100, y: 100 }, 
  children, 
  className = '',
  onClose,
  zIndex = 50
}: DraggableOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: defaultPosition.x, y: defaultPosition.y });
  const startPosRef = useRef({ x: 0, y: 0, mouseX: 0, mouseY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Storage Key
  const storageKey = `draggable_pos_${id}`;

  // Initialize position from storage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          posRef.current = parsed;
          if (containerRef.current) {
            containerRef.current.style.transform = `translate3d(${parsed.x}px, ${parsed.y}px, 0)`;
          }
        }
      } catch (e) {
        console.warn('DraggableOverlay: Failed to load position', e);
      }
    } else {
      // Set initial position
      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;
      }
    }
  }, [storageKey]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    // Check if we clicked on a form element or button inside the overlay
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, [role="button"]')) {
        // If it's the close button, let it handle its own click
        if (target.closest('.close-btn')) return;
        // If it's any other interactive element, don't drag
        return;
    }

    setIsDragging(true);
    startPosRef.current = {
      x: posRef.current.x,
      y: posRef.current.y,
      mouseX: e.clientX,
      mouseY: e.clientY
    };

    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      rafId = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        
        const dx = e.clientX - startPosRef.current.mouseX;
        const dy = e.clientY - startPosRef.current.mouseY;
        
        const newX = startPosRef.current.x + dx;
        const newY = startPosRef.current.y + dy;
        
        // Update Ref (Current State)
        posRef.current = { x: newX, y: newY };
        
        // Direct DOM Update: Optimization for zero React re-renders during drag
        containerRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem(storageKey, JSON.stringify(posRef.current));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, storageKey]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: zIndex,
        willChange: 'transform', // GPU hint
      }}
      className={cn(
        "flex flex-col min-w-[320px] max-w-[90vw] max-h-[85vh]",
        "bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden",
        "transition-shadow duration-300",
        isDragging ? "shadow-indigo-500/20 ring-1 ring-indigo-500/30 scale-[1.01]" : "shadow-black/50",
        className
      )}
    >
      {/* Header / Drag Handle */}
      <div 
        className={cn(
            "flex items-center justify-between p-3 cursor-grab active:cursor-grabbing select-none",
            "bg-gradient-to-r from-slate-900/50 to-indigo-950/30 border-b border-white/5",
            isDragging && "to-indigo-500/10"
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-slate-500" />
            {title && (
                <span className="text-xs font-bold tracking-tight text-slate-300 uppercase">
                    {title}
                </span>
            )}
        </div>
        
        {onClose && (
            <button 
                onClick={onClose}
                className="close-btn p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Close"
            >
                <X className="h-4 w-4" />
            </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 text-sm text-slate-200">
        {children}
      </div>
      
      {/* Visual Accent */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
    </div>
  );
}
