import { Node, Edge } from '@xyflow/react';
import { ModuleRegistry } from './registry';

export interface EvaluationResult {
  data?: any;
  error?: string;
}

export const evaluateGraph = async (nodes: Node[], edges: Edge[]): Promise<Record<string, EvaluationResult>> => {
  const results: Record<string, EvaluationResult> = {};
  
  // Create an adjacency list to find node dependencies
  const dependencies: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  
  nodes.forEach(n => {
    dependencies[n.id] = [];
    inDegree[n.id] = 0;
  });

  edges.forEach(e => {
    if (dependencies[e.source] && inDegree[e.target] !== undefined) {
      dependencies[e.source].push(e.target);
      inDegree[e.target]++;
    }
  });

  // Find nodes with no dependencies
  const queue = Object.keys(inDegree).filter(id => inDegree[id] === 0);
  
  // Topological sort evaluation (Async)
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const node = nodes.find(n => n.id === currentId);
    
    if (node) {
      if (node.type === 'inputNode') {
        try {
          // data.value should be valid JSON or mock selection
          const value = typeof node.data.value === 'string' ? JSON.parse(node.data.value) : node.data.value;
          results[currentId] = { data: { output: value } };
        } catch (err: any) {
          results[currentId] = { error: 'Invalid JSON input' };
        }
      } else if (node.type === 'moduleNode') {
        const moduleDef = ModuleRegistry[node.data.moduleId as string];
        if (moduleDef) {
          // Gather inputs from incoming edges and default values
          const inputs: Record<string, any> = {};
          
          // Pre-fill with defaults or inline configurations
          moduleDef.inputs.forEach(inp => {
            inputs[inp.name] = (node.data.config as Record<string, any>)?.[inp.name] ?? inp.defaultValue;
          });

          // Override with connected edge data
          const incomingEdges = edges.filter(e => e.target === currentId);
          incomingEdges.forEach(e => {
            const sourceResult = results[e.source];
            if (sourceResult?.data && sourceResult.data[e.sourceHandle || 'output']) {
              inputs[e.targetHandle || 'data'] = sourceResult.data[e.sourceHandle || 'output'];
            } else if (sourceResult?.data) {
                // fallback if handles are somewhat missing
                inputs[e.targetHandle || 'data'] = sourceResult.data.output || sourceResult.data;
            }
          });

          try {
            // Await the execution to support async strategies
            const output = await moduleDef.execute(inputs);
            results[currentId] = { data: output };
          } catch (err: any) {
            results[currentId] = { error: err.message || 'Execution failed' };
          }
        } else {
          results[currentId] = { error: 'Module not found' };
        }
      } else if (node.type === 'outputNode') {
         const incomingEdges = edges.filter(e => e.target === currentId);
         if (incomingEdges.length > 0) {
            const sourceResult = results[incomingEdges[0].source];
            if (sourceResult?.error) {
                results[currentId] = { error: 'Error in upstream node' };
            } else if (sourceResult?.data) {
                const handleKey = incomingEdges[0].sourceHandle || 'output';
                results[currentId] = { data: sourceResult.data[handleKey] || sourceResult.data };
            } else {
                results[currentId] = { data: null };
            }
         } else {
             results[currentId] = { data: null };
         }
      }
    }

    // Process downstream dependencies
    dependencies[currentId]?.forEach(targetId => {
      inDegree[targetId]--;
      if (inDegree[targetId] === 0) {
        queue.push(targetId);
      }
    });
  }

  // Handle cycles (nodes left with inDegree > 0)
  Object.keys(inDegree).forEach(id => {
    if (inDegree[id] > 0 && !results[id]) {
      results[id] = { error: 'Cycle detected in graph' };
    }
  });

  return results;
};
