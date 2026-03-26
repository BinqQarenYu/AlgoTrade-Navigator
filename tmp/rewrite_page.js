const fs = require('fs');
const targetPath = 'src/app/(app)/manual/page.tsx';

let content = fs.readFileSync(targetPath, 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(line => line.includes('export default function ManualTradingPage()'));

if (startIndex === -1) {
    console.error("ManualTradingPage function not found!");
    process.exit(1);
}

let topSection = lines.slice(0, startIndex).join('\n');

if (!topSection.includes('LayoutDashboard')) {
    topSection = topSection.replace('} from "lucide-react"', ', LayoutDashboard } from "lucide-react"');
}

const newImplementation = `export default function ManualTradingPage() {
    const { toast } = useToast();
    const { isConnected } = useApi();
    const { 
        startBotInstance, 
        stopBotInstance, 
        liveBotState,
        botInstances,
        setBotInstances,
        addBotContextInstance,
        removeBotInstance,
    } = useBot();
    
    const { bots: runningBots } = liveBotState;
    const [activeBotId, setActiveBotId] = useState<string | null>(null);

    const addBotInstance = useCallback(() => {
        addBotContextInstance({}); 
    }, [addBotContextInstance]);

    useEffect(() => {
        if (botInstances.length === 0) {
            addBotInstance();
        } else if (!activeBotId && botInstances.length > 0) {
            setActiveBotId(botInstances[0].id);
        }
    }, [botInstances, addBotInstance, activeBotId]);

    const handleBotConfigChange = useCallback((id: string, field: any, value: any) => {
        setBotInstances(prev => prev.map(bot => {
            if (bot.id === id) {
                const updatedBot: any = { ...bot, [field]: value };
                if (field === 'strategy') {
                    updatedBot.strategyParams = DEFAULT_PARAMS_MAP[value as string] || {};
                }
                return updatedBot as LiveBotConfig & { id: string };
            }
            return bot;
        }));
    }, [setBotInstances]);
    
    const handleStrategyParamChange = useCallback((botId: string, param: string, value: any) => {
        setBotInstances((prev: any[]) => prev.map((bot: any) => {
            if (bot.id === botId) {
                const updatedParams = { ...bot.strategyParams };
                 if (typeof value === 'object' || typeof value === 'boolean') {
                   updatedParams[param] = value;
                } else {
                   const parsedValue = (value === '' || isNaN(value as any)) ? 0 : String(value).includes('.') ? parseFloat(value) : parseInt(value, 10);
                   updatedParams[param] = isNaN(parsedValue as any) ? 0 : parsedValue;
                }
               return { ...bot, strategyParams: updatedParams };
           }
            return bot;
        }));
    }, [setBotInstances]);
    
    const handleDisciplineParamChange = useCallback((botId: string, paramName: keyof DisciplineParams, value: any) => {
        handleStrategyParamChange(botId, 'discipline', {
            ...(botInstances.find(b => b.id === botId)?.strategyParams?.discipline || defaultSmaCrossoverParams.discipline),
            [paramName]: value
        });
    }, [botInstances, handleStrategyParamChange]);

    const handleResetParams = useCallback((botId: string) => {
        const bot = botInstances.find(b => b.id === botId);
        if (bot && DEFAULT_PARAMS_MAP[bot.strategy]) {
            setBotInstances(prev => prev.map(b => b.id === botId ? { ...b, strategyParams: DEFAULT_PARAMS_MAP[bot.strategy] } : b));
            toast({ title: "Parameters Reset" });
        }
    }, [botInstances, setBotInstances, toast]);

    const removeBot = useCallback((id: string) => {
        setBotInstances(prev => prev.filter(bot => bot.id !== id));
        if (activeBotId === id) setActiveBotId(null);
    }, [setBotInstances, activeBotId]);

    const handleToggleBot = useCallback((botId: string) => {
        const botConfig = botInstances.find(b => b.id === botId);
        if (!botConfig?.asset || !botConfig?.strategy) {
            toast({ title: "Incomplete Config", description: "Select asset and strategy first.", variant: "destructive" });
            return;
        }

        const isRunning = runningBots[botId]?.status === 'running' || runningBots[botId]?.status === 'analyzing' || runningBots[botId]?.status === 'position_open';
        
        if (isRunning) stopBotInstance(botId);
        else startBotInstance({ ...botConfig, isManual: true });
    }, [botInstances, runningBots, startBotInstance, stopBotInstance, toast]);

    const activeBot = botInstances.find(b => b.id === activeBotId);
    const activeBotLiveState = activeBotId ? runningBots[activeBotId] : undefined;
    const isTradingActive = !!activeBotLiveState && activeBotLiveState.status !== 'idle' && activeBotLiveState.status !== 'error';

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
            <div className="flex justify-between items-center mb-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Trading Command Terminal</h1>
                    <p className="text-muted-foreground text-sm mt-1">Beginner-Friendly Synthesis Engine (Master-Detail View)</p>
                </div>
                {!isConnected && (
                    <Alert variant="destructive" className="py-2 w-auto flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        <AlertTitle className="mb-0 text-sm">Offline: Connect API in settings.</AlertTitle>
                    </Alert>
                )}
            </div>
            
            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* LEFT SIDEBAR: WATCHLIST */}
                <Card className="w-80 flex flex-col shrink-0 border-r border-slate-800 bg-slate-950/40">
                    <CardHeader className="py-4 border-b border-white/5 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold tracking-wider uppercase text-slate-300">Watchlist monitors</CardTitle>
                        <Button onClick={addBotInstance} size="icon" variant="ghost" className="h-6 w-6"><PlusCircle className="h-4 w-4 text-indigo-400"/></Button>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto flex-1">
                        {botInstances.map(bot => {
                            const st = runningBots[bot.id]?.status || 'idle';
                            const isActive = activeBotId === bot.id;
                            const signal = runningBots[bot.id]?.activePosition;
                            
                            return (
                                <div 
                                    key={bot.id} 
                                    onClick={() => setActiveBotId(bot.id)}
                                    className={\`p-4 border-b border-white/5 cursor-pointer transition-colors \${isActive ? 'bg-indigo-950/30 border-l-2 border-l-indigo-500' : 'hover:bg-slate-900'}\`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-sm">{bot.asset || "Select Asset"}</span>
                                        <StatusBadge status={st} />
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {strategyMetadatas.find(s => s.id === bot.strategy)?.name || "No strategy"}
                                    </div>
                                    {signal && (
                                        <div className={\`mt-2 px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 \${signal.action === 'UP' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}\`}>
                                            <Activity className="w-3 h-3" /> SIGNAL ACTIVE
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* CENTER STAGE: COMMAND TERMINAL */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-12 pr-4">
                    {!activeBot ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center bg-slate-950/20 rounded-lg border border-dashed border-white/10">
                            <Activity className="w-12 h-12 mb-4 opacity-20" />
                            <h2 className="text-xl font-bold">No Asset Selected</h2>
                            <p className="mt-2 text-sm max-w-md">Select an asset from the Watchlist on the left to initialize the visual HUD and Formidable Hindsight engine.</p>
                        </div>
                    ) : (
                        <>
                            {/* ACTIVE BOT HEADER CONFIG */}
                            <Card className="shrink-0 border-indigo-500/20 bg-slate-950/40">
                                <CardHeader className="py-3 items-center flex flex-row justify-between border-b border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <LayoutDashboard className="text-indigo-400 w-5 h-5"/>
                                            <CardTitle className="text-lg">{activeBot.asset || 'New Monitor'}</CardTitle>
                                        </div>
                                        <StatusBadge status={activeBotLiveState?.status} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant={isTradingActive ? "destructive" : "default"} size="sm" onClick={() => handleToggleBot(activeBot.id)} disabled={!isConnected} className={isTradingActive ? "animate-pulse" : ""}>
                                            {isTradingActive ? <StopCircle className="mr-2 h-4 w-4"/> : <Play className="mr-2 h-4 w-4"/>}
                                            {isTradingActive ? 'Halt Engine' : 'Deploy Engine'}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => removeBot(activeBot.id)} disabled={isTradingActive} className="text-red-400 hover:bg-red-950/50 hover:text-red-300">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 bg-slate-900/40">
                                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                                        <div className="col-span-2">
                                            <Label className="text-xs mb-1 block">Strategy Core</Label>
                                            <Select value={activeBot.strategy} onValueChange={(val) => handleBotConfigChange(activeBot.id, 'strategy', val)} disabled={isTradingActive}>
                                                <SelectTrigger><SelectValue placeholder="Select Strategy" /></SelectTrigger>
                                                <SelectContent>{strategyMetadatas.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            {(() => {
                                                const parsed = parseSymbolString(activeBot.asset) || { base: activeBot.asset.replace('USDT', ''), quote: 'USDT' };
                                                const availableQuotes = getAvailableQuotesForBase(parsed.base) || ['USDT'];
                                                return (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Asset Pair</Label>
                                                        <AssetSelector baseAsset={parsed.base} quoteAsset={parsed.quote} onBaseChange={(newBase) => handleBotConfigChange(activeBot.id, 'asset', \`\${newBase}\${parsed.quote}\`)} onQuoteChange={(newQuote) => handleBotConfigChange(activeBot.id, 'asset', \`\${parsed.base}\${newQuote}\`)} disabled={isTradingActive} availableQuotes={availableQuotes} />
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div>
                                            <Label className="text-xs mb-1 block">Interval</Label>
                                            <Select value={activeBot.interval} onValueChange={(val) => handleBotConfigChange(activeBot.id, 'interval', val)} disabled={isTradingActive}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent><SelectItem value="1m">1m</SelectItem><SelectItem value="5m">5m</SelectItem><SelectItem value="15m">15m</SelectItem><SelectItem value="1h">1h</SelectItem><SelectItem value="4h">4h</SelectItem><SelectItem value="1d">1d</SelectItem></SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2">
                                            <Collapsible>
                                                <CollapsibleTrigger asChild>
                                                    <Button variant="outline" size="sm" className="w-full flex justify-between group">
                                                        <span>Advanced Settings</span> <ChevronDown className="h-4 w-4 group-data-[state=open]:rotate-180 transition-transform" />
                                                    </Button>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="pt-2 absolute z-[50] w-[400px] mt-1 shadow-2xl right-6">
                                                    <StrategyParamsCard bot={activeBot} onParamChange={(p, v) => handleStrategyParamChange(activeBot.id, p, v)} onDisciplineChange={(p, v) => handleDisciplineParamChange(activeBot.id, p, v)} onReset={() => handleResetParams(activeBot.id)} isTradingActive={isTradingActive} />
                                                </CollapsibleContent>
                                            </Collapsible>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* UNIFIED HINDSIGHT PANELS (Macro + Micro + History) */}
                            <EventDossierPanel bot={activeBot} botState={activeBotLiveState} />
                            
                            {/* VISUAL HUD */}
                            <VisualHudPanel symbol={activeBot.asset || 'BTCUSDT'} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
`;

fs.writeFileSync(targetPath, topSection + '\n' + newImplementation);
console.log("Successfully rewrote the file!");
