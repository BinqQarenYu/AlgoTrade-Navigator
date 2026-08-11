"use client";

import React, { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Trash2 } from 'lucide-react';

export const OutputNode = memo(({ id, data }: any) => {
  const { deleteElements } = useReactFlow();
  const isError = !!data?.error;
  
  return (
    <div className={`bg-card text-card-foreground p-4 border rounded shadow-md min-w-[250px] relative group ${isError ? 'border-destructive' : 'border-border'}`}>
        <Handle 
            type="target" 
            position={Position.Left} 
            className="w-3 h-3 bg-primary border-2 border-background"
        />
      <div className="font-bold text-sm mb-2 pb-2 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Data Output</span>
            {data?.data && <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded">Success</span>}
          </div>
          <button 
              onClick={() => deleteElements({ nodes: [{ id }] })}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
              <Trash2 className="w-4 h-4" />
          </button>
      </div>
      
      <div className="text-xs bg-muted/50 p-2 rounded overflow-auto max-h-[250px] max-w-[400px]">
          {isError ? (
              <span className="text-destructive font-medium">{data.error}</span>
          ) : data?.data !== undefined && data?.data !== null ? (
              <pre className="text-[10px]">{JSON.stringify(data.data, null, 2)}</pre>
          ) : (
              <span className="opacity-50 italic">Awaiting input...</span>
          )}
      </div>
    </div>
  );
});

OutputNode.displayName = 'OutputNode';
