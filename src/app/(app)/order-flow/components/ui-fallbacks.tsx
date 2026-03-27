import React from 'react';

// Local lightweight Card replacement (fallback) to avoid missing module during build
export const Card = ({ children, className = '', ...props }: any) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = '', ...props }: any) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', ...props }: any) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '', ...props }: any) => (
  <p className={`text-sm text-muted-foreground ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '', ...props }: any) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
);

// Local lightweight Button replacement (fallback) to avoid missing module during build
export const Button = ({ children, className = '', variant, size, ...props }: any) => {
  const base = 'inline-flex items-center gap-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variantClass = variant === 'outline' ? 'border bg-white text-gray-800' : variant === 'destructive' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-800';
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-sm' : size === 'lg' ? 'px-4 py-2 text-lg' : 'px-3 py-2 text-sm';
  return (
    <button className={`${base} ${variantClass} ${sizeClass} ${className}`} {...props}>
      {children}
    </button>
  );
};

// Local lightweight Badge replacement (fallback) to avoid missing module during build
export const Badge = ({ children, className = '', variant, ...props }: any) => {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors';
  const variantClass = variant === 'outline' ? 'border border-gray-300 text-gray-800' : variant === 'secondary' ? 'bg-gray-200 text-gray-800' : 'bg-gray-800 text-white';
  return (
    <span className={`${base} ${variantClass} ${className}`} {...props}>
      {children}
    </span>
  );
};

// Local lightweight Alert replacement (fallback) to avoid missing module during build
export const Alert = ({ children, className = '', ...props }: any) => (
  <div className={`rounded-lg border p-4 ${className}`} {...props}>
    <div className="flex gap-3">
      {children}
    </div>
  </div>
);

export const AlertTitle = ({ children, className = '', ...props }: any) => (
  <h5 className={`font-medium leading-none tracking-tight ${className}`} {...props}>
    {children}
  </h5>
);

export const AlertDescription = ({ children, className = '', ...props }: any) => (
  <div className={`text-sm ${className}`} {...props}>
    {children}
  </div>
);

// Local lightweight Tabs replacement (fallback) to avoid missing module during build
export const Tabs = ({ children, defaultValue, className = '', ...props }: any) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue);
  return (
    <div className={className} {...props} data-active-tab={activeTab}>
      {React.Children.map(children, child =>
        React.isValidElement(child) ? React.cloneElement(child as any, { activeTab, setActiveTab }) : child
      )}
    </div>
  );
};

export const TabsList = ({ children, className = '', activeTab, setActiveTab, ...props }: any) => (
  // Consume activeTab/setActiveTab so they are not forwarded to the DOM element
  <div className={`inline-flex h-12 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-600 w-full ${className}`} {...props}>
    {children}
  </div>
);

export const TabsTrigger = ({ children, value, className = '', activeTab, setActiveTab, ...props }: any) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
      activeTab === value ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
    } ${className}`}
    onClick={() => {
      console.log('🔀 Tab clicked:', value);
      setActiveTab && setActiveTab(value);
    }}
    {...props}
  >
    {children}
  </button>
);

export const TabsContent = ({ children, value, className = '', activeTab, setActiveTab, ...props }: any) => {
  const isActive = activeTab === value;
  console.log(`📋 TabsContent for "${value}": ${isActive ? 'ACTIVE' : 'inactive'} (activeTab: ${activeTab})`);

  return isActive ? (
    <div className={`mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`} {...props}>
      {children}
    </div>
  ) : null;
};

// Local lightweight Progress replacement (fallback) to avoid missing module during build
export const Progress = ({ value = 0, className = '', ...props }: any) => (
  <div className={`relative w-full bg-gray-200 rounded-full overflow-hidden ${className}`} style={{ height: '8px' }} {...props}>
    <div
      className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-300"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);
