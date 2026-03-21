'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface DraggableOverlayProps {
  id: string;
  defaultPosition?: { x: number; y: number };
  children: React.ReactNode;
  className?: string;
  zIndex?: number;
}

export function DraggableOverlay({ 
  id, 
  defaultPosition = { x: 20, y: 20 }, 
  children, 
  className = '',
  zIndex = 40
}: DraggableOverlayProps) {
  const [position, setPosition] = useState({ x: defaultPosition.x, y: defaultPosition.y });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track the most recent position via a ref so we don't need it in the mouseUp closure dependency exactly,
  // but we can just read the state.
  const posRef = useRef(position);
  useEffect(() => {
    posRef.current = position;
  }, [position]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`draggable_pos_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
           setPosition(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load drag position', e);
    }
  }, [id]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag on left click
    if (e.button !== 0) return;
    
    // Prevent dragging if clicking inside standard interactive elements
    if ((e.target as HTMLElement).closest('button, a, input, select')) return;

    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: posRef.current.x,
      initialY: posRef.current.y
    };
    e.preventDefault(); // Prevent text selection
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      // Throttle via rAF for high performance drag (Gold Standard Resource Tax: UI thread optimization)
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!dragRef.current || !containerRef.current) return;
        
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        
        let newX = dragRef.current.initialX + dx;
        let newY = dragRef.current.initialY + dy;
        
        // Bounds checking: Look Forward Scalability constraint
        const rect = containerRef.current.getBoundingClientRect();
        const parentRect = containerRef.current.parentElement?.getBoundingClientRect();
        
        if (parentRect) {
          // Keep it strictly within the parent bounds
          const maxX = parentRect.width - rect.width;
          const maxY = parentRect.height - rect.height;
          newX = Math.max(0, Math.min(newX, maxX > 0 ? maxX : 0));
          newY = Math.max(0, Math.min(newY, maxY > 0 ? maxY : 0));
        }

        setPosition({ x: newX, y: newY });
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
      // Persist to local storage
      try {
        localStorage.setItem(`draggable_pos_${id}`, JSON.stringify(posRef.current));
      } catch (e) {}
    };

    // The Cleanup Rule: explicitly binding and destroying native window listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, id]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        top: `${position.y}px`,
        left: `${position.x}px`,
        zIndex: zIndex,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none'
      }}
      className={`shadow-lg transition-shadow bg-white/90 backdrop-blur p-2 rounded-lg border text-xs text-gray-800 ${isDragging ? 'shadow-xl ring-2 ring-indigo-500/50 scale-[1.02]' : ''} ${className}`}
    >
      {/* Drag Handle explicitly styled implicitly by cursor, but let's add a subtle drag hint */}
      <div className="absolute top-1 left-2 w-1 h-1 rounded-full bg-gray-300 opacity-50 shadow-[0_4px_0_0_#d1d5db,0_8px_0_0_#d1d5db]" />
      <div className="absolute top-1 left-3 w-1 h-1 rounded-full bg-gray-300 opacity-50 shadow-[0_4px_0_0_#d1d5db,0_8px_0_0_#d1d5db]" />
      <div className="pl-3">
        {children}
      </div>
    </div>
  );
}
