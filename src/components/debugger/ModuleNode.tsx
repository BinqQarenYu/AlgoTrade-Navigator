"use client";

import React, { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ModuleRegistry } from '@/lib/visual-debugger/registry';
import { Trash2 } from 'lucide-react';

export const ModuleNode = memo(({ id, data, selected }: any) => {
  const { deleteElements } = useReactFlow();
  const moduleDef = ModuleRegistry[data.moduleId as string];
  
  if (!moduleDef) {
      return <div className="bg-destructive text-destructive-foreground p-2 rounded shadow-md border border-destructive">Unknown Module</div>;
  }

  return (
    <div className={`bg-card text-card-foreground p-4 border rounded shadow-md min-w-[250px] relative group ${selected ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-border'}`}>
      <div className="font-bold text-sm mb-2 pb-2 border-b border-border text-primary flex justify-between items-center">
        <span>{moduleDef.name}</span>
        <button 
            onClick={() => deleteElements({ nodes: [{ id }] })}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
            <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex justify-between w-full relative pt-1">
          <div className="flex flex-col gap-3 relative">
            {moduleDef.inputs.map((inp, idx) => (
                <div key={inp.name} className="flex items-center text-xs relative text-muted-foreground" style={{ height: '20px' }}>
                    <Handle 
                        type="target" 
                        position={Position.Left} 
                        id={inp.name}
                        className="w-2.5 h-2.5 bg-blue-500 border-2 border-background"
                        style={{ top: '50%', transform: 'translateY(-50%)', left: '-22px' }}
                    />
                    {inp.name} 
                </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 items-end relative">
            {moduleDef.outputs.map((out, idx) => (
                <div key={out.name} className="flex items-center text-xs relative justify-end font-medium" style={{ height: '20px' }}>
                    {out.name}
                    <Handle 
                        type="source" 
                        position={Position.Right} 
                        id={out.name}
                        className="w-2.5 h-2.5 bg-green-500 border-2 border-background"
                        style={{ top: '50%', transform: 'translateY(-50%)', right: '-22px' }}
                    />
                </div>
            ))}
          </div>
      </div>
      
      {data.error && (
          <div className="mt-3 p-2 bg-destructive/10 text-destructive text-xs rounded border border-destructive/20 overflow-hidden text-ellipsis">
              <span className="font-bold mr-1">Error:</span> {data.error}
          </div>
      )}
    </div>
  );
});

ModuleNode.displayName = 'ModuleNode';
