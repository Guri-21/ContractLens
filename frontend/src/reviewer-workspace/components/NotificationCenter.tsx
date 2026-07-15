import React, { useState, useEffect, useRef } from 'react';
import { Bell, FileWarning, CheckCircle } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
  timestamp: Date;
}

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Analysis Complete',
      message: 'Master Service Agreement has been processed successfully.',
      type: 'success',
      read: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 5)
    },
    {
      id: '2',
      title: 'Critical Risk Detected',
      message: 'Limitation of Liability clause is missing in the SOW.',
      type: 'warning',
      read: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 2)
    }
  ]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.9) {
        setNotifications(prev => [
          {
            id: Date.now().toString(),
            title: 'Team Update',
            message: 'Alice commented on Clause 12.4',
            type: 'info',
            read: false,
            timestamp: new Date()
          },
          ...prev
        ]);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-700" />;
      case 'warning': return <FileWarning className="w-4 h-4 text-risk-critical" />;
      default: return <Bell className="w-4 h-4 text-legal-focus" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-legal-meta hover:text-legal-text focus:outline-none transition-colors rounded-sm hover:bg-legal-surface"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-risk-critical ring-2 ring-legal-bg" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-legal-surface rounded-sm shadow-xl border border-legal-border overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-legal-border flex justify-between items-center bg-legal-bg">
            <h3 className="font-mono text-xs font-semibold text-legal-text uppercase tracking-widest">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="font-mono text-[10px] text-legal-meta hover:text-legal-text font-bold uppercase tracking-wider">
                Mark Read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto cl-scroll">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-legal-meta font-mono text-[10px] uppercase tracking-widest">
                No new notifications.
              </div>
            ) : (
              <div className="divide-y divide-legal-border">
                {notifications.map(notification => (
                  <div key={notification.id} className={`p-4 flex items-start hover:bg-legal-bg transition-colors ${!notification.read ? 'bg-legal-focus/5' : ''}`}>
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className={`font-display text-sm font-semibold ${!notification.read ? 'text-legal-text' : 'text-legal-meta'}`}>
                        {notification.title}
                      </p>
                      <p className="font-body text-xs text-legal-text mt-1 line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="font-mono text-[9px] text-legal-meta mt-2 uppercase tracking-widest">
                        {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="flex-shrink-0 ml-2">
                        <span className="h-1.5 w-1.5 bg-legal-focus rounded-full inline-block mt-1"></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
