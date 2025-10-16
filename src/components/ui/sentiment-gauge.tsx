"use client";

import React, { useState, useEffect } from 'react';

interface SentimentGaugeProps {
	value: number; // 0-100
	label?: string;
	innerText?: string;
	size?: number;
	strokeWidth?: number;
}

export const SentimentGauge: React.FC<SentimentGaugeProps> = ({
	value,
	label,
	innerText,
	size = 180,
	strokeWidth = 12,
}) => {
	const [displayValue, setDisplayValue] = useState(0);

	useEffect(() => {
		const animation = requestAnimationFrame(() => {
			setDisplayValue(value);
		});
		return () => cancelAnimationFrame(animation);
	}, [value]);

	const V = Math.max(0, Math.min(100, displayValue));
	const r = (size - strokeWidth) / 2;
	const C = 2 * Math.PI * r;
	const offset = C - (V / 100) * C;

	const getColor = (val: number) => {
		if (val < 30) return 'text-red-500';
		if (val < 60) return 'text-yellow-500';
		return 'text-green-500';
	};

	const colorClass = getColor(V);

	return (
		<div className="flex flex-col items-center justify-center">
			<div className="relative" style={{ width: size, height: size }}>
				<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
					{/* Background circle */}
					<circle
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill="none"
						stroke="currentColor"
						strokeWidth={strokeWidth}
						className="text-gray-200 dark:text-gray-700"
					/>
					{/* Foreground circle (progress) */}
					<circle
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill="none"
						stroke="currentColor"
						strokeWidth={strokeWidth}
						strokeDasharray={C}
						strokeDashoffset={offset}
						strokeLinecap="round"
						className={colorClass}
					/>
				</svg>

				{/* Center content */}
				<div className="absolute inset-0 rotate-90 flex flex-col items-center justify-center">
					<div className="text-2xl font-bold tabular-nums">{Math.round(V)}</div>
					{innerText && <div className="text-xs text-muted-foreground">{innerText}</div>}
				</div>
			</div>

			{label && (
				<div className="mt-2 text-sm text-muted-foreground">{label}</div>
			)}
		</div>
	);
};

