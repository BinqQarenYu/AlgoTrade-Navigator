
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
import { usePersistentState } from '@/hooks/use-persistent-state';

interface DisciplineSettingsProps {
  params?: DisciplineParams;
  onParamChange: <K extends keyof DisciplineParams>(key: K, value: DisciplineParams[K]) => void;
  isDisabled?: boolean;
}

export function DisciplineSettings({
  params,
  onParamChange,
  isDisabled = false
}: DisciplineSettingsProps) {
    const [isOpen, setIsOpen] = usePersistentState<boolean>('discipline-settings-open', true);

    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><ShieldCheck /> Trading Discipline</CardTitle>
                        <CardDescription>Configure risk management rules.</CardDescription>
                    </div>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                        </Button>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="enable-discipline"
                                checked={params?.enableDiscipline ?? true}
                                onCheckedChange={(checked) => onParamChange('enableDiscipline', checked)}
                                disabled={isDisabled}
                            />
                            <div className="flex flex-col">
                                <Label htmlFor="enable-discipline" className="cursor-pointer">Enable Trading Discipline</Label>
                                <p className="text-xs text-muted-foreground">Enforces all risk management rules below.</p>
                            </div>
                        </div>

                        {(params?.enableDiscipline ?? true) && (
                            <>
                                <div className="space-y-4 pt-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="max-losses">Max Consecutive Losses</Label>
                                            <Input
                                                id="max-losses"
                                                type="number"
                                                value={params?.maxConsecutiveLosses || 0}
                                                onChange={(e) => onParamChange('maxConsecutiveLosses', parseInt(e.target.value, 10) || 0)}
                                                disabled={isDisabled}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cooldown">Cooldown (minutes)</Label>
                                            <Input
                                                id="cooldown"
                                                type="number"
                                                value={params?.cooldownPeriodMinutes || 0}
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
                                            value={params?.dailyDrawdownLimit || 0}
                                            onChange={(e) => onParamChange('dailyDrawdownLimit', parseInt(e.target.value, 10) || 0)}
                                            disabled={isDisabled}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label>On Failure Action</Label>
                                        <RadioGroup
                                            value={params?.onFailure || 'Cooldown'}
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
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
