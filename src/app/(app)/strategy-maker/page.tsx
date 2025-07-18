
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { TradingChart } from "@/components/trading-chart";
import { useDataManager } from "@/context/data-manager-context";
import { useApi } from "@/context/api-context";
import { useBot } from "@/context/bot-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, BrainCircuit, Wand2, PlusCircle, Trash2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HistoricalData, DisciplineParams } from "@/lib/types";
import { topAssets } from "@/lib/assets";
import { useSymbolManager } from "@/hooks/use-symbol-manager";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { Switch } from "@/components/ui/switch";
import { DisciplineSettings } from "@/components/trading-discipline/DisciplineSettings";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { availableIndicators, getIndicatorParams } from "@/lib/strategies/indicator-configs";
import { generateStrategy } from "@/ai/flows/generate-strategy-flow";


interface Rule {
  id: string;
  indicator1: string;
  condition: 'crosses_above' | 'crosses_below' | 'is_above' | 'is_below';
  indicator2: string;
  value: string; // Can be another indicator name or a static value
}

interface StrategyConfig {
  name: string;
  description: string;
  indicators: Record<string, any>; // { indicatorId: { param1: value1 } }
  entryConditions: Rule[];
  exitConditions: Rule[];
  discipline: DisciplineParams;
  reverse: boolean;
}

const defaultDiscipline: DisciplineParams = {
  enableDiscipline: true,
  maxConsecutiveLosses: 4,
  cooldownPeriodMinutes: 15,
  dailyDrawdownLimit: 10,
  onFailure: 'Cooldown',
};

export default function StrategyMakerPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { isConnected, canUseAi, consumeAiCredit } = useApi();
  const { getChartData, isLoading: isFetchingData, error: dataError } = useDataManager();
  const { symbol, baseAsset, quoteAsset, handleBaseAssetChange, handleQuoteAssetChange } = useSymbolManager('strategy-maker', 'BTC', 'USDT');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [chartData, setChartData] = useState<HistoricalData[]>([]);
  const [config, setConfig] = usePersistentState<StrategyConfig>('strategy-maker-config', {
    name: "My Custom Strategy",
    description: "A strategy created with the visual strategy maker.",
    indicators: {},
    entryConditions: [],
    exitConditions: [],
    discipline: defaultDiscipline,
    reverse: false,
  });

  useEffect(() => {
    const fetchData = async () => {
        if (!isConnected || !symbol) return;
        const data = await getChartData(symbol, '1h');
        if (data) setChartData(data);
    };
    fetchData();
  }, [isConnected, symbol, getChartData]);

  const handleConfigChange = <K extends keyof StrategyConfig>(field: K, value: StrategyConfig[K]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleAddIndicator = (indicatorId: string) => {
    if (!config.indicators[indicatorId]) {
      const defaultParams = getIndicatorParams(indicatorId);
      setConfig(prev => ({
        ...prev,
        indicators: { ...prev.indicators, [indicatorId]: defaultParams }
      }));
    }
  };

  const handleRemoveIndicator = (indicatorId: string) => {
    const newIndicators = { ...config.indicators };
    delete newIndicators[indicatorId];
    setConfig(prev => ({
      ...prev,
      indicators: newIndicators,
      entryConditions: prev.entryConditions.filter(r => r.indicator1 !== indicatorId && r.indicator2 !== indicatorId),
      exitConditions: prev.exitConditions.filter(r => r.indicator1 !== indicatorId && r.indicator2 !== indicatorId),
    }));
  };

  const handleIndicatorParamChange = (indicatorId: string, paramName: string, value: string) => {
    const parsedValue = String(value).includes('.') ? parseFloat(value) : parseInt(value, 10);
    setConfig(prev => ({
      ...prev,
      indicators: {
        ...prev.indicators,
        [indicatorId]: {
          ...prev.indicators[indicatorId],
          [paramName]: isNaN(parsedValue) ? 0 : parsedValue
        }
      }
    }));
  };
  
  const handleAddRule = (type: 'entry' | 'exit') => {
    const newRule: Rule = {
      id: `rule_${Date.now()}`,
      indicator1: '',
      condition: 'crosses_above',
      indicator2: '',
      value: '0'
    };
    const key = type === 'entry' ? 'entryConditions' : 'exitConditions';
    setConfig(prev => ({ ...prev, [key]: [...prev[key], newRule] }));
  };
  
  const handleUpdateRule = (type: 'entry' | 'exit', ruleId: string, field: keyof Rule, value: string) => {
    const key = type === 'entry' ? 'entryConditions' : 'exitConditions';
    setConfig(prev => ({
      ...prev,
      [key]: prev[key].map(rule => rule.id === ruleId ? { ...rule, [field]: value } : rule)
    }));
  };

  const handleRemoveRule = (type: 'entry' | 'exit', ruleId: string) => {
    const key = type === 'entry' ? 'entryConditions' : 'exitConditions';
    setConfig(prev => ({ ...prev, [key]: prev[key].filter(rule => rule.id !== ruleId) }));
  };

  const handleGenerateStrategy = async () => {
      if (!canUseAi()) {
          toast({ title: "AI Quota Reached", description: "Cannot generate strategy.", variant: "destructive" });
          return;
      }
      setIsGenerating(true);
      try {
          consumeAiCredit();
          const generatedCode = await generateStrategy({ config: JSON.stringify(config, null, 2) });
          // In a real app, you'd save this to a file system and reload strategies
          console.log("Generated Strategy Code:", generatedCode);
          toast({ title: "Strategy Generated!", description: "Your new strategy is now available on the Backtest page." });
          router.push('/backtest');
      } catch (error: any) {
          toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
      } finally {
          setIsGenerating(false);
      }
  };
  
  const renderRuleEditor = (type: 'entry' | 'exit') => {
    const rules = type === 'entry' ? config.entryConditions : config.exitConditions;
    const selectedIndicators = Object.keys(config.indicators);

    return (
      <div className="space-y-4">
        <Label className="capitalize">{type} Conditions</Label>
        {rules.map(rule => (
          <div key={rule.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center p-2 border rounded-md bg-muted/50">
            <Select value={rule.indicator1} onValueChange={(val) => handleUpdateRule(type, rule.id, 'indicator1', val)}>
              <SelectTrigger><SelectValue placeholder="Indicator" /></SelectTrigger>
              <SelectContent>{selectedIndicators.map(id => <SelectItem key={id} value={id}>{availableIndicators[id]?.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={rule.condition} onValueChange={(val) => handleUpdateRule(type, rule.id, 'condition', val)}>
              <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="crosses_above">Crosses Above</SelectItem>
                  <SelectItem value="crosses_below">Crosses Below</SelectItem>
                  <SelectItem value="is_above">Is Above</SelectItem>
                  <SelectItem value="is_below">Is Below</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              placeholder="Value or Indicator..." 
              value={rule.value} 
              onChange={(e) => handleUpdateRule(type, rule.id, 'value', e.target.value)}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveRule(type, rule.id)}><X/></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => handleAddRule(type)}><PlusCircle className="mr-2"/> Add Rule</Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
       <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <BrainCircuit size={32}/> Strategy Maker
          </h1>
          <p className="text-muted-foreground mt-2">
              Visually build, configure, and generate your own trading strategies.
          </p>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
            <TradingChart data={chartData} symbol={symbol} interval="1h" />
            <Card>
                <CardHeader><CardTitle>Strategy Logic</CardTitle><CardDescription>Define the entry and exit rules for your strategy.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                    {renderRuleEditor('entry')}
                    {renderRuleEditor('exit')}
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="strategy-name">Strategy Name</Label>
                        <Input id="strategy-name" value={config.name} onChange={(e) => handleConfigChange('name', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="strategy-desc">Description</Label>
                        <Input id="strategy-desc" value={config.description} onChange={(e) => handleConfigChange('description', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label>Select Indicators</Label>
                        <Select onValueChange={handleAddIndicator}>
                            <SelectTrigger><SelectValue placeholder="Add an indicator..."/></SelectTrigger>
                            <SelectContent>
                                {Object.entries(availableIndicators).map(([id, {name}]) => (
                                    <SelectItem key={id} value={id} disabled={!!config.indicators[id]}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
            
            {Object.keys(config.indicators).length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Indicator Parameters</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {Object.entries(config.indicators).map(([id, params]) => (
                            <div key={id} className="p-3 border rounded-md">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-sm">{availableIndicators[id]?.name}</h4>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveIndicator(id)}><X/></Button>
                                </div>
                                {Object.keys(params).map(paramName => (
                                    <div key={paramName} className="flex items-center justify-between gap-4 my-1">
                                        <Label className="text-xs capitalize text-muted-foreground">{paramName.replace(/([A-Z])/g, ' $1').trim()}</Label>
                                        <Input
                                            type="number"
                                            value={params[paramName]}
                                            onChange={(e) => handleIndicatorParamChange(id, paramName, e.target.value)}
                                            className="h-8 w-24"
                                            step={String(params[paramName]).includes('.') ? 0.01 : 1}
                                        />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <DisciplineSettings 
                params={config.discipline}
                onParamChange={(key, value) => handleConfigChange('discipline', { ...config.discipline, [key]: value })}
                isCollapsed={true}
                onCollapseChange={() => {}}
            />
             <div className="flex items-center space-x-2 pt-2">
                <Switch id="reverse" checked={config.reverse} onCheckedChange={(val) => handleConfigChange('reverse', val)} />
                <Label htmlFor="reverse">Reverse (Contrarian) Mode</Label>
            </div>
             <Button className="w-full" onClick={handleGenerateStrategy} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>}
                {isGenerating ? 'Generating...' : 'Convert to Strategy & Go to Backtest'}
            </Button>
        </div>
      </div>
    </div>
  );
}
