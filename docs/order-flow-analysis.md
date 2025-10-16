# Order Flow Analysis Feature

## Overview
The Order Flow Analysis feature provides real-time monitoring and detection of market manipulation patterns in cryptocurrency trading. This tool is designed to identify suspicious trading activities including:

- **Padding**: Small orders placed to create artificial volume
- **Scam**: Suspicious trading patterns indicating potential scam activity 
- **Rag**: Rapid aggressive trades designed to manipulate price

## Features

### 1. Real-time Monitoring
- Start/Stop monitoring for selected cryptocurrency pairs
- Symbol selection (BTC/USDT, ETH/USDT, ADA/USDT, SOL/USDT)
- Live order flow updates with risk analysis

### 2. Risk Analysis
- Automatic risk scoring (0-10 scale)
- Pattern detection algorithms
- Suspicious activity flagging

### 3. Interactive Dashboard
Four main tabs provide comprehensive analysis:

#### Overview Tab
- Statistics summary cards (Total Orders, High Risk Orders, Average Risk Score)
- Manipulation pattern detection cards with severity levels
- Real-time counters for each manipulation type

#### Patterns Tab
- Detailed breakdown of each manipulation pattern
- Severity indicators (Low/Medium/High)
- Progress bars showing pattern intensity
- Detection count and risk assessment

#### Order Flow Tab
- Real-time order data stream
- Buy/sell indicators with trend arrows
- Risk score highlighting
- Timestamp and order details

#### Alerts Tab
- Active manipulation alerts
- High-risk pattern notifications
- Time-based alerts for suspicious activities

## Risk Scoring Algorithm

The system uses multiple factors to calculate risk scores:

### Padding Detection (0-2 points)
- Identifies small orders creating artificial volume
- Analyzes order size relative to recent average
- Detects patterns of micro-orders

### Scam Pattern Detection (0-5 points)
- Identifies wash trading patterns
- Detects back-and-forth trading at similar prices
- Flags coordinated buy/sell activities

### Rag Pattern Detection (0-3 points)
- Identifies rapid aggressive trading
- Analyzes price manipulation attempts
- Detects high-frequency manipulation

### Additional Risk Factors (0-3 points)
- Large order anomalies
- Off-hours trading patterns
- Volume spikes

## Usage

1. **Navigate to Order Flow**: Click on "Order Flow" in the sidebar navigation
2. **Select Symbol**: Choose the cryptocurrency pair to monitor
3. **Start Monitoring**: Click "Start Monitoring" to begin real-time analysis
4. **Review Patterns**: Check different tabs for detailed analysis
5. **Monitor Alerts**: Watch for high-risk alerts in the Alerts tab

## Technical Implementation

- Built with Next.js, TypeScript, and React
- Real-time data simulation with configurable intervals
- Modular analyzer with extensible pattern detection
- Professional UI with shadcn/ui components
- Responsive design for desktop and mobile

## Color Coding

- **Green**: Low risk / Normal activity
- **Yellow**: Medium risk / Suspicious activity
- **Red**: High risk / Likely manipulation

## Future Enhancements

- Integration with real exchange APIs
- Historical pattern analysis
- Machine learning-based detection
- Custom alert configurations
- Pattern exportation and reporting