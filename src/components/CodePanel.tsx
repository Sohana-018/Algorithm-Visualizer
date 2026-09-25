import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Code2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CodePanelProps {
  code: string[];
  activeLines?: number[];
}

export function CodePanel({ code, activeLines = [] }: CodePanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="w-full bg-surface/60 rounded-2xl border border-surfaceHighlight/80 overflow-hidden shadow-xl backdrop-blur-md">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3 flex items-center justify-between bg-surfaceHighlight/40 hover:bg-surfaceHighlight/60 transition-colors border-b border-surfaceHighlight/30"
      >
        <div className="flex items-center space-x-3 text-gray-100 font-semibold tracking-wide">
          <Code2 className="w-5 h-5 text-accent-amber" />
          <span>Algorithm Code</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      
      {isOpen && (
        <div className="p-4 overflow-x-auto font-mono text-sm leading-relaxed bg-[#0d1117]">
          {code.map((line, index) => {
            const isActive = activeLines.includes(index);
            return (
              <div 
                key={index} 
                className={cn(
                  "px-3 py-0.5 rounded transition-all duration-300 whitespace-pre",
                  isActive 
                    ? "bg-accent-amber/10 text-accent-amber border-l-2 border-accent-amber font-semibold shadow-[inset_0_0_15px_rgba(245,158,11,0.05)]" 
                    : "text-gray-400 border-l-2 border-transparent hover:bg-white/5"
                )}
              >
                {line}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
