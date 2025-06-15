"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  FileText, 
  CheckSquare, 
  Calendar, 
  Users, 
  MessageSquare,
  Clock,
  ArrowRight
} from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: "task" | "note" | "meeting" | "user" | "message";
  url: string;
  createdAt: string;
  metadata?: {
    status?: string;
    priority?: string;
    assignee?: string;
    author?: string;
  };
}

export const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }

      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
        setResults([]);
        setSelectedIndex(-1);
      }

      if (isOpen && results.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % results.length);
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex(prev => prev <= 0 ? results.length - 1 : prev - 1);
        }
        if (e.key === "Enter" && selectedIndex >= 0) {
          e.preventDefault();
          handleResultClick(results[selectedIndex]);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length >= 2) {
      const debounceTimer = setTimeout(() => {
        performSearch(query);
      }, 300);

      return () => clearTimeout(debounceTimer);
    } else {
      setResults([]);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setSelectedIndex(-1);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "task":
        return <CheckSquare className="w-4 h-4 text-teal-400" />;
      case "note":
        return <FileText className="w-4 h-4 text-blue-400" />;
      case "meeting":
        return <Calendar className="w-4 h-4 text-purple-400" />;
      case "user":
        return <Users className="w-4 h-4 text-green-400" />;
      case "message":
        return <MessageSquare className="w-4 h-4 text-yellow-400" />;
      default:
        return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "task":
        return "Task";
      case "note":
        return "Note";
      case "meeting":
        return "Meeting";
      case "user":
        return "User";
      case "message":
        return "Message";
      default:
        return "Item";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative flex-1 max-w-md" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search everything... (⌘K)"
          className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
        />
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 max-h-96 overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-400 mx-auto"></div>
              <p className="text-gray-400 text-sm mt-2">Searching...</p>
            </div>
          ) : results.length === 0 && query.length >= 2 ? (
            <div className="p-4 text-center">
              <Search className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No results found for "{query}"</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className={`p-4 border-b border-gray-700 last:border-b-0 cursor-pointer transition-colors ${
                    index === selectedIndex ? "bg-gray-700" : "hover:bg-gray-700/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white text-sm font-medium truncate">
                          {result.title}
                        </h4>
                        <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-full">
                          {getTypeLabel(result.type)}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs line-clamp-2 mb-2">
                        {result.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(result.createdAt)}
                          </div>
                          {result.metadata?.author && (
                            <span>by {result.metadata.author}</span>
                          )}
                          {result.metadata?.status && (
                            <span className="px-2 py-1 bg-gray-600 rounded text-xs">
                              {result.metadata.status}
                            </span>
                          )}
                        </div>
                        <ArrowRight className="w-3 h-3 text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search Tips */}
          {query.length < 2 && (
            <div className="p-4 border-t border-gray-700">
              <p className="text-gray-500 text-xs text-center">
                Type at least 2 characters to search across tasks, notes, meetings, and more
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
