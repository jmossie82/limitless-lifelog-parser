import React from 'react';
import { Brain, Zap, Calendar } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Limitless Lifelog Parser
                </h1>
                <p className="text-sm text-gray-600">
                  Process and optimize lifelogs for ChatGPT memory integration
                </p>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-green-500" />
              <span>Token Optimization</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span>Date Selection</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="p-1 bg-blue-100 rounded">
                <Brain className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="text-sm">
              <p className="text-blue-800 font-medium">How it works:</p>
              <p className="text-blue-700 mt-1">
                Connect your Limitless.ai pendant, select a date, and we'll process your lifelogs 
                with intelligent token optimization for seamless ChatGPT memory integration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;