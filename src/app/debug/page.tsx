"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { InputNode } from '@/components/debugger/InputNode';
import { ModuleNode } from '@/components/debugger/ModuleNode';
import { OutputNode } from '@/components/debugger/OutputNode';
import { evaluateGraph } from '@/lib/visual-debugger/evaluator';
import { ModuleRegistry } from '@/lib/visual-debugger/registry';

import { Button } from '@/components/ui/button';
import { Play, Loader2, Download, Save, FolderOpen, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export interface SavedGraph {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  updatedAt: number;
}

const nodeTypes = {
  inputNode: InputNode,
  moduleNode: ModuleNode,
  outputNode: OutputNode,
};

const sampleData = `[
  { "timestamp": "2024-01-01", "open": 100, "high": 105, "low": 98, "close": 102, "volume": 1000 },
  { "timestamp": "2024-01-02", "open": 102, "high": 106, "low": 100, "close": 104, "volume": 1100 },
  { "timestamp": "2024-01-03", "open": 104, "high": 108, "low": 102, "close": 106, "volume": 1200 },
  { "timestamp": "2024-01-04", "open": 106, "high": 107, "low": 103, "close": 105, "volume": 1050 },
  { "timestamp": "2024-01-05", "open": 105, "high": 110, "low": 104, "close": 109, "volume": 1500 },
  { "timestamp": "2024-01-06", "open": 109, "high": 112, "low": 108, "close": 110, "volume": 1400 },
  { "timestamp": "2024-01-07", "open": 110, "high": 111, "low": 107, "close": 108, "volume": 1300 },
  { "timestamp": "2024-01-08", "open": 108, "high": 109, "low": 105, "close": 106, "volume": 1200 }
]`;

const initialNodes: Node[] = [
  {
    id: 'input-1',
    type: 'inputNode',
    position: { x: 50, y: 100 },
    data: { value: sampleData },
  },
  {
    id: 'module-1',
    type: 'moduleNode',
    position: { x: 350, y: 100 },
    data: { moduleId: 'sma-crossover', config: { shortPeriod: 3, longPeriod: 5 } },
  },
  {
    id: 'output-1',
    type: 'outputNode',
    position: { x: 750, y: 100 },
    data: { data: null },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'input-1', target: 'module-1', targetHandle: 'data' },
  { id: 'e2-3', source: 'module-1', target: 'output-1', sourceHandle: 'strategyOutput' },
];

const seasonalNodes: Node[] = [
  {
    id: 'input-seasonal',
    type: 'inputNode',
    position: { x: 50, y: 100 },
    data: { value: sampleData },
  },
  {
    id: 'module-seasonal',
    type: 'moduleNode',
    position: { x: 350, y: 100 },
    data: { moduleId: 'seasonal-analysis', config: {} },
  },
  {
    id: 'output-seasonal',
    type: 'outputNode',
    position: { x: 750, y: 100 },
    data: { data: null },
  },
];

const seasonalEdges: Edge[] = [
  { id: 'e1-2-seas', source: 'input-seasonal', target: 'module-seasonal', targetHandle: 'data' },
  { id: 'e2-3-seas', source: 'module-seasonal', target: 'output-seasonal', sourceHandle: 'strategyOutput' },
];

export default function DebuggerPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savedGraphs, setSavedGraphs] = useState<SavedGraph[]>([]);

  useEffect(() => {
    // Load saved graphs from local storage on mount
    try {
      const stored = localStorage.getItem('debugger_saved_graphs');
      if (stored) {
        setSavedGraphs(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse saved graphs from local storage", e);
    }
  }, []);

  const handleSaveGraph = () => {
    if (!saveName.trim()) return;
    
    const newSaved: SavedGraph = {
      id: `graph-${Date.now()}`,
      name: saveName.trim(),
      nodes,
      edges,
      updatedAt: Date.now(),
    };
    
    const updatedGraphs = [newSaved, ...savedGraphs];
    setSavedGraphs(updatedGraphs);
    localStorage.setItem('debugger_saved_graphs', JSON.stringify(updatedGraphs));
    
    setSaveName("");
    setSaveDialogOpen(false);
  };

  const handleDeleteSavedGraph = (id: string) => {
    const updatedGraphs = savedGraphs.filter(g => g.id !== id);
    setSavedGraphs(updatedGraphs);
    localStorage.setItem('debugger_saved_graphs', JSON.stringify(updatedGraphs));
  };

  const handleLoadGraph = (graph: SavedGraph) => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setLoadDialogOpen(false);
  };

  const runEvaluation = async () => {
      setIsEvaluating(true);
      try {
          const results = await evaluateGraph(nodes, edges);
          
          setNodes((nds) => 
            nds.map((n) => {
                if (results[n.id]) {
                    const updatedData: Record<string, any> = {
                        ...n.data,
                        error: results[n.id].error,
                    };
                    
                    // For output nodes, update the displayed data
                    if (n.type === 'outputNode' || n.type === 'inputNode') {
                        updatedData.data = results[n.id].data;
                    }
                    
                    if (JSON.stringify(n.data) !== JSON.stringify(updatedData)) {
                        return { ...n, data: updatedData };
                    }
                }
                return n;
            })
          );
      } finally {
          setIsEvaluating(false);
      }
  };

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const addInputNode = () => {
      const newNode: Node = {
          id: `input-${Date.now()}`,
          type: 'inputNode',
          position: { x: 50, y: 50 },
          data: { value: '[1,2,3,4,5]' }
      };
      setNodes((nds) => nds.concat(newNode));
  };
  
  const addOutputNode = () => {
      const newNode: Node = {
          id: `output-${Date.now()}`,
          type: 'outputNode',
          position: { x: 800, y: 50 },
          data: { data: null }
      };
      setNodes((nds) => nds.concat(newNode));
  };
  
  const addModuleNode = (moduleId: string) => {
      if (!moduleId) return;
      const newNode: Node = {
          id: `module-${Date.now()}`,
          type: 'moduleNode',
          position: { x: 400, y: 50 },
          data: { moduleId, config: {} }
      };
      setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      <div className="h-16 border-b flex items-center px-6 justify-between bg-card shrink-0">
          <div>
            <h1 className="text-xl font-bold">Visual Flow Debugger</h1>
            <p className="text-xs text-muted-foreground">Map data through your mathematical models</p>
          </div>
          
          <div className="flex items-center gap-3">
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Save className="w-4 h-4" /> Save
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Graph Layout</DialogTitle>
                    <DialogDescription>
                      Save your current node and edge configurations to your browser's local storage.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Input 
                      placeholder="e.g. RSI Crossover Debug" 
                      value={saveName} 
                      onChange={(e) => setSaveName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveGraph()}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSaveGraph} disabled={!saveName.trim()}>Save Graph</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <FolderOpen className="w-4 h-4" /> Load
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Load Saved Graph</DialogTitle>
                    <DialogDescription>
                      Restore a previously saved graph layout.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 max-h-[300px] overflow-y-auto space-y-2">
                    {savedGraphs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No saved graphs found.</p>
                    ) : (
                      savedGraphs.map(graph => (
                        <div key={graph.id} className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 transition-colors">
                          <div className="flex flex-col cursor-pointer flex-1" onClick={() => handleLoadGraph(graph)}>
                            <span className="font-medium text-sm">{graph.name}</span>
                            <span className="text-xs text-muted-foreground">{new Date(graph.updatedAt).toLocaleString()}</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteSavedGraph(graph.id)} className="text-destructive hover:bg-destructive/10 shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <div className="w-px h-6 bg-border mx-2"></div>

              <Button onClick={() => {
                  setNodes(initialNodes);
                  setEdges(initialEdges);
              }} variant="secondary" size="sm" className="gap-2">
                  <Download className="w-4 h-4" /> Sample: SMA
              </Button>
              <Button onClick={() => {
                  setNodes(seasonalNodes);
                  setEdges(seasonalEdges);
              }} variant="secondary" size="sm" className="gap-2">
                  <Download className="w-4 h-4" /> Sample: Seasonal
              </Button>
              <Button 
                onClick={runEvaluation} 
                size="sm" 
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isEvaluating}
              >
                  {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} 
                  {isEvaluating ? 'Evaluating...' : 'Run / Test'}
              </Button>
              <div className="w-px h-6 bg-border mx-2"></div>
              <Button onClick={addInputNode} variant="outline" size="sm">Add Input</Button>
              <Button onClick={addOutputNode} variant="outline" size="sm">Add Output</Button>
              
              <Select onValueChange={addModuleNode}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Add Module..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Indicators</SelectLabel>
                    {Object.values(ModuleRegistry)
                      .filter(mod => mod.category === 'Indicators')
                      .map((mod) => (
                        <SelectItem key={mod.id} value={mod.id}>{mod.name}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Strategies</SelectLabel>
                    {Object.values(ModuleRegistry)
                      .filter(mod => mod.category === 'Strategies')
                      .map((mod) => (
                        <SelectItem key={mod.id} value={mod.id}>{mod.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
          </div>
      </div>

      <div className="flex-1 w-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
        >
          <Controls />
          <MiniMap 
              nodeColor={(n) => {
                  if (n.type === 'inputNode') return 'blue';
                  if (n.type === 'outputNode') return 'green';
                  return 'gray';
              }} 
          />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
