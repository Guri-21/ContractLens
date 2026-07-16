import React, { useState } from 'react';
import { Send, Bot, User, BookOpen } from 'lucide-react';
import type { ClauseDTO, RiskFindingDTO } from '../types';
import { answerLegalQuestion, type LegalAdviceCitation } from '../legalAdviceEngine';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations?: LegalAdviceCitation[];
  refused?: boolean;
}

interface AiLegalAssistantProps {
  clauses?: ClauseDTO[];
  risks?: RiskFindingDTO[];
}

export const AiLegalAssistant: React.FC<AiLegalAssistantProps> = ({ clauses = [], risks = [] }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      text: 'Ask for legal review help. I will answer only from the analyzed clauses and risk evidence, with citations.',
    }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    const grounded = answerLegalQuestion(userMsg.text, clauses, risks);
    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: grounded.answer,
      citations: grounded.citations,
      refused: grounded.refused,
    };
    setMessages((prev) => [...prev, botMsg]);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white border-l border-gray-200">
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center">
        <BookOpen className="h-5 w-5 text-indigo-600 mr-2" />
        <h2 className="font-semibold text-gray-800 text-sm">Grounded Legal Advice</h2>
      </div>
      
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-gray-100 text-gray-800 rounded-bl-none'
            }`}>
              <div className="flex items-center mb-1 opacity-70 text-xs">
                {msg.role === 'user' ? <User className="h-3 w-3 mr-1" /> : <Bot className="h-3 w-3 mr-1" />}
                {msg.role === 'user' ? 'You' : 'ContractLens AI'}
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-current/15 pt-2">
                  {msg.citations.map((citation, index) => (
                    <div key={`${citation.label}-${index}`} className="rounded border border-current/15 bg-white/70 p-2 text-xs text-gray-800">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        Ref {index + 1}: {citation.label}
                      </div>
                      <blockquote className="mt-1 italic">"{citation.quote}"</blockquote>
                    </div>
                  ))}
                </div>
              )}
              {msg.refused && (
                <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">
                  Grounding required
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask with citations..."
            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Ask grounded legal question"
            className="absolute right-1 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
