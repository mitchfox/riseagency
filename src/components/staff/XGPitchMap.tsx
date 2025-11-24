import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// xG values from different zones (top to bottom, left to right)
// Based on the reference image showing expected goals from different pitch positions
const XG_GRID_DATA = [
  [0.000, 0.016, 0.045, 0.147, 0.438, 0.119, 0.049, 0.026, 0.011],
  [0.010, 0.021, 0.048, 0.111, 0.173, 0.112, 0.050, 0.022, 0.020],
  [0.006, 0.022, 0.040, 0.081, 0.187, 0.083, 0.041, 0.016, 0.016],
  [0.000, 0.017, 0.027, 0.039, 0.039, 0.028, 0.014, 0.011],
  [0.009, 0.014, 0.021, 0.028, 0.029, 0.027, 0.022, 0.014, 0.011],
  [0.010, 0.015, 0.016, 0.020, 0.020, 0.020, 0.016, 0.010, 0.000],
  [0.008, 0.014, 0.014, 0.014, 0.013, 0.017, 0.013, 0.011, 0.004],
  [0.007, 0.008, 0.009, 0.004, 0.008, 0.009, 0.002, 0.009, 0.006],
  [0.000, 0.007, 0.007, 0.007, 0.007, 0.005, 0.008, 0.000, 0.006],
  [0.000, 0.000, 0.012, 0.020, 0.005, 0.005, 0.000, 0.003, 0.000],
  [0.000, 0.000, 0.005, 0.005, 0.006, 0.005, 0.000, 0.000, 0.000],
  [0.000, 0.006, 0.000, 0.004, 0.005, 0.004, 0.003, 0.000, 0.000],
  [0.000, 0.003, 0.003, 0.000, 0.000, 0.000, 0.003, 0.000, 0.000],
  [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
  [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
];

const getXGColor = (value: number) => {
  if (value >= 0.15) return 'bg-red-600 text-white font-bold';
  if (value >= 0.10) return 'bg-orange-500 text-white font-semibold';
  if (value >= 0.05) return 'bg-yellow-400 text-slate-900';
  if (value >= 0.02) return 'bg-green-300 text-slate-900';
  if (value >= 0.01) return 'bg-green-200 text-slate-700';
  return 'bg-slate-100 text-slate-500 text-xs';
};

export const XGPitchMap = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Expected Goals (xG) Map
        </CardTitle>
        <CardDescription>
          xG values from different pitch positions - higher values indicate better scoring opportunities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-x-auto">
          <div className="min-w-[600px] mx-auto">
            {/* Title */}
            <h3 className="text-center font-bold text-xl mb-2">Positive NSxG</h3>
            
            {/* Grid Container with pitch styling */}
            <div className="relative border-4 border-slate-900 bg-green-50">
              {/* Pitch markings */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Center circle */}
                <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-slate-700 rounded-full"></div>
                <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-slate-700 rounded-full"></div>
                
                {/* Goal areas - top (opponent) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-t-0 border-slate-700"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 border-2 border-t-0 border-slate-700"></div>
                
                {/* Goal areas - bottom (own) */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-b-0 border-slate-700"></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-6 border-2 border-b-0 border-slate-700"></div>
              </div>
              
              {/* xG Grid */}
              <div className="relative grid" style={{ gridTemplateRows: `repeat(${XG_GRID_DATA.length}, 1fr)` }}>
                {XG_GRID_DATA.map((row, rowIndex) => (
                  <div key={rowIndex} className="grid" style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}>
                    {row.map((value, colIndex) => (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`
                          border border-slate-300 p-2 text-center text-xs transition-all hover:scale-105 hover:z-10
                          ${getXGColor(value)}
                        `}
                        title={`xG: ${value.toFixed(3)}`}
                      >
                        {value.toFixed(3)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-600 border border-slate-300"></div>
                <span>≥0.15 (High)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-500 border border-slate-300"></div>
                <span>0.10-0.14</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-400 border border-slate-300"></div>
                <span>0.05-0.09</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-300 border border-slate-300"></div>
                <span>0.02-0.04</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-200 border border-slate-300"></div>
                <span>0.01-0.02</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-slate-100 border border-slate-300"></div>
                <span>&lt;0.01 (Low)</span>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground text-center mt-3">
              This map shows the probability of scoring from different positions on the pitch based on historical data
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
