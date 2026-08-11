"use client";

import React, { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Trash2, Loader2, DownloadCloud } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useDataManager } from '@/context/data-manager-context';

export const InputNode = memo(({ id, data }: any) => {
  const { updateNodeData, deleteElements } = useReactFlow();
  const { getChartData } = useDataManager();
  
  // Local state for the textarea to avoid losing focus on every keystroke
  const [localValue, setLocalValue] = useState(() => {
     if (typeof data?.value === 'string') return data.value;
     if (data?.value) return JSON.stringify(data.value, null, 2);
     return '';
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalValue(e.target.value);
  };
  
  const handleBlur = () => {
      updateNodeData(id, { value: localValue });
  };

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1h');
  const [isFetching, setIsFetching] = useState(false);

  const handleFetch = async () => {
      setIsFetching(true);
      try {
          // getChartData requires a dateRange or it fetches a default amount based on the service impl.
          const result = await getChartData(symbol, interval);
          if (result && result.length > 0) {
              const strVal = JSON.stringify(result.slice(-100), null, 2); // Limit to last 100 for visual debug performance
              setLocalValue(strVal);
              updateNodeData(id, { value: strVal });
          } else {
              const err = "No data returned for " + symbol;
              setLocalValue(err);
              updateNodeData(id, { value: err });
          }
      } catch (e: any) {
          const err = e.message || "Error fetching data";
          setLocalValue(err);
          updateNodeData(id, { value: err });
      } finally {
          setIsFetching(false);
      }
  };

  return (
    <div className="bg-card text-card-foreground p-4 border border-border rounded shadow-md min-w-[280px] relative group">
      <div className="font-bold text-sm mb-2 pb-2 border-b border-border flex justify-between items-center">
          <span>Data Input</span>
          <button 
              onClick={() => deleteElements({ nodes: [{ id }] })}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
              <Trash2 className="w-4 h-4" />
          </button>
      </div>
      
      <Tabs defaultValue="fetch" className="w-full mt-2">
        <TabsList className="grid w-full grid-cols-2 h-8 mb-2">
            <TabsTrigger value="fetch" className="text-xs py-1">Fetch Live</TabsTrigger>
            <TabsTrigger value="raw" className="text-xs py-1">Raw JSON</TabsTrigger>
        </TabsList>
        
        <TabsContent value="fetch" className="flex flex-col gap-2">
            <div className="flex gap-2">
                <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Symbol" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                        <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                        <SelectItem value="BNBUSDT">BNB/USDT</SelectItem>
                        <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={interval} onValueChange={setInterval}>
                    <SelectTrigger className="h-8 text-xs w-[80px]"><SelectValue placeholder="Int" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="15m">15m</SelectItem>
                        <SelectItem value="1h">1h</SelectItem>
                        <SelectItem value="4h">4h</SelectItem>
                        <SelectItem value="1d">1d</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button 
                size="sm" 
                variant="secondary" 
                className="w-full h-8 text-xs gap-2"
                onClick={handleFetch}
                disabled={isFetching}
            >
                {isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <DownloadCloud className="w-3 h-3" />}
                {isFetching ? 'Fetching...' : 'Fetch Last 100 Candles'}
            </Button>
            <div className="text-[10px] text-muted-foreground truncate w-full mt-1">
                Data Size: {localValue.startsWith('[') ? (() => { try { return JSON.parse(localValue).length + ' rows'; } catch { return 'Invalid JSON'; } })() : 'Error/Empty'}
            </div>
        </TabsContent>

        <TabsContent value="raw" className="flex flex-col gap-2">
            <textarea 
                className="w-full text-xs font-mono bg-background border border-input rounded p-2 resize-y h-[100px]"
                placeholder="[ { high: 10, low: 5, close: 8, ... } ]"
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
            />
        </TabsContent>
      </Tabs>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-primary"
      />
    </div>
  );
});

InputNode.displayName = 'InputNode';
