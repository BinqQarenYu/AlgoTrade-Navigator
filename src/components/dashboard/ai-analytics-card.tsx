
"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit, ArrowRight } from "lucide-react";

export function AIAnalyticsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BrainCircuit /> AI Price Prediction</CardTitle>
        <CardDescription>
          Use an AI ensemble model to predict future price by synthesizing signals from multiple technical analysis strategies.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href="/screener">
            Go to AI Screener
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
