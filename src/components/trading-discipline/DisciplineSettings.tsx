
"use client";

import React from 'react';
import type { DisciplineParams } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

interface DisciplineSettingsProps {
  params: DisciplineParams;
  onParamChange: <K extends keyof DisciplineParams>(key: K, value: DisciplineParams[K]) => void;
  isDisabled?: boolean;
}

export function DisciplineSettings({
  params,
  onParamChange,
  isDisabled = false
}: DisciplineSettingsProps) {

  return (
    <div className="p-3 border rounded-md bg-muted/50 space-y-4">
        <div className="flex items-center space-x-2">
            <Switch
                id="enable-discipline"
                checked={params.enableDiscipline}
                onCheckedChange={(checked) => onParamChange('enableDiscipline', checked)}
                disabled={isDisabled}
            />
            <div className="flex flex-col">
                <Label htmlFor="enable-discipline" className="cursor-pointer">Enable Trading Discipline</Label>
                <p className="text-xs text-muted-foreground">Enforces all risk management rules below.</p>
            </div>
        </div>

        {params.enableDiscipline && (
            <>
                <Separator />
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="max-losses">Max Consecutive Losses</Label>
                            <Input
                                id="max-losses"
                                type="number"
                                value={params.maxConsecutiveLosses}
                                onChange={(e) => onParamChange('maxConsecutiveLosses', parseInt(e.target.value, 10) || 0)}
                                disabled={isDisabled}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cooldown">Cooldown (minutes)</Label>
                            <Input
                                id="cooldown"
                                type="number"
                                value={params.cooldownPeriodMinutes}
                                onChange={(e) => onParamChange('cooldownPeriodMinutes', parseInt(e.target.value, 10) || 0)}
                                disabled={isDisabled}
                            />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="drawdown">Daily Drawdown Limit (%)</Label>
                        <Input
                            id="drawdown"
                            type="number"
                            value={params.dailyDrawdownLimit}
                            onChange={(e) => onParamChange('dailyDrawdownLimit', parseInt(e.target.value, 10) || 0)}
                            disabled={isDisabled}
                        />
                    </div>
                    <div className="space-y-3">
                        <Label>On Failure Action</Label>
                        <RadioGroup
                            value={params.onFailure}
                            onValueChange={(value) => onParamChange('onFailure', value as 'Cooldown' | 'Adapt')}
                            className="flex gap-4"
                            disabled={isDisabled}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Cooldown" id="cooldown-action" />
                                <Label htmlFor="cooldown-action" className="font-normal">Cooldown</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Adapt" id="adapt-action" />
                                <Label htmlFor="adapt-action" className="font-normal">Adapt</Label>
                            </div>
                        </RadioGroup>
                         <p className="text-xs text-muted-foreground">
                            Choose whether to lock trading ('Cooldown') or receive an AI strategy recommendation ('Adapt') after hitting a loss limit.
                        </p>
                    </div>
                </div>
            </>
        )}
      </div>
  );
}
