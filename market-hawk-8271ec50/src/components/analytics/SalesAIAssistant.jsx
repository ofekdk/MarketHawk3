import React, { useState, useRef, useEffect } from 'react';
import { InvokeLLM } from "@/api/integrations";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Send,
  Sparkles,
  MessageSquare,
  BarChart,
  TrendingUp,
  RefreshCcw,
} from "lucide-react";

export default function SalesAIAssistant({ salesData, products }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const prepareSalesContext = () => {
    // Prepare sales data summary for AI context
    const totalSales = salesData.reduce((sum, sale) => sum + sale.total_amount, 0);
    const salesByMarketplace = salesData.reduce((acc, sale) => {
      acc[sale.marketplace] = (acc[sale.marketplace] || 0) + sale.total_amount;
      return acc;
    }, {});
    
    const topProducts = Object.entries(salesData.reduce((acc, sale) => {
      const product = products.find(p => p.id === sale.product_id);
      if (product) {
        acc[product.name] = (acc[product.name] || 0) + sale.total_amount;
      }
      return acc;
    }, {}))
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

    return {
      totalSales,
      salesByMarketplace,
      topProducts,
      totalOrders: salesData.length,
      averageOrderValue: totalSales / salesData.length,
      timespan: {
        start: new Date(Math.min(...salesData.map(s => new Date(s.sale_date)))).toISOString(),
        end: new Date(Math.max(...salesData.map(s => new Date(s.sale_date)))).toISOString()
      }
    };
  };

  const suggestedPrompts = [
    "What are my best performing marketplaces and why?",
    "How can I improve my sales performance?",
    "What pricing strategies should I consider?",
    "Which products should I focus on promoting?",
    "Where should I expand my marketplace presence?"
  ];

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      const salesContext = prepareSalesContext();
      
      const response = await InvokeLLM({
        prompt: `As an AI sales analytics expert, analyze the following sales data and respond to this question: "${userMessage}"

Context:
- Total Sales: $${salesContext.totalSales.toFixed(2)}
- Total Orders: ${salesContext.totalOrders}
- Average Order Value: $${salesContext.averageOrderValue.toFixed(2)}
- Time Period: ${new Date(salesContext.timespan.start).toLocaleDateString()} to ${new Date(salesContext.timespan.end).toLocaleDateString()}
- Sales by Marketplace: ${JSON.stringify(salesContext.salesByMarketplace)}
- Top Products: ${JSON.stringify(salesContext.topProducts)}

Please provide specific, actionable insights based on this data. Consider trends, patterns, and opportunities for improvement.`,
        add_context_from_internet: true
      });

      addMessage('assistant', response);
    } catch (error) {
      console.error('Error getting AI response:', error);
      addMessage('assistant', 'I apologize, but I encountered an error analyzing your sales data. Please try again.');
    }

    setIsLoading(false);
  };

  const handleSuggestedPrompt = (prompt) => {
    setInput(prompt);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-500" />
          Sales AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-[600px]">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {suggestedPrompts.map((prompt, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs text-left h-auto py-2"
              onClick={() => handleSuggestedPrompt(prompt)}
            >
              <Sparkles className="w-3 h-3 mr-1 flex-shrink-0" />
              {prompt}
            </Button>
          ))}
        </div>

        <ScrollArea ref={scrollRef} className="flex-grow mb-4 pr-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                    Analyzing sales data...
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your sales performance..."
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            className="flex-shrink-0"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}